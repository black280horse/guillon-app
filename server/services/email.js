const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'tu_email@gmail.com') {
    console.log(`[EMAIL SIMULADO] Para: ${to} | Asunto: ${subject}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({ from: `"Guillon AP" <${process.env.EMAIL_USER}>`, to, subject, html });
}

function emailNuevoRegistro({ adminEmail, userName, userEmail, businessName }) {
  return sendEmail({
    to: adminEmail,
    subject: 'Nuevo registro pendiente — Guillon AP',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#E8A020">Nuevo usuario registrado</h2>
        <p>Hay un nuevo usuario esperando aprobación:</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:bold">Nombre</td><td>${userName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Email</td><td>${userEmail}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Negocio</td><td>${businessName || '—'}</td></tr>
        </table>
        <p style="margin-top:16px">Accedé al panel admin para aprobar o rechazar este usuario.</p>
      </div>
    `,
  });
}

function emailUsuarioAprobado({ userEmail, userName }) {
  return sendEmail({
    to: userEmail,
    subject: '¡Tu cuenta fue aprobada! — Guillon AP',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#E8A020">¡Bienvenido a Guillon AP, ${userName}!</h2>
        <p>Tu cuenta fue aprobada. Ya podés iniciar sesión y empezar a usar la plataforma.</p>
        <a href="http://localhost:5173/login" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#E8A020;color:#000;border-radius:6px;text-decoration:none;font-weight:bold">
          Iniciar sesión
        </a>
      </div>
    `,
  });
}

function emailUsuarioRechazado({ userEmail, userName }) {
  return sendEmail({
    to: userEmail,
    subject: 'Tu solicitud fue rechazada — Guillon AP',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#e53e3e">Solicitud rechazada</h2>
        <p>Hola ${userName}, lamentablemente tu solicitud de acceso a Guillon AP fue rechazada.</p>
        <p>Si creés que es un error, contactate con el administrador.</p>
      </div>
    `,
  });
}

function emailTareaVence24h({ userEmail, userName, taskTitle, dueDate }) {
  return sendEmail({
    to: userEmail,
    subject: `⏰ Tarea por vencer mañana — ${taskTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#E8A020">Recordatorio de tarea</h2>
        <p>Hola ${userName}, tu tarea <strong>"${taskTitle}"</strong> vence mañana (${dueDate}).</p>
        <a href="http://localhost:5173/tareas" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#E8A020;color:#000;border-radius:6px;text-decoration:none;font-weight:bold">
          Ver tareas
        </a>
      </div>
    `,
  });
}

function emailTareaVencida({ userEmail, userName, taskTitle, dueDate }) {
  return sendEmail({
    to: userEmail,
    subject: `🔴 Tarea vencida — ${taskTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#ef4444">Tarea vencida</h2>
        <p>Hola ${userName}, tu tarea <strong>"${taskTitle}"</strong> venció el ${dueDate} sin completarse.</p>
        <a href="http://localhost:5173/tareas" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#ef4444;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Ver tareas
        </a>
      </div>
    `,
  });
}

module.exports = {
  emailNuevoRegistro, emailUsuarioAprobado, emailUsuarioRechazado,
  emailTareaVence24h, emailTareaVencida,
};
