# ============================================
# services/training.py — Training Pipeline
# ============================================
# Re-train GAT saja (IndoBERT fine-tuned sudah fix).
# Alur:
# 1. Load dataset → preprocess
# 2. Extract embeddings via IndoBERT (LAMBAT di CPU)
# 3. Per rasio split:
#    a. Split data
#    b. Build k-NN graph
#    c. Per epoch config: train GAT → evaluasi
#    d. Simpan model + metrik ke DB
# 4. Tentukan rasio+epoch terbaik
# 5. Simpan model terbaik ke file system
# ============================================

import os
import json
import threading
import numpy as np
import torch
import torch.nn as nn
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix,
)
from tqdm import tqdm

from config import Config
from database import SessionLocal
from models.db_models import TrainingSession, TrainingResult, TrainedModel
from models.gat_model import GATBaseline
from services.preprocessing import preprocess_text


def build_knn_graph(embeddings, k=5, threshold=0.75):
    """
    Build k-NN graph dari embeddings (sama dengan Colab).
    Setiap node dihubungkan ke top-k tetangga jika similarity >= threshold.
    """
    norm_emb = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    sim = norm_emb @ norm_emb.T
    n = len(embeddings)
    edges = []

    for i in range(n):
        sim_i = sim[i].copy()
        sim_i[i] = -1  # exclude self-loop
        top_k = np.argsort(sim_i)[-k:]
        for j in top_k:
            if sim_i[j] >= threshold:
                edges.append([i, j])

    # Fallback jika tidak ada edge
    if len(edges) == 0:
        for i in range(n):
            sim_i = sim[i].copy()
            sim_i[i] = -1
            j = int(np.argmax(sim_i))
            edges.append([i, j])

    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    return edge_index


def connect_test_to_train(test_emb, train_emb, k=5, threshold=0.75):
    """Hubungkan test nodes ke train graph (sama dengan Colab)."""
    norm_test = test_emb / np.linalg.norm(test_emb, axis=1, keepdims=True)
    norm_train = train_emb / np.linalg.norm(train_emb, axis=1, keepdims=True)
    sim = norm_test @ norm_train.T
    edges = []
    n_train = len(train_emb)

    for i in range(len(test_emb)):
        sim_i = sim[i]
        top_k = np.argsort(sim_i)[-k:]
        for j in top_k:
            if sim_i[j] >= threshold:
                edges.append([n_train + i, int(j)])
                edges.append([int(j), n_train + i])

    if len(edges) == 0:
        for i in range(len(test_emb)):
            j = int(np.argmax(sim[i]))
            edges.append([n_train + i, j])
            edges.append([j, n_train + i])

    return torch.tensor(edges, dtype=torch.long).t().contiguous()


def train_gat_model(train_emb, train_labels, edge_index,
                     epochs=30, lr=0.001, weight_decay=5e-4,
                     gat_params=None):
    """
    Training GAT full-batch (sama dengan Colab).

    Returns: model, losses, accuracies
    """
    device = torch.device("cpu")

    x = torch.tensor(train_emb, dtype=torch.float).to(device)
    y = torch.tensor(train_labels, dtype=torch.long).to(device)
    edge = edge_index.to(device)

    # Validasi edge index
    num_nodes = x.size(0)
    mask = (edge[0] < num_nodes) & (edge[1] < num_nodes)
    edge = edge[:, mask]

    # Buat model dengan parameter custom
    params = Config.GAT_DEFAULT_PARAMS.copy()
    if gat_params:
        params.update({
            k: v for k, v in gat_params.items()
            if k in params
        })
    params["in_dim"] = train_emb.shape[1]

    model = GATBaseline(**params).to(device)
    optimizer = torch.optim.Adam(
        model.parameters(), lr=lr, weight_decay=weight_decay
    )
    criterion = nn.CrossEntropyLoss()

    losses = []
    accuracies = []

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        out = model(x, edge)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()

        acc = (out.argmax(dim=1) == y).float().mean().item()
        losses.append(loss.item())
        accuracies.append(acc)

    return model, losses, accuracies


