require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure persistent data directory exists before DB init
try { fs.mkdirSync('/data', { recursive: true }); } catch (_) {}

require('./db/schema'); // inicializa la DB al arrancar
require('./db/seed');   // crea/actualiza admin al arrancar

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai',        require('./routes/ai'));
app.use('/api/tasks',     require('./routes/tasks'));
app.use('/api/push',      require('./routes/push'));
app.use('/api/insights',  require('./routes/insights'));
app.use('/api/settings',  require('./routes/settings'));

app.get('/api/health', (_req, res) =>
  res.status(200).send('OK')
);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.use((_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Guillon AP server corriendo en puerto ${PORT}`);

  // Iniciar servicios
  require('./services/push').init();
  require('./services/scheduler').start();
});
