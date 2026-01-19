import express from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: Task management
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         assigned_to:
 *           type: integer
 *         status:
 *           type: string
 *         due_date:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List tasks
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 */
// If query param `mine=true` filter tasks assigned to the authenticated user
router.get('/', auth, async (req, res) => {
  const mine = req.query.mine === 'true';
  if (mine) {
    const { id: userId } = req.user;
    const { rows } = await pool.query('SELECT * FROM tasks WHERE assigned_to=$1', [userId]);
    return res.json(rows);
  }

  const { rows } = await pool.query('SELECT * FROM tasks');
  res.json(rows);
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create task
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: Created task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, async (req, res) => {
  const { title, description, assigned_to, status, due_date } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, assigned_to, status, due_date)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [title, description, assigned_to, status, due_date]
  );

  io.emit('task:update', rows[0]);
  res.json(rows[0]);
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update task status
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Updated task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  const { rows } = await pool.query(
    'UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *',
    [status, id]
  );

  io.emit('task:update', rows[0]);
  res.json(rows[0]);
});

export default router;
