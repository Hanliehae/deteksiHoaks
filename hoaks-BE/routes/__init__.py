# ============================================
# routes/__init__.py — Blueprint Registry
# ============================================

from flask import Blueprint

# Buat semua blueprints
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
predict_bp = Blueprint("predict", __name__, url_prefix="/api")
history_bp = Blueprint("history", __name__, url_prefix="/api")
scraper_bp = Blueprint("scraper", __name__, url_prefix="/api")
admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
training_bp = Blueprint("training", __name__, url_prefix="/api/training")
preprocessing_bp = Blueprint("preprocessing", __name__, url_prefix="/api/admin")
evaluation_bp = Blueprint("evaluation", __name__, url_prefix="/api/evaluation")


def register_blueprints(app):
    """Register semua blueprints ke Flask app."""
    # Import routes agar decorator @bp.route terdaftar
    import routes.auth  # noqa: F401
    import routes.predict  # noqa: F401
    import routes.history  # noqa: F401
    import routes.scraper  # noqa: F401
    import routes.admin  # noqa: F401
    import routes.training  # noqa: F401
    import routes.preprocessing  # noqa: F401
    import routes.evaluation  # noqa: F401

    app.register_blueprint(auth_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(scraper_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(training_bp)
    app.register_blueprint(preprocessing_bp)
    app.register_blueprint(evaluation_bp)
