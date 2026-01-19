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

/**
 * @swagger
 * /tasks/users/all:
 *   get:
 *     summary: Get all users (id and email)
 *     tags:
 *       - Tasks
 *     responses:
 *       200:
 *         description: Array of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

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
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task by id
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 */

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
  console.log('POST /tasks payload:', { title, description, assigned_to, status, due_date, user: req.user?.id });

  // Normalize assigned_to: allow missing/null, otherwise coerce to integer
  const assignedToParam = assigned_to == null ? null : Number(assigned_to);
  if (assigned_to != null && !Number.isInteger(assignedToParam)) {
    return res.status(400).json({ error: 'assigned_to must be an integer or null' });
  }

  const { rows: ins } = await pool.query(
    `INSERT INTO tasks (title, description, assigned_to, status, due_date)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [title, description, assignedToParam, status, due_date]
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
  // Add an assignment row and notify user if assigned_to provided (guard against null/invalid IDs)
  try {
    const assignedTo = rows[0].assigned_to;
    if (assignedTo != null) {
      const uid = Number(assignedTo);
      if (!Number.isInteger(uid)) {
        console.warn('create task: assigned_to is not an integer, skipping assignment', assignedTo);
      } else {
        await pool.query('INSERT INTO task_assignments (task_id, user_id) SELECT $1,$2 WHERE $2 IS NOT NULL ON CONFLICT DO NOTHING', [rows[0].id, uid]);
        notifyUser(uid, { type: 'task:assigned', task: rows[0] });
      }
    }
  } catch (e) {
    console.error('Failed to add assignment for created task', e);
  }
  res.json(rows[0]);
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreate'
 *     responses:
 *       200:
 *         description: Created task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */

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
  console.log('PUT /tasks/:id payload:', { id, body: req.body, user: req.user?.id });

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
  try {
    const assignedTo = rows[0].assigned_to;
    if (assignedTo != null) {
      const uid = Number(assignedTo);
      if (!Number.isInteger(uid)) {
        console.warn('update task: assigned_to is not an integer, skipping assignment', assignedTo);
      } else {
        await pool.query('INSERT INTO task_assignments (task_id, user_id) SELECT $1,$2 WHERE $2 IS NOT NULL ON CONFLICT DO NOTHING', [rows[0].id, uid]);
        notifyUser(uid, { type: 'task:assigned', task: rows[0] });
      }
    }
  } catch (e) {
    console.error('Failed to add assignment for updated task', e);
  }
  res.json(rows[0]);
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdate'
 *     responses:
 *       200:
 *         description: Updated task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */

/**
 * Delete a task
 */
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
  io.emit('task:delete', { id: Number(id) });
  res.json({ success: true });
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deletion result
 */

// Assign a task to a user
/**
 * @swagger
 * /tasks/{id}/assign:
 *   post:
 *     summary: Assign a task to a user
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignRequest'
 *     responses:
 *       200:
 *         description: Assigned task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.post('/:id/assign', auth, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  console.log('POST /tasks/:id/assign payload:', { id, user_id, user: req.user?.id });

  try {
    // guard against null/invalid user_id
    if (user_id == null) throw new Error('user_id is required');
    const uid = Number(user_id);
    if (!Number.isInteger(uid)) throw new Error('user_id must be an integer');
    await pool.query('INSERT INTO task_assignments (task_id, user_id) SELECT $1,$2 WHERE $2 IS NOT NULL ON CONFLICT DO NOTHING', [id, uid]);
    // update tasks.assigned_to for convenience
    await pool.query('UPDATE tasks SET assigned_to=$1 WHERE id=$2', [uid, id]);

    const { rows } = await pool.query(
      `SELECT t.*, u.email AS assigned_to_email
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id=$1`,
      [id]
    );

    // notify user
    notifyUser(uid, { type: 'task:assigned', task: rows[0] });

    io.emit('task:update', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to assign task', err);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

/**
 * @swagger
 * /tasks/{id}/assign:
 *   post:
 *     summary: Assign a task to a user
 *     tags:
 *       - Tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignRequest'
 *     responses:
 *       200:
 *         description: Assigned task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */

export default router;
