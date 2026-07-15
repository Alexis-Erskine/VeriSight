from flask import Blueprint, render_template

frontend_bp = Blueprint("frontend", __name__)


@frontend_bp.route("/")
def home():
    return render_template("index.html")


@frontend_bp.route("/upload")
def upload_page():
    return render_template("upload.html")


@frontend_bp.route("/results/<detection_id>")
def result_page(detection_id):
    return render_template("result.html", detection_id=detection_id)


@frontend_bp.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@frontend_bp.route("/login")
def login():
    return render_template("login.html")


@frontend_bp.route("/register")
def register():
    return render_template("register.html")


@frontend_bp.route("/about")
def about():
    return render_template("about.html")
