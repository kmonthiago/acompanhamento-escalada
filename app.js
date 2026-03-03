// ====================================
// ClimbTracker — Main Application
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

// --- Storage ---
const STORAGE_KEY = 'climbtracker_data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Migrate old format: convert single assessment objects to arrays
      if (data.assessments) {
        for (const clientId in data.assessments) {
          const val = data.assessments[clientId];
          if (!Array.isArray(val)) {
            // Old format: { finger_strength: 7, ..., date: "..." }
            const scores = {};
            let date = new Date().toISOString();
            let observation = '';
            CATEGORIES.forEach(cat => {
              if (val[cat.id] !== undefined) scores[cat.id] = val[cat.id];
            });
            if (val.date) date = val.date;
            data.assessments[clientId] = [{ scores, date, observation }];
          }
        }
      }
      return data;
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return { clients: [], assessments: {} };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Helper: get latest assessment for a client ---
function getLatestAssessment(clientId) {
  const arr = appData.assessments[clientId];
  if (!arr || arr.length === 0) return null;
  return arr[arr.length - 1];
}

// --- Helper: get previous assessment for a client ---
function getPreviousAssessment(clientId) {
  const arr = appData.assessments[clientId];
  if (!arr || arr.length < 2) return null;
  return arr[arr.length - 2];
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

// --- State ---
let appData = loadData();
let currentPage = 'clients';
let radarChart = null;

// --- Router ---
function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Refresh content for each page
  if (page === 'clients') renderClients();
  if (page === 'assessment') refreshAssessmentSelect();
  if (page === 'dashboard') refreshDashboardSelect();
  if (page === 'history') refreshHistorySelect();
}

// --- Toast ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// --- Clients ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

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
    const assessmentCount = appData.assessments[client.id]?.length || 0;
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
          <span>${latest ? `✅ ${assessmentCount} avaliação(ões)` : '⏳ Pendente'}</span>
        </div>
        <span class="client-badge ${client.level}">${client.level}</span>
        ${client.goal ? `<div class="client-goal">"${client.goal}"</div>` : ''}
      </div>
    `;
  }).join('');

  // Click to go to dashboard
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

// --- Modal ---
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

function saveClient(e) {
  e.preventDefault();

  const id = document.getElementById('client-id').value;
  const clientData = {
    id: id || generateId(),
    name: document.getElementById('client-name').value.trim(),
    age: parseInt(document.getElementById('client-age').value),
    level: document.getElementById('client-level').value,
    goal: document.getElementById('client-goal').value.trim(),
    notes: document.getElementById('client-notes').value.trim(),
    createdAt: id ? undefined : new Date().toISOString()
  };

  if (id) {
    const idx = appData.clients.findIndex(c => c.id === id);
    if (idx >= 0) {
      clientData.createdAt = appData.clients[idx].createdAt;
      appData.clients[idx] = clientData;
    }
    showToast('Cliente atualizado com sucesso!');
  } else {
    appData.clients.push(clientData);
    showToast('Cliente adicionado com sucesso!');
  }

  saveData(appData);
  closeModal();
  renderClients();
}

// Global functions for onclick handlers
window.editClient = function (id) {
  const client = appData.clients.find(c => c.id === id);
  if (client) openModal(client);
};

window.deleteClient = function (id) {
  if (confirm('Tem certeza que deseja excluir este cliente?')) {
    appData.clients = appData.clients.filter(c => c.id !== id);
    delete appData.assessments[id];
    saveData(appData);
    renderClients();
    showToast('Cliente excluído', 'error');
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

  // Set default date to today
  const dateInput = document.getElementById('assessment-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  // Clear observation
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
          data-category="${cat.id}"
          oninput="document.getElementById('val-${cat.id}').textContent = this.value">
        <div class="slider-scale">
          <span>1</span>
          <span>Fraco</span>
          <span>Médio</span>
          <span>Forte</span>
          <span>10</span>
        </div>
      </div>
    `;
  }).join('');
}

