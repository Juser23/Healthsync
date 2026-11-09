const dbMock = {
    especialidades: [
        { id: 1, codigo_cups: '890201', nombre: 'Medicina General Integral' },
        { id: 2, codigo_cups: '890202', nombre: 'Cardiología Intervencionista' },
        { id: 3, codigo_cups: '890203', nombre: 'Pediatría Especializada' },
        { id: 4, codigo_cups: '890204', nombre: 'Ortopedia y Traumatología' },
        { id: 5, codigo_cups: '890205', nombre: 'Psicología y Salud Mental' }
    ],
    sedes: ['Sede Norte HealthSync (Bogotá)', 'Sede Chapinero HealthSync (Bogotá)', 'Sede Sur HealthSync (Bogotá)', 'Sede Américas HealthSync (Bogotá)', 'Sede Poblado HealthSync (Medellín)', 'Sede Centro HealthSync (Medellín)', 'Sede Norte HealthSync (Cali)'],
    eps_list: ['Sura', 'Sanitas', 'Compensar', 'Salud Total', 'Nueva EPS'],
    medicos: [],
    pacientes: [], citas: [], alertas_criticas: [], pacientes_atendidos_hoy: []
};

// Generar medicos
let docCounter = 1;
dbMock.sedes.forEach(s => {
    dbMock.especialidades.forEach(e => {
        dbMock.medicos.push({
            id: docCounter++,
            nombre: `Dr. Especialista ${docCounter} (${e.nombre.split(' ')[0]})`,
            idEspecialidad: e.id,
            sede: s
        });
    });
});

function generarDataMasiva() {
    dbMock.pacientes.push({
        id: 0, tipo_doc: "CC", documento: "1000000702", nombre: "Yeferson Valerio Ayala Gomez", 
        ciudad: "Bogotá", edad: 25, genero: "M", alertas: "--", 
        estado_afiliacion: "Activo", eps: "Sanitas", historia: [
            { id: "C001", fecha: '2026-03-15 08:30', cups: '890201', medico: 'Dr. Roberto Villalobos', notas: 'Paciente asiste a chequeo general preventivo.', estado: 'Atendida', copago: "$12,000 COP" },
            { id: "C002", fecha: '2026-04-15 14:15', cups: '----', medico: 'Dra. Andrea Suarez', notas: 'Cita pendiente para control programado.', estado: 'Programada', copago: "$12,000 COP" }
        ]
    });
    
    let testDocs = [
        { doc: "1000000703", nombre: "Marta Test Vencido", estado: "Vencido" },
        { doc: "1000000704", nombre: "Pedro Test Inactivo", estado: "Inactivo" },
        { doc: "1000000705", nombre: "Luis Test Pendiente", estado: "Pendiente de pago" }
    ];
    testDocs.forEach(t => {
        dbMock.pacientes.push({
            id: Math.random(), tipo_doc: "CC", documento: t.doc, nombre: t.nombre, 
            ciudad: "Bogotá", edad: 40, genero: "M", alertas: "--", 
            estado_afiliacion: t.estado, eps: dbMock.eps_list[Math.floor(Math.random()*dbMock.eps_list.length)], historia: []
        });
    });

    let docsConocidos = ["1012345678", "1098765432", "1045612398"];
    const nombres = ["Carlos", "Maria", "Laura", "Andres", "Jose", "Ana", "Miguel", "Diana", "Sofia", "Jorge"];
    const apellidos = ["Perez", "Gomez", "Rodriguez", "Hernandez", "Martinez", "Garcia", "Silva", "Navarro"];
    const estados = ["Activo", "Activo", "Activo", "Inactivo", "Vencido", "Pendiente de pago"];

    for (let i = 0; i < 996; i++) {
        let dc = docsConocidos[i] || ('10' + Math.floor(Math.random() * 90000000 + 10000000));
        let edad = Math.floor(Math.random() * 80 + 1);
        let nom = nombres[Math.floor(Math.random()*nombres.length)] + " " + apellidos[Math.floor(Math.random()*apellidos.length)];
        
        let cty = dbMock.sedes[Math.floor(Math.random()*dbMock.sedes.length)].split('(')[1].replace(')','');
        let paciente = {
            id: i + 10, tipo_doc: "CC", documento: dc, nombre: nom, 
            ciudad: cty, 
            edad: edad, genero: Math.random()>0.5 ? 'M' : 'F',
            alertas: edad > 60 && Math.random() > 0.8 ? 'Riesgo Cardiovascular Alto (Código Rojo)' : '--',
            estado_afiliacion: estados[Math.floor(Math.random()*estados.length)],
            eps: dbMock.eps_list[Math.floor(Math.random()*dbMock.eps_list.length)],
            historia: []
        };
        dbMock.pacientes.push(paciente);
    }
}

// generarDataMasiva();
module.exports = dbMock;
