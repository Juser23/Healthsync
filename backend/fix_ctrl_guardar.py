import re
with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/local/backend/src/controllers/api.controller.js', 'r', encoding='utf-8') as f:
    content = f.read()

target_guardar = """            // CHECK DOUBLE BOOKING
            const doubleBook = await pool.request()"""

replacement_guardar = """            // AUTO-UPDATE PAST APPOINTMENTS
            await pool.request()
                .input('pac_up', db.sql.Int, id_paciente)
                .query("UPDATE Citas_Medicas SET estado_cita = 'No Asistida' WHERE id_paciente = @pac_up AND estado_cita = 'Programada' AND fecha_hora_cita < GETDATE()");

            // CHECK DOUBLE BOOKING
            const doubleBook = await pool.request()"""

if target_guardar in content:
    content = content.replace(target_guardar, replacement_guardar)
else:
    print("NO ENCONTRADO GUARDAR")

with open('c:/Users/Yeferson Ayala/Desktop/PROYECTO - HIS/local/backend/src/controllers/api.controller.js', 'w', encoding='utf-8') as f:
    f.write(content)
