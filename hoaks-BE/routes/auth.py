# ============================================
# routes/auth.py — Login & Logout
# ============================================

from flask import request, jsonify
from routes import auth_bp
from database import SessionLocal
from models.db_models import User
from utils.auth import verify_password, create_token, hash_password


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: {"username": "admin", "password": "password123"}
    Response: {"token": "...", "user": {"id": 1, "username": "admin"}}
    """
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({
            "error": "Username dan password wajib diisi"
        }), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.username == data["username"]
        ).first()

        if not user or not verify_password(data["password"], user.password_hash):
            return jsonify({
                "error": "Username atau password salah"
            }), 401

        token = create_token(user.id, user.username)

        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
            }
        }), 200
    finally:
        db.close()


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    Body: {"username": "admin", "password": "password123"}
    Hanya untuk setup awal — buat akun admin pertama.
    """
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({
            "error": "Username dan password wajib diisi"
        }), 400

    if len(data["password"]) < 6:
        return jsonify({
            "error": "Password minimal 6 karakter"
        }), 400

    db = SessionLocal()
    try:
        # Cek apakah username sudah ada
        existing = db.query(User).filter(
            User.username == data["username"]
        ).first()

        if existing:
            return jsonify({
                "error": "Username sudah digunakan"
            }), 409

        # Buat user baru
        user = User(
            username=data["username"],
            password_hash=hash_password(data["password"]),
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return jsonify({
            "message": "Admin berhasil dibuat",
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
            }
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
