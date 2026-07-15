import os
import pytest

from app import create_app
from app.extensions import db as _db
from app.models.user import User
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


@pytest.fixture(scope="function")
def auth_headers(client, db):
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "password123",
    })
    data = response.get_json()
    token = data["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def sample_user(db):
    user = User(email="sample@example.com", username="sampleuser")
    user.set_password("password123")
    db.session.add(user)
    db.session.commit()
    return user
