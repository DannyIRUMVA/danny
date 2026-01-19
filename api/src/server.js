import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import { swaggerDocs } from './swagger.js';

const app = express();
app.use(cors());
app.use(express.json());
swaggerDocs(app);

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: '*' }
});

// Map of userId -> Set of socket ids
const connectedUsers = new Map();

io.on('connection', (socket) => {
  // Expect the client to emit an 'authenticate' event with the JWT
  socket.on('authenticate', (token) => {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const userId = user.id;
      socket.data.userId = userId;
      const set = connectedUsers.get(userId) || new Set();
      set.add(socket.id);
      connectedUsers.set(userId, set);
    } catch (err) {
      // ignore invalid token
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;
    const set = connectedUsers.get(userId);
    if (!set) return;
    set.delete(socket.id);
    if (!set.size) connectedUsers.delete(userId);
  });
});

export const notifyUser = (userId, payload) => {
  const set = connectedUsers.get(userId);
  if (!set) return;
  for (const sid of set) {
    io.to(sid).emit('notification', payload);
  }
};

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, '0.0.0.0', () => {
    console.log(`Backend running on port ${port}`);
  });
}
