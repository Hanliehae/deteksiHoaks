# ============================================
# routes/admin.py — Dataset Management & Dashboard
# ============================================

from flask import request, jsonify
from routes import admin_bp
from utils.decorators import admin_required
from database import SessionLocal
from models.db_models import (
    UploadedDataset, DetectionHistory,
    TrainingSession, TrainedModel
)
from sqlalchemy import desc


@admin_bp.route("/dashboard", methods=["GET"])
@admin_required
def dashboard():
    """
    GET /api/admin/dashboard
    Response: statistik ringkasan sistem
    """
    db = SessionLocal()
    try:
        total_datasets = db.query(UploadedDataset).filter(
            UploadedDataset.status == "active"
        ).count()

        total_detections = db.query(DetectionHistory).count()
        total_trainings = db.query(TrainingSession).count()

        active_model = db.query(TrainedModel).filter(
            TrainedModel.is_active == True  # noqa: E712
        ).first()

        last_training = db.query(TrainingSession).order_by(
            desc(TrainingSession.started_at)
        ).first()

        return jsonify({
            "total_datasets": total_datasets,
            "total_detections": total_detections,
            "total_trainings": total_trainings,
            "active_model": {
                "id": active_model.id,
                "name": active_model.model_name,
                "accuracy": active_model.accuracy,
                "f1_score": active_model.f1_score,
                "activated_at": active_model.activated_at.isoformat() if active_model.activated_at else None,
            } if active_model else None,
            "last_training": {
                "id": last_training.id,
                "status": last_training.status,
                "started_at": last_training.started_at.isoformat() if last_training.started_at else None,
                "best_f1": last_training.best_f1,
            } if last_training else None,
        }), 200
    finally:
        db.close()


@admin_bp.route("/datasets", methods=["GET"])
@admin_required
def get_datasets():
    """GET /api/admin/datasets"""
    db = SessionLocal()
    try:
        datasets = db.query(UploadedDataset).filter(
            UploadedDataset.status == "active"
        ).order_by(desc(UploadedDataset.uploaded_at)).all()

        return jsonify({
            "datasets": [
                {
                    "id": ds.id,
                    "filename": ds.original_filename or ds.filename,
                    "total_rows": ds.total_rows,
                    "hoax_count": ds.hoax_count,
                    "valid_count": ds.valid_count,
                    "uploaded_at": ds.uploaded_at.isoformat() if ds.uploaded_at else None,
                    "status": ds.status,
                }
                for ds in datasets
            ]
        }), 200
    finally:
        db.close()


@admin_bp.route("/datasets", methods=["POST"])
@admin_required
def upload_dataset():
    """
    POST /api/admin/datasets
    Form-data: file (CSV/Excel)
    """
    if "file" not in request.files:
        return jsonify({"error": "Tidak ada file yang dikirim"}), 400

    file = request.files["file"]
    user_id = request.current_user.get("user_id")

    from services.dataset import save_dataset
    result = save_dataset(file, uploaded_by=user_id)

    if result["success"]:
        return jsonify(result), 201
    else:
        return jsonify({"error": result["error"]}), 400


@admin_bp.route("/datasets/<int:dataset_id>/preview", methods=["GET"])
@admin_required
def preview_dataset(dataset_id):
    """GET /api/admin/datasets/<id>/preview"""
    from services.dataset import get_dataset_preview
    result = get_dataset_preview(dataset_id)

    if "error" in result:
        return jsonify(result), 404

    return jsonify(result), 200