def evaluate_on_train(model, train_emb, train_labels, edge_index):
    """
    Evaluasi model GAT di TRAIN set (untuk deteksi overfitting).
    Returns: dict dengan accuracy, precision, recall, f1
    """
    device = torch.device("cpu")
    x = torch.tensor(train_emb, dtype=torch.float).to(device)

    num_nodes = x.size(0)
    mask = (edge_index[0] < num_nodes) & (edge_index[1] < num_nodes)
    edge = edge_index[:, mask].to(device)

    model.eval()
    with torch.no_grad():
        logits = model(x, edge)
        preds = logits.argmax(dim=1).cpu().numpy()

    acc = accuracy_score(train_labels, preds)
    prec = precision_score(train_labels, preds, average="macro", zero_division=0)
    rec = recall_score(train_labels, preds, average="macro", zero_division=0)
    f1 = f1_score(train_labels, preds, average="macro", zero_division=0)

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
    }


def evaluate_model(model, train_emb, test_emb, train_labels, test_labels,
                    train_edge_index):
    """
    Evaluasi model GAT di test set (sama dengan Colab).

    Returns: dict dengan accuracy, precision, recall, f1, confusion_matrix
    """
    device = torch.device("cpu")

    # Hubungkan test ke train
    test_edges = connect_test_to_train(test_emb, train_emb)
    combined_edge = torch.cat([train_edge_index, test_edges], dim=1)
    combined_emb = np.vstack([train_emb, test_emb])
    combined_x = torch.tensor(combined_emb, dtype=torch.float).to(device)

    # Validasi edge index
    num_nodes = combined_x.size(0)
    mask = (combined_edge[0] < num_nodes) & (combined_edge[1] < num_nodes)
    combined_edge = combined_edge[:, mask]

    model.eval()
    with torch.no_grad():
        logits = model(combined_x, combined_edge.to(device))
        preds = logits.argmax(dim=1).cpu().numpy()

    test_preds = preds[len(train_emb):]

    acc = accuracy_score(test_labels, test_preds)
    prec = precision_score(test_labels, test_preds, average="macro", zero_division=0)
    rec = recall_score(test_labels, test_preds, average="macro", zero_division=0)
    f1 = f1_score(test_labels, test_preds, average="macro", zero_division=0)
    cm = confusion_matrix(test_labels, test_preds).tolist()

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
    }


def _update_session(session_id, **kwargs):
    """Update training session di database."""
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id
        ).first()
        if session:
            for key, value in kwargs.items():
                setattr(session, key, value)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


# =============================================================
# TAHAP A: EKSPERIMEN RASIO (Quick test semua rasio)
# =============================================================

def run_ratio_experiment(dataset_id, ratios, gat_params=None):
    """
    Eksperimen cepat: test semua rasio dengan epoch kecil (10).
    Ini tahap pertama yang dospem minta — admin melihat rasio mana terbaik.

    Args:
        dataset_id: ID dataset
        ratios: list of float, e.g. [0.5, 0.6, 0.7]
        gat_params: parameter GAT (opsional)

    Returns:
        {
            "success": True,
            "results": [
                {"ratio": 0.7, "train_pct": 70, "test_pct": 30,
                 "f1": 0.95, "accuracy": 0.94, "precision": 0.93, "recall": 0.96,
                 "train_count": 700, "test_count": 300},
                ...
            ],
            "ranking": [...] (urut dari F1 terbaik)
        }
    """
    from services.dataset import load_dataset_dataframe

    # Load dataset
    df = load_dataset_dataframe(dataset_id)
    if df is None:
        return {"success": False, "error": "Dataset tidak ditemukan"}

    # Preprocessing
    texts = df["teks"].tolist()
    labels = df["label"].values
    processed_texts = [preprocess_text(str(t)) for t in texts]

    # Extract embeddings
    from services.inference import extract_embedding
    embeddings = []
    for text in processed_texts:
        emb = extract_embedding(text)
        if emb is not None:
            embeddings.append(emb)
        else:
            embeddings.append(np.zeros(768))

    all_embeddings = np.array(embeddings)

    # Test setiap rasio dengan epoch kecil (10)
    experiment_epoch = 10
    results = []

    for ratio in ratios:
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                all_embeddings, labels,
                train_size=ratio,
                stratify=labels,
                random_state=42,
            )

            edge_index = build_knn_graph(
                X_train,
                k=Config.GRAPH_K,
                threshold=Config.GRAPH_THRESHOLD,
            )

            model, losses, accs = train_gat_model(
                X_train, y_train, edge_index,
                epochs=experiment_epoch, lr=0.001, gat_params=gat_params,
            )

            test_metrics = evaluate_model(
                model, X_train, X_test, y_train, y_test, edge_index
            )

            results.append({
                "ratio": ratio,
                "train_pct": int(ratio * 100),
                "test_pct": int((1 - ratio) * 100),
                "f1": test_metrics["f1_score"],
                "accuracy": test_metrics["accuracy"],
                "precision": test_metrics["precision"],
                "recall": test_metrics["recall"],
                "train_count": len(X_train),
                "test_count": len(X_test),
            })
        except Exception as e:
            results.append({
                "ratio": ratio,
                "train_pct": int(ratio * 100),
                "test_pct": int((1 - ratio) * 100),
                "error": str(e),
                "f1": 0,
            })

    # Ranking: urut dari F1 terbaik
    ranking = sorted(results, key=lambda x: x.get("f1", 0), reverse=True)

    return {
        "success": True,
        "results": results,
        "ranking": ranking,
        "dataset_size": len(all_embeddings),
    }


