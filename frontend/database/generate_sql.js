const fs = require('fs');

const nombres = ["Carlos", "Maria", "Andres", "Luisa", "Jorge", "Ana", "Luis", "Marta", "Jose", "Diego", "Valentina", "Camila", "Juan", "Pedro", "Sofia", "Isabella", "Miguel", "David", "Laura", "Daniela"];
const apellidos = ["Gomez", "Rodriguez", "Perez", "Lopez", "Martinez", "Gonzalez", "Ramirez", "Hernandez", "Diaz", "Torres", "Vargas", "Sanchez", "Rios", "Fernandez", "Castillo", "Moreno", "Jimenez", "Rojas"];

const especialidades = ['Medicina General', 'Cardiología', 'Pediatría', 'Ortopedia', 'Psicología'];
const dtStart = new Date("2026-04-10T08:00:00");

let sql = `
USE master;
GO

IF DB_ID('HealthSync') IS NOT NULL
BEGIN
    ALTER DATABASE HealthSync SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HealthSync;
END
GO
CREATE DATABASE HealthSync;
GO
USE HealthSync;
GO

-- 1. Tabla: PACIENTES
CREATE TABLE Pacientes (
    id_paciente INT IDENTITY(1,1) PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL,
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(15),
    telefono VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    ciudad_residencia VARCHAR(100),
    estado_afiliación VARCHAR(50) DEFAULT 'Activo',
    eps_asociada VARCHAR(100) NOT NULL,
    fecha_registro DATETIME DEFAULT GETDATE()
);

-- 2. Tabla: ESPECIALIDADES
CREATE TABLE Especialidades (
    id_especialidad INT IDENTITY(1,1) PRIMARY KEY,
    nombre_especialidad VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

-- 3. Tabla: MEDICOS
CREATE TABLE Médicos (
    id_medico INT IDENTITY(1,1) PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL,
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    id_especialidad INT REFERENCES Especialidades(id_especialidad),
    registro_medico VARCHAR(50) UNIQUE NOT NULL,
    correo_institucional VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    sede_atencion VARCHAR(100) NOT NULL,
    estado BIT DEFAULT 1
);

-- 4. Tabla: CUPS
CREATE TABLE Cups (
    codigo_cups VARCHAR(10) PRIMARY KEY,
    descripcion_procedimiento TEXT NOT NULL,
    id_especialidad INT REFERENCES Especialidades(id_especialidad)
);

-- 5. Tabla: CITAS_MÉDICAS
CREATE TABLE Citas_Medicas (
    id_cita INT IDENTITY(1,1) PRIMARY KEY,
    id_paciente INT REFERENCES Pacientes(id_paciente) ON DELETE CASCADE,
    id_medico INT REFERENCES Médicos(id_medico),
    id_especialidad INT REFERENCES Especialidades(id_especialidad),
    fecha_hora_cita DATETIME NOT NULL,
    estado_cita VARCHAR(20) DEFAULT 'Programada',
    motivo_consulta TEXT
);

-- 6. Tabla: HISTORIA_CLINICA
CREATE TABLE Historia_Clínica (
    id_historial INT IDENTITY(1,1) PRIMARY KEY,
    id_paciente INT REFERENCES Pacientes(id_paciente) ON DELETE CASCADE,
    id_medico INT REFERENCES Médicos(id_medico),
    id_cita INT REFERENCES Citas_Medicas(id_cita),
    codigo_cups VARCHAR(10) REFERENCES Cups(codigo_cups),
    fecha_atencion DATETIME DEFAULT GETDATE(),
    motivo_consulta TEXT NOT NULL,
    enfermedad_actual TEXT,
    antecedentes TEXT,
    alertas_paciente TEXT,
    diagnostico TEXT NOT NULL,
    plan_tratamiento TEXT
);

-- ===================================
-- INSERTA ESPECIALIDADES Y MEDICOS
-- ===================================
INSERT INTO Especialidades (nombre_especialidad, descripcion) VALUES
('Medicina General', 'Atención médica primaria y preventiva.'),
('Cardiología', 'Estudio de enfermedades cardiovasculares.'),
('Pediatría', 'Atención médica de niños.'),
('Ortopedia', 'Afecciones del sistema musculoesquelético.'),
('Psicología', 'Salud mental y emocional.');

INSERT INTO Cups (codigo_cups, descripcion_procedimiento, id_especialidad) VALUES
('890201', 'CONSULTA DE PRIMERA VEZ POR MEDICINA GENERAL', 1),
('890302', 'CONSULTA DE CONTROL POR CARDIOLOGÍA', 2),
('890203', 'CONSULTA DE PRIMERA VEZ POR PEDIATRÍA', 3),
('890304', 'CONSULTA DE CONTROL POR ORTOPEDIA', 4),
('890205', 'CONSULTA DE PRIMERA VEZ POR PSICOLOGÍA', 5);

INSERT INTO Médicos (tipo_documento, numero_documento, nombres, apellidos, id_especialidad, registro_medico, correo_institucional, telefono, sede_atencion) VALUES
('CC', '99991111', 'Dr. Roberto', 'Villalobos', 1, 'RM-1001', 'rvillalobos@healthsync.com', '3201112233', 'Sede Norte (Bogotá)'),
('CC', '99992222', 'Dra. Andrea', 'Suarez', 2, 'RM-1002', 'asuarez@healthsync.com', '3202223344', 'Sede Chapinero (Bogotá)'),
('CC', '99993333', 'Dra. Camila', 'Rendon', 3, 'RM-1003', 'crendon@healthsync.com', '3203334455', 'Sede Sur (Bogotá)'),
('CC', '99994444', 'Dr. Jorge', 'Castillo', 4, 'RM-1004', 'jcastillo@healthsync.com', '3204445566', 'Sede Medellín'),
('CC', '99995555', 'Lic. Diana', 'Ramirez', 5, 'RM-1005', 'dramirez@healthsync.com', '3205556677', 'Sede Cali');
GO
`;

