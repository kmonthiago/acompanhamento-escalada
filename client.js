// ====================================
// ClimbTracker — Client Portal Logic
// ====================================

import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

// --- Categories ---
const CATEGORIES = [
    {
        id: 'finger_strength', label: 'Força de Dedos', suggestions: [
            'Hangboard progressivo (3x10s em reglete 20mm)', 'Dead hangs com peso adicional',
            'Treino de pinça com pinch blocks', 'Repeaters: 7s on / 3s off x 6 reps'
        ]
    },
    {
        id: 'upper_body', label: 'Trem Superior', suggestions: [
            'Séries de pull-ups progressivas (3x máx)', 'Lock-offs negativos de 5 segundos',
            'Frenchies (lock-off em 3 ângulos)', 'Campus board: movimentos controlados'
        ]
    },
    {
        id: 'core', label: 'Core / Tensão Corporal', suggestions: [
            'Front lever progressions (3x15s)', 'L-sit em paralelas (4x20s)',
            'Prancha com variações (side plank, plank walks)', 'Toe-to-bar: 3x8 reps'
        ]
    },
    {
        id: 'flexibility', label: 'Flexibilidade / Mobilidade', suggestions: [
            'Frog stretch: 3x60s diariamente', 'Alongamento dinâmico de quadril pré-treino',
            'Pigeon pose: 2x90s cada lado', 'Mobilidade de ombros com band pull-aparts'
        ]
    },
    {
        id: 'body_awareness', label: 'Consciência Corporal', suggestions: [
            'Escalada de olhos fechados em boulder V0-V1', 'Drills de equilíbrio unipodal (30s cada pé)',
            'Movimentos estáticos com pausa de 2s em cada posição', 'Yoga orientada para escalada (2x/semana)'
        ]
    },
    {
        id: 'route_reading', label: 'Leitura de Vias', suggestions: [
            'Visualização pré-escalada: estudar a via 2 min antes', 'Flash attempts em boulders novos',
            'Prática de beta sharing com parceiros', 'Gravar vídeo e analisar movimentos depois'
        ]
    },
    {
        id: 'endurance', label: 'Resistência', suggestions: [
            'ARC training: 20 min de escalada leve contínua', 'Circuitos 4x4 (4 boulders x 4 rounds)',
            'Escalada em top-rope com volume alto (6-8 vias)', 'Intervalados: 3 min on / 3 min off x 5 rounds'
        ]
    },
    {
        id: 'footwork', label: 'Técnica de Pés', suggestions: [
            'Drill silencioso: escalar sem fazer barulho nos pés', 'Escalada com ênfase nos pés',
            'Treino de footswap em posições estáticas', 'Slab climbing focado em precisão'
        ]
    }
];

let radarChart = null;
let currentUser = null;

// --- Auth Check ---
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login.html';
            return null;
        }
        const data = await res.json();
        if (data.user.role === 'admin') {
            window.location.href = '/index.html';
            return null;
        }
        return data.user;
    } catch (e) {
        window.location.href = '/login.html';
        return null;
    }
}

// --- Logout ---
async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
}

