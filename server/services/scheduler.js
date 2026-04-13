const db = require('../db/schema');
const { emailTareaVence24h, emailTareaVencida } = require('./email');
const push = require('./push');

function today() { return new Date().toISOString().slice(0, 10); }
function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function runJob() {
  const todayStr    = today();
  const tomorrowStr = tomorrow();
  console.log(`[Scheduler] Corriendo job — ${new Date().toLocaleString('es-AR')}`);

  // ── 1. Marcar tareas como overdue ───────────────────────────────────────────
  const overduedResult = db.prepare(`
    UPDATE tasks SET status = 'overdue'
    WHERE due_date < ? AND status IN ('pending','in_progress')
  `).run(todayStr);
  if (overduedResult.changes > 0) {
    console.log(`[Scheduler] ${overduedResult.changes} tarea(s) marcadas como overdue`);
  }

  // ── 2. Notificar tareas que vencen mañana (solo 1 vez) ───────────────────────
  const due24h = db.prepare(`
    SELECT t.id, t.title, t.due_date, t.user_id,
           u.email, u.name
    FROM tasks t
    JOIN users u ON u.id = t.user_id
    WHERE t.due_date = ? AND t.notified_24h = 0
      AND t.status NOT IN ('completed','overdue')
  `).all(tomorrowStr);

  for (const task of due24h) {
    try {
      await emailTareaVence24h({
        userEmail: task.email, userName: task.name,
        taskTitle: task.title, dueDate: task.due_date,
      });
      await push.sendToUser(task.user_id, {
        title: '⏰ Tarea por vencer',
        body: `"${task.title}" vence mañana (${task.due_date})`,
        url: '/tareas',
      });
      db.prepare('UPDATE tasks SET notified_24h = 1 WHERE id = ?').run(task.id);
    } catch (err) {
      console.error(`[Scheduler] Error notificando 24h tarea ${task.id}:`, err.message);
    }
  }

  // ── 3. Notificar tareas recién vencidas (solo 1 vez) ─────────────────────────
  const nowOverdue = db.prepare(`
    SELECT t.id, t.title, t.due_date, t.user_id,
           u.email, u.name
    FROM tasks t
    JOIN users u ON u.id = t.user_id
    WHERE t.status = 'overdue' AND t.notified_overdue = 0
  `).all();

  for (const task of nowOverdue) {
    try {
      await emailTareaVencida({
        userEmail: task.email, userName: task.name,
        taskTitle: task.title, dueDate: task.due_date,
      });
      await push.sendToUser(task.user_id, {
        title: '🔴 Tarea vencida',
        body: `"${task.title}" venció el ${task.due_date}`,
        url: '/tareas',
      });
      db.prepare('UPDATE tasks SET notified_overdue = 1 WHERE id = ?').run(task.id);
    } catch (err) {
      console.error(`[Scheduler] Error notificando overdue tarea ${task.id}:`, err.message);
    }
  }
}

function start() {
  // Corre inmediatamente al arrancar y luego cada hora
  runJob().catch(console.error);
  setInterval(() => runJob().catch(console.error), 60 * 60 * 1000);
  console.log('[Scheduler] Job horario iniciado');
}

module.exports = { start, runJob };
