// ====================================
// ClimbTracker — Server (Improved Debugging)
// ====================================

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import assessmentRoutes from './routes/assessments.js';
import userRoutes from './routes/users.js';
import { initDB } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Logger Middleware ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
}));

// Trust proxy for Render
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/users', userRoutes);

// --- Static Files ---
// Serve static files from 'dist'
app.use(express.static(join(__dirname, 'dist')));

// Fallback for SPA or direct HTML access
app.get('*', (req, res) => {
    // If it's an API call that wasn't caught, 404 JSON
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: `API route not found: ${req.url}` });
    }

    // For all other routes, try to serve index.html or the specific file
    // Check if the path points to client.html or login.html specifically
    if (req.url === '/login' || req.url === '/login.html') {
        return res.sendFile(join(__dirname, 'dist', 'login.html'));
    }
    if (req.url === '/client' || req.url === '/client.html') {
        return res.sendFile(join(__dirname, 'dist', 'client.html'));
    }
    if (req.url === '/admin' || req.url === '/index.html' || req.url === '/') {
        return res.sendFile(join(__dirname, 'dist', 'index.html'));
    }

    // Default to login page if nothing else matches
    res.sendFile(join(__dirname, 'dist', 'login.html'));
});

// --- Start Server ---
async function start() {
    try {
        console.log('⏳ Inicializando banco de dados...');
        await initDB();
        console.log('✅ Banco de dados pronto.');

        app.listen(PORT, () => {
            console.log(`🧗 ClimbTracker rodando na porta ${PORT}`);
            if (process.env.NODE_ENV === 'production') {
                console.log('🚀 Modo Produção Ativo');
            }
        });
    } catch (err) {
        console.error('❌ Erro FATAL ao iniciar servidor:', err);
        process.exit(1);
    }
}

start();
