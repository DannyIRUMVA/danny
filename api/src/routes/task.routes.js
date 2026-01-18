import express from 'express';
import { pool } from '../db.js';
import { auth } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

router.get('/', auth, async (_, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks');
  res.json(rows);
});

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
