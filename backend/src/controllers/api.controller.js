const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dbMock = require('../mock/dbMock');

const apiController = {
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            if (!email || !password) return res.status(400).json({ error: 'Datos requeridos incompletos.' });
            const hash = crypto.createHash('sha256').update(password).digest('hex');
            let user = null;
            
            if (email === 'admin@healthsync.com' && hash === 'c90a677e569fb6448e0d0df6f448d7455b952561c2d784cdb461aef009243266') {
                user = { id: 1, nombre: 'Director Médico General', rol: 'ADMINISTRADOR' };
            } else if (email === 'asesor@healthsync.com' && hash === '8d2b99a4e6da186144b0a2ebcf1d4450bfb97be339d1ac49ba6fd27d9d1fe8dd') {
                user = { id: 2, nombre: 'Admisiones y Agenda', rol: 'ASESOR' };
            }

            if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

            const token = jwt.sign(
                { id: user.id, rol: user.rol }, 
                process.env.JWT_SECRET || 'super_secret_healthsync_key_2026', 
                { expiresIn: '8h' }
            );
            res.json({ success: true, token, user });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },
    consultarSedes: async (req, res) => {
        if (!global.dbConnected) return res.json([]);
        try {
            const db = require('../config/db');
            const pool = await db.getConnection();
            const result = await pool.request().query("SELECT DISTINCT sede_atencion FROM Medicos WHERE LOWER(CAST(estado AS VARCHAR)) IN ('1', 'activo', 'true') OR estado IS NULL");
            const sedes = result.recordset
                .map(r => (r.sede_atencion || '').replace('MedellÃ­n', 'Medellín').replace('BogotÃ¡', 'Bogotá').trim())
                .filter(Boolean);
            res.json([...new Set(sedes)]);
        } catch(e) {
            console.error(e);
            res.json([]);
        }
    },
    buscarPaciente: async (req, res) => {
        if (!global.dbConnected) return res.status(503).json({ error: 'Base de datos desconectada' });
        const doc = req.params.documento;
        const tipo_doc = req.params.tipo_doc;
        try {
            const db = require('../config/db');
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('doc', db.sql.VarChar, doc)
                .input('tipo', db.sql.VarChar, tipo_doc)
                .query('SELECT * FROM Pacientes WHERE numero_documento = @doc AND tipo_documento = @tipo');
            
            if (result.recordset.length > 0) {
                const pacienteRow = result.recordset[0];
                
                // OBTENER HISTORIAL CLINICO
                const idPac = pacienteRow.id_paciente;
                const histRes = await pool.request()
                    .input('pacId', db.sql.Int, idPac)
                    .query("SELECT C.id_cita, C.fecha_hora_cita, C.estado_cita, C.motivo_consulta, E.nombre_especialidad, M.nombres as mn, M.apellidos as ma FROM Citas_Medicas C JOIN Especialidades E ON C.id_especialidad = E.id_especialidad JOIN Medicos M ON C.id_medico = M.id_medico WHERE C.id_paciente = @pacId ORDER BY C.fecha_hora_cita DESC");
                
                const historial = histRes.recordset.map(r => ({
                    id: r.id_cita,
                    ordenId: 'ORD-' + r.id_cita,
                    fecha: new Date(r.fecha_hora_cita).toLocaleString('es-CO'),
                    especialidad: r.nombre_especialidad,
                    medico: r.mn + ' ' + r.ma,
                    Médico: r.mn + ' ' + r.ma,
                    estado: r.estado_cita,
                    motivo: r.motivo_consulta || 'Consulta médica programada',
                    notas: r.motivo_consulta || 'Consulta médica programada'
                }));

                const ciudadLimpia = (pacienteRow.ciudad_residencia || 'Bogotá')
                    .replace('Bogotá¡', 'Bogotá')
                    .replace('BogotÃ¡', 'Bogotá')
                    .replace('MedellÃ­n', 'Medellín');

                res.json({
                    historial_clinico: historial,
                    documento: pacienteRow.numero_documento,
                    tipo_doc: pacienteRow.tipo_documento,
                    nombre: pacienteRow.nombres + ' ' + pacienteRow.apellidos,
                    ciudad: ciudadLimpia,
                    estado_afiliacion: pacienteRow.estado_afiliacion,
                    eps: pacienteRow.eps_asociada,
                    alertas: '--',
                    historia: historial
                });
            } else {
                res.status(404).json({ error: 'Paciente no encontrado' });
            }
        } catch(e) {
            console.error(e);
            res.status(500).json({ error: 'Error DB' });
        }
    },
    guardarPaciente: async (req, res) => {
        if (!global.dbConnected) return res.status(503).json({ error: 'Base de datos desconectada' });
        try {
            const { documento, tipo_doc = 'CC', nombre = '', ciudad = 'Bogotá', eps = 'Sanitas', estado_afiliacion = 'Activo' } = req.body;
            const partes = nombre.trim().split(/\s+/);
            const nombres = partes.slice(0, Math.max(1, Math.ceil(partes.length / 2))).join(' ');
            const apellidos = partes.slice(Math.max(1, Math.ceil(partes.length / 2))).join(' ') || 'Sin Apellido';
            const ciudadLimpia = ciudad.replace('Bogotá¡', 'Bogotá');

            const db = require('../config/db');
            const pool = await db.getConnection();
            await pool.request()
                .input('tdoc', db.sql.VarChar, tipo_doc)
                .input('doc', db.sql.VarChar, documento)
                .input('nom', db.sql.VarChar, nombres)
                .input('ape', db.sql.VarChar, apellidos)
                .input('fnac', db.sql.Date, new Date('1990-01-01'))
                .input('gen', db.sql.VarChar, 'No especifica')
                .input('tel', db.sql.VarChar, '3000000000')
                .input('email', db.sql.VarChar, `paciente_${documento}@healthsync.com`)
                .input('ciu', db.sql.VarChar, ciudadLimpia)
                .input('est', db.sql.VarChar, estado_afiliacion)
                .input('eps', db.sql.VarChar, eps)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM Pacientes WHERE numero_documento = @doc AND tipo_documento = @tdoc)
                    INSERT INTO Pacientes (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, telefono, email, ciudad_residencia, estado_afiliacion, eps_asociada)
                    VALUES (@tdoc, @doc, @nom, @ape, @fnac, @gen, @tel, @email, @ciu, @est, @eps)
                `);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error registrando paciente en DB' });
        }
    },
    obtenerDashboard: async (req, res) => {
        if (!global.dbConnected) {
            return res.json({
                totalPacientes: 0,
                citasNuevas: 0,
                alertasCriticas: [],
                alertasCríticas: [],
                proximasCitas: [],
                PróximasCitas: [],
                estadisticasCitas: [],
                pacientesAtendidosHoy: []
            });
        }
        try {
            const db = require('../config/db');
            const pool = await db.getConnection();
            const result = await pool.request().query('SELECT COUNT(*) as count FROM Pacientes');
            const countPacientes = result.recordset[0].count;

            const proxRes = await pool.request().query(`
                SELECT TOP 10 C.id_cita, C.fecha_hora_cita, C.estado_cita,
                       P.nombres + ' ' + P.apellidos AS paciente,
                       M.nombres + ' ' + M.apellidos AS medico
                FROM Citas_Medicas C
                JOIN Pacientes P ON C.id_paciente = P.id_paciente
                JOIN Medicos M ON C.id_medico = M.id_medico
                WHERE C.estado_cita = 'Programada'
                ORDER BY C.fecha_hora_cita DESC
            `);

            const proximasCitas = proxRes.recordset.map(r => ({
                id: r.id_cita,
                paciente: r.paciente,
                medico: r.medico,
                Médico: r.medico,
                fecha: new Date(r.fecha_hora_cita).toLocaleString('es-CO'),
                estado: r.estado_cita
            }));
            
            res.json({
                totalPacientes: countPacientes,
                citasNuevas: 0,
                alertasCriticas: [],
                alertasCríticas: [],
                proximasCitas: proximasCitas,
                PróximasCitas: proximasCitas,
                estadisticasCitas: [],
                pacientesAtendidosHoy: []
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error DB' });
        }
    },
    obtenerCalendarioMedico: async (req, res) => {
        if (!global.dbConnected) return res.json([]);
        try {
            const medicoNombre = req.params.nombre;
            const db = require('../config/db');
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('nom', db.sql.VarChar, medicoNombre)
                .query(`
                    SELECT CONVERT(varchar(20), C.fecha_hora_cita, 120) as fechaRaw, C.estado_cita 
                    FROM Citas_Medicas C
                    INNER JOIN Medicos M ON C.id_medico = M.id_medico
                    WHERE (M.nombres + ' ' + M.apellidos) = @nom AND C.estado_cita != 'Cancelada'
                `);
            res.json(result.recordset);
        } catch(e) {
            console.error(e);
            res.json([]);
        }
    },
    consultarDisponibilidad: async (req, res) => {
        if (!global.dbConnected) return res.json([]);
        try {
            const codigo_cups = req.query.codigo_cups || req.query.Codigo_cups;
            const sede = (req.query.sede || '').trim();
            let idEsp = 1; // Default
            if (codigo_cups) {
                // Infer from last digit of "890201" -> 1
                const lastDigit = parseInt(codigo_cups.slice(-1));
                if (!isNaN(lastDigit)) idEsp = lastDigit;
            }

            const db = require('../config/db');
            const pool = await db.getConnection();
            const result = await pool.request()
                .input('id_esp', db.sql.Int, idEsp)
                .input('sede', db.sql.VarChar, sede)
                .query(`
                    SELECT id_medico as id, nombres + ' ' + apellidos as nombre, id_especialidad as idEspecialidad, sede_atencion as sede
                    FROM Medicos
                    WHERE id_especialidad = @id_esp
                      AND (sede_atencion = @sede OR REPLACE(REPLACE(sede_atencion, 'MedellÃ­n', 'Medellín'), 'BogotÃ¡', 'Bogotá') = @sede)
                      AND (LOWER(CAST(estado AS VARCHAR)) IN ('1', 'activo', 'true') OR estado IS NULL)
                `);
            
            res.json(result.recordset);
        } catch(e) {
            console.error(e);
            res.json([]);
        }
    },
    guardarCita: async (req, res) => {
        if (!global.dbConnected) return res.status(503).json({ error: 'Base de datos desconectada' });
        try {
            let { tipo_doc, documento, medico_id, fecha, motivo } = req.body;
            tipo_doc = tipo_doc || 'CC';
            medico_id = medico_id || req.body['MÃ©dico_id'] || req.body['Médico_id'];
            
            const db = require('../config/db');
            const pool = await db.getConnection();
            
            const pacRes = await pool.request()
                .input('doc', db.sql.VarChar, documento)
                .input('tdoc', db.sql.VarChar, tipo_doc)
                .query("SELECT id_paciente FROM Pacientes WHERE numero_documento = @doc AND tipo_documento = @tdoc");
            if(pacRes.recordset.length === 0) return res.status(404).json({error: 'Paciente no encontrado'});
            const id_paciente = pacRes.recordset[0].id_paciente;

            const medRes = await pool.request()
                .input('id', db.sql.Int, medico_id)
                .query("SELECT id_especialidad FROM Medicos WHERE id_medico = @id");
            if(medRes.recordset.length === 0) return res.status(404).json({error: 'Médico no encontrado'});
            const id_esp = medRes.recordset[0].id_especialidad;

            // AUTO-UPDATE PAST APPOINTMENTS
            await pool.request()
                .input('pac_up', db.sql.Int, id_paciente)
                .query("UPDATE Citas_Medicas SET estado_cita = 'No Asistida' WHERE id_paciente = @pac_up AND estado_cita = 'Programada' AND fecha_hora_cita < GETDATE()");

            // CHECK DOUBLE BOOKING
            const doubleBook = await pool.request()
                .input('pac_db', db.sql.Int, id_paciente)
                .input('espId_db', db.sql.Int, id_esp)
                .query("SELECT id_cita FROM Citas_Medicas WHERE id_paciente = @pac_db AND id_especialidad = @espId_db AND estado_cita = 'Programada'");
            
            if (doubleBook.recordset.length > 0) {
                return res.status(400).json({error: 'El paciente ya cuenta con una cita programada activa para esta especialidad. Debe asistir o cancelarla primero.'});
            }

            const result = await pool.request()
                .input('pac', db.sql.Int, id_paciente)
                .input('med', db.sql.Int, medico_id)
                .input('esp', db.sql.Int, id_esp)
                .input('fecha', db.sql.DateTime, new Date(fecha))
                .input('est', db.sql.VarChar, 'Programada')
                .input('motivo', db.sql.VarChar, motivo || 'Cita generada por sistema')
                .query("INSERT INTO Citas_Medicas (id_paciente, id_medico, id_especialidad, fecha_hora_cita, estado_cita, motivo_consulta) OUTPUT INSERTED.id_cita VALUES (@pac, @med, @esp, @fecha, @est, @motivo)");
            
            const ordenId = 'ORD-' + result.recordset[0].id_cita;

            // Envio automatico de correo
            try {
                const pacInfo = await pool.request().input('pac', db.sql.Int, id_paciente).query("SELECT nombres, apellidos, email FROM Pacientes WHERE id_paciente = @pac");
                const medInfo = await pool.request().input('med', db.sql.Int, medico_id).query("SELECT nombres, apellidos, sede_atencion FROM Medicos WHERE id_medico = @med");
                const espInfo = await pool.request().input('esp', db.sql.Int, id_esp).query("SELECT nombre_especialidad FROM Especialidades WHERE id_especialidad = @esp");
                
                if (pacInfo.recordset.length && medInfo.recordset.length && espInfo.recordset.length) {
                    const pData = pacInfo.recordset[0];
                    const mData = medInfo.recordset[0];
                    const eData = espInfo.recordset[0];
                    
                    const dObj = new Date(fecha);
                    const formatter = new Intl.DateTimeFormat('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

                    const citaData = {
                        ordenId: ordenId,
                        paciente: pData.nombres + ' ' + pData.apellidos,
                        documento: documento,
                        especialidad: eData.nombre_especialidad,
                        medico: mData.nombres + ' ' + mData.apellidos,
                        sede: mData.sede_atencion,
                        fecha: formatter.format(dObj),
                        copago: '$15,500 COP'
                    };
                    
                    const mailer = require('../utils/mailer');
                    mailer.sendTicketEmail(pData.email, citaData).catch(e => console.error("Error envio mail:", e));
                }
            } catch (err) {
                console.error("Error construyendo email:", err);
            }
            
            res.json({ success: true, ordenId: ordenId, copago: '$15,500 COP' });
        } catch(e) {
            console.error(e);
            res.status(500).json({error: 'Error interno: ' + e.message});
        }
    },
    obtenerAuditoria: async (req, res) => {
        if (!global.dbConnected) return res.status(503).json({ error: 'DB desconectada' });
        try {
            const db = require('../config/db');
            const pool = await db.getConnection();
            const result = await pool.request().query("SELECT * FROM Logs_Auditoria ORDER BY fecha_hora DESC");
            res.json(result.recordset);
        } catch(e) {
            console.error(e);
            res.status(500).json({ error: 'Error obteniendo auditoria' });
        }
    },

    cancelarCitaRapida: async (req, res) => {
        if (!global.dbConnected) return res.status(503).json({ error: 'DB desconectada' });
        try {
            const db = require('../config/db');
            const pool = await db.getConnection();
            await pool.request()
                .input('id', db.sql.Int, req.params.id)
                .query("UPDATE Citas_Medicas SET estado_cita = 'Cancelada' WHERE id_cita = @id");
            
            // Log Auditoria
            await pool.request()
                .input('usr', db.sql.VarChar, 'Asesor/Admin')
                .input('rol', db.sql.VarChar, 'Asesor')
                .input('acc', db.sql.VarChar, 'Cancelación de cita ID ' + req.params.id)
                .query("INSERT INTO Logs_Auditoria (usuario, rol, accion) VALUES (@usr, @rol, @acc)");

            res.json({ success: true });
        } catch(e) {
            console.error(e);
            res.status(500).json({ error: 'Error cancelando cita' });
        }
    },

    cancelarCita: async (req, res) => {
        if (!global.dbConnected) return res.status(503).json({ error: 'DB desconectada' });
        try {
            const idCita = req.params.idCita || req.params.id;
            const db = require('../config/db');
            const pool = await db.getConnection();
            await pool.request()
                .input('id', db.sql.Int, idCita)
                .query("UPDATE Citas_Medicas SET estado_cita = 'Cancelada' WHERE id_cita = @id");

            await pool.request()
                .input('usr', db.sql.VarChar, 'Asesor/Admin')
                .input('rol', db.sql.VarChar, 'Asesor')
                .input('acc', db.sql.VarChar, 'Cancelación de cita ID ' + idCita)
                .query("INSERT INTO Logs_Auditoria (usuario, rol, accion) VALUES (@usr, @rol, @acc)");

            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error cancelando cita' });
        }
    },
    obtenerTriage: async (req, res) => {
        if (!global.dbConnected) return res.json([]);
        res.json([]);
    },
    registrarTriage: async (req, res) => {
        res.json({ success: true });
    },
    dbStatus: async (req, res) => {
        res.json({ connected: global.dbConnected || false });
    },
    dbConnect: async (req, res) => {
        try {
            const db = require('../config/db');
            await db.getConnection();
            global.dbConnected = true;
            res.json({ success: true, message: 'Conectado a la base de datos SQL Server exitosamente.' });
        } catch (error) {
            global.dbConnected = false;
            res.status(500).json({ error: 'No se pudo conectar a la base de datos SQL Server.' });
        }
    }
};

module.exports = apiController;
