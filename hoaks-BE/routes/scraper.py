# ============================================
# routes/scraper.py — Ekstrak Teks dari URL
# ============================================

from flask import request, jsonify
from routes import scraper_bp
from services.scraper import scrape_url


@scraper_bp.route("/scrape", methods=["POST"])
def scrape():
    """
    POST /api/scrape
    Body: {"url": "https://..."}
    Response: {"headline": "...", "content": "...", "source": "..."}
    """
    data = request.get_json()

    if not data or not data.get("url"):
        return jsonify({"error": "URL wajib diisi"}), 400

    url = data["url"].strip()

    # Validasi URL format
    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "URL harus dimulai dengan http:// atau https://"}), 400

    result = scrape_url(url)

    if "error" in result:
        return jsonify(result), 400

    return jsonify(result), 200
