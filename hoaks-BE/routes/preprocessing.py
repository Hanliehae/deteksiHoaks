# ============================================
# routes/preprocessing.py — Demo Preprocessing
# ============================================

from flask import request, jsonify
from routes import preprocessing_bp
from utils.decorators import admin_required
from services.preprocessing import preprocess_with_steps


@preprocessing_bp.route("/preprocess", methods=["POST"])
@admin_required
def demo_preprocess():
    """
    POST /api/admin/preprocess
    Body: {"text": "Teks yang ingin di-preprocessing"}
    Response: output tiap tahap preprocessing
    """
    data = request.get_json()

    if not data or not data.get("text"):
        return jsonify({"error": "Teks wajib diisi"}), 400

    text = data["text"]
    result = preprocess_with_steps(text)

    return jsonify(result), 200


@preprocessing_bp.route("/tokenize", methods=["POST"])
@admin_required
def demo_tokenize():
    """
    POST /api/admin/tokenize
    Body: {"text": "Teks yang sudah di-preprocess"}
    Response: token IDs, decoded tokens, statistik
    """
    data = request.get_json()

    if not data or not data.get("text"):
        return jsonify({"error": "Teks wajib diisi"}), 400

    text = data["text"]

    try:
        from services.inference import _tokenizer
        if _tokenizer is None:
            return jsonify({
                "error": "Tokenizer belum di-load. Pastikan backend sudah startup."
            }), 503

        # Tokenisasi
        encoded = _tokenizer(
            text,
            truncation=True,
            padding=False,
            max_length=128,
            return_attention_mask=False,
        )

        token_ids = encoded["input_ids"]
        tokens = _tokenizer.convert_ids_to_tokens(token_ids)

        # Decode per token untuk display
        decoded_tokens = []
        for tid, tok in zip(token_ids, tokens):
            decoded_tokens.append({
                "id": tid,
                "token": tok,
                "is_special": tok in _tokenizer.all_special_tokens,
            })

        return jsonify({
            "original_text": text,
            "total_tokens": len(tokens),
            "tokens": decoded_tokens,
            "token_ids": token_ids,
            "vocab_size": _tokenizer.vocab_size,
            "model_name": "indobenchmark/indobert-base-p1",
        }), 200

    except Exception as e:
        return jsonify({"error": f"Tokenisasi gagal: {str(e)}"}), 500
