/**
 * Dashboard Route — Patient Registration Dashboard
 * 
 * Serves a beautiful, modern web dashboard at GET /dashboard
 * that displays all registered patients from the database.
 * Uses embedded HTML/CSS/JS — no separate frontend build needed.
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send(getDashboardHTML());
});

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareCloud — Patient Registration Dashboard</title>
  <meta name="description" content="CareCloud Voice AI Agent - Patient Registration Dashboard. View and manage patient records.">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --bg-primary: #0a0e1a;
      --bg-secondary: #111827;
      --bg-card: #1a1f35;
      --bg-card-hover: #222845;
      --border: rgba(99, 102, 241, 0.15);
      --border-bright: rgba(99, 102, 241, 0.4);
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent: #6366f1;
      --accent-light: #818cf8;
      --accent-glow: rgba(99, 102, 241, 0.25);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.15);
      --warning: #f59e0b;
      --error: #ef4444;
      --gradient-1: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
      --gradient-2: linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1);
      --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.4);
      --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.15);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Animated background gradient */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 100%, rgba(168, 85, 247, 0.06) 0%, transparent 60%),
        radial-gradient(ellipse at 50% 50%, rgba(6, 182, 212, 0.04) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
      position: relative;
      z-index: 1;
    }

    /* ─── Header ─── */
    header {
      padding: 32px 0 24px;
      border-bottom: 1px solid var(--border);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: var(--gradient-1);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
    }

    .logo-text h1 {
      font-size: 24px;
      font-weight: 800;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }

    .logo-text p {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 400;
      margin-top: 2px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--gradient-1);
      color: white;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    }

    .btn-primary:hover {
      box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: var(--bg-card);
      color: var(--text-secondary);
      border-color: var(--border);
    }

    .btn-secondary:hover {
      border-color: var(--border-bright);
      color: var(--text-primary);
      background: var(--bg-card-hover);
    }

    /* ─── Stats Cards ─── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      padding: 28px 0;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--gradient-1);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .stat-card:hover {
      border-color: var(--border-bright);
      box-shadow: var(--shadow-glow);
      transform: translateY(-2px);
    }

    .stat-card:hover::before {
      opacity: 1;
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 800;
      margin-top: 8px;
      background: var(--gradient-2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* ─── Search & Filter ─── */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
    }

    .search-box input {
      width: 100%;
      padding: 12px 16px 12px 44px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s;
      outline: none;
    }

    .search-box input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    .search-box input::placeholder {
      color: var(--text-muted);
    }

    .search-box .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 16px;
    }

    /* ─── Table ─── */
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow-lg);
      margin-bottom: 40px;
    }

    .table-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 900px;
    }

    thead {
      background: rgba(99, 102, 241, 0.06);
      border-bottom: 1px solid var(--border);
    }

    th {
      text-align: left;
      padding: 14px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    td {
      padding: 14px 16px;
      font-size: 14px;
      color: var(--text-secondary);
      border-bottom: 1px solid rgba(99, 102, 241, 0.06);
      white-space: nowrap;
    }

    tr {
      transition: background 0.15s;
    }

    tbody tr:hover {
      background: var(--bg-card-hover);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .patient-name {
      color: var(--text-primary);
      font-weight: 600;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge-sex {
      background: rgba(99, 102, 241, 0.12);
      color: var(--accent-light);
    }

    .badge-active {
      background: var(--success-glow);
      color: var(--success);
    }

    .action-btn {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      transition: all 0.2s;
    }

    .action-btn:hover {
      border-color: var(--accent);
      color: var(--accent-light);
      background: rgba(99, 102, 241, 0.08);
    }

    .action-btn.delete:hover {
      border-color: var(--error);
      color: var(--error);
      background: rgba(239, 68, 68, 0.08);
    }

    /* ─── Empty State ─── */
    .empty-state {
      text-align: center;
      padding: 80px 20px;
    }

    .empty-state .icon {
      font-size: 56px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-state h3 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 400px;
      margin: 0 auto;
    }

    /* ─── Modal ─── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border-bright);
      border-radius: 20px;
      width: 100%;
      max-width: 640px;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg), var(--shadow-glow);
      animation: modalIn 0.25s ease;
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px;
      border-bottom: 1px solid var(--border);
    }

    .modal-header h2 {
      font-size: 20px;
      font-weight: 700;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      transition: color 0.2s;
    }

    .modal-close:hover {
      color: var(--text-primary);
    }

    .modal-body {
      padding: 28px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
    }

    .detail-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .detail-value {
      font-size: 15px;
      color: var(--text-primary);
      font-weight: 500;
    }

    .detail-section {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }

    .detail-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--accent-light);
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ─── Loading ─── */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 12px;
      color: var(--text-muted);
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── Toast ─── */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-bright);
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 14px;
      box-shadow: var(--shadow-lg);
      z-index: 200;
      animation: slideUp 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .header-content { flex-direction: column; align-items: flex-start; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
      .toolbar { flex-direction: column; }
      .search-box { min-width: 100%; }
    }

    /* ─── Pulse animation for live indicator ─── */
    .live-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      display: inline-block;
      margin-right: 6px;
      animation: pulse 2s ease infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    }

    .footer {
      text-align: center;
      padding: 32px 0;
      color: var(--text-muted);
      font-size: 13px;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-icon">🏥</div>
          <div class="logo-text">
            <h1>CareCloud</h1>
            <p>Voice AI Patient Registration Dashboard</p>
          </div>
        </div>
        <div class="header-actions">
          <span style="font-size: 13px; color: var(--text-muted);">
            <span class="live-dot"></span>System Online
          </span>
          <button class="btn btn-secondary" onclick="loadPatients()">⟳ Refresh</button>
        </div>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Patients</div>
        <div class="stat-value" id="stat-total">—</div>
        <div class="stat-sub">Registered records</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Registered Today</div>
        <div class="stat-value" id="stat-today">—</div>
        <div class="stat-sub">New registrations</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">With Insurance</div>
        <div class="stat-value" id="stat-insured">—</div>
        <div class="stat-sub">Patients with insurance info</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">API Status</div>
        <div class="stat-value" style="font-size: 24px; -webkit-text-fill-color: var(--success);">● Healthy</div>
        <div class="stat-sub" id="stat-api">Connected</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Search patients by name, phone, email..." oninput="filterPatients()">
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Date of Birth</th>
              <th>Sex</th>
              <th>Phone</th>
              <th>City, State</th>
              <th>Insurance</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="patientTableBody">
            <tr>
              <td colspan="8">
                <div class="loading">
                  <div class="spinner"></div>
                  Loading patients...
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div id="emptyState" style="display:none;">
        <div class="empty-state">
          <div class="icon">📋</div>
          <h3>No patients registered yet</h3>
          <p>Call the voice agent phone number to register a new patient. Records will appear here automatically.</p>
        </div>
      </div>
    </div>

    <footer class="footer">
      CareCloud Voice AI Agent — Patient Registration System &copy; 2026
    </footer>
  </div>

  <!-- Patient Detail Modal -->
  <div class="modal-overlay" id="patientModal">
    <div class="modal">
      <div class="modal-header">
        <h2 id="modalTitle">Patient Details</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>

  <script>
    let allPatients = [];

    // ─── Load patients from API ───
    async function loadPatients() {
      try {
        const res = await fetch('/patients');
        const json = await res.json();
        allPatients = json.data || [];
        renderPatients(allPatients);
        updateStats(allPatients);
      } catch (err) {
        console.error('Failed to load patients:', err);
        document.getElementById('patientTableBody').innerHTML = \`
          <tr><td colspan="8">
            <div class="empty-state">
              <div class="icon">⚠️</div>
              <h3>Failed to load patients</h3>
              <p>\${err.message}</p>
            </div>
          </td></tr>\`;
      }
    }

    // ─── Render patient rows ───
    function renderPatients(patients) {
      const tbody = document.getElementById('patientTableBody');
      const empty = document.getElementById('emptyState');

      if (patients.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }

      empty.style.display = 'none';
      tbody.innerHTML = patients.map(p => \`
        <tr>
          <td>
            <span class="patient-name">\${esc(p.first_name)} \${esc(p.last_name)}</span>
            \${p.email ? '<br><span style="font-size:12px;color:var(--text-muted)">' + esc(p.email) + '</span>' : ''}
          </td>
          <td>\${esc(p.date_of_birth)}</td>
          <td><span class="badge badge-sex">\${esc(p.sex)}</span></td>
          <td>\${formatPhone(p.phone_number)}</td>
          <td>\${esc(p.city)}, \${esc(p.state)}</td>
          <td>\${p.insurance_provider ? '<span class="badge badge-active">✓ ' + esc(p.insurance_provider) + '</span>' : '<span style="color:var(--text-muted)">—</span>'}</td>
          <td>\${formatDate(p.created_at)}</td>
          <td>
            <button class="action-btn" onclick="viewPatient('\${p.patient_id}')">View</button>
            <button class="action-btn delete" onclick="deletePatient('\${p.patient_id}', '\${esc(p.first_name)} \${esc(p.last_name)}')">Delete</button>
          </td>
        </tr>
      \`).join('');
    }

    // ─── Update stats ───
    function updateStats(patients) {
      document.getElementById('stat-total').textContent = patients.length;
      
      const today = new Date().toISOString().split('T')[0];
      const todayCount = patients.filter(p => p.created_at && p.created_at.startsWith(today)).length;
      document.getElementById('stat-today').textContent = todayCount;
      
      const insuredCount = patients.filter(p => p.insurance_provider).length;
      document.getElementById('stat-insured').textContent = insuredCount;
    }

    // ─── Search/Filter ───
    function filterPatients() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      if (!query) {
        renderPatients(allPatients);
        return;
      }
      const filtered = allPatients.filter(p =>
        (p.first_name + ' ' + p.last_name).toLowerCase().includes(query) ||
        (p.phone_number || '').includes(query) ||
        (p.email || '').toLowerCase().includes(query) ||
        (p.city || '').toLowerCase().includes(query)
      );
      renderPatients(filtered);
    }

    // ─── View patient modal ───
    function viewPatient(id) {
      const p = allPatients.find(x => x.patient_id === id);
      if (!p) return;

      document.getElementById('modalTitle').textContent = p.first_name + ' ' + p.last_name;
      document.getElementById('modalBody').innerHTML = \`
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Patient ID</span>
            <span class="detail-value" style="font-size:12px;word-break:break-all;">\${p.patient_id}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status</span>
            <span class="detail-value"><span class="badge badge-active">Active</span></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">First Name</span>
            <span class="detail-value">\${esc(p.first_name)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Name</span>
            <span class="detail-value">\${esc(p.last_name)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Date of Birth</span>
            <span class="detail-value">\${esc(p.date_of_birth)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Sex</span>
            <span class="detail-value">\${esc(p.sex)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Phone</span>
            <span class="detail-value">\${formatPhone(p.phone_number)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email</span>
            <span class="detail-value">\${p.email ? esc(p.email) : '—'}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>📍 Address</h3>
          <div class="detail-grid">
            <div class="detail-item full-width">
              <span class="detail-label">Street Address</span>
              <span class="detail-value">\${esc(p.address_line_1)}\${p.address_line_2 ? ', ' + esc(p.address_line_2) : ''}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">City</span>
              <span class="detail-value">\${esc(p.city)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">State</span>
              <span class="detail-value">\${esc(p.state)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ZIP Code</span>
              <span class="detail-value">\${esc(p.zip_code)}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>🏦 Insurance</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Provider</span>
              <span class="detail-value">\${p.insurance_provider ? esc(p.insurance_provider) : '—'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Member ID</span>
              <span class="detail-value">\${p.insurance_member_id ? esc(p.insurance_member_id) : '—'}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>🚨 Emergency Contact</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Name</span>
              <span class="detail-value">\${p.emergency_contact_name ? esc(p.emergency_contact_name) : '—'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Phone</span>
              <span class="detail-value">\${p.emergency_contact_phone ? formatPhone(p.emergency_contact_phone) : '—'}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>⚙️ Metadata</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Language</span>
              <span class="detail-value">\${p.preferred_language || 'English'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Registered</span>
              <span class="detail-value">\${formatDateTime(p.created_at)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Last Updated</span>
              <span class="detail-value">\${formatDateTime(p.updated_at)}</span>
            </div>
          </div>
        </div>
      \`;
      document.getElementById('patientModal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('patientModal').classList.remove('active');
    }

    // Close modal on overlay click
    document.getElementById('patientModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // ─── Delete patient ───
    async function deletePatient(id, name) {
      if (!confirm('Are you sure you want to delete the record for ' + name + '?')) return;
      try {
        const res = await fetch('/patients/' + id, { method: 'DELETE' });
        if (res.ok) {
          showToast('✓ ' + name + ' has been removed');
          loadPatients();
        } else {
          showToast('⚠️ Failed to delete record');
        }
      } catch (err) {
        showToast('⚠️ Error: ' + err.message);
      }
    }

    // ─── Toast notification ───
    function showToast(message) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // ─── Utility functions ───
    function esc(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function formatPhone(phone) {
      if (!phone) return '—';
      const d = phone.replace(/\\D/g, '');
      if (d.length === 10) return '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6);
      return phone;
    }

    function formatDate(dt) {
      if (!dt) return '—';
      try {
        return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { return dt; }
    }

    function formatDateTime(dt) {
      if (!dt) return '—';
      try {
        return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      } catch { return dt; }
    }

    // ─── Keyboard shortcuts ───
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // ─── Auto-refresh every 30 seconds ───
    setInterval(loadPatients, 30000);

    // ─── Initial load ───
    loadPatients();
  </script>
</body>
</html>`;
}

module.exports = router;
