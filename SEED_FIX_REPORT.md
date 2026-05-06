# Informe de fix: pre-deploy Railway + seeders seguros

## 1. Diagnóstico inicial

Railway ejecutaba **`preDeployCommand`** antiguo (solo migraciones) y/o la imagen no incluía **`railway-predeploy.sh`** porque los cambios en **`Dockerfile.railway`**, **`railway.toml`**, **`docker-entrypoint.sh`** y el nuevo script vivían únicamente en **staging (--cached)** o en disco sin **commit**.

Los **Build Logs** no mostraban `COPY railway-predeploy.sh`; el archivo en producción divergía del **`Dockerfile.railway`** esperado tras `git show HEAD`.

## 2. Causa raíz

- **Commits no publicados**: `main` en GitHub (`02bb9cc`) construía imagen sin el script ni el `COPY` nuevo.
- **Desincronización local vs remoto**: en disco sí existían `railway-predeploy.sh` + copy en Dockerfile + `preDeployCommand = sh /app/railway-predeploy.sh`, pero no estaban en el historial remoto hasta el push siguiente.

## 3. Bug adicional encontrado y corregido (`warehouse_seeder`)

El seeder anterior usaba **`Warehouse.updateOrCreateMany('code', [...])`** con payloads que fijaban `address`, `latitude` y **`null`**. En cada deploy eso podía **sobrescribir** datos cargados desde el panel (coords, dirección).

**Solución aplicada**: patrón **solo crear si no existe** (`findBy('code')` → `create` solo si falta); si el registro existe, **no se modifica nada**.

`demo_user_seeder` se mantuvo sin cambios (ya idempotente y sin pisar contraseña en usuarios existentes).

## 4. Fix aplicado (push)

Commit en **`Greimer29/lobo-go-api`** `main`:

- **SHA**: `6aa2df1`
- **Mensaje**: `feat(deploy): habilitar preDeployCommand con seeders idempotentes - migrations + seeds automáticos en cada deploy`

Archivos incluidos (7):

1. `.env.railway.example`
2. `DEPLOY_RAILWAY.md`
3. `Dockerfile.railway` (incluye `COPY railway-predeploy.sh`)
4. `docker-entrypoint.sh` (seed `demo_user_seeder` + `warehouse_seeder` si `RUN_DEMO_SEED_ON_BOOT=true`)
5. `railway-predeploy.sh` (nuevo)
6. `railway.toml` (`preDeployCommand = sh /app/railway-predeploy.sh`)
7. `database/seeders/warehouse_seeder.ts` (solo crea si falta)

Push remoto:

```text
To https://github.com/Greimer29/lobo-go-api.git
   02bb9cc..6aa2df1  main -> main
```

## 5. Resultado post-deploy (rellenar tras validación manual)

Ejecutar en MySQL Railway cuando el último deploy esté **Active**:

```sql
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_admins FROM users WHERE role = 'admin';
SELECT COUNT(*) AS total_drivers FROM users WHERE role = 'driver';
SELECT COUNT(*) AS total_vehicles FROM vehicles;
SELECT id, code, name, latitude, longitude FROM tracking_warehouses ORDER BY code;
```

Criterios orientativos (dependen del histórico de la base):

| Comprobación | Nota |
|--------------|------|
| `RUN_DEMO_SEED_ON_BOOT=true` | Obligatorio para ejecutar seeds en predeploy / entrypoint |
| `--` | -- |
| `total_vehicles` | Esperable **2** (MC-01, MC-02) después de corrercorectamente **`demo_user_seeder`** |
| `tracking_warehouses` | Fila existente para código `01`: **latitude/longitude previas deben mantenerse** tras redeploy si ya estaban cargadas (fix del seeder) |

**Espacio para notas después del chequeo**:

- Estado deploy Railway: _____
- Fragmentos útiles Build/Deploy Logs: _____

## 6. Confirmación del flujo automático

El flujo queda **cerrado cuando**:

1. **Build Logs** muestran `COPY railway-predeploy.sh /app/railway-predeploy.sh`.
2. **Deploy Logs** muestran `migration:run` y, con la variable habilitada, ejecución de **`db:seed`** / menciones de seeder sin error.
3. La base muestra efectos esperados según tabla arriba (sin regresión de coords en warehouses existentes).

Hasta esa verificación manual, esta sección queda pendiente del operador.

---

**Fecha del commit/deploy**: registrar al confirmar último deploy en Railway.
