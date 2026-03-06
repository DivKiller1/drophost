const appEl = document.getElementById('app');

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const then = new Date(iso);
  const now = new Date();
  const diff = (now - then) / 1000;
  if (diff < 60) return 'just now';
  const minutes = Math.round(diff / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

function statusClass(status) {
  switch (status) {
    case 'building':
      return 'dh-status-building';
    case 'live':
      return 'dh-status-live';
    case 'expired':
      return 'dh-status-expired';
    case 'pending':
    default:
      return 'dh-status-pending';
  }
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // ignore
  }
  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

const state = {
  deployments: [],
  loadingDeployments: false,
  lastError: null,
  lastSuccess: null
};

async function loadDeployments() {
  state.loadingDeployments = true;
  render();
  try {
    const deployments = await fetchJSON('/api/deployments');
    state.deployments = deployments;
    state.lastError = null;
  } catch (err) {
    state.lastError = err.message;
  } finally {
    state.loadingDeployments = false;
    render();
  }
}

function renderHome() {
  const latest = state.deployments[0] || null;

  const slugPreview =
    latest && latest.slot
      ? `<span class="dh-slug-preview">Last deployed at <strong>/d/${latest.slot}/</strong></span>`
      : `<span class="dh-slug-preview">Your site will be live at <strong>/d/&lt;slug&gt;/</strong></span>`;

  appEl.innerHTML = `
    <section class="dh-shell">
      <section class="dh-card">
        <div class="dh-card-header">
          <div>
            <div class="dh-card-title">Deploy a static site</div>
            <div class="dh-card-subtitle">Upload a .zip or single index.html. DropHost will mount it and wire Nginx.</div>
          </div>
          <span class="dh-pill">
            <span class="dh-pill-dot"></span>
            LAN-only · macvlan
          </span>
        </div>
        <form id="deploy-form" class="dh-form">
          <div>
            <div class="dh-field-label">Name</div>
            <input id="name-input" class="dh-input" name="name" placeholder="My portfolio site" required />
          </div>
          <div>
            <div class="dh-field-label">Static files</div>
            <div class="dh-upload-zone">
              <div class="dh-upload-main">Drag in a .zip or index.html</div>
              <div class="dh-upload-sub">Single-page apps are supported, index.html must be at the root of the archive.</div>
              <input id="file-input" class="dh-upload-input" type="file" name="file" accept=".html,.zip" required />
              ${slugPreview}
            </div>
          </div>
          <div>
            <div class="dh-field-label">TTL</div>
            <div class="dh-row">
              <select id="ttl-input" class="dh-select" name="ttl_seconds">
                <option value="">Permanent</option>
                <option value="${60 * 60}">1 hour</option>
                <option value="${24 * 60 * 60}">24 hours</option>
                <option value="${7 * 24 * 60 * 60}">7 days</option>
              </select>
              <button type="submit" class="dh-button-primary">
                <span>Deploy</span>
              </button>
            </div>
          </div>
          ${state.lastError
      ? `<div class="dh-alert dh-alert-error">${state.lastError}</div>`
      : state.lastSuccess
        ? `<div class="dh-alert dh-alert-success">${state.lastSuccess}</div>`
        : ''
    }
        </form>
      </section>

      <section class="dh-card">
        <div class="dh-card-header">
          <div>
            <div class="dh-card-title">Recent deployments</div>
            <div class="dh-card-subtitle">Status and LAN URLs for your latest sites.</div>
          </div>
          <button class="dh-button-ghost" id="view-all-btn">
            View all
          </button>
        </div>
        <div id="recent-deployments">
          ${renderDeploymentsList(true)}
        </div>
      </section>
    </section>
  `;

  const form = document.getElementById('deploy-form');
  const nameInput = document.getElementById('name-input');
  const viewAllBtn = document.getElementById('view-all-btn');

  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#/deployments';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    state.lastError = null;
    state.lastSuccess = null;
    render();
    try {
      const result = await fetchJSON('/api/deployments', {
        method: 'POST',
        body: formData
      });
      state.deployments.unshift(result);
      state.lastSuccess = `Deployed to ${result.lan_url}`;
      form.reset();
      if (nameInput) nameInput.focus();
      render();
    } catch (err) {
      state.lastError = err.message;
      render();
    }
  });
}

