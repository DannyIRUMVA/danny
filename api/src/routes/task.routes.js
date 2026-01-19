import express from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { io, notifyUser } from '../server.js';

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
router.get('/', auth, async (req, res) => {
  const mine = req.query.mine === 'true';
  if (mine) {
    const { id: userId } = req.user;
    const { rows } = await pool.query(
      `SELECT t.*, u.email AS assigned_to_email
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.assigned_to=$1`,
      [userId]
    );
    return res.json(rows);
  }

  const { rows } = await pool.query(
    `SELECT t.*, u.email AS assigned_to_email
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id`
  );
  res.json(rows);
});

// Simple users endpoint for frontend dropdown (no auth for demo, but ideally protect)
router.get('/users/all', async (req, res) => {
  const { rows } = await pool.query('SELECT id, email FROM users ORDER BY email');
  res.json(rows);
});

/**
 * Get single task by id (with assigned user email)
 */
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT t.*, u.email AS assigned_to_email
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id=$1`,
    [id]
  );
  if (!rows.length) return res.sendStatus(404);
  res.json(rows[0]);
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
 *     requestBody:[black@arch ~]$ curl -X POST http://localhost:3000/tasks \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzY4ODE2MTczfQ.zUmFD4QiYdM2Czt4H374uOixPj9WZTWHDlfNJtsXvj4" \
     -d '{
       "title": "Complete Dashboard UI",
       "description": "Fix alignment issues in the task management view",
       "assigned_to": 1,
       "status": "pending",
       "due_date": "2026-02-01"
     }'
curl: (52) Empty reply from server
[black@arch ~]$ 


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

  const { rows: ins } = await pool.query(
    `INSERT INTO tasks (title, description, assigned_to, status, due_date)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [title, description, assigned_to, status, due_date]
  );

  const id = ins[0].id;
  const { rows } = await pool.query(
    `SELECT t.*, u.email AS assigned_to_email
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id=$1`,
    [id]
  );

  io.emit('task:update', rows[0]);
  // Add an assignment row and notify user if assigned_to provided
  if (rows[0].assigned_to) {
    try {
      await pool.query('INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rows[0].id, rows[0].assigned_to]);
      notifyUser(rows[0].assigned_to, { type: 'task:assigned', task: rows[0] });
    } catch (e) {
      // ignore
    }
  }
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
  const { id } = req.params;

  // Allow partial updates for fields: title, description, assigned_to, status, due_date
  const allowed = ['title', 'description', 'assigned_to', 'status', 'due_date'];
  const keys = Object.keys(req.body).filter((k) => allowed.includes(k));

  if (!keys.length) return res.status(400).json({ error: 'No updatable fields provided' });

  const sets = keys.map((k, i) => `${k}=$${i + 1}`);
  const values = keys.map((k) => req.body[k]);
  values.push(id);

  const q = `UPDATE tasks SET ${sets.join(', ')} WHERE id=$${values.length} RETURNING id`;
  const { rows: up } = await pool.query(q, values);

  const updatedId = up[0].id;
  const { rows } = await pool.query(
    `SELECT t.*, u.email AS assigned_to_email
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id=$1`,
    [updatedId]
  );

  io.emit('task:update', rows[0]);
  // If assignment changed, ensure task_assignments row and notify
  if (rows[0].assigned_to) {
    try {
      await pool.query('INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rows[0].id, rows[0].assigned_to]);
      notifyUser(rows[0].assigned_to, { type: 'task:assigned', task: rows[0] });
    } catch (e) {
      // ignore
    }
  }
  res.json(rows[0]);
});

/**
 * Delete a task
 */
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
  io.emit('task:delete', { id: Number(id) });
  res.json({ success: true });
});

// Assign a task to a user
router.post('/:id/assign', auth, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  await pool.query('INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, user_id]);
  // update tasks.assigned_to for convenience
  await pool.query('UPDATE tasks SET assigned_to=$1 WHERE id=$2', [user_id, id]);

  const { rows } = await pool.query(
    `SELECT t.*, u.email AS assigned_to_email
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id=$1`,
    [id]
  );

  // notify user
  notifyUser(user_id, { type: 'task:assigned', task: rows[0] });

  io.emit('task:update', rows[0]);
  res.json(rows[0]);
});

export default router;
