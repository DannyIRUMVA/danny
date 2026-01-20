import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.sendStatus(401);
  const token = header.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // Invalid or malformed token -> unauthorized
    console.warn('Auth failed:', err?.message || err);
    return res.sendStatus(401);
  }
};
