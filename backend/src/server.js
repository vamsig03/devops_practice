import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { initializeDatabase, pool } from './db.js';
import { createToken, requireAuth } from './auth.js';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'launchpad-api' }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );
    const user = { id: result.insertId, name, email };
    res.status(201).json({ token: createToken(user), user });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const [rows] = await pool.execute('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    const safeUser = { id: user.id, name: user.name, email: user.email };
    res.json({ token: createToken(safeUser), user: safeUser });
  } catch (error) { next(error); }
});

app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json({
      user: rows[0],
      stats: { deployments: 12, uptime: '99.98%', services: 4, alerts: 0 },
      activity: [
        { title: 'Production deployment', detail: 'main · v1.8.2', time: '12 min ago', status: 'success' },
        { title: 'Health checks passed', detail: '4 services operational', time: '34 min ago', status: 'success' },
        { title: 'Database backup', detail: 'Automated snapshot', time: '2 hr ago', status: 'info' }
      ]
    });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(config.port, '0.0.0.0', () => console.log(`API running on port ${config.port}`));
  } catch (error) {
    console.error('Database connection failed. Update backend/src/config.js.', error.message);
    process.exit(1);
  }
}

start();

