# ============================================
# services/dataset.py — Dataset Management
# ============================================

import os
import uuid
from datetime import datetime
import pandas as pd
from config import Config
from database import SessionLocal
from models.db_models import UploadedDataset


ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}
REQUIRED_COLUMNS = {"teks", "label"}


def allowed_file(filename: str) -> bool:
    """Cek apakah ekstensi file diperbolehkan."""
    return "." in filename and \
        filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_dataset(file_path: str) -> dict:
    """
    Validasi file dataset.

    Returns:
        {"valid": True/False, "message": "...", "preview": [...], "stats": {...}}
    """
    try:
        # Baca file
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        # Cek kolom yang dibutuhkan
        missing = REQUIRED_COLUMNS - set(df.columns)
        if missing:
            return {
                "valid": False,
                "message": f"Kolom yang dibutuhkan tidak ditemukan: {missing}. "
                           f"Dataset harus memiliki kolom 'teks' dan 'label'. "
                           f"Kolom yang ada: {list(df.columns)}",
            }

        # Cek apakah ada data
        if len(df) == 0:
            return {
                "valid": False,
                "message": "Dataset kosong (0 baris data)",
            }

        # Cek nilai label (harus 0 atau 1)
        unique_labels = df["label"].unique()
        invalid_labels = [l for l in unique_labels if l not in [0, 1]]
        if invalid_labels:
            return {
                "valid": False,
                "message": f"Nilai label harus 0 (Valid) atau 1 (Hoaks). "
                           f"Ditemukan nilai tidak valid: {invalid_labels}",
            }

        # Cek missing values
        null_count = df[["teks", "label"]].isnull().sum()
        if null_count.any():
            return {
                "valid": False,
                "message": f"Terdapat data kosong: {null_count.to_dict()}",
            }

        # Stats
        total = len(df)
        hoax_count = int((df["label"] == 1).sum())
        valid_count = int((df["label"] == 0).sum())

        # Preview 10 baris pertama
        preview = df.head(10).to_dict(orient="records")

        return {
            "valid": True,
            "message": "Dataset valid",
            "stats": {
                "total_rows": total,
                "hoax_count": hoax_count,
                "valid_count": valid_count,
            },
            "preview": preview,
            "columns": list(df.columns),
        }

    except Exception as e:
        return {
            "valid": False,
            "message": f"Gagal membaca file: {str(e)}",
        }


def save_dataset(file, uploaded_by: int = None) -> dict:
    """
    Simpan dataset yang diupload admin.

    Args:
        file: FileStorage dari Flask request
        uploaded_by: user ID admin

    Returns:
        {"success": True, "dataset": {...}} atau {"success": False, "error": "..."}
    """
    if not file or not file.filename:
        return {"success": False, "error": "Tidak ada file yang diupload"}

    if not allowed_file(file.filename):
        return {
            "success": False,
            "error": f"Format file tidak didukung. Gunakan: {ALLOWED_EXTENSIONS}",
        }

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(Config.UPLOAD_DIR, unique_name)

    # Simpan file
    os.makedirs(Config.UPLOAD_DIR, exist_ok=True)
    file.save(file_path)

    # Validasi
    validation = validate_dataset(file_path)
    if not validation["valid"]:
        # Hapus file jika tidak valid
        os.remove(file_path)
        return {"success": False, "error": validation["message"]}

    # Simpan metadata ke database
    db = SessionLocal()
    try:
        dataset = UploadedDataset(
            filename=unique_name,
            original_filename=file.filename,
            file_path=file_path,
            total_rows=validation["stats"]["total_rows"],
            hoax_count=validation["stats"]["hoax_count"],
            valid_count=validation["stats"]["valid_count"],
            uploaded_by=uploaded_by,
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return {
            "success": True,
            "dataset": {
                "id": dataset.id,
                "filename": dataset.original_filename,
                "total_rows": dataset.total_rows,
                "hoax_count": dataset.hoax_count,
                "valid_count": dataset.valid_count,
                "uploaded_at": dataset.uploaded_at.isoformat(),
            },
            "preview": validation["preview"],
        }

    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


def get_dataset_preview(dataset_id: int, rows: int = 10) -> dict:
    """Ambil preview baris pertama dari dataset."""
    db = SessionLocal()
    try:
        dataset = db.query(UploadedDataset).filter(
            UploadedDataset.id == dataset_id
        ).first()

        if not dataset:
            return {"error": "Dataset tidak ditemukan"}

        if not os.path.exists(dataset.file_path):
            return {"error": "File dataset tidak ditemukan di server"}

        if dataset.file_path.endswith(".csv"):
            df = pd.read_csv(dataset.file_path)
        else:
            df = pd.read_excel(dataset.file_path)

        preview = df.head(rows).to_dict(orient="records")

        return {
            "dataset": {
                "id": dataset.id,
                "filename": dataset.original_filename,
                "total_rows": dataset.total_rows,
            },
            "columns": list(df.columns),
            "preview": preview,
        }

    finally:
        db.close()


def load_dataset_dataframe(dataset_id: int) -> pd.DataFrame | None:
    """Load dataset sebagai DataFrame (dipakai oleh training service)."""
    db = SessionLocal()
    try:
        dataset = db.query(UploadedDataset).filter(
            UploadedDataset.id == dataset_id
        ).first()

        if not dataset or not os.path.exists(dataset.file_path):
            return None

        if dataset.file_path.endswith(".csv"):
            return pd.read_csv(dataset.file_path)
        else:
            return pd.read_excel(dataset.file_path)
    finally:
        db.close()