function saveAssessment(e) {
  e.preventDefault();

  const clientId = document.getElementById('assessment-client-select').value;
  if (!clientId) return;

  const scores = {};
  CATEGORIES.forEach(cat => {
    const slider = document.getElementById(`slider-${cat.id}`);
    scores[cat.id] = parseInt(slider.value);
  });

  const date = document.getElementById('assessment-date').value || new Date().toISOString().split('T')[0];
  const observation = document.getElementById('assessment-observation').value.trim();

  const assessmentEntry = {
    scores,
    date: new Date(date + 'T12:00:00').toISOString(),
    observation
  };

  // Push to array (create if doesn't exist)
  if (!appData.assessments[clientId]) {
    appData.assessments[clientId] = [];
  }
  appData.assessments[clientId].push(assessmentEntry);
  saveData(appData);

  showToast('Avaliação salva com sucesso!');

  // Navigate to dashboard
  setTimeout(() => {
    document.getElementById('dashboard-client-select').value = clientId;
    navigateTo('dashboard');
    renderDashboard(clientId);
  }, 500);
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

function renderDashboard(clientId) {
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

  const previous = getPreviousAssessment(clientId);
  renderRadarChart(latest.scores, previous ? previous.scores : null);
  renderScores(latest.scores);
  renderSuggestions(latest.scores);
}

function renderRadarChart(currentScores, previousScores) {
  const ctx = document.getElementById('radar-chart').getContext('2d');

  const labels = CATEGORIES.map(c => c.label);
  const currentData = CATEGORIES.map(c => currentScores[c.id] || 0);

  const datasets = [{
    label: 'Avaliação Atual',
    data: currentData,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.8)',
    borderWidth: 2,
    pointBackgroundColor: '#6366f1',
    pointBorderColor: '#818cf8',
    pointBorderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 7,
    fill: true
  }];

  // Add previous assessment overlay if exists
  if (previousScores) {
    const prevData = CATEGORIES.map(c => previousScores[c.id] || 0);
    datasets.push({
      label: 'Avaliação Anterior',
      data: prevData,
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      borderColor: 'rgba(148, 163, 184, 0.4)',
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointBackgroundColor: '#64748b',
      pointBorderColor: '#94a3b8',
      pointBorderWidth: 1,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: true
    });
  }

  if (radarChart) radarChart.destroy();

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: previousScores ? true : false,
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleFont: { family: 'Inter', size: 13 },
          bodyFont: { family: 'Inter', size: 12 },
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}/10`
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            color: 'rgba(255,255,255,0.3)',
            backdropColor: 'transparent',
            font: { size: 10 }
          },
          pointLabels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11, weight: '500' },
            padding: 15
          },
          grid: {
            color: 'rgba(255,255,255,0.06)',
            circular: true
          },
          angleLines: {
            color: 'rgba(255,255,255,0.06)'
          }
        }
      }
    }
  });
}

function renderScores(scores) {
  const container = document.getElementById('scores-list');

  const sorted = [...CATEGORIES].sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0));

  container.innerHTML = sorted.map(cat => {
    const score = scores[cat.id] || 0;
    const percent = (score / 10) * 100;
    return `
      <div class="score-item">
        <div class="score-bar-wrap">
          <div class="score-label">
            <span>${cat.label}</span>
            <span>${score}/10</span>
          </div>
          <div class="score-bar">
            <div class="score-bar-fill" style="width: ${percent}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSuggestions(scores) {
  const container = document.getElementById('suggestions-list');

  const weak = CATEGORIES
    .filter(cat => (scores[cat.id] || 0) <= 5)
    .sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0));

  if (weak.length === 0) {
    container.innerHTML = `
      <div class="no-suggestions">
        <div class="emoji">🎉</div>
        <p>Todos os escores estão acima de 5! Excelente performance geral.</p>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">Continue mantendo o nível e considere desafios mais avançados.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = weak.map(cat => {
    const score = scores[cat.id] || 0;
    return `
      <div class="suggestion-card">
        <div class="suggestion-category">${cat.label}</div>
        <div class="suggestion-score">Escore atual: ${score}/10</div>
        <ul class="suggestion-text">
          ${cat.suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

// --- History ---
function refreshHistorySelect() {
  const select = document.getElementById('history-client-select');
  select.innerHTML = '<option value="">— Escolha um cliente —</option>';
  appData.clients.forEach(c => {
    const count = appData.assessments[c.id]?.length || 0;
    select.innerHTML += `<option value="${c.id}">${c.name} ${count > 0 ? `(${count} avaliações)` : '(sem avaliação)'}</option>`;
  });
}

function renderHistory(clientId) {
  const content = document.getElementById('history-content');
  const empty = document.getElementById('history-empty');
  const assessments = appData.assessments[clientId];

  if (!assessments || assessments.length === 0) {
    content.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  content.style.display = 'block';
  empty.style.display = 'none';

  const timeline = document.getElementById('history-timeline');

  // Render in reverse chronological order (latest first)
  const sorted = [...assessments].reverse();

  timeline.innerHTML = sorted.map((entry, index) => {
    const scores = entry.scores;
    const avg = (CATEGORIES.reduce((sum, cat) => sum + (scores[cat.id] || 0), 0) / CATEGORIES.length).toFixed(1);
    const isLatest = index === 0;

    return `
      <div class="history-item">
        <div class="history-card">
          <div class="history-card-header">
            <div class="history-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(entry.date)}
              ${isLatest ? '<span class="history-badge-latest">Mais recente</span>' : ''}
            </div>
            <div class="history-avg">
              Média: <span class="history-avg-value">${avg}</span>
            </div>
          </div>
          <div class="history-scores-grid">
            ${CATEGORIES.map(cat => {
      const score = scores[cat.id] || 0;
      const level = score <= 4 ? 'low' : score <= 6 ? 'medium' : 'high';
      return `
                <div class="history-score-badge">
                  <span class="badge-label">${cat.label}</span>
                  <span class="badge-value ${level}">${score}</span>
                </div>
              `;
    }).join('')}
          </div>
          ${entry.observation ? `
            <div class="history-observation">
              <div class="history-observation-label">📝 Observação</div>
              <div class="history-observation-text">${entry.observation}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// --- Mobile Menu ---
function setupMobile() {
  if (window.innerWidth <= 768) {
    if (!document.querySelector('.mobile-menu-btn')) {
      const btn = document.createElement('button');
      btn.className = 'mobile-menu-btn';
      btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
      btn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
      document.body.appendChild(btn);
    }
  }
}

// --- Init ---
function init() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
      // Close mobile menu
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Client modal
  document.getElementById('btn-add-client').addEventListener('click', () => openModal());
  document.getElementById('btn-add-client-empty').addEventListener('click', () => openModal());
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('client-form').addEventListener('submit', saveClient);

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Assessment
  document.getElementById('assessment-client-select').addEventListener('change', (e) => {
    onAssessmentClientSelect(e.target.value);
  });
  document.getElementById('assessment-form').addEventListener('submit', saveAssessment);

  // Dashboard
  document.getElementById('dashboard-client-select').addEventListener('change', (e) => {
    if (e.target.value) renderDashboard(e.target.value);
    else {
      document.getElementById('dashboard-content').style.display = 'none';
    }
  });

  // History
  document.getElementById('history-client-select').addEventListener('change', (e) => {
    if (e.target.value) renderHistory(e.target.value);
    else {
      document.getElementById('history-content').style.display = 'none';
      document.getElementById('history-empty').style.display = 'none';
    }
  });

  // Mobile
  setupMobile();
  window.addEventListener('resize', setupMobile);

  // Initial render
  renderClients();
}

document.addEventListener('DOMContentLoaded', init);
