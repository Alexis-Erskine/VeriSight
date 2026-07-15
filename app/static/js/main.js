/* ─── DOM Ready ─── */
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initAuthForms();
  initUploadZone();
  initResultPage();
  updateAuthUI();
});

/* ─── Mobile Nav ─── */
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

/* ─── Auth UI ─── */
function updateAuthUI() {
  const token = localStorage.getItem('token');
  const navLinks = document.querySelector('.navbar-links');
  if (!navLinks) return;

  const authItems = navLinks.querySelectorAll('[data-auth]');
  authItems.forEach(el => {
    const auth = el.dataset.auth;
    if (auth === 'authenticated') {
      el.style.display = token ? '' : 'none';
    } else if (auth === 'guest') {
      el.style.display = token ? 'none' : '';
    }
  });

  const userName = localStorage.getItem('username');
  const userEl = navLinks.querySelector('[data-user]');
  if (userEl && userName) {
    userEl.textContent = userName;
  }
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  if (user) {
    localStorage.setItem('username', user.username || user.email);
    localStorage.setItem('user', JSON.stringify(user));
  }
  updateAuthUI();
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('user');
  updateAuthUI();
}

function getToken() {
  return localStorage.getItem('token');
}

/* ─── Toast Notifications ─── */
function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  if (!container) {
    const div = document.createElement('div');
    div.className = 'toast-container';
    document.body.appendChild(div);
  }
  const c = document.querySelector('.toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  c.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ─── Auth Forms ─── */
function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = loginForm.querySelector('.form-error');
      const submitBtn = loginForm.querySelector('.form-submit');
      const formData = new FormData(loginForm);

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password'),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (errorEl) {
            errorEl.textContent = data.error || 'Login failed';
            errorEl.classList.add('active');
          }
          return;
        }

        setAuth(data.token, data.user);
        showToast('Welcome back!', 'success');
        window.location.href = '/dashboard';
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = 'Connection error. Please try again.';
          errorEl.classList.add('active');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = registerForm.querySelector('.form-error');
      const submitBtn = registerForm.querySelector('.form-submit');
      const formData = new FormData(registerForm);

      if (formData.get('password').length < 8) {
        if (errorEl) {
          errorEl.textContent = 'Password must be at least 8 characters';
          errorEl.classList.add('active');
        }
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.get('email'),
            username: formData.get('username'),
            password: formData.get('password'),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (errorEl) {
            errorEl.textContent = data.error || 'Registration failed';
            errorEl.classList.add('active');
          }
          return;
        }

        setAuth(data.token, data.user);
        showToast('Account created!', 'success');
        window.location.href = '/dashboard';
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = 'Connection error. Please try again.';
          errorEl.classList.add('active');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
}

