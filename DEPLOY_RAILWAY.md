# Deploy API publica en Railway (Docker + GitHub)

## 1) Repo de GitHub (solo API)

Sube **solo** el contenido de `api` a tu repo de API publica.

Archivos clave para deploy:

- `Dockerfile.railway`
- `railway.toml`
- `docker-entrypoint.sh`
- `package.json`
- `build` se genera en build stage, no se sube

## 2) Crear servicio en Railway

1. En Railway: **New Project** -> **Deploy from GitHub repo**
2. Selecciona tu repo de API publica
3. Railway detectara `railway.toml` y construira con `Dockerfile.railway`

## 3) Variables de entorno

Usa `.env.railway.example` como plantilla y carga esas variables en Railway.
Minimo obligatorio:

- `APP_KEY`
- `JWT_SECRET`
- `APP_URL`
- `MYSQL_TRACKING_HOST`
- `MYSQL_TRACKING_PORT`
- `MYSQL_TRACKING_DATABASE`
- `MYSQL_TRACKING_USER`
- `MYSQL_TRACKING_PASSWORD`

Recomendado:

- `NODE_ENV=production`
- `RUN_MIGRATIONS_ON_BOOT=true`
- `RUN_DEMO_SEED_ON_BOOT=false`

## 4) Base de datos

Puedes usar:

- MySQL de Railway (recomendado), o
- un MySQL externo accesible desde internet

Si usas MySQL de Railway, copia host/port/user/password/database del plugin MySQL al servicio API.

## 5) Validacion post-deploy

1. Verifica que el servicio quede en estado **Healthy**
2. Prueba endpoint de salud/autenticacion desde la URL publica de Railway
3. Verifica en logs que migraciones corran sin error

## 6) Nota de seguridad

- No guardes credenciales de GitHub ni passwords en el repo.
- Define secretos solo en variables de Railway / GitHub Secrets.
