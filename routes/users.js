// ====================================
// ClimbTracker — User Management Routes
// ====================================

import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { requireAdmin } from './auth.js';

const router = Router();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// GET /api/users — List all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.role, u.client_id, u.display_name, u.created_at, c.name as client_name
       FROM users u
       LEFT JOIN clients c ON u.client_id = c.id
       ORDER BY u.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// POST /api/users — Create user (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { username, password, role, clientId, displayName } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e senha são obrigatórios' });
        }

        if (role === 'client' && !clientId) {
            return res.status(400).json({ error: 'clientId é obrigatório para usuários do tipo cliente' });
        }

        const hash = hashPassword(password);

        const result = await query(
            `INSERT INTO users (username, password_hash, role, client_id, display_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, role, client_id, display_name, created_at`,
            [username.toLowerCase().trim(), hash, role || 'client', clientId || null, displayName || username]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username já existe' });
        }
        console.error('Erro ao criar usuário:', err);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// PUT /api/users/:id — Update user (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role, clientId, displayName } = req.body;

        let updateQuery;
        let params;

        if (password) {
            const hash = hashPassword(password);
            updateQuery = `UPDATE users SET username = $2, password_hash = $3, role = $4, client_id = $5, display_name = $6
                     WHERE id = $1
                     RETURNING id, username, role, client_id, display_name, created_at`;
            params = [id, username.toLowerCase().trim(), hash, role, clientId || null, displayName || username];
        } else {
            updateQuery = `UPDATE users SET username = $2, role = $3, client_id = $4, display_name = $5
                     WHERE id = $1
                     RETURNING id, username, role, client_id, display_name, created_at`;
            params = [id, username.toLowerCase().trim(), role, clientId || null, displayName || username];
        }

        const result = await query(updateQuery, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username já existe' });
        }
        console.error('Erro ao atualizar usuário:', err);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// DELETE /api/users/:id — Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting own account
        if (req.session.user.id === parseInt(id)) {
            return res.status(400).json({ error: 'Não é possível excluir sua própria conta' });
        }

        const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ success: true, deleted: id });
    } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

export default router;
