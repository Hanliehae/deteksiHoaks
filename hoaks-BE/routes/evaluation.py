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
    Response: metrik evaluasi model aktif dengan perbandingan train vs test
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

        # Hitung perbandingan training vs testing (4 kolom dospem)
        train_m = metrics.get("train_metrics", {})
        test_m = metrics.get("test_metrics", {})

        comparison = []
        metric_keys = [
            ("Accuracy", "accuracy"),
            ("Precision", "precision"),
            ("Recall", "recall"),
            ("F1-Score", "f1_score"),
            ("Macro Average", "macro_avg"),
            ("Weighted Average", "weighted_avg"),
            ("MCC", "mcc"),
            ("ROC-AUC", "roc_auc"),
        ]

        is_overfit = False
        for label, key in metric_keys:
            train_val = train_m.get(key)
            test_val = test_m.get(key)
            gap = None
            overfit = False

            if train_val is not None and test_val is not None:
                gap = round(abs(train_val - test_val), 4)
                # Untuk MCC dan ROC-AUC, threshold berbeda
                threshold = 0.05 if key not in ("mcc", "roc_auc") else 0.1
                overfit = gap > threshold
                if overfit:
                    is_overfit = True

            comparison.append({
                "label": label,
                "key": key,
                "train": train_val,
                "test": test_val,
                "gap": gap,
                "is_overfit": overfit,
            })

        return jsonify({
            "metrics": metrics,
            "comparison": comparison,
            "is_overfit": is_overfit,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Gagal membaca metrics: {str(e)}"}), 500
