let citasChartInstance = null;

const app = {
    user: null,
    calendarOffset: 0,
    selectedMedicoName: null,

    inactivityTimer: null,

    init() {
        this.checkAuth();
        this.bindEvents();
        this.setupInactivityTimeout();
    },

    setupInactivityTimeout() {
        const resetTimer = () => {
            clearTimeout(this.inactivityTimer);
            if (sessionStorage.getItem('hg_user')) {
                // 30 minutos en milisegundos = 30 * 60 * 1000 = 1800000
                this.inactivityTimer = setTimeout(() => {
                    sessionStorage.removeItem('hg_user');
                    alert('Tu Sesión ha expirado por inactividad de 30 minutos.');
                    window.location.href = 'index.html';
                }, 1800000);
            }
        };
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, resetTimer, true);
        });
        resetTimer();
    },

    checkAuth() {
        const path = window.location.pathname;
        const localUser = sessionStorage.getItem('hg_user');
        
        if (localUser) {
            this.user = JSON.parse(localUser);
            if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
                window.location.href = 'dashboard.html';
            } else if (path.includes('dashboard.html')) {
                this.setupDashboard();
            }
        } else {
            if (path.includes('dashboard.html')) {
                window.location.href = 'index.html';
            }
        }
    },

    setupDashboard() {
        if(!this.user) return;
        document.getElementById('userNameHeader').textContent = this.user.nombre;
        document.getElementById('userRoleHeader').textContent = this.user.rol;
        document.getElementById('roleLabel').textContent = this.user.rol;
        const mAudi = document.getElementById('menuAuditoria');
        if (mAudi) {
            if(this.user.rol === 'ADMINISTRADOR') mAudi.classList.remove('d-none');
            else mAudi.classList.add('d-none');
        }
        document.getElementById('userAvatar').textContent = this.user.rol.charAt(0);

        const dbContainer = document.getElementById('dbStatusContainer');
        if (dbContainer) {
            dbContainer.classList.remove('d-none');
            if (this.user.rol !== 'ADMINISTRADOR') {
                dbContainer.onclick = null;
                dbContainer.style.cursor = 'default';
            }
            this.checkDbStatus();
        }

        this.router.navigate('resumen');
    },

    async checkDbStatus() {
        try {
            const res = await fetch('/api/db-status', { headers: apiService.getHeaders() });
            const data = await res.json();
            const badge = document.getElementById('dbStatusBadge');
            if (badge) {
                if (data.connected) {
                    badge.className = 'badge badge-light-success';
                    badge.textContent = 'DB Conectada';
                } else {
                    badge.className = 'badge badge-light-danger';
                    if (this.user?.rol === 'ADMINISTRADOR') {
                        badge.textContent = 'DB Desconectada';
                    } else {
                        badge.textContent = 'DB Desconectada - Contactar Admin';
                    }
                }
            }
        } catch (e) {
            console.error('Error verificando estado DB', e);
        }
    },

    async toggleDbConnection() {
        if (this.user?.rol !== 'ADMINISTRADOR') {
            ui.showToast('Solo el administrador puede conectar la base de datos.', 'warning');
            return;
        }

        const badge = document.getElementById('dbStatusBadge');
        if (!badge) return;
        
        badge.textContent = 'Conectando...';
        badge.className = 'badge badge-light-warning';
        
        try {
            const res = await fetch('/api/db-connect', { method: 'POST', headers: apiService.getHeaders() });
            const data = await res.json();
            if (data.success) {
                badge.className = 'badge badge-light-success';
                badge.textContent = 'DB Conectada';
                ui.showToast('Conectado a SQL Server', 'success'); app.router.navigate('resumen');
            } else {
                badge.className = 'badge badge-light-danger';
                badge.textContent = 'DB Desconectada';
                ui.showToast(data.error || 'Error al conectar', 'error');
            }
        } catch (e) {
            badge.className = 'badge badge-light-danger';
            badge.textContent = 'DB Desconectada';
            ui.showToast('Error de red al conectar DB', 'error');
        }
    },

    async doLogin() {
        const email = document.getElementById('emailInput').value;
        const pass = document.getElementById('passwordInput').value;
        const btn = document.getElementById('btnLogin');

        try {
            btn.disabled = true;
            btn.innerHTML = 'Estableciendo conexión encriptada...';
            
            const req = await apiService.login(email, pass);
            sessionStorage.setItem('hg_user', JSON.stringify(req.user));
            
            ui.showToast('Autorización validada. Redirigiendo.', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } catch (error) {
            ui.showToast(error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = 'Iniciar Sesión Segura';
        }
    },

    async cancelarCitaRapida(idCita, docPaciente) {
        if (!confirm('¿Está seguro de que desea CANCELAR esta cita?')) return;
        try {
            await apiService.cancelarCitaRapida(idCita);
            ui.showToast('Cita cancelada correctamente.', 'success');
            document.getElementById('searchPacienteDoc').value = docPaciente;
            this.doBuscarPacienteAgenda();
        } catch(e) {
            ui.showToast(e.message || 'Error al cancelar la cita', 'error');
        }
    },

    doLogout() {
        sessionStorage.removeItem('hg_user');
        window.location.href = 'index.html';
    },

    router: {
        async navigate(viewId) {
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            const activeMenu = document.querySelector(`.menu-item[data-view="${viewId}"]`);
            if (activeMenu) activeMenu.classList.add('active');

            const contentDiv = document.getElementById('appContent');
            
            try {
                const response = await fetch(`modules/${viewId}.html`);
                if (!response.ok) throw new Error('Modulo no encontrado o CORS error');
                const html = await response.text();
                contentDiv.innerHTML = html;
            } catch (err) {
                console.error("Error cargando el modulo HTML:", err);
                // Si falla por CORS (abierto como file://), avisamos al usuario
                contentDiv.innerHTML = `<div style="padding:40px; text-align:center;">
                    <h3 class="text-danger">Error cargando ${viewId}.html</h3>
                    <p>Si abriste este archivo directamente en el navegador (file://), las políticas de seguridad impiden cargar los módulos HTML locales.</p>
                    <p>Por favor, usa una extensión como <b>Live Server</b> en VSCode para servir el proyecto.</p>
                </div>`;
                return;
            }

            const titles = { 'resumen':'Resumen Operativo', 'agendar':'Agenda Médica', 'historia':'Historial Clínico', 'admision':'Inscripción Pacientes', 'triage': 'Gestión de Urgencias' };
            const headTitle = document.getElementById('headerTitle');
            if(headTitle && titles[viewId]) headTitle.innerText = titles[viewId];

            if(viewId === 'resumen') app.loadDashboardData(); 
            if(viewId === 'auditoria') app.loadAuditoriaData(); 
            if(viewId === 'agendar') {
                const selectEsp = document.getElementById('selectEspecialidad');
                const selectSed = document.getElementById('selectSedeAgenda');
                
                if(selectEsp) {
                    selectEsp.addEventListener('change', async () => {
                        const msgE = document.getElementById('pacienteAgendaEncontrado');
                        if (selectEsp.value && msgE && msgE.dataset.ciudad) {
                            selectSed.innerHTML = '<option value="">Seleccione Sede Clínica...</option>';
                            let sedesDisponibles = await apiService.consultarSedes();
                            const norm = str => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                            const ciudadNorm = norm(msgE.dataset.ciudad);
                            let sedesFiltradas = sedesDisponibles.filter(s => norm(s).includes(ciudadNorm));
                            if (sedesFiltradas.length === 0) sedesFiltradas = sedesDisponibles;
                            sedesFiltradas.forEach(s => {
                                selectSed.innerHTML += `<option value="${s}">${s}</option>`;
                            });
                            selectSed.disabled = false;
                        } else {
                            selectSed.innerHTML = '<option value="">Esperando especialidad...</option>';
                            selectSed.disabled = true;
                        }
                        app.doCambioFiltrosAgendamiento();
                    });
                }
                
                if(selectSed) selectSed.addEventListener('change', () => app.doCambioFiltrosAgendamiento());
                const selectMed = document.getElementById('selectMédico');
                if(selectMed) selectMed.addEventListener('change', (e) => {
                    const option = e.target.options[e.target.selectedIndex];
                    app.selectedMedicoName = option.getAttribute('data-nombre');
                    app.calendarOffset = 0;
                    app.renderCalendar();
                });
            }
        }
    },

    async renderCalendar() {
        const wrapper = document.getElementById('calendarWrapper');
        if(!wrapper) return;
        
        if(!app.selectedMedicoName) {
            wrapper.classList.add('d-none');
            return;
        }
        
        wrapper.classList.remove('d-none');
        document.getElementById('inputFechaCita').value = ''; // Reset selection
        
        let doctorCitas = [];
        try {
            doctorCitas = await apiService.obtenerCalendarioMedico(app.selectedMedicoName);
        } catch(e) {
            console.error(e);
        }

        // Calculate week start
        let today = new Date();
        today.setHours(0,0,0,0);
        let dayOfWeek = today.getDay() || 7; 
        let monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1 + (app.calendarOffset * 7));
        
        let sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        document.getElementById('labelWeekTitle').innerText = `Semana del ${monday.getDate()} ${monthNames[monday.getMonth()]} al ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;
        
        document.getElementById('btnPrevWeek').disabled = app.calendarOffset <= 0;
        
        let weekDates = [];
        for(let i=0; i<7; i++) {
            let d = new Date(monday);
            d.setDate(monday.getDate() + i);
            weekDates.push(d);
            document.getElementById('date-'+(i+1)).innerText = d.getDate() + '/' + (d.getMonth()+1);
        }
        
        let tbody = document.getElementById('calendarBody');
        tbody.innerHTML = '';
        
        for(let hour = 8; hour <= 17; hour++) {
            let tr = document.createElement('tr');
            
            let th = document.createElement('th');
            let ampm = hour >= 12 ? 'PM' : 'AM';
            let hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            th.innerHTML = `<span style="color:#7e8299; font-size:0.8rem;">${hour12}:00 ${ampm}</span>`;
            tr.appendChild(th);
            
            for(let day = 0; day < 7; day++) {
                let cellDate = new Date(weekDates[day]);
                cellDate.setHours(hour, 0, 0, 0);
                
                let td = document.createElement('td');
                if (day === 6) { 
                    td.innerHTML = '<div class="calendar-cell" style="background:#f1f3f8; color:#a2a3b7;">-</div>';
                } else {
                    let isOccupied = false;
                    let cellISO = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00`;
                    
                    for(let cita of doctorCitas) {
                        if(cita.fechaRaw) {
                            let citaD = new Date(cita.fechaRaw);
                            if(citaD.getFullYear() === cellDate.getFullYear() && citaD.getMonth() === cellDate.getMonth() && citaD.getDate() === cellDate.getDate() && citaD.getHours() === cellDate.getHours()) {
                                isOccupied = true; break;
                            }
                        } else {
                           if(cita.fecha.includes(cellISO.split('T')[0])) {
                               // Old format support
                           }
                        }
                    }
                    
                    let cellStr = cellDate.toLocaleString('es-CO');
                    
                    if (cellDate < new Date()) { 
                        td.innerHTML = `<div class="calendar-cell" style="background:#f1f3f8; color:#a2a3b7;">Pasado</div>`;
                    } else if (isOccupied) {
                        td.innerHTML = `<div class="calendar-cell busy" title="Turno no disponible">Ocupado</div>`;
                    } else {
                        td.innerHTML = `<div class="calendar-cell free" data-datetime="${cellISO}">Libre</div>`;
                    }
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
    },

    async loadAuditoriaData() {
        const tbody = document.getElementById('auditoriaTableBody');
        if (!tbody) return;
        try {
            const logs = await apiService.obtenerAuditoria();
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay registros de auditoría.</td></tr>';
                return;
            }
            tbody.innerHTML = logs.map(l => `<tr>
                <td>${l.id_log}</td>
                <td>${l.usuario}</td>
                <td>${l.rol}</td>
                <td>${l.accion}</td>
                <td>${new Date(l.fecha_hora).toLocaleString('es-CO')}</td>
            </tr>`).join('');
        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error cargando auditoría</td></tr>';
        }
    },

    mostrarToast(msg, type = 'success') {
        ui.showToast(msg, type);
    },

    async loadDashboardData() {
        if(!document.getElementById('citasHoyDb')) return;
        
        try {
            const data = await apiService.obtenerDashboard();
            
            document.getElementById('totalDbUsers').textContent = (data.totalPacientes || 0).toLocaleString();
            let baseHoy = 60; 
            document.getElementById('citasHoyDb').textContent = baseHoy + (data.citasNuevas || 0);
            const alertas = data.alertasCriticas || data.alertasCríticas || [];
            document.getElementById('alertasDb').textContent = alertas.length;

            const tbody = document.getElementById('listaPróximasCitas') || document.getElementById('listaProximasCitas');
            const proximas = data.proximasCitas || data.PróximasCitas || [];
            if(tbody) {
                tbody.innerHTML = '';
                proximas.forEach((cita) => {
                    let rowStyle = cita.is_new ? 'background-color: #f1f8f5;' : '';
                    if (cita.is_new) cita.is_new = false; 
                    const medicoNom = cita.medico || cita.Médico || '';
                    tbody.innerHTML += `
                        <tr style="${rowStyle} transition: background 1s;">
                            <td><strong>${cita.paciente}</strong></td>
                            <td><span style="font-size:0.85rem; color:#475569">${medicoNom}</span></td>
                            <td style="white-space: nowrap; font-size:0.85rem;">${cita.fecha}</td>
                            <td><span class="badge ${cita.estado === 'Confirmada' ? 'badge-light-success' : 'badge-light-primary'}">${cita.estado}</span></td>
                        </tr>
                    `;
                });
            }
            app.dashboardCache = data;
            this.renderChart(data.estadisticasCitas);
        } catch(e) {
            console.error("Error al cargar dashboard", e);
        }
    },

    renderChart(estadisticas) {
        const ctx = document.getElementById('citasChart');
        if(!ctx) return;
        
        let counts = [24, 12, 10, 8, 6]; 
        if (estadisticas) {
            estadisticas.forEach(c => {
                if(c.is_new && c.esp_id && counts[c.esp_id - 1] !== undefined) {
                    counts[c.esp_id - 1]++;
                }
            });
        }

        if (citasChartInstance) citasChartInstance.destroy();

        citasChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Med. Gral', 'Cardiología', 'Pediatría', 'Ortopedia', 'Psicología'],
                datasets: [{
                    label: 'Citas Asignadas',
                    data: counts,
                    backgroundColor: [
                        '#20c997',
                        '#0d6efd',
                        '#ffc107',
                        '#dc3545',
                        '#6f42c1'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'right' },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                cutout: '65%'
            }
        });
    },

    abrirModalAlertas() {
        const body = document.getElementById('modalBody');
        document.getElementById('modalTitle').innerHTML = 'Alertas Críticas Detectadas';
        const alertas = app.dashboardCache ? (app.dashboardCache.alertasCriticas || app.dashboardCache.alertasCríticas || []) : [];
        body.innerHTML = `
            <table class="table table-hover">
                <thead><tr><th>Documento</th><th>Paciente (Riesgo)</th><th>Factor Clínico</th></tr></thead>
                <tbody>
                    ${alertas.slice(0, 50).map(a => `
                        <tr>
                            <td>${a.doc}</td>
                            <td><b>${a.paciente}</b></td>
                            <td class="text-danger" style="font-weight: 500;">${a.motivo}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('genericModal').classList.remove('d-none');
    },

    abrirModalAtendidos() {
        const body = document.getElementById('modalBody');
        document.getElementById('modalTitle').innerHTML = 'Pacientes Atendidos por Jornada';
        const rawAtendidos = app.dashboardCache ? app.dashboardCache.pacientesAtendidosHoy : [];
        const atendidos = Array.isArray(rawAtendidos) ? rawAtendidos : [];
        body.innerHTML = `
            <ul style="list-style: none; padding:0;">
                ${atendidos.map(a => `
                    <li style="padding: 12px; border-bottom: 1px solid #f1f5f9;">
                        <b style="color:var(--primary-color);">[${a.hora}]</b> 
                        <span style="font-weight:600; margin: 0 10px;">${a.paciente}</span>
                        <span class="text-muted" style="font-size:0.85rem;">${a.observacion}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        document.getElementById('genericModal').classList.remove('d-none');
    },

    
    // --- TRIAGE Y URGENCIAS ---
    switchTriageTab(tab) {
        const viewIngreso = document.getElementById('triageViewIngreso');
        const viewEstado = document.getElementById('triageViewEstado');
        if(!viewIngreso || !viewEstado) return;
        
        viewIngreso.classList.add('d-none');
        viewEstado.classList.add('d-none');
        document.getElementById('btnTabIngreso').classList.replace('btn-primary', 'btn-light');
        document.getElementById('btnTabEstado').classList.replace('btn-primary', 'btn-light');
        
        if(tab === 'ingreso') {
            viewIngreso.classList.remove('d-none');
            document.getElementById('btnTabIngreso').classList.replace('btn-light', 'btn-primary');
        } else {
            viewEstado.classList.remove('d-none');
            document.getElementById('btnTabEstado').classList.replace('btn-light', 'btn-primary');
            this.cargarEstadoTriage();
        }
    },

    async validarPacienteTriage() {
        const doc = document.getElementById('triageDocInput').value.trim();
        if(!doc) return this.mostrarToast('Ingrese el número de documento', 'error');
        
        try {
            const p = await apiService.buscarPaciente(doc, 'CC');
            if(p.estado_afiliacion === 'Inactivo') {
                return this.mostrarToast('El paciente se encuentra INACTIVO. Remitir a facturación/admisiones.', 'error');
            }
            
            this.triagePacienteSeleccionado = p;
            document.getElementById('triagePacienteInfo').innerHTML = `
                <div style="width: 45px; height: 45px; border-radius: 10px; background: rgba(32,201,151,0.1); display: flex; align-items: center; justify-content: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #181c32;">${p.nombre}</div>
                    <div style="font-size: 0.85rem; color: #7e8299; margin-top: 3px;">ID: <span style="font-weight:600; color:#3f4254;">${p.documento}</span> &nbsp;|&nbsp; EPS: <span style="font-weight:600; color:#3f4254;">${p.eps}</span> &nbsp;|&nbsp; Afiliación: <span style="font-weight:700; color: ${p.estado_afiliacion==='Activo'?'#50cd89':'#f1416c'}">${p.estado_afiliacion}</span></div>
                </div>
            `;
            document.getElementById('triageFormContainer').classList.remove('d-none');
            this.mostrarToast('Paciente validado correctamente', 'success');
        } catch (e) {
            this.mostrarToast('Paciente no encontrado en el sistema', 'error');
            document.getElementById('triageFormContainer').classList.add('d-none');
            this.triagePacienteSeleccionado = null;
        }
    },

    async guardarTriage() {
        if(!this.triagePacienteSeleccionado) return this.mostrarToast('Debe validar el paciente primero', 'error');
        
        const motivo = document.getElementById('triageMotivo').value.trim();
        const clasificacion = document.getElementById('triageClasificacion').value;
        const accion = document.getElementById('triageAccion').value;
        
        if(!motivo || !clasificacion || !accion) return this.mostrarToast('Complete todos los campos del Triage', 'error');
        
        try {
            await apiService.registrarTriage({
                documento: this.triagePacienteSeleccionado.documento,
                nombre: this.triagePacienteSeleccionado.nombre,
                motivo, clasificacion, accion
            });
            this.mostrarToast('Triage registrado exitosamente', 'success');
            
            // Limpiar formulario
            document.getElementById('triageMotivo').value = '';
            document.getElementById('triageClasificacion').value = '';
            document.getElementById('triageFormContainer').classList.add('d-none');
            document.getElementById('triageDocInput').value = '';
            this.triagePacienteSeleccionado = null;
            
            // Cambiar a pestaña de estado
            this.switchTriageTab('estado');
        } catch(e) {
            this.mostrarToast('Error al registrar Triage', 'error');
        }
    },

    async cargarEstadoTriage() {
        const tbody = document.getElementById('triageTableBody');
        if(!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
        
        try {
            const data = await apiService.obtenerTriage();
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay pacientes en urgencias</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(t => {
                let badgeClass = 'badge-light-primary';
                let label = t.clasificacion;
                if(t.clasificacion === 'I') { badgeClass = 'badge-light-danger'; label = 'Triage I (Reanimación)'; }
                if(t.clasificacion === 'II') { badgeClass = 'badge-light-warning'; label = 'Triage II (Emergencia)'; }
                if(t.clasificacion === 'III') { badgeClass = 'badge-light-warning'; label = 'Triage III (Urgencia)'; }
                if(t.clasificacion === 'IV') { badgeClass = 'badge-light-success'; label = 'Triage IV (Prioridad Menor)'; }
                if(t.clasificacion === 'V') { badgeClass = 'badge-light-primary'; label = 'Triage V (No Urgente)'; }
                
                let btnClass = 'btn-light';
                if(t.clasificacion === 'I' || t.clasificacion === 'II') btnClass = 'btn-danger';
                
                return `
                    <tr>
                        <td style="font-weight:700; padding-left: 20px; color: #181c32;">${t.paciente}</td>
                        <td>${t.motivo}</td>
                        <td><span class="badge ${badgeClass}">${label}</span></td>
                        <td style="text-align: right; padding-right: 20px;"><button class="btn btn-sm ${btnClass}" style="border-radius: 6px; font-weight: 600;">${t.accion}</button></td>
                    </tr>
                `;
            }).join('');
            
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error cargando estado</td></tr>';
        }
    },

    cerrarModal() {
        document.getElementById('genericModal').classList.add('d-none');
    },

    async doBuscarPacienteAgenda() {
        const doc = document.getElementById('searchPacienteDoc').value;
        const msg = document.getElementById('pacienteAgendaEncontrado');
        const selectSede = document.getElementById('selectSedeAgenda');
        const selectEspecialidad = document.getElementById('selectEspecialidad');
        const selectMed = document.getElementById('selectMédico');

        if(!doc) return;

        msg.innerHTML = 'Validando Documento en Base de Datos...';
        msg.style.color = "var(--primary-color)";
        
        if(selectSede) { selectSede.disabled = true; selectSede.innerHTML = '<option value="">Esperando Validación...</option>'; }
        if(selectMed) { selectMed.disabled = true; selectMed.innerHTML = '<option value="">Esperando centro...</option>'; }

        try {
            const p = await apiService.buscarPaciente(doc);
            
            const card = document.getElementById('pacienteProfileCard');
            if (p.estado_afiliacion !== "Activo") {
                msg.innerHTML = `⚠️ Operación Rechazada: Paciente <b>${p.nombre}</b>. Estado: <b style="text-transform:uppercase;">${p.estado_afiliacion}</b>.`;
                msg.style.color = "var(--danger-color)";
                msg.dataset.nombre = "";
                if(card) card.classList.add('d-none');
                return;
            }

            msg.innerHTML = `Identidad validada correctamente.`;
            msg.style.color = "var(--success-color)";
            msg.dataset.nombre = p.nombre;
            msg.dataset.ciudad = p.ciudad;
            
            const histCont = document.getElementById('historialRapidoAgenda');
            if (histCont && p.historial_clinico) {
                let html = '<h6 style="color:var(--primary-color); font-weight:700; margin-bottom:15px;"><i class="bi bi-clock-history"></i> Historial Clínico Reciente</h6><div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr style="background:#f1f3f8; color:#5e6278; font-size:0.8rem;"><th>Fecha</th><th>Especialidad</th><th>Médico</th><th>Estado</th></tr></thead><tbody style="font-size:0.85rem;">';
                if (p.historial_clinico.length === 0) {
                    html += '<tr><td colspan="4" class="text-center text-muted">No hay historial registrado</td></tr>';
                } else {
                    p.historial_clinico.slice(0, 4).forEach(h => {
                        let bg = h.estado === 'Programada' ? '#fff3cd' : (h.estado === 'Completada' ? '#d4edda' : '');
                        
                    let cancelBtn = h.estado === 'Programada' ? '<button class="btn btn-sm btn-outline-danger" onclick="app.cancelarCitaRapida(' + h.id + ', \'' + p.documento + '\')" style="font-size:0.7rem; padding:0.1rem 0.4rem;">Cancelar</button>' : '';
                    html += '<tr style="background:' + bg + '"><td>' + h.fecha.split(',')[0] + '</td><td>' + h.especialidad + '</td><td>' + h.medico + '</td><td>' + h.estado + ' ' + cancelBtn + '</td></tr>';

                    });
                }
                html += '</tbody></table></div>';
                histCont.innerHTML = html;
                document.getElementById('historialRapidoAgendaRow').classList.remove('d-none');
            }
            
            if(card) {
                card.classList.remove('d-none');
                document.getElementById('profileInitials').innerText = p.nombre.substring(0,2).toUpperCase();
                document.getElementById('profileName').innerText = p.nombre + (p.alertas !== '--' ? ' ⚠️ [Alerta Clínica]' : '');
                document.getElementById('profileDoc').innerText = p.documento;
                document.getElementById('profileCity').innerText = p.ciudad;
                document.getElementById('profileEps').innerText = p.eps;
            }
            
            if(selectEspecialidad) {
                selectEspecialidad.disabled = false;
                selectEspecialidad.value = '';
            }
            if(selectSede) {
                selectSede.disabled = true;
                selectSede.innerHTML = '<option value="">Seleccione arriba la especialidad...</option>';
            }
        } catch(error) {
            msg.innerHTML = `Error: ${error.message}`;
            msg.style.color = "var(--danger-color)";
            msg.dataset.nombre = "";
        }
    },

    async doCambioFiltrosAgendamiento() {
        const idEsp = document.getElementById('selectEspecialidad').value;
        const sedeSeleccionada = document.getElementById('selectSedeAgenda').value;
        const selectMed = document.getElementById('selectMédico');
        
        selectMed.innerHTML = '<option value="">Calculando disponibilidad...</option>';
        
        try {
            selectMed.innerHTML = '';
            if(!idEsp || !sedeSeleccionada) { 
                selectMed.innerHTML = '<option value="">Esperando centro y especialidad...</option>';
                selectMed.disabled = true; 
                return; 
            }
            
            let Médicos = await apiService.consultarDisponibilidad(idEsp, sedeSeleccionada);
            selectMed.disabled = false;
            
            if(Médicos.length === 0) {
                selectMed.innerHTML = '<option value="">Sin disponibilidad en esta sede</option>';
                selectMed.disabled = true;
                if (document.getElementById('calendarWrapper')) document.getElementById('calendarWrapper').classList.add('d-none');
            } else {
                selectMed.innerHTML = '<option value="">Seleccione al especialista...</option>';
                Médicos.forEach(m => {
                    selectMed.innerHTML += `<option value="${m.id}" data-nombre="${m.nombre}">${m.nombre}</option>`;
                });
                if (document.getElementById('calendarWrapper')) document.getElementById('calendarWrapper').classList.add('d-none');
            }
        } catch (e) {
            console.error(e);
        }
    },

    async doGuardarCita(e) {
        e.preventDefault();
        
        const docInput = document.getElementById('searchPacienteDoc').value;
        const espVal = document.getElementById('selectEspecialidad').value;
        const medVal = document.getElementById('selectMédico').value;
        const fechaVal = document.getElementById('inputFechaCita').dataset.iso;
        const motivoVal = document.getElementById('inputMotivo').value;
        const msgE = document.getElementById('pacienteAgendaEncontrado');

        if (!docInput || !espVal || !medVal || !fechaVal || !motivoVal) {
            ui.showToast('Revisión requerida: Existen campos sin completar.', 'warning');
            return;
        }
        if (!msgE || !msgE.dataset.nombre) {
            ui.showToast('Requisito de seguridad: Valide el documento.', 'error');
            return;
        }

        const btn = document.getElementById('btnGuardarCita');
        try {
            btn.disabled = true;
            btn.innerHTML = 'Enviando petición a SQL Server...';
            
            let res = await apiService.guardarCita({
                documento: docInput,
                medico_id: medVal, // ahora medVal es el ID
                fecha: fechaVal,
                motivo: motivoVal
            });

            const espNombre = document.getElementById('selectEspecialidad').options[document.getElementById('selectEspecialidad').selectedIndex].text;
            const selectMedEl = document.getElementById('selectMédico');
            const medNombreText = selectMedEl.options[selectMedEl.selectedIndex].getAttribute('data-nombre') || medVal;

            
            const userStr = sessionStorage.getItem('hg_user');
            const userName = userStr ? JSON.parse(userStr).nombre : 'Sistema';
            
            const randSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const radicado = `HS-${res.ordenId}-${randSuffix}`;
            
            const elRadicado = document.getElementById('tkRadicado');
            if (elRadicado) {
                elRadicado.innerText = radicado;
                document.getElementById('tkBarcode').innerText = radicado;
                document.getElementById('tkFechaImpresion').innerText = new Date().toLocaleString();
                document.getElementById('tkUsuarioImp').innerText = userName;
                
                const selSede = document.getElementById('selectSedeAgenda');
                document.getElementById('tkSede').innerText = selSede && selSede.options[selSede.selectedIndex] ? selSede.options[selSede.selectedIndex].text : 'Sede Principal';
            } else {
                if(document.getElementById('tkOrden')) document.getElementById('tkOrden').innerText = res.ordenId;
            }
            
            document.getElementById('tkFecha').innerText = fechaVal.replace('T', ' ');
            document.getElementById('tkPaciente').innerText = msgE.dataset.nombre;
            document.getElementById('tkDoc').innerText = docInput;
            document.getElementById('tkMed').innerText = medNombreText;
            document.getElementById('tkEsp').innerText = espNombre;
            document.getElementById('tkCosto').innerText = res.copago || 'Sin Costo';

            ui.showToast('Registro Clínico creado exitosamente.', 'success');
            document.getElementById('agendarForm').reset();
            msgE.innerHTML = '';
            
            setTimeout(() => {
                document.getElementById('modalTitle').innerText = "Comprobante de Asignación";
                document.getElementById('modalBody').innerHTML = `
                    <div class="text-center p-3">
                        <svg class="svg-icon" style="color:var(--success-color); width:50px; height:50px; margin-bottom:15px;" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <h4 style="color:#181c32; font-weight:700;">Cita N° ${res.ordenId} Programada</h4>
                        <p class="text-muted">Copago: <strong>${res.copago}</strong></p>
                        
<div id="emailProgress" class="mt-4 p-3" style="background:#f1f8f5; border-radius:8px; text-align:left; border: 1px solid #c3e6cb;">
    <div class="d-flex align-items-center mb-2" id="pdfLoader">
        <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
        <span style="font-size:0.9rem; font-weight:600; color:var(--success-color);">Generando Ticket PDF y conectando a Gmail...</span>
    </div>
    <div style="font-size:0.8rem; color:#475569; margin-top:5px;" id="emailSubject">Asunto: Asignación de cita - </div>
</div>
<button class="btn btn-success w-100 mt-3 d-none" id="btnEmailSuccess" onclick="document.getElementById('genericModal').classList.add('d-none')">
    <i class="bi bi-check-circle"></i> Volver a la Agenda
</button>


                    </div>
                `;
                document.getElementById('genericModal').classList.remove('d-none');
                setTimeout(() => {
                    const pdfLoader = document.getElementById('pdfLoader');
                    if(pdfLoader) pdfLoader.innerHTML = '<i class="bi bi-envelope-check-fill text-success me-2" style="font-size: 1.2rem;"></i><span style="font-size:0.9rem; font-weight:600; color:var(--success-color);">¡PDF enviado exitosamente al paciente!</span>';
                    const btnEmail = document.getElementById('btnEmailSuccess');
                    if(btnEmail) btnEmail.classList.remove('d-none');
                    app.renderCalendar();
                }, 2500);
            }, 600);
        } catch (error) {
            ui.showToast(error.message || 'Excepción del servidor.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Confirmar y Agendar';
        }
    },

    async doBuscarHistoriaClinica() {
        const doc = document.getElementById('searchHistoriaDoc').value;
        const regBtn = document.getElementById('btnRegistrarNuevoPacienteWrapper');
        const cont = document.getElementById('historiaContenido');

        if(!doc) { ui.showToast('Ingrese criterio de búsqueda.', 'warning'); return; }

        cont.classList.add('d-none');
        regBtn.classList.add('d-none');

        try {
            const p = await apiService.buscarPaciente(doc);
            
            document.getElementById('pacientePerfil').innerHTML = `
                <div class="col-md-6"><h2 style="color:var(--primary-color); margin-bottom:0;">${p.nombre}</h2> <small class="text-muted">Sede: ${p.ciudad} | EPS: ${p.eps}</small></div>
                <div class="col-md-6 text-right pt-2" style="text-align: right;"><strong>Documento: ${p.documento}</strong><br><span class="badge ${p.estado_afiliacion==='Activo'?'badge-light-success':p.estado_afiliacion==='Inactivo'?'badge-light-warning':'badge-light-danger'}" style="margin-top:5px; text-transform:uppercase;">ESTADO: ${p.estado_afiliacion}</span></div>
                <div class="col-12 mt-3">
                    <span class="badge ${p.alertas==='--'?'badge-light-primary':'badge-light-warning'}">Valoración Cardiovascular: ${p.alertas}</span><br>
                </div>
            `;

            const list = document.getElementById('listaHistoriaClinica') || document.getElementById('listaHistoriaClínica');
            if (list) {
                list.innerHTML = '';
                const eventos = p.historial_clinico || p.historia || [];
                
                if(eventos.length === 0) {
                    list.innerHTML = `<div class="timeline-item"><span class="text-muted">No existen eventos en el sistema.</span></div>`;
                } else {
                    eventos.forEach(ev => {
                        let badgeClass = (ev.estado === 'Atendida' || ev.estado === 'Completada') ? 'badge-light-primary' : ev.estado === 'Cancelada' ? 'badge-light-danger' : 'badge-light-warning';
                        let bgLeft = (ev.estado === 'Atendida' || ev.estado === 'Completada') ? 'var(--primary-color)' : ev.estado === 'Cancelada' ? 'var(--danger-color)' : 'var(--warning-color)';
                        
                        let botonesProgramada = '';
                        if(ev.estado === 'Programada') {
                            botonesProgramada = `
                                <div class="mt-3" style="border-top:1px dashed #e4e6ef; padding-top:10px;">
                                    <button type="button" class="btn btn-sm btn-light text-danger" onclick="app.cancelarCitaPaciente('${p.documento}', '${ev.id}')">Cancelar Turno</button>
                                    <button type="button" class="btn btn-sm btn-light text-primary" onclick="app.reprogramarCitaPaciente('${p.documento}', '${ev.id}')">Reprogramar</button>
                                </div>
                            `;
                        }

                        const medicoNombre = ev.medico || ev.Médico || 'Médico Asignado';
                        const notasTexto = ev.motivo || ev.notas || 'Consulta médica';
                        const ordenTexto = ev.ordenId || ('ORD-' + ev.id);

                        list.innerHTML += `
                            <div class="timeline-item" style="padding: 1rem; border-left: 3px solid ${bgLeft}; margin-bottom: 1rem; background-color: #f8f9fa; border-radius: 0 8px 8px 0;">
                                <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                                    <strong>${ev.fecha} <small class="text-muted ml-2">(${ordenTexto})</small></strong>
                                    <span class="badge ${badgeClass}">${ev.estado}</span>
                                </div>
                                <div style="font-weight:600; color:var(--text-dark);">${medicoNombre} 
                                    ${ev.especialidad ? `<small class="text-muted">| ${ev.especialidad}</small>` : ''}
                                </div>
                                <p class="text-muted mt-2" style="font-size:0.9rem; margin-bottom:0;">${notasTexto}</p>
                                ${botonesProgramada}
                            </div>
                        `;
                    });
                }
            }

            cont.classList.remove('d-none');
        } catch (error) {
            regBtn.classList.remove('d-none');
            ui.showToast('No existen registros asociados.', 'warning');
        }
    },

    async cancelarCitaPaciente(doc, id) {
        if(confirm('¿Está seguro de anular esta cita de forma irreversible?')) {
            await apiService.cancelarCita(id, doc);
            ui.showToast('La cita médica ha sido revocada del sistema.', 'error');
            this.doBuscarHistoriaClinica();
        }
    },

    reprogramarCitaPaciente(doc, id) {
        ui.showToast('Asigne la nueva fecha.', 'success');
        this.router.navigate('agendar');
        setTimeout(() => {
            document.getElementById('searchPacienteDoc').value = doc;
            this.doBuscarPacienteAgenda();
        }, 500);
        apiService.cancelarCita(id, doc);
    },

    abrirFormularioPaciente() {
        this.router.navigate('admision');
    },

    async guardarNuevoPacienteRapido(e) {
        if(e) e.preventDefault();
        const nom = document.getElementById('regNombre').value;
        const doc = document.getElementById('regDoc').value;
        const eps = document.getElementById('regEps').value;
        const sede = document.getElementById('regSede').value;
        const estado = document.getElementById('regEstado').value;

        if(!nom || !doc || !eps || !sede) {
            ui.showToast('Complete todos los datos.', 'warning');
            return;
        }

        await apiService.guardarPaciente({
            documento: doc, nombre: nom, ciudad: sede, eps: eps, estado_afiliacion: estado
        });

        ui.showToast(`Paciente ${nom} registrado con éxito en SQL.`, 'success');
        document.getElementById('registroForm').reset();
        
        setTimeout(() => {
            this.router.navigate('agendar');
            setTimeout(() => {
                document.getElementById('searchPacienteDoc').value = doc;
                this.doBuscarPacienteAgenda();
            }, 300);
        }, 800);
    },

    bindEvents() {
        // Delegación de eventos global, importante para elementos cargados dinámicamente
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#btnLogin')) this.doLogin();
            if (e.target.closest('#btnLogout')) this.doLogout();
            
            const menuItem = e.target.closest('.menu-item[data-view]');
            if (menuItem) this.router.navigate(menuItem.getAttribute('data-view'));

            if (e.target.closest('#btnBuscarPacienteAgenda')) this.doBuscarPacienteAgenda();
            if (e.target.closest('#btnBuscarHistoria')) this.doBuscarHistoriaClinica();
            if (e.target.closest('#btnGuardarCita')) {
                const form = document.getElementById('agendarForm');
                if(form.checkValidity()) this.doGuardarCita(e);
                else form.reportValidity();
            }

            // Calendar Interactions
            if (e.target.closest('#btnPrevWeek')) { app.calendarOffset--; app.renderCalendar(); }
            if (e.target.closest('#btnNextWeek')) { app.calendarOffset++; app.renderCalendar(); }
            
            const cell = e.target.closest('.calendar-cell.free');
            if (cell) {
                document.querySelectorAll('.calendar-cell.selected').forEach(el => {
                    el.classList.remove('selected');
                    el.innerHTML = 'Libre';
                });
                cell.classList.add('selected');
                cell.innerHTML = 'Activo';
                const dObj = new Date(cell.dataset.datetime);
                const formatter = new Intl.DateTimeFormat('es-CO', { 
                    weekday: 'long', month: 'long', day: 'numeric', 
                    hour: 'numeric', minute: '2-digit', hour12: true 
                });
                const inputField = document.getElementById('inputFechaCita');
                inputField.value = formatter.format(dObj);
                inputField.dataset.iso = cell.dataset.datetime;
            }
        });

        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'loginForm') { e.preventDefault(); this.doLogin(); }
            if (e.target.id === 'agendarForm') { e.preventDefault(); this.doGuardarCita(e); }
            if (e.target.id === 'registroForm') { e.preventDefault(); this.guardarNuevoPacienteRapido(e); }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());






