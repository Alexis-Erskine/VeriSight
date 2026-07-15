from flask import Blueprint, request, jsonify, current_app
from flask_bcrypt import Bcrypt

from app.extensions import db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.auth_service import login_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    try:
        result = AuthService.register_user(email=email, username=username, password=password)
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    try:
        result = AuthService.login_user(email=email, password=password)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route("/profile", methods=["GET"])
@login_required
def profile(current_user):
    return jsonify({"user": current_user.to_dict()}), 200


@auth_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    username = data.get("username", "").strip()
    if username:
        existing = User.query.filter(User.username == username, User.id != current_user.id).first()
        if existing:
            return jsonify({"error": "Username already taken"}), 409
        current_user.username = username

    db.session.commit()
    return jsonify({"user": current_user.to_dict()}), 200