# =============================================================
# TAHAP B: TRAINING FINAL (dengan 1 rasio + epoch/LR custom)
# =============================================================

def run_training_pipeline(session_id: int):
    """
    Jalankan training pipeline di background thread.
    Sekarang menerima 1 rasio saja (bukan array), sesuai alur 2-tahap dospem.
    Menyimpan metrik training DAN testing per epoch untuk tabel perbandingan.
    """
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id
        ).first()

        if not session:
            return

        # Update status
        session.status = "running"
        session.progress = 0
        session.current_step = "Memulai training..."
        db.commit()

        # Load dataset
        from services.dataset import load_dataset_dataframe
        df = load_dataset_dataframe(session.dataset_id)
        if df is None:
            session.status = "failed"
            session.error_message = "Dataset tidak ditemukan"
            db.commit()
            return

        _update_session(session_id,
                        current_step="Preprocessing teks...",
                        progress=5)

        # Preprocessing
        texts = df["teks"].tolist()
        labels = df["label"].values
        processed_texts = [preprocess_text(str(t)) for t in texts]

        _update_session(session_id,
                        current_step="Mengekstrak embedding IndoBERT...",
                        progress=10)

        # Extract embeddings menggunakan IndoBERT yang sudah di-load
        from services.inference import extract_embedding
        embeddings = []
        total = len(processed_texts)
        for i, text in enumerate(processed_texts):
            emb = extract_embedding(text)
            if emb is not None:
                embeddings.append(emb)
            else:
                # Fallback: zero vector
                embeddings.append(np.zeros(768))

            # Update progress (10% - 50% untuk embedding extraction)
            if (i + 1) % max(1, total // 20) == 0:
                pct = 10 + int(40 * (i + 1) / total)
                _update_session(session_id,
                                current_step=f"Embedding: {i+1}/{total}",
                                progress=pct)

        all_embeddings = np.array(embeddings)

        # Parse parameters
        # Support baik array (legacy) maupun single ratio (baru)
        split_ratios = session.split_ratios or [0.7]
        if isinstance(split_ratios, (int, float)):
            split_ratios = [split_ratios]

        epoch_list = session.epochs or [30]
        if isinstance(epoch_list, (int, float)):
            epoch_list = [int(epoch_list)]

        lr = session.learning_rate or 0.001
        gat_params = session.gat_params or {}

        total_combos = len(split_ratios) * len(epoch_list)
        combo_idx = 0
        best_f1 = 0
        best_ratio = None
        best_epoch = None
        best_model_state = None
        best_gat_params = None

        # Per rasio split
        for ratio in split_ratios:
            train_size = ratio
            test_size = 1 - ratio

            _update_session(session_id,
                            current_step=f"Split data rasio {int(ratio*100)}:{int(test_size*100)}",
                            progress=50 + int(40 * combo_idx / total_combos))

            # Stratified split
            X_train, X_test, y_train, y_test = train_test_split(
                all_embeddings, labels,
                train_size=train_size,
                stratify=labels,
                random_state=42,
            )

            # Build graph untuk split ini
            edge_index = build_knn_graph(
                X_train,
                k=Config.GRAPH_K,
                threshold=Config.GRAPH_THRESHOLD,
            )

            # Per epoch config
            for epochs in epoch_list:
                combo_idx += 1
                _update_session(
                    session_id,
                    current_step=f"Training rasio {int(ratio*100)}:{int(test_size*100)}, epoch {epochs}...",
                    progress=50 + int(40 * combo_idx / total_combos),
                )

                # Train
                model, losses, accs = train_gat_model(
                    X_train, y_train, edge_index,
                    epochs=epochs, lr=lr, gat_params=gat_params,
                )

                # Evaluate di test set
                test_metrics = evaluate_model(
                    model, X_train, X_test, y_train, y_test, edge_index
                )

                # Evaluate di train set (untuk deteksi overfitting)
                train_metrics = evaluate_on_train(
                    model, X_train, y_train, edge_index
                )

                is_best = test_metrics["f1_score"] > best_f1
                if is_best:
                    best_f1 = test_metrics["f1_score"]
                    best_ratio = ratio
                    best_epoch = epochs
                    best_model_state = model.state_dict()
                    best_gat_params = gat_params.copy()

                # Simpan hasil ke DB (termasuk train metrics)
                db2 = SessionLocal()
                try:
                    result = TrainingResult(
                        session_id=session_id,
                        split_ratio=ratio,
                        train_count=len(X_train),
                        test_count=len(X_test),
                        epoch=epochs,
                        # Test metrics
                        accuracy=test_metrics["accuracy"],
                        precision_score=test_metrics["precision"],
                        recall=test_metrics["recall"],
                        f1_score=test_metrics["f1_score"],
                        # Train metrics (baru — untuk tabel overfitting)
                        train_accuracy=train_metrics["accuracy"],
                        train_precision=train_metrics["precision"],
                        train_recall=train_metrics["recall"],
                        train_f1=train_metrics["f1_score"],
                        is_best=is_best,
                        confusion_matrix=test_metrics["confusion_matrix"],
                    )
                    db2.add(result)
                    db2.commit()
                except Exception:
                    db2.rollback()
                finally:
                    db2.close()

        # Simpan model terbaik ke file
        if best_model_state is not None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            model_name = session.model_name or f"gat_{timestamp}_r{int(best_ratio*100)}_e{best_epoch}"
            model_dir = os.path.join(Config.TRAINED_MODELS_DIR, model_name)
            os.makedirs(model_dir, exist_ok=True)

            model_path = os.path.join(model_dir, "model.pt")
            torch.save(best_model_state, model_path)

            # Simpan config
            config_data = {
                "split_ratio": best_ratio,
                "epochs": best_epoch,
                "learning_rate": lr,
                "gat_params": gat_params,
                "accuracy": best_f1,
                "created_at": timestamp,
            }
            with open(os.path.join(model_dir, "config.json"), "w") as f:
                json.dump(config_data, f, indent=2)

            # Simpan embeddings + labels untuk model ini
            np.save(os.path.join(model_dir, "embeddings.npy"), all_embeddings)
            np.save(os.path.join(model_dir, "labels.npy"), labels)

            # Simpan texts
            df[["teks", "label"]].to_csv(
                os.path.join(model_dir, "texts.csv"), index=False
            )

            # Register model di DB
            db3 = SessionLocal()
            try:
                # Cari result terbaik
                best_result = db3.query(TrainingResult).filter(
                    TrainingResult.session_id == session_id,
                    TrainingResult.is_best == True,  # noqa: E712
                ).first()

                trained_model = TrainedModel(
                    session_id=session_id,
                    result_id=best_result.id if best_result else None,
                    model_name=model_name,
                    model_path=model_path,
                    accuracy=best_result.accuracy if best_result else None,
                    f1_score=best_f1,
                )
                db3.add(trained_model)
                db3.commit()
            except Exception:
                db3.rollback()
            finally:
                db3.close()

        # Update session = selesai
        _update_session(
            session_id,
            status="completed",
            progress=100,
            current_step="Training selesai!",
            best_ratio=best_ratio,
            best_epoch=best_epoch,
            best_f1=best_f1,
            completed_at=datetime.now(timezone.utc),
        )

    except Exception as e:
        _update_session(
            session_id,
            status="failed",
            error_message=str(e),
            current_step=f"Error: {str(e)}",
        )
    finally:
        db.close()


def start_training_async(session_id: int):
    """Mulai training di background thread."""
    thread = threading.Thread(
        target=run_training_pipeline,
        args=(session_id,),
        daemon=True,
    )
    thread.start()
    return thread
