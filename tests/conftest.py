import os
import pytest

from app import create_app
from app.extensions import db as _db
from app.models.uploaded_video import UploadedVideo
from app.models.analysis_result import AnalysisResult


@pytest.fixture(scope="session")
def app():
    os.environ["FLASK_ENV"] = "testing"
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(scope="function")
def db(app):
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture(scope="function")
def client(app):
    return app.test_client()
