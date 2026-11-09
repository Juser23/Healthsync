const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// Endpoint pÃƒÂºblico (Login para obtener Token)
router.post('/auth/login', apiController.login);

// Rutas protegidas (Requieren Token Bearer)
router.use(authMiddleware);

// Sedes y Disponibilidad
router.get('/sedes', apiController.consultarSedes);
router.get('/disponibilidad', apiController.consultarDisponibilidad);

// Dashboard y Calendario
router.get('/dashboard', apiController.obtenerDashboard);
router.get('/auditoria', apiController.obtenerAuditoria);
router.get('/calendario/:nombre', apiController.obtenerCalendarioMedico);

// Pacientes
router.get('/pacientes/:tipo_doc/:documento', apiController.buscarPaciente);
router.post('/pacientes', apiController.guardarPaciente);

// Citas
router.post('/citas', apiController.guardarCita);
router.put('/citas/:id/cancelar', apiController.cancelarCitaRapida);
router.delete('/citas/:idCita', apiController.cancelarCita);

// DB Management
router.get('/db-status', apiController.dbStatus);
router.post('/db-connect', apiController.dbConnect);

// Triage
router.get('/triage', apiController.obtenerTriage);
router.post('/triage', apiController.registrarTriage);

// Triage
router.get('/triage', apiController.obtenerTriage);
router.post('/triage', apiController.registrarTriage);

module.exports = router;


