// ====================================
// ClimbTracker — Client Routes
// ====================================

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from './auth.js';

const router = Router();

// GET /api/clients — List clients
router.get('/', requireAuth, async (req, res) => {
    try {
        const { user } = req.session;

        let result;
        if (user.role === 'admin') {
            result = await query('SELECT * FROM clients ORDER BY created_at DESC');
        } else {
            // Client can only see their own data
            result = await query('SELECT * FROM clients WHERE id = $1', [user.clientId]);
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar clientes:', err);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
});

// GET /api/clients/:id — Get single client
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { user } = req.session;
        const { id } = req.params;

        // Clients can only access their own data
        if (user.role !== 'admin' && user.clientId !== id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await query('SELECT * FROM clients WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

// POST /api/clients — Create client
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { id, name, age, level, goal, notes } = req.body;

        if (!name || !age) {
            return res.status(400).json({ error: 'Nome e idade são obrigatórios' });
        }

        const clientId = id || Date.now().toString(36) + Math.random().toString(36).slice(2);

        const result = await query(
            `INSERT INTO clients (id, name, age, level, goal, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [clientId, name, age, level || 'iniciante', goal || '', notes || '']
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao criar cliente:', err);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// PUT /api/clients/:id — Update client
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, level, goal, notes } = req.body;

        const result = await query(
            `UPDATE clients SET name = $2, age = $3, level = $4, goal = $5, notes = $6
       WHERE id = $1
       RETURNING *`,
            [id, name, age, level, goal || '', notes || '']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar cliente:', err);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// DELETE /api/clients/:id — Delete client
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json({ success: true, deleted: id });
    } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});

export default router;
