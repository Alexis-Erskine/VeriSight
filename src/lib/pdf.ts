import PDFDocument from "pdfkit";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INDIGO = "#4f46e5";
const DEEPFAKE_RED = "#dc2626";
const AUTHENTIC_GREEN = "#16a34a";
const TEXT_DARK = "#1f2937";
const TEXT_MUTED = "#6b7280";
const TEXT_FAINT = "#9ca3af";

const RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f59e0b",
  medium: "#2563eb",
  low: "#16a34a",
};

export interface ReportData {
  id: string;
  prediction: number;
  confidence: number | null;
  riskLevel: string | null;
  framesAnalyzed: number | null;
  totalFrames: number | null;
  processingTimeMs: number | null;
  createdAt: Date;
  analysisText: string | null;
}

function drawArc(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
  width: number,
  color: string
) {
  doc.save();
  doc.lineWidth(width).strokeColor(color);
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const a = start + (end - start) * (i / steps);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) doc.moveTo(x, y);
    else doc.lineTo(x, y);
  }
  doc.stroke();
  doc.restore();
}

function centerText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  color: string,
  font: string = "Helvetica-Bold"
) {
  doc.font(font).fontSize(size).fillColor(color);
  const th = doc.heightOfString(text, { width: w });
  doc.text(text, x, y + (h - th) / 2, { width: w, align: "center", lineGap: 0 });
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.save();
  doc.rect(MARGIN, doc.y + 2, 4, 13).fill(INDIGO);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT_DARK);
  doc.text(title.toUpperCase(), MARGIN + 12, doc.y);
  doc.moveDown(1.2);
  doc.restore();
}

