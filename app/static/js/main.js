document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initUploadZone();
  initResultPage();
});

function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.navbar-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
      navLinks.classList.remove('open');
    }
  });
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function initUploadZone() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  const preview = document.getElementById('upload-preview');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const uploadBtn = document.getElementById('upload-btn');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');

  if (!zone || !input) return;

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) input.files = e.dataTransfer.files;
    handleFileSelect();
  });

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', handleFileSelect);

  function handleFileSelect() {
    const file = input.files[0];
    if (!file) return;

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    preview.classList.add('active');
    progressContainer.classList.remove('active');
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadFile);
  }

  async function uploadFile() {
    const file = input.files[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/webm'];
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

    if (!validExts.includes(ext) && !validTypes.includes(file.type)) {
      showToast('Unsupported file format. Use MP4, AVI, MOV, MKV, or WebM.', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('File exceeds 100 MB limit.', 'error');
      return;
    }

    progressContainer.classList.add('active');
    progressFill.className = 'progress-bar-fill indeterminate';
    progressStatus.textContent = 'Uploading video...';
    progressPercent.textContent = '';

    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      });

      progressFill.className = 'progress-bar-fill';

      if (!res.ok) {
        const err = await res.json();
        progressStatus.textContent = err.error || 'Upload failed';
        showToast(err.error || 'Upload failed', 'error');
        setTimeout(() => progressContainer.classList.remove('active'), 3000);
        return;
      }

      progressFill.style.width = '100%';
      progressStatus.textContent = 'Analysis complete!';
      progressPercent.textContent = '100%';

      const data = await res.json();
      showToast('Analysis complete!', 'success');

      setTimeout(() => {
        window.location.href = `/results/${data.id}`;
      }, 1000);

    } catch (err) {
      progressFill.className = 'progress-bar-fill';
      progressStatus.textContent = 'Connection error';
      showToast('Failed to upload. Please try again.', 'error');
    }
  }
}

function initResultPage() {
  const container = document.getElementById('result-container');
  if (!container) return;

  const detectionId = container.dataset.detectionId;
  if (detectionId) {
    loadResult(detectionId);
  }
}

async function loadResult(detectionId) {
  const container = document.getElementById('result-container');
  if (!container) return;

  try {
    const res = await fetch(`/api/results/${detectionId}`);
    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-icon">&#9888;</div>
          <h3>Result Not Found</h3>
          <p>${data.error || 'This analysis result does not exist.'}</p>
          <a href="/upload" class="btn btn-primary btn-sm" style="margin-top:20px;display:inline-flex">Upload a Video</a>
        </div>`;
      return;
    }

    renderResult(data);

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-icon">&#9888;</div>
        <h3>Failed to Load</h3>
        <p>Could not load the result. Please try again.</p>
        <button onclick="location.reload()" class="btn btn-secondary btn-sm" style="margin-top:20px">Retry</button>
      </div>`;
  }
}

