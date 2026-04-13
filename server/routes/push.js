const router = require('express').Router();
const db = require('../db/schema');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/push/subscribe
router.post('/subscribe', (req, res) => {
  const userId = req.user.id;
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return res.status(400).json({ error: 'Suscripción inválida' });

  db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
  `).run(userId, endpoint, keys.p256dh, keys.auth);

  res.json({ message: 'Suscripción guardada' });
});

// DELETE /api/push/subscribe
router.delete('/subscribe', (req, res) => {
  const userId = req.user.id;
  const { endpoint } = req.body;
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(userId, endpoint);
  } else {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);
  }
  res.json({ message: 'Suscripción eliminada' });
});

// GET /api/push/key — devuelve la VAPID public key al cliente
router.get('/key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

module.exports = router;
