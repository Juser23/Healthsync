import re
with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/local/backend/src/controllers/api.controller.js', 'r', encoding='utf-8') as f:
    content = f.read()

target_buscar = """            // Buscar historial clnico
            const historialReq = await pool.request()
                .input('pacId_h', db.sql.Int, paciente.id_paciente)
                .query(`
                    SELECT 
                        C.id_cita as id,
                        CONVERT(varchar(20), C.fecha_hora_cita, 120) as fecha,
                        E.nombre_especialidad as especialidad,
                        M.nombres + ' ' + M.apellidos as medico,
                        C.estado_cita as estado
                    FROM Citas_Medicas C
                    INNER JOIN Especialidades E ON C.id_especialidad = E.id_especialidad
                    INNER JOIN Medicos M ON C.id_medico = M.id_medico
                    WHERE C.id_paciente = @pacId_h
                    ORDER BY C.fecha_hora_cita DESC
                `);"""

replacement_buscar = """            // Auto-actualizar citas pasadas a 'No Asistida'
            await pool.request()
                .input('pacId_u', db.sql.Int, paciente.id_paciente)
                .query("UPDATE Citas_Medicas SET estado_cita = 'No Asistida' WHERE id_paciente = @pacId_u AND estado_cita = 'Programada' AND fecha_hora_cita < GETDATE()");

            // Buscar historial clnico (solo del ltimo ao)
            const historialReq = await pool.request()
                .input('pacId_h', db.sql.Int, paciente.id_paciente)
                .query(`
                    SELECT 
                        C.id_cita as id,
                        CONVERT(varchar(20), C.fecha_hora_cita, 120) as fecha,
                        E.nombre_especialidad as especialidad,
                        M.nombres + ' ' + M.apellidos as medico,
                        C.estado_cita as estado
                    FROM Citas_Medicas C
                    INNER JOIN Especialidades E ON C.id_especialidad = E.id_especialidad
                    INNER JOIN Medicos M ON C.id_medico = M.id_medico
                    WHERE C.id_paciente = @pacId_h AND C.fecha_hora_cita >= DATEADD(year, -1, GETDATE())
                    ORDER BY C.fecha_hora_cita DESC
                `);"""

content = content.replace(target_buscar, replacement_buscar)
content = content.replace(target_buscar.replace("clnico", "clínico").replace("ltimo", "último").replace("ao", "año"), replacement_buscar)

with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/local/backend/src/controllers/api.controller.js', 'w', encoding='utf-8') as f:
    f.write(content)
