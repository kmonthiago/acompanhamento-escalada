// ====================================
// ClimbTracker — Assessment Routes
// ====================================

import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from './auth.js';

const router = Router();

const SCORE_FIELDS = [
    'finger_strength', 'upper_body', 'core', 'flexibility',
    'body_awareness', 'route_reading', 'endurance', 'footwork'
];

// GET /api/assessments/:clientId — Get latest assessment
router.get('/:clientId', requireAuth, async (req, res) => {
    try {
        const { user } = req.session;
        const { clientId } = req.params;

        if (user.role !== 'admin' && user.clientId !== clientId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await query(
            `SELECT * FROM assessments WHERE client_id = $1 ORDER BY date DESC LIMIT 1`,
            [clientId]
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        const row = result.rows[0];
        const scores = {};
        SCORE_FIELDS.forEach(field => {
            scores[field] = row[field];
        });

        res.json({
            id: row.id,
            scores,
            date: row.date,
            observation: row.observation || ''
        });
    } catch (err) {
        console.error('Erro ao buscar avaliação:', err);
        res.status(500).json({ error: 'Erro ao buscar avaliação' });
    }
});

// GET /api/assessments/:clientId/history — Get all assessments (full history)
router.get('/:clientId/history', requireAuth, async (req, res) => {
    try {
        const { user } = req.session;
        const { clientId } = req.params;

        if (user.role !== 'admin' && user.clientId !== clientId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await query(
            `SELECT * FROM assessments WHERE client_id = $1 ORDER BY date ASC`,
            [clientId]
        );

        const history = result.rows.map(row => {
            const scores = {};
            SCORE_FIELDS.forEach(field => {
                scores[field] = row[field];
            });
            return {
                id: row.id,
                scores,
                date: row.date,
                observation: row.observation || '',
                created_by: row.created_by
            };
        });

        res.json(history);
    } catch (err) {
        console.error('Erro ao buscar histórico:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

// POST /api/assessments — Save assessment (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { clientId, scores, observation, date } = req.body;

        if (!clientId || !scores) {
            return res.status(400).json({ error: 'clientId e scores são obrigatórios' });
        }

        // Verify client exists
        const clientCheck = await query('SELECT id FROM clients WHERE id = $1', [clientId]);
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const values = SCORE_FIELDS.map(f => scores[f] || 5);
        const assessmentDate = date ? new Date(date) : new Date();

        const result = await query(
            `INSERT INTO assessments (client_id, finger_strength, upper_body, core, flexibility, body_awareness, route_reading, endurance, footwork, observation, date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [clientId, ...values, observation || '', assessmentDate, req.session.user.username]
        );

        const row = result.rows[0];
        const resScores = {};
        SCORE_FIELDS.forEach(field => {
            resScores[field] = row[field];
        });

        res.status(201).json({
            id: row.id,
            scores: resScores,
            date: row.date,
            observation: row.observation || ''
        });
    } catch (err) {
        console.error('Erro ao salvar avaliação:', err);
        res.status(500).json({ error: 'Erro ao salvar avaliação' });
    }
});

// GET /api/assessments — Get all latest assessments grouped by client (admin)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT DISTINCT ON (client_id) * FROM assessments 
       ORDER BY client_id, date DESC`
        );

        const assessmentsByClient = {};
        result.rows.forEach(row => {
            const scores = {};
            SCORE_FIELDS.forEach(field => {
                scores[field] = row[field];
            });
            assessmentsByClient[row.client_id] = {
                id: row.id,
                scores,
                date: row.date,
                observation: row.observation || ''
            };
        });

        res.json(assessmentsByClient);
    } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
        res.status(500).json({ error: 'Erro ao buscar avaliações' });
    }
});

export default router;
