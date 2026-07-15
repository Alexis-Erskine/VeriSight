import os
import logging
from logging.handlers import RotatingFileHandler

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()


def create_app(config_name=None):
    app = Flask(__name__)

    app_config = os.getenv("FLASK_ENV", "development")
    if config_name:
        app_config = config_name

    if app_config == "production":
        app.config.from_object("app.config.ProductionConfig")
        from app.config import ProductionConfig
        app.config["SQLALCHEMY_DATABASE_URI"] = ProductionConfig.get_database_uri()
        _init_production_static(app)
    elif app_config == "testing":
        app.config.from_object("app.config.TestingConfig")
    else:
        app.config.from_object("app.config.DevelopmentConfig")

    CORS(app)
    configure_logging(app)
    _ensure_upload_dir(app)

    from app.extensions import db, migrate, bcrypt
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)

    register_blueprints(app)
    register_error_handlers(app)
    register_shell_context(app)
    register_template_context(app)

    with app.app_context():
        if not app.config.get("TESTING"):
            _init_detector(app)

    return app


def _init_detector(app):
    try:
        from app.ml.model import XceptionDeepFakeDetector
        detector = XceptionDeepFakeDetector()
        app.config["DETECTOR"] = detector
        app.logger.info("Deepfake detector loaded successfully")
    except ImportError as e:
        app.logger.warning(
            "Deepfake detector not available (%s). Video uploads will fail "
            "until torch/timm are installed.",
            e,
        )


def _init_production_static(app):
    try:
        from whitenoise import WhiteNoise
        static_root = os.path.join(app.root_path, "static")
        app.wsgi_app = WhiteNoise(app.wsgi_app, root=static_root, prefix="static/")
        app.logger.info("WhiteNoise enabled for static file serving")
    except ImportError:
        app.logger.warning("WhiteNoise not installed; static files served by Flask")


def _ensure_upload_dir(app):
    upload_folder = app.config.get("UPLOAD_FOLDER", "uploads")
    os.makedirs(upload_folder, exist_ok=True)


def configure_logging(app):
    if not app.debug and not app.config.get("TESTING"):
        os.makedirs("logs", exist_ok=True)
        handler = RotatingFileHandler(
            "logs/verisight.log", maxBytes=1024 * 1024 * 5, backupCount=5
        )
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
        )
        handler.setFormatter(formatter)
        app.logger.addHandler(handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info("VeriSight starting up")


def register_blueprints(app):
    from app.routes.auth import auth_bp
    from app.routes.videos import videos_bp
    from app.routes.results import results_bp
    from app.routes.frontend import frontend_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(videos_bp, url_prefix="/api/videos")
    app.register_blueprint(results_bp, url_prefix="/api/results")
    app.register_blueprint(frontend_bp)


def register_error_handlers(app):
    from flask import jsonify

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "message": str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"error": "File too large"}), 413

    @app.errorhandler(422)
    def unprocessable_entity(error):
        return jsonify({"error": "Unprocessable entity", "message": str(error)}), 422

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify({"error": "Too many requests"}), 429

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Server error: {error}")
        return jsonify({"error": "Internal server error"}), 500


def register_shell_context(app):
    @app.shell_context_processor
    def make_shell_context():
        from app.models.user import User
        from app.models.uploaded_video import UploadedVideo
        from app.models.analysis_result import AnalysisResult
        from app.extensions import db
        return {
            "db": db,
            "User": User,
            "UploadedVideo": UploadedVideo,
            "AnalysisResult": AnalysisResult,
        }


def register_template_context(app):
    from datetime import datetime, timezone

    @app.context_processor
    def inject_template_globals():
        return {"now": lambda: datetime.now(timezone.utc)}