/* ─── Upload Zone ─── */
function initUploadZone() {
  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('upload-preview');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressStatus = document.getElementById('progress-status');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');

  if (!zone || !fileInput) return;

  zone.addEventListener('click', () => fileInput.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file) {
    const validTypes = ['video/mp4', 'video/x-msvideo', 'video/quicktime',
                        'video/x-matroska', 'video/webm'];
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

    if (!validExts.includes(ext)) {
      showToast('Invalid video format. Supported: MP4, AVI, MOV, MKV, WEBM', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('File exceeds 100 MB limit', 'error');
      return;
    }

    if (preview) {
      preview.classList.add('active');
      if (fileName) fileName.textContent = file.name;
      if (fileSize) fileSize.textContent = formatFileSize(file.size);
    }

    document.getElementById('upload-btn')?.addEventListener('click', () => uploadFile(file));
  }
}

async function uploadFile(file) {
  const token = getToken();
  if (!token) {
    showToast('Please sign in first', 'error');
    window.location.href = '/login';
    return;
  }

  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const progressStatus = document.getElementById('progress-status');
  const uploadBtn = document.getElementById('upload-btn');

  if (progressContainer) progressContainer.classList.add('active');
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
  }

  const formData = new FormData();
  formData.append('video', file);

  try {
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          if (progressFill) progressFill.style.width = pct + '%';
          if (progressPercent) progressPercent.textContent = pct + '%';
          if (progressStatus) progressStatus.textContent = 'Uploading video...';
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('POST', '/api/videos/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });

    if (progressFill) {
      progressFill.style.width = '100%';
      progressFill.classList.remove('indeterminate');
    }
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressStatus) progressStatus.textContent = 'Analysis complete!';

    showToast('Analysis complete!', 'success');
    setTimeout(() => {
      window.location.href = `/results/${result.id}`;
    }, 800);

  } catch (err) {
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    if (progressStatus) {
      progressStatus.textContent = 'Upload failed';
    }
    showToast(err.message || 'Upload failed', 'error');
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Try Again';
    }
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ─── Result Page ─── */
function initResultPage() {
  const container = document.getElementById('result-container');
  if (!container) return;

  const pathParts = window.location.pathname.split('/');
  const detectionId = pathParts[pathParts.length - 1];

  loadResult(detectionId);
}

async function loadResult(detectionId) {
  const container = document.getElementById('result-container');
  const token = getToken();

  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch(`/api/results/${detectionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#9888;</div>
          <h3>Result Not Found</h3>
          <p>${data.error || 'This detection result could not be found.'}</p>
          <a href="/dashboard" class="btn btn-secondary btn-sm" style="margin-top:16px;display:inline-flex">Back to Dashboard</a>
        </div>`;
      return;
    }

    renderResult(data);

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9888;</div>
        <h3>Connection Error</h3>
        <p>Failed to load the result. Please try again.</p>
        <button onclick="location.reload()" class="btn btn-secondary btn-sm" style="margin-top:16px">Retry</button>
      </div>`;
  }
}

function renderResult(data) {
  const container = document.getElementById('result-container');
  const score = data.prediction || 0;
  const confidence = data.confidence || 0;
  const isDeepfake = data.prediction_label === 'deepfake';
  const verdictClass = isDeepfake ? 'deepfake' : 'authentic';
  const verdictText = isDeepfake ? 'Deepfake Detected' : 'Authentic';

  const riskLevel = getRiskLevel(score);
  const gaugeColor = getGaugeColor(score);
  const circumference = 2 * Math.PI * 70;

  const recommendations = getRecommendations(data);

  container.innerHTML = `
    <div class="result-page fade-in">
      <div class="result-header">
        <h1>Detection Result</h1>
        <p class="filename">${escapeHtml(data.filename)}</p>
      </div>

      <div class="result-grid">
        <div class="verdict-card ${verdictClass} fade-in-up delay-1">
          <div class="gauge-container">
            <svg class="gauge-svg" width="160" height="160" viewBox="0 0 160 160">
              <circle class="gauge-bg" cx="80" cy="80" r="70"/>
              <circle class="gauge-fill" cx="80" cy="80" r="70"
                stroke="${gaugeColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${circumference}"
                id="gauge-circle"/>
            </svg>
            <div class="gauge-center">
              <span class="gauge-value" style="color:${gaugeColor}" id="gauge-value">0%</span>
              <span class="gauge-label">Deepfake Score</span>
            </div>
          </div>

          <div class="verdict-label">${verdictText}</div>
          <div class="verdict-sub">AI-powered analysis result</div>

          <span class="risk-badge risk-${data.risk_level || 'low'}">
            <span>&#9679;</span> ${capitalize(data.risk_level || 'low')} Risk
          </span>
        </div>

        <div class="confidence-section fade-in-up delay-2">
          <h3>Analysis Confidence</h3>
          <div class="confidence-bar-track">
            <div class="confidence-bar-fill ${getConfidenceClass(confidence)}"
                 id="confidence-fill"
                 style="width: 0%"></div>
            <span class="confidence-label" id="confidence-label">0%</span>
          </div>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-top:12px">
            Confidence measures how certain the model is about its prediction.
          </p>
        </div>

        <div class="details-section fade-in-up delay-3">
          <h3>Analysis Details</h3>
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Frames Analyzed</div>
              <div class="detail-value">${data.frames_analyzed || 0} / ${data.total_frames || 0}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Processing Time</div>
              <div class="detail-value">${formatTime(data.processing_time_ms)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Risk Level</div>
              <div class="detail-value" style="font-size:0.95rem">${capitalize(data.risk_level || 'unknown')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date Uploaded</div>
              <div class="detail-value" style="font-size:0.85rem">${formatDate(data.date_uploaded)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="recommendations-section fade-in-up delay-4">
        <h3>Recommendations</h3>
        ${recommendations.map(r => `
          <div class="recommendation-card">
            <div class="recommendation-icon ${r.iconClass}">${r.icon}</div>
            <div>
              <h4>${r.title}</h4>
              <p>${r.description}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="text-align:center;margin-top:32px" class="fade-in-up delay-5">
        <a href="/upload" class="btn btn-primary">Analyze Another Video</a>
        <button onclick="downloadReport('${data.id}')" class="btn btn-secondary" style="margin-left:12px">&#8595; Download PDF Report</button>
        <a href="/dashboard" class="btn btn-secondary" style="margin-left:12px">Dashboard</a>
      </div>
    </div>
  `;

  animateGauge(score, gaugeColor, circumference, circumference - (score * circumference));
  animateConfidence(confidence);
}

function animateGauge(score, color, circumference, offset) {
  const circle = document.getElementById('gauge-circle');
  const valueEl = document.getElementById('gauge-value');
  if (!circle || !valueEl) return;

  let current = 0;
  const target = score;
  const duration = 1500;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = eased * target;

    circle.style.strokeDashoffset = circumference - (val * circumference);
    valueEl.textContent = (val * 100).toFixed(0) + '%';

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function animateConfidence(confidence) {
  const fill = document.getElementById('confidence-fill');
  const label = document.getElementById('confidence-label');
  if (!fill || !label) return;

  let current = 0;
  const target = confidence;
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = eased * target;

    fill.style.width = (val * 100) + '%';
    label.textContent = (val * 100).toFixed(0) + '%';

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function getRiskLevel(score) {
  if (score >= 0.8) return { label: 'Critical', class: 'critical' };
  if (score >= 0.6) return { label: 'High', class: 'high' };
  if (score >= 0.3) return { label: 'Medium', class: 'medium' };
  return { label: 'Low', class: 'low' };
}

function getGaugeColor(score) {
  if (score >= 0.8) return '#ef4444';
  if (score >= 0.6) return '#f59e0b';
  if (score >= 0.3) return '#00d4ff';
  return '#10b981';
}

function getConfidenceClass(confidence) {
  if (confidence >= 0.8) return 'very-high';
  if (confidence >= 0.6) return 'high';
  if (confidence >= 0.3) return 'medium';
  return 'low';
}

function getRecommendations(data) {
  const score = data.prediction || 0;
  const isDeepfake = data.prediction_label === 'deepfake';
  const recs = [];

  if (isDeepfake) {
    recs.push({
      icon: '&#9888;',
      iconClass: 'warning',
      title: 'Potentially Manipulated Content',
      description: 'This video shows strong indicators of AI-generated manipulation. Exercise caution before sharing or acting on this content.',
    });
    recs.push({
      icon: '&#9432;',
      iconClass: 'info',
      title: 'Cross-Verification Recommended',
      description: 'Verify the content through independent sources. Look for the original video or official statements from the purported source.',
    });
    recs.push({
      icon: '&#9432;',
      iconClass: 'info',
      title: 'Report Suspicious Content',
      description: 'If this video targets individuals or spreads misinformation, consider reporting it to relevant platforms or authorities.',
    });
  } else {
    recs.push({
      icon: '&#10003;',
      iconClass: 'success',
      title: 'Content Appears Authentic',
      description: 'No significant deepfake indicators were detected. The video appears to be authentic based on our analysis.',
    });
    recs.push({
      icon: '&#9432;',
      iconClass: 'info',
      title: 'Stay Vigilant',
      description: 'While this video appears authentic, always practice critical media consumption. Deepfake technology continues to evolve.',
    });
  }

  recs.push({
    icon: '&#9432;',
    iconClass: 'info',
    title: 'Understanding the Score',
    description: `The deepfake score (${(score * 100).toFixed(1)}%) represents the probability that this video contains AI-generated manipulation. Scores above 50% suggest deepfake.`,
  });

  return recs;
}

function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(ms) {
  if (!ms) return '0s';
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins + 'm ' + secs + 's';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Download PDF Report ─── */
async function downloadReport(detectionId) {
  const token = getToken();
  if (!token) {
    showToast('Please sign in first', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/results/${detectionId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to download report', 'error');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verisight_report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Report downloaded successfully', 'success');
  } catch (err) {
    showToast('Connection error. Please try again.', 'error');
  }
}
