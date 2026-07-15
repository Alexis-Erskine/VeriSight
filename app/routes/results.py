from flask import Blueprint, request, jsonify, send_file

from app.extensions import db
from app.models.analysis_result import AnalysisResult
from app.models.uploaded_video import UploadedVideo
from app.services.pdf_report import generate_report

results_bp = Blueprint("results", __name__)


@results_bp.route("", methods=["GET"])
def list_results():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    per_page = min(per_page, 100)

    status_filter = request.args.get("status")

    query = AnalysisResult.query

    if status_filter:
        query = query.filter(AnalysisResult.status == status_filter)

    query = query.order_by(AnalysisResult.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "results": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }), 200


@results_bp.route("/<analysis_id>", methods=["GET"])
def get_result(analysis_id):
    result = AnalysisResult.query.filter(AnalysisResult.id == analysis_id).first()

    if not result:
        return jsonify({"error": "Analysis not found"}), 404

    return jsonify(result.to_dict()), 200


@results_bp.route("/<analysis_id>/download", methods=["GET"])
def download_report(analysis_id):
    result = AnalysisResult.query.filter(AnalysisResult.id == analysis_id).first()

    if not result:
        return jsonify({"error": "Analysis not found"}), 404

    pdf_buffer = generate_report(result.to_dict())

    safe_name = result.filename.rsplit(".", 1)[0] if result.filename else "report"
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{safe_name}_verisight_report.pdf",
    )


@results_bp.route("/<analysis_id>", methods=["DELETE"])
def delete_result(analysis_id):
    result = AnalysisResult.query.filter(AnalysisResult.id == analysis_id).first()

    if not result:
        return jsonify({"error": "Analysis not found"}), 404

    video = UploadedVideo.query.get(result.video_id)
    if video:
        db.session.delete(video)

    db.session.commit()

    return jsonify({"message": "Analysis deleted"}), 200
