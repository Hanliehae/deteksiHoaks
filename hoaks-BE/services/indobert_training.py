# ============================================
# services/indobert_training.py — IndoBERT Fine-tuning
# ============================================
# Berdasarkan kode Colab yang sudah berhasil.
# Fine-tune layer tertentu dari IndoBERT, monitor val accuracy.
# ============================================

import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from config import Config
from services.preprocessing import preprocess_text


class HoaxDataset(Dataset):
    """Dataset untuk fine-tuning IndoBERT (sama dengan Colab)."""

    def __init__(self, texts, labels, tokenizer, max_len=256):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        inp = self.tokenizer(
            str(self.texts[idx]), truncation=True,
            padding='max_length', max_length=self.max_len,
            return_tensors='pt'
        )
        return {
            'input_ids': inp['input_ids'].flatten(),
            'attention_mask': inp['attention_mask'].flatten(),
            'label': torch.tensor(self.labels[idx], dtype=torch.long)
        }


def run_indobert_finetuning(
    session_id, dataset_id, unfreeze_layers, max_length,
    batch_size, learning_rate, epochs, status_store
):
    """
    Fine-tune IndoBERT per-layer (sama alurnya dengan Colab).

    Args:
        session_id: ID sesi (untuk update status)
        dataset_id: ID dataset dari DB
        unfreeze_layers: list layer yang di-unfreeze [8, 9, 10, 11]
        max_length: max sequence length (256)
        batch_size: batch size (16)
        learning_rate: learning rate (2e-5)
        epochs: jumlah epoch (3)
        status_store: dict untuk update status real-time
    """
    device = torch.device("cpu")

    def update_status(**kwargs):
        status_store[session_id].update(kwargs)

    try:
        # Step 1: Load dataset
        update_status(current_step="Memuat dataset...", progress=5)

        from services.dataset import load_dataset_dataframe
        df = load_dataset_dataframe(dataset_id)
        if df is None:
            update_status(status="failed", current_step="Dataset tidak ditemukan")
            return

        texts = df["teks"].tolist()
        labels = df["label"].values

        # Step 2: Split data (70:15:15 seperti Colab)
        update_status(current_step="Splitting data (70:15:15)...", progress=10)

        train_texts, temp_texts, train_labels, temp_labels = train_test_split(
            texts, labels, test_size=0.30, random_state=42, stratify=labels
        )
        val_texts, _, val_labels, _ = train_test_split(
            temp_texts, temp_labels, test_size=0.50, random_state=42, stratify=temp_labels
        )

        update_status(
            current_step=f"Train: {len(train_texts)}, Val: {len(val_texts)} data",
            progress=15
        )

        # Step 3: Load IndoBERT
        update_status(current_step="Memuat IndoBERT model...", progress=20)

        from transformers import AutoTokenizer, AutoModelForSequenceClassification

        MODEL_NAME = "indobenchmark/indobert-base-p1"
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        bert_model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME, num_labels=2
        ).to(device)

        # Step 4: Freeze/unfreeze layers
        update_status(
            current_step=f"Mengkonfigurasi layer (unfreeze: {unfreeze_layers})...",
            progress=25
        )

        for name, param in bert_model.bert.named_parameters():
            param.requires_grad = any(
                f'encoder.layer.{i}' in name for i in unfreeze_layers
            )

        trainable = sum(p.numel() for p in bert_model.parameters() if p.requires_grad)
        total_p = sum(p.numel() for p in bert_model.parameters())

        update_status(
            current_step=f"Parameter: {trainable:,} / {total_p:,} dilatih ({100*trainable/total_p:.1f}%)",
            progress=30
        )

        # Step 5: Siapkan DataLoader
        train_loader = DataLoader(
            HoaxDataset(train_texts, train_labels, tokenizer, max_length),
            batch_size=batch_size, shuffle=True
        )
        val_loader = DataLoader(
            HoaxDataset(val_texts, val_labels, tokenizer, max_length),
            batch_size=batch_size, shuffle=False
        )

        # Step 6: Optimizer + scheduler (sama dengan Colab)
        from transformers import get_linear_schedule_with_warmup

        optimizer = torch.optim.AdamW(
            bert_model.parameters(), lr=learning_rate, weight_decay=0.01
        )
        total_steps = len(train_loader) * epochs
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=int(0.1 * total_steps),
            num_training_steps=total_steps
        )

        # Step 7: Fine-tuning loop
        best_val_acc = 0
        epoch_results = []

        for epoch in range(epochs):
            # Training
            bert_model.train()
            total_loss = 0
            batch_count = len(train_loader)

            for batch_idx, batch in enumerate(train_loader):
                ids = batch['input_ids'].to(device)
                mask = batch['attention_mask'].to(device)
                lbls = batch['label'].to(device)

                optimizer.zero_grad()
                out = bert_model(ids, attention_mask=mask, labels=lbls)
                out.loss.backward()
                optimizer.step()
                scheduler.step()
                total_loss += out.loss.item()

                # Update progress per batch
                if (batch_idx + 1) % max(1, batch_count // 5) == 0:
                    epoch_progress = 30 + int(60 * ((epoch * batch_count + batch_idx + 1) / (epochs * batch_count)))
                    update_status(
                        current_step=f"Epoch {epoch+1}/{epochs} — Batch {batch_idx+1}/{batch_count}",
                        progress=epoch_progress
                    )

            # Validation
            bert_model.eval()
            val_preds = []
            with torch.no_grad():
                for batch in val_loader:
                    ids = batch['input_ids'].to(device)
                    mask = batch['attention_mask'].to(device)
                    out = bert_model(ids, attention_mask=mask)
                    val_preds.extend(out.logits.argmax(1).cpu().numpy())

            val_acc = accuracy_score(val_labels, val_preds)
            avg_loss = total_loss / batch_count
            is_best = val_acc > best_val_acc

            if is_best:
                best_val_acc = val_acc
                # Simpan model terbaik
                save_dir = os.path.join(Config.TRAINED_MODELS_DIR, "indobert_finetuned")
                os.makedirs(save_dir, exist_ok=True)
                torch.save(bert_model.state_dict(), os.path.join(save_dir, "model.pt"))

            epoch_result = {
                "epoch": epoch + 1,
                "loss": round(avg_loss, 4),
                "val_accuracy": round(val_acc, 4),
                "is_best": is_best,
            }
            epoch_results.append(epoch_result)

            update_status(
                current_step=f"Epoch {epoch+1}: Loss={avg_loss:.4f}, Val Acc={val_acc:.4f}" + (" ★" if is_best else ""),
                epoch_results=epoch_results,
                best_val_accuracy=round(best_val_acc, 4),
            )

        # Selesai
        update_status(
            status="completed",
            progress=100,
            current_step=f"Fine-tuning selesai! Best Val Acc: {best_val_acc:.4f}",
        )

    except Exception as e:
        update_status(
            status="failed",
            current_step=f"Error: {str(e)}",
            error=str(e),
        )
