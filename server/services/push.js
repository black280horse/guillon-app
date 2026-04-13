const webpush = require('web-push');
const db = require('../db/schema');

let initialized = false;

function init() {
  if (initialized) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[PUSH] VAPID keys no configuradas — push deshabilitado');
    return;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@guillonappp.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  initialized = true;
}

async function sendToUser(userId, { title, body, url = '/' }) {
  if (!initialized) return;
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);

  const payload = JSON.stringify({ title, body, url });
  const deadEndpoints = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        deadEndpoints.push(sub.endpoint);
      } else {
        console.error('[PUSH] Error enviando:', err.message);
      }
    }
  }

  // Limpiar subscripciones expiradas
  for (const ep of deadEndpoints) {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(ep);
  }
}

module.exports = { init, sendToUser };
