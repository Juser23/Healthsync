const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function sendTicketEmail(toEmail, citaData) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER || 'tucorreo@gmail.com',
            pass: process.env.SMTP_PASS || 'tu_password_de_aplicacion'
        }
    });

    const logoPath = path.join(__dirname, '../../../frontend/assets/images/logo.png');
    
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);
            
            const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 2px solid #20c997;">
                    <img src="cid:logo_hs" alt="HealthSync" style="max-height: 60px;">
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #20c997; margin-top: 0;">Asignación de Cita Médica</h2>
                    <p>Estimado(a) <strong>${citaData.pacienteNombre}</strong>,</p>
                    <p>Le informamos que su cita para la especialidad de <strong>${citaData.especialidad}</strong> ha sido agendada exitosamente.</p>
                    
                    <div style="background-color: #eef3f8; border-left: 4px solid #20c997; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="margin-bottom: 10px;">📅 <strong>Fecha y Hora:</strong> ${citaData.fecha} ${citaData.hora}</li>
                            <li style="margin-bottom: 10px;">👨‍⚕️ <strong>Médico:</strong> ${citaData.medico}</li>
                            <li>🏥 <strong>Sede:</strong> ${citaData.sede}</li>
                        </ul>
                    </div>

                    <p style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; border: 1px solid #ffeeba;">
                        ⚠️ <strong>Recuerde:</strong> Debe cancelar el valor de la cuota moderadora (Copago) de <strong>$15,500 COP</strong> al momento de asistir a su cita.
                    </p>

                    <p>Adjuntamos a este correo el comprobante oficial en formato PDF para su registro.</p>
                    <p style="color: #666; font-size: 0.9em; margin-top: 30px;">Gracias por usar HealthSync.</p>
                </div>
                <div style="background-color: #181c32; color: #fff; padding: 15px; text-align: center; font-size: 0.8em;">
                    © 2026 HealthSync Platform. Todos los derechos reservados.
                </div>
            </div>`;

            let mailOptions = {
                from: `"HealthSync Notificaciones" <${process.env.SMTP_USER}>`,
                to: toEmail,
                subject: `Asignación de Cita - ${citaData.especialidad}`,
                html: htmlContent,
                attachments: [
                    {
                        filename: `Comprobante_Cita_${citaData.idCita}.pdf`,
                        content: pdfData
                    }
                ]
            };

            // Adjuntar logo como inline si existe
            if (fs.existsSync(logoPath)) {
                mailOptions.attachments.push({
                    filename: 'logo.png',
                    path: logoPath,
                    cid: 'logo_hs' 
                });
            }

            try {
                await transporter.sendMail(mailOptions);
                resolve(true);
            } catch (error) {
                console.error("Error en sendMail:", error);
                reject(error);
            }
        });

        // Dibujar el PDF
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f1f3f8');
        
        doc.fill('#ffffff').rect(40, 40, doc.page.width - 80, doc.page.height - 80).fill();
        
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 50, { height: 40 });
        }
        
        doc.fillColor('#181c32')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text('COMPROBANTE DE CITA', 200, 60, { align: 'right' });
           
        doc.moveTo(50, 110).lineTo(doc.page.width - 50, 110).strokeColor('#20c997').lineWidth(2).stroke();
        
        doc.fillColor('#333333')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('DATOS DEL PACIENTE', 50, 130);
           
        doc.font('Helvetica')
           .fontSize(10)
           .text(`Nombre: ${citaData.pacienteNombre}`, 50, 150)
           .text(`Documento: ${citaData.pacienteDoc}`, 50, 165);

        doc.fillColor('#333333')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('DETALLES DE LA CITA', 300, 130);
           
        doc.font('Helvetica')
           .fontSize(10)
           .text(`Cita N°: ORD-${citaData.idCita}`, 300, 150)
           .text(`Estado: PROGRAMADA`, 300, 165);

        doc.rect(50, 200, doc.page.width - 100, 120).fillAndStroke('#ffffff', '#e4e6ef');
        
        doc.fillColor('#20c997').font('Helvetica-Bold').fontSize(14).text(citaData.especialidad, 70, 220);
        
        doc.fillColor('#5e6278').font('Helvetica').fontSize(11)
           .text(`Fecha: ${citaData.fecha}`, 70, 250)
           .text(`Hora: ${citaData.hora}`, 70, 270)
           .text(`Médico: ${citaData.medico}`, 300, 250)
           .text(`Sede: ${citaData.sede}`, 300, 270);
           
        doc.rect(50, 340, doc.page.width - 100, 50).fill('#fff3cd');
        doc.fillColor('#856404').font('Helvetica-Bold').fontSize(12)
           .text(`Valor a pagar (Copago): $15,500 COP`, 70, 358);
           
        doc.moveTo(50, 420).lineTo(doc.page.width - 50, 420).dash(5, {space: 5}).strokeColor('#ccc').stroke();
        
        doc.fillColor('#a1a5b7').font('Helvetica').fontSize(9)
           .text('Generado por HealthSync Platform. Presente este comprobante el día de su cita.', 50, 440, { align: 'center' });

        doc.end();
    });
}

module.exports = { sendTicketEmail };
