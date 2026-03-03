// ====================================
// ClimbTracker — Server
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

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'climbtracker-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.RENDER === 'true',
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
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
    }

    // Serve specific HTML files
    const htmlFiles = ['login.html', 'client.html', 'index.html'];
    const requestedFile = req.path.slice(1); // remove leading /

    if (htmlFiles.includes(requestedFile)) {
        return res.sendFile(join(__dirname, 'dist', requestedFile));
    }

    // Default: serve login page
    res.sendFile(join(__dirname, 'dist', 'login.html'));
});

// --- Start Server ---
async function start() {
    try {
        await initDB();
        console.log('✅ Banco de dados inicializado');

        app.listen(PORT, () => {
            console.log(`🧗 ClimbTracker rodando em http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao iniciar:', err);
        process.exit(1);
    }
}

start();
