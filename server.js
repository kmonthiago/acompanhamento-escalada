// ====================================
// ClimbTracker — Server (Resilient Routing & Debug)
// ====================================

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import assessmentRoutes from './routes/assessments.js';
import userRoutes from './routes/users.js';
import { initDB } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, 'dist');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Logger Middleware ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} (IP: ${req.ip})`);
    next();
});

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'climbtracker-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
}));

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// --- Status Route (Ping) ---
app.get('/api/ping', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        env: process.env.NODE_ENV,
        distExists: fs.existsSync(distPath)
    });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/users', userRoutes);

// --- Static Files ---
if (fs.existsSync(distPath)) {
    console.log('✅ Pasta dist encontrada. Servindo arquivos estáticos.');
    app.use(express.static(distPath));
} else {
    console.warn('⚠️ AVISO: Pasta dist não encontrada! O build pode ter falhado.');
}

// Fixed Fallback Logic
app.get('*', (req, res) => {
    // If API, avoid serving HTML
    if (req.path.startsWith('/api/')) {
        console.log(`❌ 404 API Not Found: ${req.path}`);
        return res.status(404).json({ error: `API route not found: ${req.path}` });
    }

    // Try to serve requested file explicitly if it looks like one
    if (req.path.includes('.')) {
        const filePath = join(distPath, req.path);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }

    // SPA Routes
    if (req.path === '/client' || req.path === '/client.html') {
        const p = join(distPath, 'client.html');
        return fs.existsSync(p) ? res.sendFile(p) : res.status(404).send('client.html not found in dist');
    }

    if (req.path === '/index.html' || req.path === '/admin' || req.path === '/') {
        const p = join(distPath, 'index.html');
        return fs.existsSync(p) ? res.sendFile(p) : res.status(404).send('index.html not found in dist');
    }

    // Default to login
    const loginPath = join(distPath, 'login.html');
    if (fs.existsSync(loginPath)) {
        res.sendFile(loginPath);
    } else {
        res.status(404).send('Página não encontrada (login.html missing). Por favor, verifique o build do Render.');
    }
});

// --- Start Server ---
async function start() {
    try {
        console.log('⏳ Conectando ao Neon...');
        await initDB();
        console.log('✅ Conexão com Neon OK.');

        app.listen(PORT, () => {
            console.log(`🧗 ClimbTracker ativo na porta ${PORT}`);
        });
    } catch (err) {
        console.error('❌ ERRO CRÍTICO na inicialização:', err);
        process.exit(1);
    }
}

start();
