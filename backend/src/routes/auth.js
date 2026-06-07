import { Router } from 'express';
import { parseBearerToken, extractUserFromToken } from '../middleware/auth.js';

const router = Router();

router.get('/me', (req, res) => {
  if (req.user) {
    return res.json(req.user);
  }

  const token = parseBearerToken(req);
  if (token) {
    const user = extractUserFromToken(token);
    if (user) return res.json(user);
  }

  return res.status(401).json({ error: 'Authentication required' });
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

export default router;
