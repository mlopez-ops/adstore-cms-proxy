# AdStore CMS Proxy

Microservicio Node/Express minimal cuyo único propósito es exponer la edge function de Supabase `tablet-cms-feed` sobre **HTTP plano** (sin redirect forzado a HTTPS), porque algunos proveedores externos de CMS solo aceptan URLs `http://`.

## Arquitectura

```
CMS externo  →  http://<servicio>.up.railway.app/cms/SC-0001
                          ↓
                Este proxy (Express)
                          ↓ HTTPS interno
                Supabase: /functions/v1/tablet-cms-feed?id=SC-0001
                          ↓
                JSON plano: { "play": true|false, ... }
```

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /` → metadata del servicio
- `GET /cms/:id` → consulta el feed de la tablet `:id` (ej. `SC-0001`, `sc-1`, `1`) y devuelve **siempre HTTP 200** con JSON plano:
  - Con publicación activa:
    ```json
    {
      "play": true,
      "media_url": "https://...",
      "media_type": "image",
      "title": "Promo Verano",
      "business_name": "Buenos Aires Express",
      "business_logo": "https://...",
      "tablet_name": "SC-0001",
      "expires_at": "2026-05-01T12:00:00Z",
      "published_at": "2026-04-22T10:00:00Z"
    }
    ```
  - Sin publicación / tablet inválida / negocio inactivo / error:
    ```json
    { "play": false, "reason": "..." }
    ```

## Deploy en Railway (paso a paso)

### 1. Crear repo en GitHub

```bash
# desde la carpeta railway-cms-proxy/
git init
git add .
git commit -m "init: adstore cms proxy"
# crear repo en GitHub (ej: adstore-cms-proxy) y push
git remote add origin git@github.com:<tu-usuario>/adstore-cms-proxy.git
git branch -M main
git push -u origin main
```

### 2. Crear servicio en Railway

1. Entrar a https://railway.app/new
2. **Deploy from GitHub repo** → seleccionar `adstore-cms-proxy`
3. Railway detecta automáticamente Node.js y corre `npm start`

### 3. Variables de entorno (Settings → Variables)

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://rwktenqhszklbnyzvyki.supabase.co` |
| `SUPABASE_ANON_KEY` | el anon key del proyecto Supabase |
| `PORT` | (lo asigna Railway, no tocar) |

### 4. Generar dominio público

Settings → **Networking** → **Generate Domain**.
Railway te da algo como `adstore-cms-proxy-production-xxxx.up.railway.app`.
Esa misma URL acepta tanto `http://` como `https://` sin force-redirect.

## Validación

```bash
# Health
curl http://<tu-dominio>.up.railway.app/health

# Feed de una tablet
curl http://<tu-dominio>.up.railway.app/cms/SC-0001
```

El segundo comando debe devolver JSON plano. Si la tablet no tiene publicación activa: `{"play":false,...}`.

## URL final para el proveedor del CMS

```
URL:          http://<tu-dominio>.up.railway.app/cms/SC-0001
Key:          play
Comparación:  Igual
Value:        true
```

(Reemplazar `SC-0001` por el ID de cada tablet)
