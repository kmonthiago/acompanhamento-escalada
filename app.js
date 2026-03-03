// ====================================
// ClimbTracker — Main Application (API Integrated)
// ====================================

import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// --- Data: Categories ---
const CATEGORIES = [
  {
    id: 'finger_strength',
    label: 'Força de Dedos',
    description: 'Suspensão em agarras, força de pinça, dead hangs',
    suggestions: [
      'Hangboard progressivo (3x10s em reglete 20mm)',
      'Dead hangs com peso adicional',
      'Treino de pinça com pinch blocks',
      'Repeaters: 7s on / 3s off x 6 reps'
    ]
  },
  {
    id: 'upper_body',
    label: 'Trem Superior',
    description: 'Pull-ups, lock-offs, resistência muscular',
    suggestions: [
      'Séries de pull-ups progressivas (3x máx)',
      'Lock-offs negativos de 5 segundos',
      'Frenchies (lock-off em 3 ângulos)',
      'Campus board: movimentos controlados'
    ]
  },
  {
    id: 'core',
    label: 'Core / Tensão Corporal',
    description: 'Estabilidade, front lever, prancha, tensão',
    suggestions: [
      'Front lever progressions (3x15s)',
      'L-sit em paralelas (4x20s)',
      'Prancha com variações (side plank, plank walks)',
      'Toe-to-bar: 3x8 reps'
    ]
  },
  {
    id: 'flexibility',
    label: 'Flexibilidade / Mobilidade',
    description: 'Abertura de quadril, ombros, high-steps',
    suggestions: [
      'Frog stretch: 3x60s diariamente',
      'Alongamento dinâmico de quadril pré-treino',
      'Pigeon pose: 2x90s cada lado',
      'Mobilidade de ombros com band pull-aparts'
    ]
  },
  {
    id: 'body_awareness',
    label: 'Consciência Corporal',
    description: 'Propriocepção, equilíbrio, coordenação motora',
    suggestions: [
      'Escalada de olhos fechados em boulder V0-V1',
      'Drills de equilíbrio unipodal (30s cada pé)',
      'Movimentos estáticos com pausa de 2s em cada posição',
      'Yoga orientada para escalada (2x/semana)'
    ]
  },
  {
    id: 'route_reading',
    label: 'Leitura de Vias',
    description: 'Interpretação de sequências, beta reading, visualização',
    suggestions: [
      'Visualização pré-escalada: estudar a via 2 min antes',
      'Flash attempts em boulders novos',
      'Prática de beta sharing com parceiros',
      'Gravar vídeo e analisar movimentos depois'
    ]
  },
  {
    id: 'endurance',
    label: 'Resistência',
    description: 'Capacidade de sustentar esforço prolongado',
    suggestions: [
      'ARC training: 20 min de escalada leve contínua',
      'Circuitos 4x4 (4 boulders x 4 rounds)',
      'Escalada em top-rope com volume alto (6-8 vias)',
      'Intervalados: 3 min on / 3 min off x 5 rounds'
    ]
  },
  {
    id: 'footwork',
    label: 'Técnica de Pés',
    description: 'Precisão de pisada, uso de volumes, smearing',
    suggestions: [
      'Drill silencioso: escalar sem fazer barulho nos pés',
      'Escalada com ênfase nos pés (usar mãos só p/ equilíbrio)',
      'Treino de footswap em posições estáticas',
      'Slab climbing focado em precisão'
    ]
  }
];

// --- State ---
let appData = { clients: [], assessments: {}, users: [] };
let currentUser = null;
let currentPage = 'clients';
let radarChart = null;

// --- Helper: get latest assessment for a client ---
function getLatestAssessment(clientId) {
  return appData.assessments[clientId] || null;
}

// --- Helper: format date ---
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// --- API Calls ---
async function apiCall(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (res.status === 401) {
      window.location.href = '/login.html';
      return null;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    console.error(`API Error (${url}):`, err);
    return null;
  }
}

async function loadInitialData() {
  const me = await apiCall('/api/auth/me');
  if (!me) return;
  currentUser = me.user;
  document.getElementById('admin-display-name').textContent = currentUser.display_name || currentUser.username;

  const [clients, assessments] = await Promise.all([
    apiCall('/api/clients'),
    apiCall('/api/assessments')
  ]);

  if (clients) appData.clients = clients;
  if (assessments) appData.assessments = assessments;

  renderClients();
}

