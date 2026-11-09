require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes/api.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Para poder leer JSON en el body (POST/PUT)

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas base del backend
app.use('/api', apiRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.send('Servidor HealthSync Backend en funcionamiento');
});

// Cualquier ruta no encontrada que no empiece con /api, redirigir al index.html del frontend (soporte para Single Page Application)
app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        res.status(404).json({ error: 'Ruta API no encontrada' });
    }
});

const PORT = process.env.PORT || 3000;
// Escuchar en todas las interfaces de red (0.0.0.0) para permitir acceso desde otras IPs
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor] Escuchando en http://0.0.0.0:${PORT}`);
    console.log(`[Servidor] Para acceder desde otro equipo, usa http://<IP_DE_TU_SERVIDOR>:${PORT}`);
});
