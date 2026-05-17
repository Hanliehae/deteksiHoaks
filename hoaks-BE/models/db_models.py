# ============================================
# models/db_models.py — Database Tables (7 tabel)
# ============================================

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    """Tabel admin users untuk autentikasi."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="admin")
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    uploaded_datasets = relationship("UploadedDataset", back_populates="uploader")
    training_sessions = relationship("TrainingSession", back_populates="started_by_user")


class DetectionHistory(Base):
    """Riwayat deteksi hoaks oleh user biasa."""
    __tablename__ = "detection_history"

    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text, nullable=False)
    input_headline = Column(String(500))
    input_url = Column(String(500))
    input_type = Column(String(20))  # 'url', 'headline', 'full'
    preprocessed_text = Column(Text)
    predicted_label = Column(String(10))  # 'HOAKS' atau 'VALID'
    confidence = Column(Float)
    hoax_score = Column(Float)
    valid_score = Column(Float)
    model_used = Column(String(100))
    created_at = Column(DateTime, default=utcnow, index=True)

    # Relationships
    similar_news = relationship(
        "SimilarNews", back_populates="detection",
        cascade="all, delete-orphan"
    )


class SimilarNews(Base):
    """Berita serupa yang ditemukan dari similarity search."""
    __tablename__ = "similar_news"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(
        Integer, ForeignKey("detection_history.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    text = Column(Text, nullable=False)
    label = Column(String(10))  # 'HOAKS' atau 'VALID'
    similarity_score = Column(Float)
    rank = Column(Integer)  # 1, 2, 3

    # Relationships
    detection = relationship("DetectionHistory", back_populates="similar_news")


class UploadedDataset(Base):
    """Dataset yang diupload admin untuk training."""
    __tablename__ = "uploaded_datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    file_path = Column(String(500))
    total_rows = Column(Integer)
    hoax_count = Column(Integer)
    valid_count = Column(Integer)
    uploaded_by = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    uploaded_at = Column(DateTime, default=utcnow, index=True)
    status = Column(String(20), default="active")  # 'active', 'archived'

    # Relationships
    uploader = relationship("User", back_populates="uploaded_datasets")
    training_sessions = relationship("TrainingSession", back_populates="dataset")


class TrainingSession(Base):
    """Sesi training yang dijalankan admin."""
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(
        Integer, ForeignKey("uploaded_datasets.id"), nullable=False
    )
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    progress = Column(Float, default=0.0)  # 0.0 - 100.0
    current_step = Column(String(200))  # Pesan progress: "Rasio 70:30, epoch 10..."

    # Parameter training
    split_ratios = Column(JSON)  # [0.7, 0.8, 0.9]
    epochs = Column(JSON)  # [10, 20, 30]
    learning_rate = Column(Float, default=0.001)
    batch_size = Column(Integer, default=32)
    gat_params = Column(JSON)  # {"heads":4, "hidden_dim":128, "dropout":0.3}
    model_name = Column(String(100), default="")  # Nama model dari admin

    # Hasil terbaik
    best_ratio = Column(Float)
    best_epoch = Column(Integer)
    best_f1 = Column(Float)

    # Metadata
    started_by = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    started_at = Column(DateTime, default=utcnow, index=True)
    completed_at = Column(DateTime)
    error_message = Column(Text)

    # Relationships
    dataset = relationship("UploadedDataset", back_populates="training_sessions")
    started_by_user = relationship("User", back_populates="training_sessions")
    results = relationship(
        "TrainingResult", back_populates="session",
        cascade="all, delete-orphan"
    )
    models = relationship(
        "TrainedModel", back_populates="session",
        cascade="all, delete-orphan"
    )


class TrainingResult(Base):
    """Metrik per rasio per epoch dari sesi training."""
    __tablename__ = "training_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("training_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    split_ratio = Column(Float)  # 0.7, 0.8, 0.9
    train_count = Column(Integer)
    test_count = Column(Integer)
    epoch = Column(Integer)
    # Test metrics (evaluasi di data test)
    accuracy = Column(Float)
    precision_score = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    # Train metrics (evaluasi di data train — untuk deteksi overfitting)
    train_accuracy = Column(Float)
    train_precision = Column(Float)
    train_recall = Column(Float)
    train_f1 = Column(Float)
    is_best = Column(Boolean, default=False)
    confusion_matrix = Column(JSON)  # [[TP, FP], [FN, TN]]
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    session = relationship("TrainingSession", back_populates="results")
    trained_model = relationship("TrainedModel", back_populates="result", uselist=False)


class TrainedModel(Base):
    """Model yang dihasilkan dari training."""
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("training_sessions.id", ondelete="CASCADE"),
        nullable=False
    )
    result_id = Column(
        Integer, ForeignKey("training_results.id"), nullable=True
    )
    model_name = Column(String(100))
    model_path = Column(String(500))
    is_active = Column(Boolean, default=False, index=True)
    accuracy = Column(Float)
    f1_score = Column(Float)
    activated_at = Column(DateTime)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    session = relationship("TrainingSession", back_populates="models")
    result = relationship("TrainingResult", back_populates="trained_model")
