import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, { expiresIn: '24h' });
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