export async function generateReportPdf(result: ReportData): Promise<Buffer> {
  const isDf = result.prediction >= 0.5;
  const score = (result.prediction * 100).toFixed(1);
  const confidence = result.confidence != null ? (result.confidence * 100).toFixed(0) : "N/A";
  const verdictColor = isDf ? DEEPFAKE_RED : AUTHENTIC_GREEN;
  const verdictText = isDf ? "DEEPFAKE DETECTED" : "AUTHENTIC";
  const riskLevel = (result.riskLevel ?? "unknown").toUpperCase();
  const riskColor = RISK_COLORS[result.riskLevel ?? "low"] ?? TEXT_MUTED;
  const riskSegments: Record<string, number> = { low: 1, medium: 3, high: 4, critical: 5 };
  const filledSegments = riskSegments[result.riskLevel ?? "low"] ?? 1;

  const analysisText = result.analysisText?.trim();

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));

  // ---------- Header banner ----------
  const headerGradient = doc.linearGradient(0, 0, PAGE_W, 0);
  headerGradient.stop(0, "#4f46e5");
  headerGradient.stop(0.55, "#6d28d9");
  headerGradient.stop(1, "#9333ea");
  doc.rect(0, 0, PAGE_W, 110).fill(headerGradient);

  doc.save();
  doc.roundedRect(MARGIN, 34, 42, 42, 10).fill("white");
  doc.font("Helvetica-Bold").fontSize(22).fillColor(INDIGO);
  doc.text("V", MARGIN, 44, { width: 42, align: "center" });
  doc.font("Helvetica-Bold").fontSize(21).fillColor("white");
  doc.text("VeriSight", MARGIN + 58, 40);
  doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.85)");
  doc.text("AI-Powered Deepfake Detection Report", MARGIN + 58, 66);
  doc.font("Helvetica").fontSize(8).fillColor("rgba(255,255,255,0.7)");
  doc.text(
    new Date(result.createdAt).toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    }),
    PAGE_W - MARGIN - 200,
    44,
    { width: 200, align: "right" }
  );
  doc.restore();

  // ---------- Watermark ----------
  doc.save();
  doc.translate(PAGE_W / 2, PAGE_H / 2);
  doc.rotate(45);
  doc.font("Helvetica-Bold").fontSize(96).fillColor("#f1f3ff");
  doc.text("VeriSight", -190, -30, { width: 380, align: "center" });
  doc.restore();

  // ---------- Verdict card ----------
  const cardY = 140;
  doc.save();
  doc.roundedRect(MARGIN, cardY, CONTENT_W, 200, 16).fill("#f8f9ff");
  doc.roundedRect(MARGIN, cardY, CONTENT_W, 200, 16).lineWidth(1).stroke("#e5e7eb");
  doc.restore();

  // Gauge
  const cx = 150;
  const cy = cardY + 105;
  const r = 58;
  doc.save();
  doc.circle(cx, cy, r).lineWidth(11).stroke("#e9eaf2");
  doc.restore();
  const startAngle = -Math.PI / 2;
  const sweep = result.prediction * 2 * Math.PI;
  drawArc(doc, cx, cy, r, startAngle, startAngle + sweep, 11, verdictColor);

  doc.font("Helvetica-Bold").fontSize(26).fillColor(verdictColor);
  doc.text(score + "%", cx - 60, cy - 24, { width: 120, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor(TEXT_FAINT);
  doc.text("deepfake score", cx - 60, cy + 8, { width: 120, align: "center" });

  // Verdict badge
  const badgeX = 238;
  const badgeW = CONTENT_W - (badgeX - MARGIN);
  doc.save();
  doc.roundedRect(badgeX, cardY + 28, badgeW, 58, 12).fill(verdictColor);
  doc.restore();
  centerText(doc, verdictText, badgeX, cardY + 28, badgeW, 58, 18, "white");

  // Risk level label + segmented meter
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT_MUTED);
  doc.text("RISK LEVEL: " + riskLevel, badgeX, cardY + 104);
  const segSize = 46;
  const segGap = 6;
  for (let i = 0; i < 5; i++) {
    const sx = badgeX + i * (segSize + segGap);
    doc.save();
    doc.roundedRect(sx, cardY + 118, segSize, 12, 3).fill(i < filledSegments ? riskColor : "#e5e7eb");
    doc.restore();
  }

  // Confidence stat
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT_MUTED);
  doc.text("CONFIDENCE", badgeX, cardY + 150);
  doc.font("Helvetica-Bold").fontSize(17).fillColor(verdictColor);
  doc.text(confidence + "%", badgeX, cardY + 163);

  // ---------- Analysis details ----------
  doc.y = cardY + 230;
  sectionHeading(doc, "Analysis Details");

  const rows: [string, string][] = [
    ["Deepfake Score", score + "%"],
    ["Confidence", confidence + "%"],
    ["Verdict", isDf ? "Deepfake Detected" : "Likely Authentic"],
    ["Risk Level", riskLevel],
    ["Frames Analyzed", (result.framesAnalyzed ?? 0) + " / " + (result.totalFrames ?? 0)],
    ["Processing Time", result.processingTimeMs ? (result.processingTimeMs / 1000).toFixed(1) + "s" : "N/A"],
    ["Date Analyzed", new Date(result.createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })],
  ];

  const tableTop = doc.y;
  const rowH = 24;
  const tableH = rows.length * rowH + 14;
  doc.save();
  doc.roundedRect(MARGIN, tableTop, CONTENT_W, tableH, 12).fill("#ffffff");
  doc.roundedRect(MARGIN, tableTop, CONTENT_W, tableH, 12).lineWidth(1).stroke("#e5e7eb");
  doc.restore();

  rows.forEach(([label, value], i) => {
    const y = tableTop + 7 + i * rowH;
    if (i % 2 === 1) {
      doc.save();
      doc.rect(MARGIN + 1, y, CONTENT_W - 2, rowH).fill("#f3f4f6");
      doc.restore();
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INDIGO);
    doc.text(label, MARGIN + 14, y + 6);
    doc.font("Helvetica").fontSize(9).fillColor(TEXT_DARK);
    doc.text(value, MARGIN + 14, y + 6, { width: CONTENT_W - 28, align: "right" });
  });

  doc.y = tableTop + tableH + 12;

  // ---------- AI Analysis ----------
  if (analysisText) {
    sectionHeading(doc, "AI Analysis");
    doc.save();
    doc.roundedRect(MARGIN, doc.y, CONTENT_W, 74, 12).fill("#eef2ff");
    doc.roundedRect(MARGIN, doc.y, CONTENT_W, 74, 12).lineWidth(1).stroke("#c7d2fe");
    doc.rect(MARGIN, doc.y, 5, 74).fill(INDIGO);
    doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#374151");
    doc.text(analysisText, MARGIN + 18, doc.y + 12, { width: CONTENT_W - 34, lineGap: 4 });
    doc.restore();
    doc.moveDown(1.4);
  }

  // ---------- Recommendations ----------
  sectionHeading(doc, "Recommendations");
  const recs = isDf
    ? ["Do not share unverified content. Deepfakes can spread misinformation.",
       "Examine visual artifacts, unnatural blinking, and audio-visual desynchronization.",
       "Verify the source and cross-reference with trusted media.",
       "Report suspicious content to platform moderators or authorities."]
    : ["Content appears authentic with no significant deepfake indicators.",
       "Cross-verify the video source for contextual consistency.",
       "Stay vigilant as deepfake technology evolves rapidly."];
  doc.save();
  for (const rec of recs) {
    doc.font("Helvetica-Bold").fontSize(10).fillColor(verdictColor);
    doc.text("\u25CF", MARGIN, doc.y);
    doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
    doc.text(rec, MARGIN + 18, doc.y - 12, { width: CONTENT_W - 18 });
    doc.moveDown(0.6);
  }
  doc.restore();

  // ---------- Footer ----------
  doc.y = PAGE_H - 70;
  doc.save();
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke();
  doc.font("Helvetica").fontSize(8).fillColor(TEXT_FAINT);
  doc.text("Generated by VeriSight \u2014 AI-Powered Deepfake Detection", MARGIN, doc.y + 8, {
    width: CONTENT_W,
    align: "center",
  });
  doc.fontSize(7);
  doc.text(
    "Report " + result.id.slice(0, 8) + "  \u2022  " + new Date().toLocaleString(),
    MARGIN,
    doc.y + 13,
    { width: CONTENT_W, align: "center" }
  );
  doc.restore();

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(buffers);
}