function renderResult(data) {
  const container = document.getElementById('result-container');
  const isDf = data.prediction_label === 'deepfake';
  const riskClass = data.risk_level || 'low';
  const score = data.prediction != null ? (data.prediction * 100).toFixed(1) : '--';
  const confidence = data.confidence != null ? (data.confidence * 100).toFixed(0) : '--';
  const gaugeColor = isDf ? '#ef4444' : '#10b981';
  const gaugeRadius = 68;
  const circumference = 2 * Math.PI * gaugeRadius;
  const offset = data.prediction != null ? circumference * (1 - data.prediction) : circumference;

  const recommendations = getRecommendations(data.risk_level, isDf);

  container.innerHTML = `
    <div class="result-page fade-in-up">
      <div class="result-header">
        <h1>Analysis Result</h1>
        <p class="filename">${escapeHtml(data.filename)}</p>
      </div>

      <div class="result-grid">
        <div class="verdict-card ${isDf ? 'deepfake' : 'authentic'}">
          <div class="gauge-container">
            <svg class="gauge-svg" width="160" height="160" viewBox="0 0 160 160">
              <circle class="gauge-bg" cx="80" cy="80" r="${gaugeRadius}"/>
              <circle class="gauge-fill" cx="80" cy="80" r="${gaugeRadius}"
                stroke="${gaugeColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"/>
            </svg>
            <div class="gauge-center">
              <span class="gauge-value" style="color:${gaugeColor}">${score}%</span>
              <span class="gauge-label">Deepfake Score</span>
            </div>
          </div>
          <div class="verdict-label">${isDf ? 'Deepfake Detected' : 'Authentic'}</div>
          <div class="verdict-sub">${isDf ? 'This video shows signs of AI manipulation' : 'No signs of deepfake manipulation detected'}</div>
          <span class="risk-badge risk-${riskClass}">${data.risk_level.toUpperCase()} RISK</span>
        </div>

        <div class="confidence-section">
          <h3>Confidence</h3>
          <div class="confidence-bar-track">
            <div class="confidence-bar-fill ${confidence > 80 ? 'very-high' : confidence > 60 ? 'high' : confidence > 40 ? 'medium' : 'low'}"
                 style="width:${confidence}%"></div>
            <span class="confidence-label">${confidence}% Confidence</span>
          </div>
          <div style="margin-top:20px">
            <h3 style="font-size:1rem;font-weight:600;margin-bottom:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">Details</h3>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value" style="color:${data.status === 'completed' ? 'var(--success)' : 'var(--warning)'}">${data.status}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Frames Analyzed</div>
                <div class="detail-value">${data.frames_analyzed || 0} / ${data.total_frames || 0}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Processing Time</div>
                <div class="detail-value">${data.processing_time_ms ? (data.processing_time_ms / 1000).toFixed(1) + 's' : '--'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Date Analyzed</div>
                <div class="detail-value" style="font-size:0.85rem;font-family:inherit">${formatDate(data.date_uploaded)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="recommendations-section">
        <h3>Recommendations</h3>
        ${recommendations.map(r => `
          <div class="recommendation-card">
            <div class="recommendation-icon ${r.icon}">${r.iconChar}</div>
            <div>
              <h4>${r.title}</h4>
              <p>${r.description}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="text-align:center;margin-top:32px">
        <a href="/upload" class="btn btn-primary btn-lg">Analyze Another Video</a>
        <button onclick="downloadReport('${data.id}')" class="btn btn-secondary btn-lg" style="margin-left:12px">
          &#128196; Download PDF Report
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function downloadReport(id) {
  try {
    const res = await fetch(`/api/results/${id}/download`);
    if (!res.ok) {
      showToast('Report not available', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verisight_report_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('Download failed', 'error');
  }
}

function getRecommendations(riskLevel, isDf) {
  const recs = [];

  if (!isDf) {
    recs.push({
      icon: 'success', iconChar: '\u2705',
      title: 'Content Appears Authentic',
      description: 'This video shows no significant signs of deepfake manipulation. However, always maintain healthy skepticism toward digital media.',
    });
    recs.push({
      icon: 'info', iconChar: '\u2139\uFE0F',
      title: 'Cross-Verify Sources',
      description: 'Consider verifying the video source and checking for contextual consistency across multiple reliable channels.',
    });
    recs.push({
      icon: 'success', iconChar: '\uD83D\uDEE1\uFE0F',
      title: 'Stay Vigilant',
      description: 'Deepfake technology evolves rapidly. Regularly update your awareness of new manipulation techniques and detection tools.',
    });
  } else {
    recs.push({
      icon: 'warning', iconChar: '\u26A0\uFE0F',
      title: 'Do Not Share Unverified Content',
      description: 'Avoid sharing this video until its authenticity has been thoroughly verified. Sharing deepfakes can contribute to misinformation.',
    });
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recs.push({
        icon: 'warning', iconChar: '\uD83D\uDEA8',
        title: 'Report Suspicious Content',
        description: 'If this video targets individuals or spreads false information, consider reporting it to relevant platform moderators or authorities.',
      });
    }
    recs.push({
      icon: 'info', iconChar: '\uD83D\uDD0D',
      title: 'Examine Context Clues',
      description: 'Look for visual artifacts, unnatural blinking, audio-visual desync, and inconsistent lighting — common indicators of deepfake generation.',
    });
    recs.push({
      icon: 'info', iconChar: '\uD83C\uDF93',
      title: 'Educate Others',
      description: 'Share your knowledge about deepfake detection with peers. Digital literacy is the most effective defense against AI-generated misinformation.',
    });
  }

  return recs;
}
