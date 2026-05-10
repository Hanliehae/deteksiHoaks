# ============================================
# routes/history.py — Riwayat Deteksi
# ============================================

from flask import request, jsonify
from routes import history_bp
from database import SessionLocal
from models.db_models import DetectionHistory, SimilarNews
from sqlalchemy import desc


@history_bp.route("/history", methods=["GET"])
def get_history():
    """
    GET /api/history?page=1&per_page=10&search=keyword
    Response: { items: [...], total, page, per_page, pages }
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "", type=str)

    db = SessionLocal()
    try:
        query = db.query(DetectionHistory)

        # Filter pencarian
        if search:
            query = query.filter(
                DetectionHistory.input_text.ilike(f"%{search}%") |
                DetectionHistory.input_headline.ilike(f"%{search}%")
            )

        # Hitung total
        total = query.count()
        pages = (total + per_page - 1) // per_page

        # Pagination + urutkan terbaru
        items = query.order_by(
            desc(DetectionHistory.created_at)
        ).offset(
            (page - 1) * per_page
        ).limit(per_page).all()

        return jsonify({
            "items": [
                {
                    "id": item.id,
                    "input_headline": item.input_headline,
                    "input_type": item.input_type,
                    "predicted_label": item.predicted_label,
                    "confidence": item.confidence,
                    "hoax_score": item.hoax_score,
                    "valid_score": item.valid_score,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                }
                for item in items
            ],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        }), 200
    finally:
        db.close()


@history_bp.route("/history/<int:history_id>", methods=["GET"])
def get_history_detail(history_id):
    """
    GET /api/history/<id>
    Response: detail deteksi lengkap + berita serupa
    """
    db = SessionLocal()
    try:
        item = db.query(DetectionHistory).filter(
            DetectionHistory.id == history_id
        ).first()

        if not item:
            return jsonify({"error": "Riwayat tidak ditemukan"}), 404

        # Ambil berita serupa
        similar = db.query(SimilarNews).filter(
            SimilarNews.detection_id == history_id
        ).order_by(SimilarNews.rank).all()

        return jsonify({
            "id": item.id,
            "input_text": item.input_text,
            "input_headline": item.input_headline,
            "input_url": item.input_url,
            "input_type": item.input_type,
            "preprocessed_text": item.preprocessed_text,
            "predicted_label": item.predicted_label,
            "confidence": item.confidence,
            "hoax_score": item.hoax_score,
            "valid_score": item.valid_score,
            "model_used": item.model_used,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "similar_news": [
                {
                    "id": s.id,
                    "text": s.text,
                    "label": s.label,
                    "similarity_score": s.similarity_score,
                    "rank": s.rank,
                }
                for s in similar
            ],
        }), 200
    finally:
        db.close()
