from functools import wraps
from datetime import datetime, timedelta, timezone

import jwt
from flask import request, jsonify, current_app

from app.extensions import db, bcrypt
from app.models.user import User


class AuthService:

    @staticmethod
    def register_user(email, username, password):
        existing_user = User.query.filter(
            (User.email == email) | (User.username == username)
        ).first()

        if existing_user:
            if existing_user.email == email:
                raise ValueError("Email already registered")
            raise ValueError("Username already taken")

        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")

        if not username or len(username) < 2:
            raise ValueError("Username must be at least 2 characters")

        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise ValueError("Invalid email format")

        user = User(email=email, username=username)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        token = AuthService._generate_token(user.id)
        return {"user": user.to_dict(), "token": token}

    @staticmethod
    def login_user(email, password):
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("Account is deactivated")

        token = AuthService._generate_token(user.id)
        return {"user": user.to_dict(), "token": token}

    @staticmethod
    def _generate_token(user_id):
        payload = {
            "sub": user_id,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc)
            + timedelta(hours=current_app.config["JWT_EXPIRATION_HOURS"]),
        }
        return jwt.encode(
            payload, current_app.config["JWT_SECRET"], algorithm="HS256"
        )


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET"],
                algorithms=["HS256"],
            )
            current_user = db.session.get(User, payload["sub"])
            if not current_user or not current_user.is_active:
                return jsonify({"error": "Invalid authentication token"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authentication token"}), 401

        return f(current_user, *args, **kwargs)

    return decorated
