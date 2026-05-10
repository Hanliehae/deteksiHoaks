# ============================================
# utils/decorators.py — Route Decorators
# ============================================

from functools import wraps
from flask import request, jsonify
from utils.auth import decode_token


def admin_required(f):
    """
    Decorator: endpoint hanya bisa diakses admin dengan JWT valid.

    Cara pakai:
        @app.route('/api/admin/something')
        @admin_required
        def admin_endpoint():
            user_id = request.current_user['user_id']
            ...

    Token dikirim via header:
        Authorization: Bearer <token>
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Ambil token dari header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Token tidak ditemukan",
                "message": "Silakan login terlebih dahulu"
            }), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)

        if payload is None:
            return jsonify({
                "error": "Token tidak valid atau sudah expired",
                "message": "Silakan login ulang"
            }), 401

        # Simpan user info di request context
        request.current_user = payload
        return f(*args, **kwargs)

    return decorated
