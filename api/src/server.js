import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: '*' }
});

server.listen(3000, () => {
  console.log('Backend running on port 3000');
});
