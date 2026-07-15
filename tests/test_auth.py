def test_register_success(client, db):
    response = client.post("/api/auth/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "token" in data
    assert data["user"]["email"] == "new@example.com"


def test_register_duplicate_email(client, db):
    client.post("/api/auth/register", json={
        "email": "dup@example.com",
        "username": "user1",
        "password": "password123",
    })
    response = client.post("/api/auth/register", json={
        "email": "dup@example.com",
        "username": "user2",
        "password": "password123",
    })
    assert response.status_code == 400
    assert "already registered" in response.get_json()["error"]


def test_register_short_password(client, db):
    response = client.post("/api/auth/register", json={
        "email": "short@example.com",
        "username": "shortpw",
        "password": "123",
    })
    assert response.status_code == 400


def test_login_success(client, db):
    client.post("/api/auth/register", json={
        "email": "login@example.com",
        "username": "loginuser",
        "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "token" in data


def test_login_invalid_credentials(client, db):
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_profile_requires_auth(client, db):
    response = client.get("/api/auth/profile")
    assert response.status_code == 401


def test_profile_authenticated(client, db, auth_headers):
    response = client.get("/api/auth/profile", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["user"]["email"] == "test@example.com"
