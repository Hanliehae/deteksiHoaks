# ============================================
# app.py — Flask Application Entry Point
# ============================================
# Jalankan: python app.py
# ============================================

import os
import sys

# Fix encoding untuk Windows console
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import init_db
from routes import register_blueprints


def create_app():
    """Flask Application Factory."""

    app = Flask(__name__)
    app.config["SECRET_KEY"] = Config.SECRET_KEY

    # CORS — izinkan semua origin (development)
    CORS(app)

    # Fallback: tangani preflight OPTIONS secara eksplisit
    @app.after_request
    def after_request(response):
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        return response

    # Pastikan direktori yang dibutuhkan ada
    os.makedirs(Config.TRAINED_MODELS_DIR, exist_ok=True)
    os.makedirs(Config.UPLOAD_DIR, exist_ok=True)

    # Register semua blueprints (routes)
    register_blueprints(app)

    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        from services.inference import is_ready
        return jsonify({
            "status": "ok",
            "message": "HoaxPoliticsID Backend is running",
            "model_ready": is_ready(),
        }), 200

    # Endpoint untuk trigger model loading manual
    @app.route("/api/admin/load-models", methods=["POST"])
    def trigger_load_models():
        """POST /api/admin/load-models — Admin trigger model loading."""
        import threading
        from services.inference import is_ready, load_all_models

        if is_ready():
            return jsonify({"message": "Model sudah di-load", "ready": True}), 200

        def _load():
            try:
                load_all_models()
            except Exception as e:
                print(f"[WARN] Model loading failed: {e}")

        t = threading.Thread(target=_load, daemon=True)
        t.start()
        return jsonify({
            "message": "Model loading dimulai di background",
            "ready": False,
        }), 202

    # Inisialisasi database (buat tabel jika belum ada)
    with app.app_context():
        init_db()
        print("[OK] Database tables created/verified")

        # Migrasi: tambah kolom baru ke tabel yang sudah ada
        _run_migrations()

        # Buat akun admin default jika belum ada
        _create_default_admin()

    return app


def _run_migrations():
    """Tambah kolom baru ke tabel yang sudah ada (safe — skip jika sudah ada)."""
    from sqlalchemy import text
    from database import engine

    migrations = [
        # Tambah kolom model_name ke training_sessions
        "ALTER TABLE training_sessions ADD COLUMN model_name VARCHAR(100) DEFAULT ''",
    ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"[OK] Migration: {sql[:60]}...")
            except Exception:
                # Kolom sudah ada — skip
                pass


def _create_default_admin():
    """Buat akun admin default saat pertama kali startup."""
    from database import SessionLocal
    from models.db_models import User
    from utils.auth import hash_password

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            print("[OK] Default admin created (username: admin, password: admin123)")
        else:
            # Re-hash jika masih pakai bcrypt format (lambat di Windows)
            if admin.password_hash.startswith("$2b$") or admin.password_hash.startswith("$2a$"):
                admin.password_hash = hash_password("admin123")
                db.commit()
                print("[OK] Admin password re-hashed (bcrypt → werkzeug)")
            else:
                print("[OK] Admin user already exists")
    except Exception as e:
        db.rollback()
        print(f"[WARN] Error creating default admin: {e}")
    finally:
        db.close()


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    app = create_app()

    print("=" * 50)
    print("  HoaxPoliticsID Backend")
    print("=" * 50)
    print(f"  URL  : http://localhost:5000")
    print(f"  DB   : {Config.DATABASE_URL[:50]}...")
    print(f"  CORS : {Config.CORS_ORIGINS[:80]}...")
    print("=" * 50)

    # TIDAK load model saat startup.
    # Model akan di-load secara lazy saat pertama kali /predict dipanggil,
    # atau admin bisa trigger manual via POST /api/admin/load-models.
    # Ini memastikan server langsung responsif untuk login, dashboard, dll.
    print("[INFO] Server siap menerima request.")
    print("[INFO] Model ML akan di-load saat pertama kali predict dipanggil.")
    print("[INFO] Atau trigger manual: POST /api/admin/load-models")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=True,
    )