function renderDeploymentsList(limitToRecent) {
  if (state.loadingDeployments) {
    return `<div class="dh-skeleton" style="height: 98px; margin-bottom: 0.3rem;"></div>`;
  }
  if (!state.deployments.length) {
    return `<p class="dh-muted">No deployments yet. Deploy your first site from the form on the left.</p>`;
  }

  const items = limitToRecent ? state.deployments.slice(0, 5) : state.deployments;

  return `
    <div class="dh-list">
      ${items
      .map((d) => {
        const statusCls = statusClass(d.status);
        const hits = d.hits || 0;
        return `
            <div class="dh-card-row">
              <div class="dh-card-main">
                <div class="dh-card-title-sm">${d.name}</div>
                <div class="dh-card-meta">
                  <span>slot: <code>${d.slot}</code></span>
                  · <span>${formatRelativeTime(d.created_at)}</span>
                </div>
                ${d.lan_url
            ? `<a href="${d.lan_url}" target="_blank" class="dh-url">${d.lan_url}</a>`
            : ''
          }
              </div>
              <div style="text-align:right; display:flex; flex-direction:column; gap:0.35rem; align-items:flex-end;">
                <span class="dh-status-badge ${statusCls}">${d.status}</span>
                <span class="dh-badge-small">${hits} hits</span>
              </div>
            </div>
          `;
      })
      .join('')}
    </div>
  `;
}

function renderDeploymentsView() {
  appEl.innerHTML = `
    <section class="dh-shell">
      <section class="dh-card" style="grid-column: 1 / -1;">
        <div class="dh-card-header">
          <div>
            <div class="dh-card-title">All deployments</div>
            <div class="dh-card-subtitle">Every deployment, newest first.</div>
          </div>
          <button class="dh-button-ghost" id="back-to-deploy">
            Back to deploy
          </button>
        </div>
        ${renderDeploymentsList(false)}
      </section>
    </section>
  `;

  const backBtn = document.getElementById('back-to-deploy');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#/';
    });
  }
}

function renderAnalyticsView() {
  const total = state.deployments.length;
  const live = state.deployments.filter((d) => d.status === 'live').length;
  const expired = state.deployments.filter((d) => d.status === 'expired').length;

  appEl.innerHTML = `
    <section class="dh-shell">
      <section class="dh-card" style="grid-column: 1 / -1;">
        <div class="dh-card-header">
          <div>
            <div class="dh-card-title">Analytics (dashboard-side)</div>
            <div class="dh-card-subtitle">Derived from deployments list. Backend analytics endpoints can extend this.</div>
          </div>
        </div>
        <div class="dh-metric-grid">
          <div class="dh-metric-card">
            <div class="dh-metric-label">Total deployments</div>
            <div class="dh-metric-value">${total}</div>
          </div>
          <div class="dh-metric-card">
            <div class="dh-metric-label">Live</div>
            <div class="dh-metric-value">${live}</div>
          </div>
          <div class="dh-metric-card">
            <div class="dh-metric-label">Expired</div>
            <div class="dh-metric-value">${expired}</div>
          </div>
        </div>
      </section>
    </section>
  `;
}

function render() {
  const hash = window.location.hash || '#/';
  if (hash.startsWith('#/deployments')) {
    renderDeploymentsView();
  } else if (hash.startsWith('#/analytics')) {
    renderAnalyticsView();
  } else {
    renderHome();
  }
}

window.addEventListener('hashchange', render);

loadDeployments().then(() => {
  render();
});

