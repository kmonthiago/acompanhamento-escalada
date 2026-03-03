// ====================================
// ClimbTracker — Auth Routes
// ====================================

import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = Router();

// --- Helpers ---
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// --- Middleware ---
export function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    next();
}

export function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
}

// --- Routes ---

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e senha são obrigatórios' });
        }

        const hash = hashPassword(password);
        const result = await query(
            'SELECT id, username, role, client_id, display_name FROM users WHERE username = $1 AND password_hash = $2',
            [username.toLowerCase().trim(), hash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            clientId: user.client_id,
            displayName: user.display_name
        };

        res.json({
            success: true,
            user: req.session.user
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.json({ success: true });
    });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    res.json({ user: req.session.user });
});

export default router;
