import os
import uuid

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.uploaded_video import UploadedVideo
from app.models.analysis_result import AnalysisResult
from app.services.video_service import VideoService
from app.services.detection_service import DetectionService

videos_bp = Blueprint("videos", __name__)


@videos_bp.route("/upload", methods=["POST"])
def upload_video():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]

    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    video_service = VideoService()

    try:
        video_service.validate_video(file)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    original_filename = secure_filename(file.filename)
    unique_id = str(uuid.uuid4())
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "mp4"
    stored_filename = f"{unique_id}.{ext}"
    file_path = os.path.join(upload_folder, stored_filename)

    file.seek(0)
    file.save(file_path)
    file_size = os.path.getsize(file_path)

    uploaded_video = UploadedVideo(
        filename=stored_filename,
        original_filename=original_filename,
        file_size=file_size,
        file_path=file_path,
        mime_type=file.content_type,
    )
    db.session.add(uploaded_video)
    db.session.flush()

    analysis = AnalysisResult(
        video_id=uploaded_video.id,
        filename=original_filename,
        status="pending",
    )
    db.session.add(analysis)
    db.session.commit()

    try:
        result = DetectionService.run_analysis(
            file_path=file_path,
            analysis_id=analysis.id,
            app=current_app._get_current_object(),
        )

        analysis.prediction = result["prediction"]
        analysis.confidence = result["confidence"]
        analysis.risk_level = AnalysisResult._compute_risk_level(result["prediction"])
        analysis.frames_analyzed = result["frames_analyzed"]
        analysis.total_frames = result["total_frames"]
        analysis.processing_time_ms = result["processing_time_ms"]
        analysis.status = "completed"
        analysis.completed_at = result["completed_at"]
        db.session.commit()

        return jsonify(analysis.to_dict()), 200

    except Exception as e:
        analysis.status = "failed"
        analysis.error_message = str(e)
        db.session.commit()
        current_app.logger.error(f"Analysis failed for {analysis.id}: {e}")
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500


@videos_bp.route("/<analysis_id>/status", methods=["GET"])
def get_status(analysis_id):
    result = AnalysisResult.query.filter(AnalysisResult.id == analysis_id).first()

    if not result:
        return jsonify({"error": "Analysis not found"}), 404

    return jsonify(result.to_dict()), 200