// --- Router ---
function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);
  const bnavEl = document.getElementById(`bnav-${page}`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (bnavEl) bnavEl.classList.add('active');

  // Refresh content for each page
  if (page === 'clients') renderClients();
  if (page === 'assessment') refreshAssessmentSelect();
  if (page === 'dashboard') refreshDashboardSelect();
  if (page === 'history') refreshHistorySelect();
  if (page === 'users') loadUsers();
}

// --- Toast ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// --- Clients ---
function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function renderClients() {
  const grid = document.getElementById('clients-grid');
  const empty = document.getElementById('empty-clients');

  if (appData.clients.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = appData.clients.map(client => {
    const latest = getLatestAssessment(client.id);
    return `
      <div class="client-card" data-id="${client.id}">
        <div class="client-card-header">
          <div class="client-avatar">${getInitials(client.name)}</div>
          <div class="client-card-actions">
            <button class="btn-icon" onclick="event.stopPropagation(); editClient('${client.id}')" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" onclick="event.stopPropagation(); deleteClient('${client.id}')" title="Excluir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div class="client-name">${client.name}</div>
        <div class="client-meta">
          <span>${client.age} anos</span>
          <span>${latest ? `✅ Avaliado` : '⏳ Pendente'}</span>
        </div>
        <span class="client-badge ${client.level}">${client.level}</span>
        ${client.goal ? `<div class="client-goal">"${client.goal}"</div>` : ''}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.client-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (getLatestAssessment(id)) {
        document.getElementById('dashboard-client-select').value = id;
        navigateTo('dashboard');
        renderDashboard(id);
      } else {
        document.getElementById('assessment-client-select').value = id;
        navigateTo('assessment');
        onAssessmentClientSelect(id);
      }
    });
  });
}

// --- Modals ---
function openModal(client = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('client-form');

  form.reset();
  document.getElementById('client-id').value = '';

  if (client) {
    title.textContent = 'Editar Cliente';
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-age').value = client.age;
    document.getElementById('client-level').value = client.level;
    document.getElementById('client-goal').value = client.goal || '';
    document.getElementById('client-notes').value = client.notes || '';
  } else {
    title.textContent = 'Novo Cliente';
  }

  overlay.classList.add('active');
  setTimeout(() => document.getElementById('client-name').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

async function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const clientData = {
    name: document.getElementById('client-name').value.trim(),
    age: parseInt(document.getElementById('client-age').value),
    level: document.getElementById('client-level').value,
    goal: document.getElementById('client-goal').value.trim(),
    notes: document.getElementById('client-notes').value.trim()
  };

  let res;
  if (id) {
    res = await apiCall(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(clientData) });
  } else {
    // Basic ID generation for backend if needed, though backend should handle it
    clientData.id = Date.now().toString(36);
    res = await apiCall('/api/clients', { method: 'POST', body: JSON.stringify(clientData) });
  }

  if (res) {
    showToast(id ? 'Cliente atualizado!' : 'Cliente adicionado!');
    const allClients = await apiCall('/api/clients');
    if (allClients) appData.clients = allClients;
    closeModal();
    renderClients();
  }
}

window.editClient = function (id) {
  const client = appData.clients.find(c => c.id === id);
  if (client) openModal(client);
};

window.deleteClient = async function (id) {
  if (confirm('Tem certeza que deseja excluir este cliente?')) {
    const res = await apiCall(`/api/clients/${id}`, { method: 'DELETE' });
    if (res) {
      appData.clients = appData.clients.filter(c => c.id !== id);
      delete appData.assessments[id];
      renderClients();
      showToast('Cliente excluído', 'error');
    }
  }
};

// --- Assessment ---
function refreshAssessmentSelect() {
  const select = document.getElementById('assessment-client-select');
  select.innerHTML = '<option value="">— Escolha um cliente —</option>';
  appData.clients.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function onAssessmentClientSelect(clientId) {
  const form = document.getElementById('assessment-form');
  if (!clientId) {
    form.style.display = 'none';
    return;
  }
  form.style.display = 'block';
  document.getElementById('assessment-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('assessment-observation').value = '';
  renderSliders(clientId);
}

function renderSliders(clientId) {
  const container = document.getElementById('assessment-sliders');
  const latest = getLatestAssessment(clientId);
  const existing = latest ? latest.scores : {};

  container.innerHTML = CATEGORIES.map(cat => {
    const value = existing[cat.id] || 5;
    return `
      <div class="slider-card">
        <div class="slider-header">
          <span class="slider-label">${cat.label}</span>
          <span class="slider-value" id="val-${cat.id}">${value}</span>
        </div>
        <p class="slider-description">${cat.description}</p>
        <input type="range" class="slider-input" id="slider-${cat.id}"
          min="1" max="10" step="1" value="${value}"
          oninput="document.getElementById('val-${cat.id}').textContent = this.value">
      </div>
    `;
  }).join('');
}

async function saveAssessment(e) {
  e.preventDefault();
  const clientId = document.getElementById('assessment-client-select').value;
  if (!clientId) return;

  const scores = {};
  CATEGORIES.forEach(cat => {
    scores[cat.id] = parseInt(document.getElementById(`slider-${cat.id}`).value);
  });

  const body = {
    clientId,
    scores,
    date: document.getElementById('assessment-date').value,
    observation: document.getElementById('assessment-observation').value.trim()
  };

  const res = await apiCall('/api/assessments', { method: 'POST', body: JSON.stringify(body) });
  if (res) {
    showToast('Avaliação salva!');
    appData.assessments[clientId] = res; // Update latest in state
    setTimeout(() => {
      document.getElementById('dashboard-client-select').value = clientId;
      navigateTo('dashboard');
      renderDashboard(clientId);
    }, 500);
  }
}

// --- Dashboard ---
function refreshDashboardSelect() {
  const select = document.getElementById('dashboard-client-select');
  select.innerHTML = '<option value="">— Escolha um cliente —</option>';
  appData.clients.forEach(c => {
    const hasAssessment = getLatestAssessment(c.id);
    select.innerHTML += `<option value="${c.id}" ${!hasAssessment ? 'disabled' : ''}>${c.name} ${hasAssessment ? '' : '(sem avaliação)'}</option>`;
  });
}

async function renderDashboard(clientId) {
  const content = document.getElementById('dashboard-content');
  const empty = document.getElementById('dashboard-empty');
  const latest = getLatestAssessment(clientId);

  if (!latest) {
    content.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  content.style.display = 'block';
  empty.style.display = 'none';

  // Load history to get previous assessment for comparison
  const history = await apiCall(`/api/assessments/${clientId}/history`);
  const previous = history && history.length > 1 ? history[history.length - 2] : null;

  renderRadarChart(latest.scores, previous ? previous.scores : null);
  renderScores(latest.scores);
  renderSuggestions(latest.scores);
}

function renderRadarChart(currentScores, previousScores) {
  const ctx = document.getElementById('radar-chart').getContext('2d');
  const labels = CATEGORIES.map(c => c.label);
  const currentData = CATEGORIES.map(c => currentScores[c.id] || 0);

  const datasets = [{
    label: 'Atual',
    data: currentData,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
    pointBackgroundColor: '#6366f1',
    fill: true
  }];

  if (previousScores) {
    datasets.push({
      label: 'Anterior',
      data: CATEGORIES.map(c => previousScores[c.id] || 0),
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
      borderColor: '#94a3b8',
      borderDash: [5, 5],
      fill: true
    });
  }

  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, display: false } } },
      plugins: { legend: { display: !!previousScores } }
    }
  });
}

function renderScores(scores) {
  const container = document.getElementById('scores-list');
  const sorted = [...CATEGORIES].sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0));
  container.innerHTML = sorted.map(cat => {
    const val = scores[cat.id] || 0;
    return `
      <div class="score-item">
        <div class="score-label"><span>${cat.label}</span><span>${val}/10</span></div>
        <div class="score-bar"><div class="score-bar-fill" style="width: ${val * 10}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderSuggestions(scores) {
  const container = document.getElementById('suggestions-list');
  const weak = CATEGORIES.filter(cat => (scores[cat.id] || 0) <= 5);
  if (weak.length === 0) {
    container.innerHTML = '<p>Excelente! Todos os níveis acima de 5.</p>';
    return;
  }
  container.innerHTML = weak.map(cat => `
    <div class="suggestion-card">
      <div class="suggestion-category">${cat.label}</div>
      <ul class="suggestion-text">${cat.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
    </div>
  `).join('');
}

// --- History ---
function refreshHistorySelect() {
  const select = document.getElementById('history-client-select');
  select.innerHTML = '<option value="">— Escolha um cliente —</option>';
  appData.clients.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

async function renderHistory(clientId) {
  const content = document.getElementById('history-content');
  const empty = document.getElementById('history-empty');
  const history = await apiCall(`/api/assessments/${clientId}/history`);

  if (!history || history.length === 0) {
    content.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  content.style.display = 'block';
  empty.style.display = 'none';
  const timeline = document.getElementById('history-timeline');

  timeline.innerHTML = [...history].reverse().map((entry, idx) => {
    const avg = (CATEGORIES.reduce((s, c) => s + (entry.scores[c.id] || 0), 0) / CATEGORIES.length).toFixed(1);
    return `
      <div class="history-item">
        <div class="history-card">
          <div class="history-card-header">
            <div class="history-date">📅 ${formatDate(entry.date)} ${idx === 0 ? '<span class="history-badge-latest">Atual</span>' : ''}</div>
            <div class="history-avg">Média: <span>${avg}</span></div>
          </div>
          <div class="history-scores-grid">
            ${CATEGORIES.map(c => `<div class="history-score-badge"><span class="badge-label">${c.label}</span><span class="badge-value">${entry.scores[c.id] || 0}</span></div>`).join('')}
          </div>
          ${entry.observation ? `<div class="history-observation"><div class="history-observation-text">${entry.observation}</div></div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// --- Users ---
async function loadUsers() {
  const users = await apiCall('/api/users');
  if (!users) return;
  const list = document.getElementById('users-list');
  list.innerHTML = users.map(u => `
    <div class="client-card">
      <div class="client-name">${u.display_name || u.username}</div>
      <div class="client-meta">usuário: <strong>${u.username}</strong> | role: ${u.role}</div>
      <button class="btn btn-ghost" style="margin-top:10px; color:var(--danger)" onclick="deleteUser(${u.id})">Excluir</button>
    </div>
  `).join('');

  // Populate client select for binding
  const select = document.getElementById('user-client-id');
  select.innerHTML = '<option value="">— Sem vínculo —</option>';
  appData.clients.forEach(c => select.innerHTML += `<option value="${c.id}">${c.name}</option>`);
}

window.deleteUser = async function (id) {
  if (confirm('Excluir este usuário?')) {
    if (await apiCall(`/api/users/${id}`, { method: 'DELETE' })) loadUsers();
  }
};

// --- Mobile Navigation Helpers ---
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// --- Init ---
function init() {
  loadInitialData();

  // Sidebar nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
      closeSidebar();
    });
  });

  // Bottom nav links (mobile)
  document.querySelectorAll('.bottom-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Mobile hamburger menu
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openSidebar);
  }

  // Sidebar overlay (close on click)
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  // Logout buttons (sidebar + mobile header)
  const logoutHandler = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  };
  document.getElementById('btn-logout').addEventListener('click', logoutHandler);
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', logoutHandler);
  }

  // Client handlers
  document.getElementById('btn-add-client').addEventListener('click', () => openModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('client-form').addEventListener('submit', saveClient);

  // User handlers
  document.getElementById('btn-add-user').addEventListener('click', () => {
    document.getElementById('user-modal-overlay').classList.add('active');
  });
  document.getElementById('user-modal-close').addEventListener('click', () => document.getElementById('user-modal-overlay').classList.remove('active'));
  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      username: document.getElementById('user-username').value,
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value,
      display_name: document.getElementById('user-display-name').value,
      clientId: document.getElementById('user-client-id').value || null
    };
    if (await apiCall('/api/users', { method: 'POST', body: JSON.stringify(body) })) {
      showToast('Usuário criado!');
      document.getElementById('user-modal-overlay').classList.remove('active');
      loadUsers();
    }
  });

  // Select handlers
  document.getElementById('assessment-client-select').addEventListener('change', (e) => onAssessmentClientSelect(e.target.value));
  document.getElementById('assessment-form').addEventListener('submit', saveAssessment);
  document.getElementById('dashboard-client-select').addEventListener('change', (e) => e.target.value && renderDashboard(e.target.value));
  document.getElementById('history-client-select').addEventListener('change', (e) => e.target.value && renderHistory(e.target.value));
}

document.addEventListener('DOMContentLoaded', init);