// --- Load Data ---
async function loadClientData(clientId) {
    const [clientRes, assessmentRes, historyRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/assessments/${clientId}`),
        fetch(`/api/assessments/${clientId}/history`)
    ]);

    const client = await clientRes.json();
    const assessment = await assessmentRes.json();
    const history = await historyRes.json();

    return { client, assessment, history };
}

// --- Render Profile ---
function renderProfile(client) {
    const initials = client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('profile-avatar').textContent = initials;
    document.getElementById('profile-name').textContent = client.name;
    document.getElementById('profile-age').textContent = `${client.age} anos`;

    const badge = document.getElementById('profile-level');
    badge.textContent = client.level;
    badge.className = `profile-badge ${client.level}`;

    const goalEl = document.getElementById('profile-goal');
    if (client.goal) {
        goalEl.textContent = `"${client.goal}"`;
        goalEl.style.display = 'block';
    } else {
        goalEl.style.display = 'none';
    }
}

// --- Render Radar Chart ---
function renderRadarChart(assessment) {
    const ctx = document.getElementById('radar-chart').getContext('2d');
    const labels = CATEGORIES.map(c => c.label);
    const data = CATEGORIES.map(c => assessment[c.id] || 0);

    if (radarChart) radarChart.destroy();

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'Performance',
                data,
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.8)',
                borderWidth: 2,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#818cf8',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleFont: { family: 'Inter', size: 13 },
                    bodyFont: { family: 'Inter', size: 12 },
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `Escore: ${ctx.raw}/10`
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 10,
                    ticks: { stepSize: 2, color: 'rgba(255,255,255,0.3)', backdropColor: 'transparent', font: { size: 10 } },
                    pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 10, weight: '500' }, padding: 12 },
                    grid: { color: 'rgba(255,255,255,0.06)', circular: true },
                    angleLines: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

// --- Render Scores ---
function renderScores(assessment) {
    const container = document.getElementById('scores-list');
    const sorted = [...CATEGORIES].sort((a, b) => (assessment[a.id] || 0) - (assessment[b.id] || 0));

    container.innerHTML = sorted.map(cat => {
        const score = assessment[cat.id] || 0;
        const percent = (score / 10) * 100;
        return `
      <div class="score-item">
        <div class="score-label">
          <span>${cat.label}</span>
          <span>${score}/10</span>
        </div>
        <div class="score-bar">
          <div class="score-bar-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
    }).join('');

    // Overall score
    const total = CATEGORIES.reduce((sum, cat) => sum + (assessment[cat.id] || 0), 0);
    const avg = (total / CATEGORIES.length).toFixed(1);
    document.getElementById('overall-value').textContent = `${avg}/10`;
}

// --- Render Suggestions ---
function renderSuggestions(assessment) {
    const section = document.getElementById('suggestions-section');
    const container = document.getElementById('suggestions-list');

    const weak = CATEGORIES
        .filter(cat => (assessment[cat.id] || 0) <= 5)
        .sort((a, b) => (assessment[a.id] || 0) - (assessment[b.id] || 0));

    if (weak.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = weak.map(cat => {
        const score = assessment[cat.id] || 0;
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

// --- Render History ---
function renderHistory(history) {
    const section = document.getElementById('history-section');
    const container = document.getElementById('history-list');

    if (!history || history.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = history.map((entry, idx) => {
        const date = new Date(entry.date).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
        const total = CATEGORIES.reduce((sum, cat) => sum + (entry[cat.id] || 0), 0);
        const avg = (total / CATEGORIES.length).toFixed(1);

        return `
      <div class="history-card" onclick="this.classList.toggle('expanded')">
        <div class="history-header">
          <span class="history-date">📅 ${date}</span>
          <span class="history-avg">Média: ${avg}/10</span>
        </div>
        <div class="history-details">
          <div class="history-scores">
            ${CATEGORIES.map(cat => `
              <div class="history-score-item">
                <span>${cat.label}</span>
                <span>${entry[cat.id] || 0}/10</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    }).join('');
}

// --- Init ---
async function init() {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('user-greeting').textContent = `Olá, ${currentUser.displayName}`;
    document.getElementById('btn-logout').addEventListener('click', logout);

    try {
        const { client, assessment, history } = await loadClientData(currentUser.clientId);

        // Hide loading, show content
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('client-content').style.display = 'block';

        renderProfile(client);

        if (assessment) {
            document.getElementById('no-assessment').style.display = 'none';
            document.getElementById('current-assessment').style.display = 'block';
            renderRadarChart(assessment);
            renderScores(assessment);
            renderSuggestions(assessment);
        } else {
            document.getElementById('no-assessment').style.display = 'flex';
            document.getElementById('current-assessment').style.display = 'none';
        }

        renderHistory(history);
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        document.getElementById('loading-state').innerHTML = `
      <div class="empty-icon">❌</div>
      <p>Erro ao carregar seus dados. Tente novamente.</p>
    `;
    }
}

document.addEventListener('DOMContentLoaded', init);