@admin_bp.route("/datasets/<int:dataset_id>/stats", methods=["GET"])
@admin_required
def dataset_stats(dataset_id):
    """
    GET /api/admin/datasets/<id>/stats
    Response: statistik dataset — distribusi label, panjang teks, top words
    """
    from services.dataset import load_dataset_dataframe
    from collections import Counter

    df = load_dataset_dataframe(dataset_id)
    if df is None:
        return jsonify({"error": "Dataset tidak ditemukan"}), 404

    # Deteksi kolom teks
    text_col = None
    for col in ["teks", "text", "content", "Teks"]:
        if col in df.columns:
            text_col = col
            break

    label_col = None
    for col in ["label", "Label", "labels"]:
        if col in df.columns:
            label_col = col
            break

    stats = {"total_rows": len(df)}

    # Distribusi label
    if label_col:
        label_dist = df[label_col].value_counts().to_dict()
        stats["label_distribution"] = {
            str(k): int(v) for k, v in label_dist.items()
        }

    # Statistik panjang teks
    if text_col:
        lengths = df[text_col].astype(str).str.split().str.len()
        stats["text_length"] = {
            "mean": round(float(lengths.mean()), 1),
            "min": int(lengths.min()),
            "max": int(lengths.max()),
            "median": round(float(lengths.median()), 1),
        }

        # Top 20 kata
        all_words = " ".join(df[text_col].astype(str).tolist()).lower().split()
        word_counts = Counter(all_words).most_common(20)
        stats["top_words"] = [
            {"word": w, "count": c} for w, c in word_counts
        ]

        # Rata-rata karakter
        char_lengths = df[text_col].astype(str).str.len()
        stats["char_length"] = {
            "mean": round(float(char_lengths.mean()), 1),
            "min": int(char_lengths.min()),
            "max": int(char_lengths.max()),
        }

        # ===== Analisis Kata per Kategori (heuristik) =====
        import re
        all_words_list = all_words  # sudah lowercase dari atas

        # Daftar stopword sederhana untuk exclude
        stopwords = {
            "yang", "dan", "di", "ke", "dari", "ini", "itu",
            "dengan", "untuk", "pada", "adalah", "dalam", "oleh",
            "juga", "atau", "akan", "ada", "bisa", "saya", "kita",
            "mereka", "dia", "ia", "se", "nya", "lah",
        }
        filtered = [w for w in all_words_list if w not in stopwords and len(w) > 2]
        word_freq = Counter(filtered)

        # Kata keterangan (adverbia) — daftar tetap
        adverbia_list = {
            "tidak", "sangat", "sudah", "belum", "masih", "akan",
            "pernah", "selalu", "sering", "jarang", "segera", "hampir",
            "justru", "bahkan", "hanya", "semakin", "terlalu", "cukup",
            "memang", "mungkin", "tentu", "pasti", "agak", "lagi",
        }

        # Klasifikasi heuristik
        kata_kerja = []
        kata_benda = []
        kata_sifat = []
        kata_keterangan = []

        for word, count in word_freq.most_common(200):
            if word in adverbia_list:
                kata_keterangan.append({"word": word, "count": count})
            elif re.match(r"^(me|mem|men|meny|meng|ber|di|ter|per)", word) and len(word) > 4:
                kata_kerja.append({"word": word, "count": count})
            elif re.match(r"^(pe|pen|pem|peng|peny|per|ke)", word) and (
                word.endswith("an") or word.endswith("nya")
            ):
                kata_benda.append({"word": word, "count": count})
            elif (word.endswith("nya") or word.endswith("is") or
                  word.endswith("al") or word.endswith("if")):
                kata_sifat.append({"word": word, "count": count})

        # Kata benda tambahan: kata tanpa prefix yang umum sebagai nomina
        nomina_common = {
            "presiden", "menteri", "pemerintah", "rakyat", "negara",
            "partai", "polisi", "uang", "dana", "hukum", "anggota",
            "pasal", "wakil", "ketua", "jenderal", "gubernur",
            "bupati", "walikota", "calon", "pemilu", "pilkada",
        }
        for word in nomina_common:
            if word in word_freq and not any(
                w["word"] == word for w in kata_benda
            ):
                kata_benda.append({
                    "word": word, "count": word_freq[word]
                })

        # Sort tiap kategori by count, limit 20
        kata_kerja.sort(key=lambda x: x["count"], reverse=True)
        kata_benda.sort(key=lambda x: x["count"], reverse=True)
        kata_sifat.sort(key=lambda x: x["count"], reverse=True)
        kata_keterangan.sort(key=lambda x: x["count"], reverse=True)

        stats["word_categories"] = {
            "kata_kerja": kata_kerja[:20],
            "kata_benda": kata_benda[:20],
            "kata_sifat": kata_sifat[:20],
            "kata_keterangan": kata_keterangan[:20],
        }

    return jsonify(stats), 200


@admin_bp.route("/datasets/<int:dataset_id>", methods=["DELETE"])
@admin_required
def delete_dataset(dataset_id):
    """DELETE /api/admin/datasets/<id>"""
    db = SessionLocal()
    try:
        dataset = db.query(UploadedDataset).filter(
            UploadedDataset.id == dataset_id
        ).first()

        if not dataset:
            return jsonify({"error": "Dataset tidak ditemukan"}), 404

        dataset.status = "archived"
        db.commit()

        return jsonify({"message": "Dataset berhasil dihapus"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
