# ============================================
# database.py — SQLAlchemy Engine & Session
# ============================================

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import Config

# SQLite tidak mendukung pool_size/max_overflow
_is_sqlite = Config.DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        Config.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        Config.DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=Config.DEBUG,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency: buka session, otomatis tutup setelah selesai."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Buat semua tabel jika belum ada."""
    import models.db_models  # noqa: F401 — trigger model registration
    Base.metadata.create_all(bind=engine)
