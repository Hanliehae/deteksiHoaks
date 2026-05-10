# ============================================
# services/inference.py — Model Loading & Prediction
# ============================================
# Pipeline prediksi lengkap:
# 1. Preprocess teks
# 2. Tokenize → IndoBERT → CLS embedding (768d)
# 3. Similarity search → top-3 berita serupa
# 4. Build graph edges (query ↔ train neighbors)
# 5. GAT forward → softmax → [valid_score, hoax_score]
# ============================================
# CATATAN: Semua heavy imports (torch, transformers, numpy)
# dilakukan secara LAZY di dalam function, BUKAN di top-level,
# agar server Flask bisa start dan menerima request (login, dll)
# tanpa harus menunggu library ML selesai di-load.
# ============================================

import os
import threading
from config import Config

# Global variables — di-load secara lazy saat pertama kali diperlukan
_tokenizer = None
_bert_model = None
_gat_model = None
_train_embeddings = None
_train_labels = None
_train_texts_df = None
_train_edge_index = None
_device = None
_models_loaded = False
_loading = False
_loading_lock = threading.Lock()


def _get_device():
    """Lazy-load torch device."""
    global _device
    if _device is None:
        import torch
        _device = torch.device("cpu")
    return _device


def _ensure_models_loaded():
    """Lazy load: muat model hanya saat pertama kali diperlukan."""
    global _models_loaded, _loading
    if _models_loaded:
        return
    with _loading_lock:
        if _models_loaded:
            return
        if _loading:
            return
        _loading = True
    try:
        load_all_models()
        _models_loaded = True
    except Exception as e:
        print(f"[WARN] Model loading failed: {e}")
    finally:
        _loading = False


def load_all_models():
    """
    Load semua model dan data.
    Dipanggil lazy saat pertama kali predict dipanggil.
    """
    global _tokenizer, _bert_model, _gat_model
    global _train_embeddings, _train_labels, _train_texts_df
    global _train_edge_index

    print("\n--- Loading ML Models ---")

    # 1. Load IndoBERT tokenizer + model
    _load_indobert()

    # 2. Load GAT model
    _load_gat_model()

    # 3. Load train data (embeddings, labels, texts)
    _load_train_data()

    # 4. Build train graph edge_index
    _build_train_graph()

    print("--- ML Models Ready ---\n")


def _load_indobert():
    """Load IndoBERT tokenizer dan model fine-tuned."""
    global _tokenizer, _bert_model

    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification

    device = _get_device()
    model_name = Config.INDOBERT_MODEL_NAME
    finetuned_path = Config.INDOBERT_FINETUNED_PATH

    # Load tokenizer
    print(f"  Loading tokenizer: {model_name}")
    _tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Load model
    print(f"  Loading IndoBERT model...")
    _bert_model = AutoModelForSequenceClassification.from_pretrained(
        model_name, num_labels=2
    )

    # Load fine-tuned weights jika ada
    if os.path.exists(finetuned_path):
        print(f"  Loading fine-tuned weights: {finetuned_path}")
        _bert_model.load_state_dict(
            torch.load(finetuned_path, map_location=device, weights_only=True)
        )
        print("  OK - Fine-tuned IndoBERT loaded")
    else:
        print(f"  WARN - Fine-tuned weights not found: {finetuned_path}")
        print("  Using base IndoBERT (accuracy may be lower)")

    _bert_model.to(device)
    _bert_model.eval()


def _load_gat_model(model_path: str = None):
    """Load GAT model."""
    global _gat_model

    import torch
    from models.gat_model import GATBaseline

    device = _get_device()
    path = model_path or Config.GAT_MODEL_PATH
    if not os.path.exists(path):
        print(f"  WARN - GAT model not found: {path}")
        return

    print(f"  Loading GAT model: {path}")
    _gat_model = GATBaseline(**Config.GAT_DEFAULT_PARAMS)
    _gat_model.load_state_dict(
        torch.load(path, map_location=device, weights_only=True)
    )
    _gat_model.to(device)
    _gat_model.eval()
    print("  OK - GAT model loaded")


def _load_train_data():
    """Load train embeddings, labels, texts."""
    global _train_embeddings, _train_labels, _train_texts_df

    import numpy as np
    import pandas as pd

    emb_path = Config.TRAIN_EMBEDDINGS_PATH
    labels_path = Config.TRAIN_LABELS_PATH
    texts_path = Config.TRAIN_TEXTS_PATH

    if os.path.exists(emb_path):
        _train_embeddings = np.load(emb_path)
        print(f"  OK - Train embeddings: {_train_embeddings.shape}")
    else:
        print(f"  WARN - Train embeddings not found: {emb_path}")

    if os.path.exists(labels_path):
        _train_labels = np.load(labels_path)
        print(f"  OK - Train labels: {_train_labels.shape}")
    else:
        print(f"  WARN - Train labels not found: {labels_path}")

    if os.path.exists(texts_path):
        _train_texts_df = pd.read_csv(texts_path)
        print(f"  OK - Train texts: {len(_train_texts_df)} rows")
    else:
        print(f"  WARN - Train texts not found: {texts_path}")


