# ============================================
# config.py — Environment Variables
# ============================================

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Konfigurasi aplikasi dari environment variables."""

    # Database
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/hoax_politics_db"
    )

    # JWT
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "ganti-dengan-secret-key-yang-aman"
    )
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Model paths
    MODEL_DIR = os.getenv("MODEL_DIR", "artifacts")
    INDOBERT_MODEL_NAME = os.getenv(
        "INDOBERT_MODEL_NAME",
        "indobenchmark/indobert-base-p1"
    )

    # File paths (relatif ke MODEL_DIR)
    GAT_MODEL_PATH = os.path.join(MODEL_DIR, "gat_model.pt")
    INDOBERT_FINETUNED_PATH = os.path.join(MODEL_DIR, "indobert_finetuned.pt")
    TRAIN_EMBEDDINGS_PATH = os.path.join(MODEL_DIR, "train_embeddings.npy")
    TRAIN_LABELS_PATH = os.path.join(MODEL_DIR, "train_labels.npy")
    TRAIN_TEXTS_PATH = os.path.join(MODEL_DIR, "train_texts.csv")
    METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

    # Directories
    TRAINED_MODELS_DIR = "trained_models"
    UPLOAD_DIR = os.path.join("uploads", "datasets")

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173")

    # Flask
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    # GAT defaults (sesuai Colab)
    GAT_DEFAULT_PARAMS = {
        "in_dim": 768,
        "hidden_dim": 128,
        "out_dim": 2,
        "heads": 4,
        "dropout": 0.3,
    }

    # Graph construction defaults (sesuai Colab)
    GRAPH_K = 5
    GRAPH_THRESHOLD = 0.75

    # IndoBERT defaults (sesuai Colab)
    INDOBERT_MAX_LENGTH = 256
    INDOBERT_BATCH_SIZE = 16
