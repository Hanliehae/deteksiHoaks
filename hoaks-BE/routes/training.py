# ============================================
# routes/training.py — Training Endpoints
# ============================================

from flask import request, jsonify
from routes import training_bp
from utils.decorators import admin_required
from database import SessionLocal
from models.db_models import TrainingSession, TrainingResult, TrainedModel
from sqlalchemy import desc
from datetime import datetime, timezone


@training_bp.route("/start", methods=["POST"])
@admin_required
def start_training():
    """
    POST /api/training/start
    Body: {
        "dataset_id": 1,
        "split_ratios": [0.7, 0.8, 0.9],
        "epochs": [10, 20, 30],
        "learning_rate": 0.001,
        "gat_params": {"heads": 4, "hidden_dim": 128, "dropout": 0.3}
    }
    """
    data = request.get_json()

    if not data or not data.get("dataset_id"):
        return jsonify({"error": "dataset_id wajib diisi"}), 400

    # Validasi dataset exists
    db = SessionLocal()
    try:
        from models.db_models import UploadedDataset
        dataset = db.query(UploadedDataset).filter(
            UploadedDataset.id == data["dataset_id"],
            UploadedDataset.status == "active",
        ).first()

        if not dataset:
            return jsonify({"error": "Dataset tidak ditemukan"}), 404

        # Cek apakah ada training yang sedang berjalan
        running = db.query(TrainingSession).filter(
            TrainingSession.status == "running"
        ).first()

        if running:
            return jsonify({
                "error": "Ada training yang sedang berjalan",
                "session_id": running.id,
            }), 409

        # Buat training session
        session = TrainingSession(
            dataset_id=data["dataset_id"],
            status="pending",
            progress=0,
            current_step="Menunggu dimulai...",
            split_ratios=data.get("split_ratios", [0.7, 0.8, 0.9]),
            epochs=data.get("epochs", [10, 20, 30]),
            learning_rate=data.get("learning_rate", 0.001),
            gat_params=data.get("gat_params", {}),
            model_name=data.get("model_name", ""),
            started_by=request.current_user.get("user_id"),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        session_id = session.id

        # Mulai training di background thread
        from services.training import start_training_async
        start_training_async(session_id)

        return jsonify({
            "message": "Training dimulai",
            "session_id": session_id,
        }), 202

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@training_bp.route("/status/<int:session_id>", methods=["GET"])
@admin_required
def get_training_status(session_id):
    """
    GET /api/training/status/<id>
    Frontend polling setiap 3 detik.
    """
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id
        ).first()

        if not session:
            return jsonify({"error": "Training session tidak ditemukan"}), 404

        return jsonify({
            "id": session.id,
            "status": session.status,
            "progress": session.progress,
            "current_step": session.current_step,
            "best_ratio": session.best_ratio,
            "best_epoch": session.best_epoch,
            "best_f1": session.best_f1,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "error_message": session.error_message,
        }), 200
    finally:
        db.close()


@training_bp.route("/results/<int:session_id>", methods=["GET"])
@admin_required
def get_training_results(session_id):
    """GET /api/training/results/<id> — tabel metrik per rasio per epoch"""
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id
        ).first()

        if not session:
            return jsonify({"error": "Training session tidak ditemukan"}), 404

        results = db.query(TrainingResult).filter(
            TrainingResult.session_id == session_id
        ).order_by(
            TrainingResult.split_ratio,
            TrainingResult.epoch
        ).all()

        return jsonify({
            "session": {
                "id": session.id,
                "status": session.status,
                "best_ratio": session.best_ratio,
                "best_epoch": session.best_epoch,
                "best_f1": session.best_f1,
                "learning_rate": session.learning_rate,
                "gat_params": session.gat_params,
            },
            "results": [
                {
                    "id": r.id,
                    "split_ratio": r.split_ratio,
                    "train_count": r.train_count,
                    "test_count": r.test_count,
                    "epoch": r.epoch,
                    "accuracy": r.accuracy,
                    "precision": r.precision_score,
                    "recall": r.recall,
                    "f1_score": r.f1_score,
                    "is_best": r.is_best,
                    "confusion_matrix": r.confusion_matrix,
                }
                for r in results
            ],
        }), 200
    finally:
        db.close()


@training_bp.route("/history", methods=["GET"])
@admin_required
def get_training_history():
    """GET /api/training/history"""
    db = SessionLocal()
    try:
        sessions = db.query(TrainingSession).order_by(
            desc(TrainingSession.started_at)
        ).all()

        return jsonify({
            "sessions": [
                {
                    "id": s.id,
                    "status": s.status,
                    "dataset_id": s.dataset_id,
                    "model_name": getattr(s, "model_name", ""),
                    "best_f1": s.best_f1,
                    "best_ratio": s.best_ratio,
                    "best_epoch": s.best_epoch,
                    "split_ratios": s.split_ratios,
                    "epochs": s.epochs,
                    "learning_rate": s.learning_rate,
                    "started_at": s.started_at.isoformat() if s.started_at else None,
                    "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                }
                for s in sessions
            ]
        }), 200
    finally:
        db.close()


@training_bp.route("/models", methods=["GET"])
@admin_required
def get_trained_models():
    """GET /api/training/models"""
    db = SessionLocal()
    try:
        models = db.query(TrainedModel).order_by(
            desc(TrainedModel.created_at)
        ).all()

        return jsonify({
            "models": [
                {
                    "id": m.id,
                    "model_name": m.model_name,
                    "accuracy": m.accuracy,
                    "f1_score": m.f1_score,
                    "is_active": m.is_active,
                    "activated_at": m.activated_at.isoformat() if m.activated_at else None,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in models
            ]
        }), 200
    finally:
        db.close()


@training_bp.route("/models/<int:model_id>/activate", methods=["POST"])
@admin_required
def activate_model(model_id):
    """POST /api/training/models/<id>/activate"""
    db = SessionLocal()
    try:
        model = db.query(TrainedModel).filter(
            TrainedModel.id == model_id
        ).first()

        if not model:
            return jsonify({"error": "Model tidak ditemukan"}), 404

        # Nonaktifkan semua model lain
        db.query(TrainedModel).update({"is_active": False})

        # Aktifkan model yang dipilih
        model.is_active = True
        model.activated_at = datetime.now(timezone.utc)
        db.commit()

        # Reload model ke memori
        from services.inference import reload_gat_model
        reload_gat_model(model.model_path)

        return jsonify({
            "message": f"Model '{model.model_name}' berhasil diaktifkan",
            "model": {
                "id": model.id,
                "model_name": model.model_name,
                "accuracy": model.accuracy,
                "f1_score": model.f1_score,
            }
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