def _build_train_graph():
    """Build k-NN graph dari train embeddings (sama dengan Colab)."""
    global _train_edge_index

    if _train_embeddings is None:
        print("  SKIP - Cannot build graph without embeddings")
        return

    from services.similarity import build_knn_graph
    print("  Building train graph (k=5, threshold=0.75)...")
    _train_edge_index = build_knn_graph(
        _train_embeddings,
        k=Config.GRAPH_K,
        threshold=Config.GRAPH_THRESHOLD,
    )
    print(f"  OK - Train graph: {_train_edge_index.shape[1]} edges")


def reload_gat_model(model_path: str):
    """Reload GAT model dari path baru (setelah admin aktifkan model)."""
    _load_gat_model(model_path)


def extract_embedding(text: str):
    """
    Ekstrak CLS embedding dari teks menggunakan IndoBERT fine-tuned.

    Args:
        text: teks yang sudah di-preprocess

    Returns:
        numpy array [768] atau None jika model belum di-load
    """
    import torch

    if _tokenizer is None or _bert_model is None:
        return None

    device = _get_device()
    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=Config.INDOBERT_MAX_LENGTH,
    ).to(device)

    with torch.no_grad():
        outputs = _bert_model.bert(**inputs)
        cls_embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()

    return cls_embedding[0]  # [768]


def predict(text: str) -> dict:
    """
    Pipeline prediksi lengkap.

    Args:
        text: teks yang sudah di-preprocess

    Returns:
        {
            "label": "HOAKS" | "VALID",
            "confidence": 0.87,
            "hoax_score": 0.87,
            "valid_score": 0.13,
            "similar_news": [
                {"text": "...", "label": "HOAKS", "similarity": 0.92, "rank": 1},
                ...
            ]
        }
    """
    import torch
    import numpy as np

    # Lazy load model jika belum di-load
    _ensure_models_loaded()

    # Cek apakah model sudah di-load
    if _gat_model is None or _train_embeddings is None:
        return {"error": "Model belum di-load. Pastikan artifacts tersedia."}

    device = _get_device()

    # Step 1: Extract embedding
    query_emb = extract_embedding(text)
    if query_emb is None:
        return {"error": "Gagal mengekstrak embedding. IndoBERT belum di-load."}

    # Step 2: Similarity search → top-3
    from services.similarity import cosine_similarity_search, build_edge_index_for_query
    similar = cosine_similarity_search(
        query_emb, _train_embeddings, top_k=3
    )

    # Step 3: Build edges (query ↔ train neighbors)
    query_edges = build_edge_index_for_query(
        query_emb, _train_embeddings,
        k=Config.GRAPH_K, threshold=Config.GRAPH_THRESHOLD,
    )

    # Step 4: Combine train graph + query edges
    combined_edge = torch.cat([
        _train_edge_index,
        torch.tensor(query_edges, dtype=torch.long).t().contiguous(),
    ], dim=1).to(device)

    # Step 5: Combine embeddings (train + query)
    combined_emb = np.vstack([_train_embeddings, query_emb.reshape(1, -1)])
    combined_x = torch.tensor(combined_emb, dtype=torch.float).to(device)

    # Step 6: Validasi edge index
    num_nodes = combined_x.size(0)
    mask = (combined_edge[0] < num_nodes) & (combined_edge[1] < num_nodes)
    combined_edge = combined_edge[:, mask]

    # Step 7: GAT inference
    _gat_model.eval()
    with torch.no_grad():
        logits = _gat_model(combined_x, combined_edge)
        probs = torch.softmax(logits, dim=1).cpu().numpy()

    # Query node = last node
    query_probs = probs[-1]  # [valid_prob, hoax_prob]
    valid_score = float(query_probs[0])
    hoax_score = float(query_probs[1])

    label = "HOAKS" if hoax_score > valid_score else "VALID"
    confidence = max(valid_score, hoax_score)

    # Step 8: Format similar news
    similar_news = []
    for i, sim_item in enumerate(similar):
        idx = sim_item["index"]
        sim_text = ""
        sim_label = ""

        if _train_texts_df is not None and idx < len(_train_texts_df):
            row = _train_texts_df.iloc[idx]
            sim_text = str(row.get("teks", ""))
            raw_label = row.get("label", -1)
            sim_label = "HOAKS" if int(raw_label) == 1 else "VALID"
        elif _train_labels is not None and idx < len(_train_labels):
            sim_label = "HOAKS" if _train_labels[idx] == 1 else "VALID"

        similar_news.append({
            "text": sim_text,
            "label": sim_label,
            "similarity": round(sim_item["similarity"] * 100, 2),
            "rank": i + 1,
        })

    return {
        "label": label,
        "confidence": round(confidence * 100, 2),
        "hoax_score": round(hoax_score * 100, 2),
        "valid_score": round(valid_score * 100, 2),
        "similar_news": similar_news,
    }


def get_active_model_name() -> str:
    """Return nama model yang sedang aktif."""
    if _gat_model is None:
        return "none"
    return os.path.basename(Config.GAT_MODEL_PATH)


def is_ready() -> bool:
    """Cek apakah semua model sudah di-load."""
    return all([
        _tokenizer is not None,
        _bert_model is not None,
        _gat_model is not None,
        _train_embeddings is not None,
    ])
