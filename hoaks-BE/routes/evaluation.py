# ============================================
# routes/evaluation.py — Model Evaluation Metrics
# ============================================

import json
import os
from flask import jsonify
from routes import evaluation_bp
from utils.decorators import admin_required
from config import Config


@evaluation_bp.route("/metrics", methods=["GET"])
@admin_required
def get_metrics():
    """
    GET /api/evaluation/metrics
    Response: metrik evaluasi model aktif (dari metrics.json)
    """
    metrics_path = Config.METRICS_PATH

    if not os.path.exists(metrics_path):
        return jsonify({
            "error": "File metrics.json belum tersedia",
            "message": "Copy metrics.json dari Google Drive ke artifacts/"
        }), 404

    try:
        with open(metrics_path, "r") as f:
            metrics = json.load(f)

        return jsonify({"metrics": metrics}), 200
    except Exception as e:
        return jsonify({"error": f"Gagal membaca metrics: {str(e)}"}), 500
