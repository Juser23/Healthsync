const apiService = {
    getToken() {
        return sessionStorage.getItem('hg_token');
    },

    getHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    },

    async handleResponse(res) {
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                sessionStorage.removeItem('hg_user');
                sessionStorage.removeItem('hg_token');
                window.location.href = 'index.html';
                throw new Error("Sesión expirada o token inválido.");
            }
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Error en la petición");
        }
        return res.json();
    },

    async login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await this.handleResponse(res);
        sessionStorage.setItem('hg_token', data.token); // Guardar el token real
        return data;
    },

    async buscarPaciente(documento, tipo_doc = 'CC') {
        const res = await fetch(`/api/pacientes/${tipo_doc}/${documento}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    async guardarPaciente(datosPaciente) {
        if (!datosPaciente.tipo_doc) datosPaciente.tipo_doc = 'CC';
        const res = await fetch('/api/pacientes', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(datosPaciente)
        });
        return this.handleResponse(res);
    },

    async consultarSedes() {
        const res = await fetch('/api/sedes', {
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    async consultarDisponibilidad(codigo_cups, sede) {
        const res = await fetch(`/api/disponibilidad?codigo_cups=${codigo_cups}&sede=${encodeURIComponent(sede)}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    async guardarCita(datosCita) {
        // La UI enviaba mucha basura. Construir un payload limpio.
        if (!datosCita.tipo_doc) datosCita.tipo_doc = 'CC';
        const payload = {
            tipo_doc: datosCita.tipo_doc,
            documento: datosCita.documento,
            medico_id: datosCita.medico_id,
            fecha: datosCita.fecha,
            motivo: datosCita.motivo
        };

        const res = await fetch('/api/citas', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });
        return this.handleResponse(res);
    },

    async obtenerAuditoria() {
        const res = await fetch('/api/auditoria', { headers: this.getHeaders() });
        return this.handleResponse(res);
    },

    async obtenerDashboard() {
        const res = await fetch('/api/dashboard', { headers: this.getHeaders() });
        return this.handleResponse(res);
    },

    async obtenerCalendarioMedico(nombreMedico) {
        const res = await fetch(`/api/calendario/${encodeURIComponent(nombreMedico)}`, { headers: this.getHeaders() });
        return this.handleResponse(res);
    },

    async cancelarCitaRapida(idCita) {
        const res = await fetch(`/api/citas/${idCita}/cancelar`, {
            method: 'PUT',
            headers: this.getHeaders()
        });
        return this.handleResponse(res);
    },

    async cancelarCita(idCita, documento, tipo_doc = 'CC') {
        const res = await fetch(`/api/citas/${idCita}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
            body: JSON.stringify({ tipo_doc, documento })
        });
        return this.handleResponse(res);
    },
    async obtenerTriage() {
        const res = await fetch('/api/triage', { headers: this.getHeaders() });
        return this.handleResponse(res);
    },
    async registrarTriage(datos) {
        const res = await fetch('/api/triage', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(datos)
        });
        return this.handleResponse(res);
    }
};

