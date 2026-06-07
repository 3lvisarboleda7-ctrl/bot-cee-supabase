# Análisis de Configuración Supabase — Decisiones de Implementación

## 1. Postgres (Por Defecto) vs OrioleDB (ALFA)

### Decisión: Elegir "Postgres (Por defecto)"

**¿Por qué NO OrioleDB en MVP?**

OrioleDB está marcada como **ALFA** (tecnología experimental). Riesgos:
- Inestabilidad → bugs, cambios sin aviso → rompe la regla de "costo cero sin complicaciones"
- Incompatibilidad con extensiones estándar (pg_cron, uuid-ossp) que documentamos en §6 del esquema
- El equipo no tiene experiencia depurando tecnología ALFA → costo en tiempo (muerte para un MVP académico)

**Por qué Postgres estándar SÍ:**
- ✅ Producción-ready, usado en millones de apps reales
- ✅ Compatible 100% con nuestro schema SQL + RLS + pg_cron (limpieza automática)
- ✅ Documentación exhaustiva, comunidad gigante
- ✅ Si escalamos post-MVP, Postgres es el estándar de la industria

**Regla del proyecto:** "Si necesita experimentos = descartado para MVP". Postgres cumple.

---

## 2. Checklist de Capturas de Pantalla (para el documento formal)

Al crear el proyecto Supabase, capturar **en este orden**:

| # | Punto en flujo | Qué capturar | Por qué |
|---|---|---|---|
| 1 | Botón "Create project" | Panel "Advanced Settings" con "Postgres (Por defecto)" seleccionado | Prueba de que elegimos estándar, no ALFA |
| 2 | Formulario New Project | Nombre, contraseña DB, región (South America/São Paulo), botón verde "Create new project" | Demostrar que es 1-clic, sin complicaciones |
| 3 | Dashboard post-creación | Proyecto activo, menús laterales (Table Editor, SQL Editor, Auth, Settings) | Muestra la interfaz lista para usar |
| 4 | Settings → API | Project URL y anon public key (con la key parcialmente ocultada) | Acredita dónde obtener credenciales |
| 5 | Table Editor | Una tabla de ejemplo creada, mostrando UI de drag-and-drop | Demuestra crear schema con 0 SQL |
| 6 | SQL Editor | Nuestro schema SQL mínimo pegado y ejecutado | Muestra alternativa "paste & run" |
| 7 | Authentication → Providers | Email habilitado, lista de OAuth (Google, GitHub, etc.) | Demuestra qué métodos de auth están listos |

> **Nota:** En la cap #4, ocultar la anon key real con un rectangulito negro o `[HIDDEN]` antes de compartir el documento — nunca exponer credenciales en documentos que circulan.

---

## 3. Sistema Seguro para Guardar Credenciales

### El Problema
- **Project URL** y **Anon Public Key** las necesitan Persona 1 (Frontend), Persona 2 (Backend) y Persona 4 (Cloud Run).
- **Service Key** (secret) la necesita solo Persona 4 (para Cloud Run con permisos elevados).
- ❌ **NUNCA** commitearlas al repo público o exponerlas en documentos compartidos.

### Solución Multicapa (gratis y segura)

#### Nivel 1: Desarrollo local (cada dev)
Crear archivo `.env.local` en la raíz del proyecto:
```bash
# .env.local (⚠️ GITIGNORED — no commitear)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

El Frontend (Persona 1) lee `VITE_SUPABASE_*`, el Backend (Persona 2) lee `SUPABASE_*` estándar.

#### Nivel 2: Compartir con el equipo (sin exponerlo)
**Opción recomendada para MVP académico: Notion/Google Doc privado**

Crear documento titulado **"🔐 Credenciales Supabase — Bot MVP (Confidencial)"** compartido solo a los 4 miembros:

```
Proyecto: Bot-MVP-SistemasIntegrados
Región: South America (São Paulo)
Creado: 2026-06-06

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUBLIC (puede ir en .env.local)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project URL:
https://xxxxx.supabase.co

Anon Public Key:
eyJhbGc...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRETO (solo Persona 4 / Cloud Run)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service Role Key:
[Solo visible para Persona 4]
```

✅ **Ventajas:**
- Versionado (ves quién cambió qué y cuándo)
- Auditado (Notion muestra historial)
- Fácil de actualizar si hay que rotar keys
- Acceso granular (solo equipo)

#### Nivel 3: Producción (si algún día escala)
**GitHub Secrets** (si el backend está en GitHub Actions CI/CD):
```powershell
# Persona 4 lo hace al configurar despliegue:
gh secret set SUPABASE_URL --body "https://xxxxx.supabase.co"
gh secret set SUPABASE_SERVICE_KEY --body "eyJhbGc..."
```
Los workflows los leen automáticamente, no aparecen en logs.

**GCP Secret Manager** (mejor aún, para Cloud Run):
```bash
# Persona 4:
echo -n "https://xxxxx.supabase.co" | gcloud secrets create supabase-url --data-file=-
echo -n "eyJhbGc..." | gcloud secrets create supabase-key --data-file=-
```
Cloud Run las monta en variables de entorno sin exponerlas.

---

## 4. Checklist de Seguridad (antes de entregar)

- [ ] ¿El `.env.local` está en `.gitignore`?
- [ ] ¿Nadie ha commitiado credenciales a git (buscar con `git log -p | grep SUPABASE`)?
- [ ] ¿El documento de Notion es privado y solo los 4 miembros pueden acceder?
- [ ] ¿Si ya pusheaste algo a GitHub, rotaste las keys (en Supabase → Settings → API)?
- [ ] ¿Cada persona tiene su propia copia de `.env.local` con las mismas credenciales?
- [ ] ¿Persona 4 tiene acceso a la Service Key (no en repo, solo en Secret Manager)?

---

## 5. Flujo de primer uso (para las 4 personas)

1. **Persona 3** crea el proyecto Supabase y toma las capturas.
2. **Persona 3** crea el doc de Notion privado con credenciales.
3. **Persona 3** ejecuta el schema SQL (§6 del documento principal).
4. **Persona 3** invita a Persona 1, 2, 4 al proyecto Supabase (Settings → Team).
5. Cada persona:
   - Descarga las credenciales del doc de Notion.
   - Crea su propio `.env.local` local (no commitear).
   - Instancia `supabase-js` (Persona 1) o el SDK Python/JS (Persona 2).
6. **Persona 4** configura el Secret Manager de GCP cuando llegue el momento del despliegue.

---

## 6. Contexto: Persona 3 — Persistencia y Auth (Free Tier)

Toda esta configuración se diseña alrededor de los límites del free tier:
- 500 MB DB (suficiente con limpieza de mensajes viejos)
- 5 GB egress (suficiente con UI liviana)
- 1 GB storage (no se usa en MVP)
- 50,000 MAU (sobra para proyecto académico)
- ⚠️ Se pausa tras 1 semana (mitigado con keep-alive)
- ⚠️ Sin backups automáticos (mitigado con dump manual)

Las credenciales deben estar **seguras pero accesibles** — Notion es el punto medio perfecto para MVP.