let batchSize = 100;
let docsGuardados = [];

const sedesNombres = ['Bogotá', 'Medellín', 'Cali'];
const epsNombres = ['Sura', 'Sanitas', 'Compensar', 'Salud Total', 'Nueva EPS'];
const estados_afiliación = ['Activo', 'Activo', 'Activo', 'Inactivo', 'Vencido', 'Pendiente de pago'];

// Casos Controlados
sql += `\nINSERT INTO Pacientes (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, email, telefono, ciudad_residencia, estado_afiliación, eps_asociada) VALUES \n`;
sql += `('CC', '1000000702', 'Yeferson Valerio', 'Ayala Gomez', '2001-01-01', 'Masculino', 'yeferson@healthsync.com', '3001234567', 'Bogotá', 'Activo', 'Sanitas'),\n`;
sql += `('CC', '1000000703', 'Marta', 'Test Vencido', '1985-05-10', 'Femenino', 'marta_vencido@mail.com', '3000000123', 'Medellín', 'Vencido', 'Sura'),\n`;
sql += `('CC', '1000000704', 'Pedro', 'Test Inactivo', '1990-11-20', 'Masculino', 'pedro_inactivo@mail.com', '3000000124', 'Cali', 'Inactivo', 'Compensar'),\n`;
sql += `('CC', '1000000705', 'Luis', 'Test Pendiente', '1975-03-30', 'Masculino', 'luis_pendiente@mail.com', '3000000125', 'Bogotá', 'Pendiente de pago', 'Nueva EPS');\nGO\n`;

// Generar ~1000 Pacientes
for(let b=0; b<10; b++) {
    sql += `\nINSERT INTO Pacientes (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, email, telefono, ciudad_residencia, estado_afiliación, eps_asociada) VALUES \n`;
    for(let i=0; i<100; i++) {
        let n = nombres[Math.floor(Math.random()*nombres.length)];
        let a = apellidos[Math.floor(Math.random()*apellidos.length)] + ' ' + apellidos[Math.floor(Math.random()*apellidos.length)];
        let doc = '10' + Math.floor(Math.random()*90000000 + 10000000);
        if (docsGuardados.length < 50) docsGuardados.push(doc);
        
        let yy = 1960 + Math.floor(Math.random()*50);
        let fn = yy + "-01-15";
        let g = Math.random() > 0.5 ? 'Masculino' : 'Femenino';
        let ct = sedesNombres[Math.floor(Math.random()*sedesNombres.length)];
        let st = estados_afiliación[Math.floor(Math.random()*estados_afiliación.length)];
        let ep = epsNombres[Math.floor(Math.random()*epsNombres.length)];
        
        sql += `('CC', '${doc}', '${n}', '${a}', '${fn}', '${g}', 'usuario_${doc}@email.com', '300000000', '${ct}', '${st}', '${ep}')`;
        if(i < 99) sql += ',\n'; else sql += ';\nGO\n';
    }
}

// Generar Citas (alrededor de 600 - para un 60% ocupado en proximas fechas)
for(let b=0; b<6; b++) {
    sql += `\nINSERT INTO Citas_Medicas (id_paciente, id_medico, id_especialidad, fecha_hora_cita, estado_cita, motivo_consulta) VALUES \n`;
    for(let i=0; i<100; i++) {
        let pId = Math.floor(Math.random()*1000 + 1);
        let mId = Math.floor(Math.random()*5 + 1);
        
        // fecha_cita -> próximos 14 dias
        let diasAgregados = Math.floor(Math.random() * 14);
        let horaAgregada = 8 + Math.floor(Math.random() * 8); // 8am to 16pm
        let fc = new Date(dtStart.getTime() + (diasAgregados * 86400000) + (horaAgregada * 3600000));
        let ds = fc.toISOString().replace('T', ' ').substring(0, 19);

        sql += `(${pId}, ${mId}, ${mId}, '${ds}', 'Programada', 'Control rutinario asignado.')`;
        if(i < 99) sql += ',\n'; else sql += ';\nGO\n';
    }
}

let infoTxt = `# DOCUMENTOS VÁLIDOS PARA CASOS DE PRUEBA Y DEMOSTRACIÓN

** 1. PERFIL ADMINISTRADOR VIP **
1000000702 -> Yeferson Valerio Ayala Gomez (Bogotá | Activo)

** 2. CASOS DE ESTADOS RESTRINGIDOS (Finanzas / EPS) **
1000000703 -> Marta Test Vencido (Medellín | Vencido)
1000000704 -> Pedro Test Inactivo (Cali | Inactivo)
1000000705 -> Luis Test Pendiente (Bogotá | Pendiente de pago)

** 3. MUESTRA DE USUARIOS RANDOM SQL (Activos o Inactivos al azar) **
` + docsGuardados.join('\n');

fs.writeFileSync('database.sql', sql);
fs.writeFileSync('documentos_prueba.txt', infoTxt);
console.log("SQL generated!");
