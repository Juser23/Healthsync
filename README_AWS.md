# GuÃ­a de Despliegue en AWS (EC2 Ubuntu 26.04 LTS (Resolute))

Esta carpeta contiene la configuraciÃ³n lista para desplegar en AWS EC2 sin generar errores de entorno, dependencias o rutas.

## Mejoras Implementadas para AWS
1. **Rutas Relativas Inyectadas:** El frontend usa rutas automÃ¡ticas relativas `/api/...`. Ya no hay conflictos de CORS.
2. **ExposiciÃ³n a Internet (0.0.0.0):** El servidor `server.js` ya estÃ¡ configurado para escuchar en `0.0.0.0`, lo que permite que acepte trÃ¡fico pÃºblico desde la IPv4 de EC2.
3. **Manejo de `.env` Aislado:** La configuraciÃ³n local y la de AWS estÃ¡n aisladas. Usa `.env.example` como plantilla para tu base de datos RDS.

## InstalaciÃ³n Automatizada (Ubuntu 26.04 LTS (Resolute))

Para evitar que tengas errores al intentar levantar el proyecto manualmente, he creado un script bash oficial que configura todo tu servidor de golpe.

Una vez subas esta carpeta `aws` a tu instancia EC2, ejecuta los siguientes comandos desde la terminal de Ubuntu:

```bash
# 1. Darle permisos de ejecuciÃ³n al script
chmod +x setup_ec2_ubuntu.sh

# 2. Ejecutar el instalador automÃ¡tico como administrador
sudo ./setup_ec2_ubuntu.sh
```

### Â¿QuÃ© hace exactamente este script?
1. Actualiza el sistema operativo Ubuntu (`apt-get update`).
2. Instala la versiÃ³n oficial **Node.js 20.x LTS**.
3. Instala el gestor de dependencias **PM2** de forma global.
4. Entra a la carpeta `backend` e instala las librerÃ­as (`npm install`).
5. Genera tu archivo `.env` base (si no existe).
6. Arranca la aplicaciÃ³n bajo el nombre `healthsync-api` en modo de producciÃ³n.
7. Configura el sistema (`systemd`) para que si EC2 se reinicia, tu servidor vuelva a arrancar automÃ¡ticamente.

## Pasos Finales en la Consola de AWS
Recuerda ingresar a tu consola de AWS (EC2 > Security Groups) y agregar una **Inbound Rule (Regla de Entrada)**:
- **Tipo:** Custom TCP
- **Puerto:** 3000 (o el que uses)
- **Origen:** 0.0.0.0/0 (Cualquier IP)

Â¡Listo! Ya podrÃ¡s acceder a la plataforma desde la IP pÃºblica de tu servidor EC2.

