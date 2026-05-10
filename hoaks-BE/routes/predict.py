# ============================================
# routes/predict.py — Deteksi Hoaks
# ============================================

from flask import request, jsonify
from routes import predict_bp
from database import SessionLocal
from models.db_models import DetectionHistory, SimilarNews
from services.preprocessing import preprocess_text
from services import inference as inference_service


@predict_bp.route("/predict", methods=["POST"])
def predict():
    """
    POST /api/predict
    Body: {
        "url": "https://...",        (opsional)
        "headline": "Judul berita",  (opsional)
        "content": "Isi berita..."   (opsional)
    }
    Minimal salah satu field harus diisi.
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body kosong"}), 400

    url = data.get("url", "").strip()
    headline = data.get("headline", "").strip()
    content = data.get("content", "").strip()

    # Tentukan input type dan teks yang akan diproses
    input_type = "full"
    raw_text = content

    if url:
        input_type = "url"
        # Scrape URL dulu
        from services.scraper import scrape_url
        scraped = scrape_url(url)
        if "error" in scraped:
            return jsonify({"error": scraped["error"]}), 400
        headline = scraped.get("headline", headline)
        raw_text = scraped.get("content", "")
        if not raw_text:
            return jsonify({"error": "Tidak dapat mengekstrak konten dari URL"}), 400
    elif headline and not content:
        input_type = "headline"
        raw_text = headline
    elif not content and not headline:
        return jsonify({"error": "Masukkan URL, judul, atau isi berita"}), 400

    # Cek apakah model ready
    if not inference_service.is_ready():
        return jsonify({
            "error": "Model belum siap. Pastikan artifacts tersedia.",
            "model_ready": False,
        }), 503

    # Preprocess
    processed_text = preprocess_text(raw_text)

    if not processed_text:
        return jsonify({"error": "Teks terlalu pendek setelah preprocessing"}), 400

    # Prediksi
    result = inference_service.predict(processed_text)

    if "error" in result:
        return jsonify(result), 500

    # Simpan ke database
    db = SessionLocal()
    try:
        detection = DetectionHistory(
            input_text=raw_text[:2000],  # Limit panjang
            input_headline=headline[:500] if headline else None,
            input_url=url if url else None,
            input_type=input_type,
            preprocessed_text=processed_text[:2000],
            predicted_label=result["label"],
            confidence=result["confidence"],
            hoax_score=result["hoax_score"],
            valid_score=result["valid_score"],
            model_used=inference_service.get_active_model_name(),
        )
        db.add(detection)
        db.flush()

        # Simpan berita serupa
        for sim_news in result.get("similar_news", []):
            similar = SimilarNews(
                detection_id=detection.id,
                text=sim_news["text"][:2000] if sim_news.get("text") else "",
                label=sim_news.get("label", ""),
                similarity_score=sim_news.get("similarity", 0),
                rank=sim_news.get("rank", 0),
            )
            db.add(similar)

        db.commit()

        return jsonify({
            "id": detection.id,
            "label": result["label"],
            "confidence": result["confidence"],
            "hoax_score": result["hoax_score"],
            "valid_score": result["valid_score"],
            "preprocessed_text": processed_text[:500],
            "similar_news": result["similar_news"],
            "input_type": input_type,
            "headline": headline,
        }), 200

    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Gagal menyimpan hasil: {str(e)}"}), 500
    finally:
        db.close()
