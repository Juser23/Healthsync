const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // El token se envía en el header "Authorization" con el formato: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un Token válido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_SECRET || 'super_secret_healthsync_key_2026';
        const decoded = jwt.verify(token, secret);
        // Guardamos los datos del usuario en la request para usarlos en el controlador
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = authMiddleware;
