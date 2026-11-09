#!/bin/bash
# ==========================================
# HEALTHSYNC - SCRIPT DE DESPLIEGUE PARA AWS EC2 (Ubuntu 26.04)
# ==========================================

echo "1. Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

echo "2. Instalando Node.js (v20.x)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "3. Instalando PM2 (Process Manager) para ejecución en segundo plano..."
sudo npm install -g pm2

echo "4. Instalando Nginx (Para servir Frontend y Proxy Inverso)..."
sudo apt install -y nginx

echo "=========================================="
echo " CONFIGURACIÓN DEL PROYECTO"
echo "=========================================="
echo "-> Asegúrate de haber copiado las carpetas 'frontend' y 'backend' a esta máquina."
echo "-> Navega a la carpeta backend:"
echo "   cd backend"
echo "-> Instala las dependencias:"
echo "   npm install"
echo "-> Crea y configura tu archivo .env con las credenciales de RDS:"
echo "   cp .env.example .env"
echo "   nano .env"
echo "-> Inicia el backend con PM2:"
echo "   pm2 start server.js --name healthsync-api"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "-> Copia los archivos del frontend a Nginx:"
echo "   sudo cp -r ../frontend/* /var/www/html/"
echo "   sudo systemctl restart nginx"
echo ""
echo "¡Despliegue finalizado! El Frontend está corriendo en el puerto 80."
