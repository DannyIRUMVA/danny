import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    'INSERT INTO users (email, password) VALUES ($1,$2)',
    [email, hash]
  );

  res.json({ message: 'User created' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email=$1',
    [email]
  );

  if (!rows.length) return res.sendStatus(401);

  const valid = await bcrypt.compare(password, rows[0].password);
  if (!valid) return res.sendStatus(401);

  const token = jwt.sign(
    { id: rows[0].id },
    process.env.JWT_SECRET
  );

  res.json({ token });
});

export default router;
