import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def _recommendations(prediction, risk_level):
    score = prediction or 0
    is_deepfake = score > 0.5
    if is_deepfake:
        return (
            "This video shows strong indicators of AI-generated manipulation. "
            "Exercise caution before sharing or acting on this content. "
            "Verify the content through independent sources and look for "
            "the original video or official statements from the purported source. "
            "If this video targets individuals or spreads misinformation, "
            "consider reporting it to relevant platforms or authorities."
        )
    return (
        "No significant deepfake indicators were detected. "
        "The video appears to be authentic based on our analysis. "
        "While this video appears authentic, always practice critical "
        "media consumption as deepfake technology continues to evolve."
    )


def generate_report(result_dict):
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=25*mm,
        bottomMargin=20*mm,
        leftMargin=22*mm,
        rightMargin=22*mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=26,
        leading=32,
        textColor=colors.HexColor("#0a0e17"),
        spaceAfter=4*mm,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_CENTER,
        spaceAfter=10*mm,
        fontName="Helvetica",
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#0a0e17"),
        spaceBefore=8*mm,
        spaceAfter=4*mm,
        fontName="Helvetica-Bold",
    )

    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=1*mm,
        fontName="Helvetica",
    )

    value_style = ParagraphStyle(
        "Value",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#0a0e17"),
        spaceAfter=3*mm,
        fontName="Helvetica-Bold",
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#334155"),
        fontName="Helvetica",
        alignment=TA_LEFT,
    )

    score = result_dict.get("prediction") or 0
    confidence = result_dict.get("confidence") or 0
    is_deepfake = score > 0.5
    risk = result_dict.get("risk_level") or "unknown"

    if risk == "critical" or score >= 0.8:
        risk_color = colors.HexColor("#ef4444")
    elif risk == "high" or score >= 0.6:
        risk_color = colors.HexColor("#f59e0b")
    elif risk == "medium" or score >= 0.3:
        risk_color = colors.HexColor("#3b82f6")
    else:
        risk_color = colors.HexColor("#10b981")

    prediction_text = "Deepfake Detected" if is_deepfake else "Authentic"
    prediction_color = colors.HexColor("#ef4444") if is_deepfake else colors.HexColor("#10b981")
    confidence_pct = f"{confidence * 100:.1f}%"
    score_pct = f"{score * 100:.1f}%"
    risk_label = risk.upper() if risk else "UNKNOWN"

    elements = []

    elements.append(Paragraph("VeriSight", title_style))
    elements.append(Paragraph("Deepfake Detection Analysis Report", subtitle_style))

    elements.append(HRFlowable(
        width="100%", thickness=1,
        color=colors.HexColor("#e2e8f0"),
        spaceAfter=6*mm,
    ))

    elements.append(Paragraph("Prediction Result", section_style))

    elements.append(Spacer(1, 2*mm))

    result_data = [
        [Paragraph("Verdict", label_style),
         Paragraph(prediction_text, ParagraphStyle("PredVal", parent=value_style,
                   fontSize=16, textColor=prediction_color, fontName="Helvetica-Bold"))],
        [Paragraph("Deepfake Score", label_style),
         Paragraph(score_pct, value_style)],
        [Paragraph("Confidence", label_style),
         Paragraph(confidence_pct, value_style)],
        [Paragraph("Risk Level", label_style),
         Paragraph(risk_label, ParagraphStyle("RiskVal", parent=value_style,
                   textColor=risk_color, fontName="Helvetica-Bold"))],
    ]

    result_table = Table(result_data, colWidths=[120, 300])
    result_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(result_table)

    elements.append(Paragraph("Video Information", section_style))

    info_data = [
        [Paragraph("Filename", label_style),
         Paragraph(result_dict.get("filename", "N/A"), value_style)],
        [Paragraph("Analysis Date", label_style),
         Paragraph(_fmt_date(result_dict.get("date_uploaded")), value_style)],
    ]

    frames = result_dict.get("frames_analyzed")
    total = result_dict.get("total_frames")
    if frames is not None:
        info_data.append([
            Paragraph("Frames Analyzed", label_style),
            Paragraph(f"{frames} / {total or 0}", value_style),
        ])

    proc = result_dict.get("processing_time_ms")
    if proc is not None:
        secs = proc / 1000
        info_data.append([
            Paragraph("Processing Time", label_style),
            Paragraph(f"{secs:.1f}s", value_style),
        ])

    info_table = Table(info_data, colWidths=[120, 300])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(info_table)

    elements.append(Paragraph("Recommendations", section_style))
    rec_text = _recommendations(score, risk)
    elements.append(Paragraph(rec_text, body_style))

    elements.append(Spacer(1, 10*mm))

    elements.append(HRFlowable(
        width="100%", thickness=0.5,
        color=colors.HexColor("#cbd5e1"),
        spaceAfter=4*mm,
    ))

    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
        fontName="Helvetica",
    )
    elements.append(Paragraph(
        "VeriSight &mdash; AI-Powered Deepfake Detection &mdash; "
        "This report was generated automatically. The results are based on "
        "machine learning analysis and should be used as a reference only.",
        footer_style,
    ))

    doc.build(elements)
    buf.seek(0)
    return buf


def _fmt_date(date_str):
    if not date_str:
        return "N/A"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%B %d, %Y at %I:%M %p %Z")
    except (ValueError, TypeError):
        return str(date_str)
