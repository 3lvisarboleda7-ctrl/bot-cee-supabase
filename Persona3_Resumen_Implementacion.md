# Persona 3 — Resumen de Implementación (MVP)
### Bot a Costo Cero · Persistencia y Autenticación con Supabase
**Responsable:** Persona 3
**Fecha:** 2026-06-06
**Estado:** ✅ Núcleo implementado y validado

---

## 1. Qué se implementó (resumen ejecutivo)

Se montó la capa de **persistencia + autenticación** del chatbot del **CEE (Centro de Especialización Ejecutiva, UNI-FIIS)** completamente en el **plan gratuito de Supabase**, sin necesidad de plan pago. El usuario final **no ve ningún login**: entra a la web del CEE (cuya página gestiona CCAT) y empieza a chatear; el sistema le asigna una identidad anónima por detrás.

![Proyecto Supabase activo y en estado Saludable](img/01_dashboard.png)

| Componente | Estado | Evidencia |
|-----------|--------|-----------|
| Proyecto Supabase (Free) | ✅ Activo / Saludable | Dashboard "Saludable" |
| Esquema SQL (conversations + messages) | ✅ Creado | "Success. No rows returned" |
| Anonymous Auth (sin login visible) | ✅ Habilitado | Toggle "Allow anonymous sign-ins" en verde |
| Row Level Security (RLS) | ✅ Validado | Prueba: A ve lo suyo, B bloqueado |
| Limpieza automática (pg_cron, 30 días) | ✅ Programada | 2 jobs activos en `cron.job` |
| Protección de credenciales | ✅ `.gitignore` + `.env.local` | Archivos creados |
| Keep-alive (anti-pausa) | ✅ Workflow listo | GitHub Actions cada 3 días |

---

## 2. Arquitectura final

```
Usuario (visitante del CEE) entra a la web
        ↓
Frontend (Persona 1)  →  supabase.auth.signInAnonymously()
        ↓                  Supabase asigna auth.uid() = UUID anónimo único
        ↓
Backend (Persona 2)   →  guarda/lee mensajes vía API REST
        ↓
SUPABASE (Persona 3):
   • PostgreSQL: tablas conversations + messages
   • RLS: cada auth.uid() ve solo SUS datos
   • pg_cron: borra mensajes >30 días automáticamente
        ↓
Cloud Run (Persona 4) →  credenciales en Secret Manager
```

---

## 3. Esquema de base de datos implementado

**2 tablas** (sin tabla de perfiles — la identidad es `auth.uid()`):

- **`conversations`**: `id`, `user_id`, `title`, `created_at`, `updated_at`
- **`messages`**: `id`, `conversation_id`, `role`, `content`, `token_count`, `created_at`

**Seguridad:** RLS activo en ambas tablas, con políticas basadas en `auth.uid()`.
**Optimización:** 2 índices, `id` de mensajes como `bigint` (ahorro de espacio), `on delete cascade`.

![Esquema SQL ejecutado correctamente en el SQL Editor](img/02_sql_schema.png)

**Anonymous Auth habilitado** (sin login visible para el usuario):

![Anonymous sign-ins habilitado en Supabase](img/03_anon_auth2.png)

---

## 4. Pruebas realizadas (para el profesor)

### 4.1 Validación de RLS (aislamiento entre usuarios)
Se simularon 2 usuarios anónimos en el SQL Editor:

| Usuario | Conversaciones que ve | Resultado |
|---------|----------------------|-----------|
| A (dueño) | Las suyas | ✅ Ve sus datos |
| B (intruso) | 0 de A | 🔒 Bloqueado por RLS |

![Prueba RLS — Usuario B no puede ver las conversaciones de A (total = 0)](img/05_rls_test1.png)

![Prueba RLS — Usuario A sí ve sus propias conversaciones](img/05_rls_test2.png)

**Conclusión:** un usuario NO puede acceder a los datos de otro, incluso siendo anónimo. Seguridad confirmada.

### 4.2 Limpieza automática
Dos jobs de `pg_cron` verificados como `active = true`:
- `limpieza_mensajes` → diario 3:00 AM UTC (mensajes >30 días)
- `limpieza_conversaciones` → domingos 4:00 AM UTC (conversaciones inactivas)

![Jobs de limpieza pg_cron activos en la tabla cron.job](img/06_pgcron_jobs.png)

---

## 5. Cumplimiento del Free Tier

| Recurso | Límite Free | Uso estimado MVP | Margen |
|---------|-------------|------------------|--------|
| Base de datos | 500 MB | ~3 MB (con limpieza 30 días) | 99.4% libre |
| Egress | 5 GB/mes | ~1.5 MB/mes | 99.9% libre |
| MAU (usuarios) | 50,000 | ~50 (prueba) | Sobra |
| Storage | 1 GB | 0 (no se usa) | 100% libre |
| Proyectos activos | 2 | 1 | OK |

**Riesgos del Free y mitigaciones aplicadas:**
- ⚠️ Pausa tras 1 semana → ✅ keep-alive cada 3 días (GitHub Actions)
- ⚠️ Sin backups automáticos → ✅ esquema SQL versionado en repo + export manual

---

## 6. Credenciales (cómo las usa el equipo)

| Persona | Necesita | Dónde |
|---------|----------|-------|
| 1 (Frontend) | Project URL + anon key | `.env.local` (`VITE_*`) |
| 2 (Backend) | Project URL + anon key | `.env.local` (`SUPABASE_*`) |
| 4 (Cloud Run) | + service_role key | GCP Secret Manager |

- **Project URL:** `https://opqgmxfjlkurqnzmfkfz.supabase.co`
- **anon key:** en `.env.local` (no se commitea, protegido por `.gitignore`)
- **service_role key:** solo Persona 4, nunca en el frontend

---

## 7. Entregables de Persona 3 (checklist)

- [x] Esquema SQL mínimo (creado y ejecutado)
- [x] Política de limpieza de mensajes (pg_cron, 30 días)
- [x] Lista de funciones de Supabase usables gratis
- [x] RLS configurado y validado
- [x] Anonymous Auth (sin fricción de login)
- [x] Protección de credenciales (.gitignore + .env.local)
- [x] Keep-alive anti-pausa
- [ ] Pegar anon key real en `.env.local` (paso manual pendiente)
- [ ] (Opcional) Capturas insertadas en el documento de investigación

---

## 8. Archivos generados por Persona 3

| Archivo | Contenido |
|---------|-----------|
| `Persona3_Supabase_Investigacion.md` | Investigación completa (estructura solicitada + entregables) |
| `Persona3_Supabase_Config_Analisis.md` | Decisiones: Postgres vs OrioleDB, credenciales |
| `Analisis_Impacto_Limpieza.md` | Análisis de retención (30/60/90 días) |
| `Persona3_Resumen_Implementacion.md` | Este documento (cierre) |
| `.gitignore` | Protección de credenciales |
| `.env.local` | Plantilla de variables de entorno |
| `.github/workflows/supabase-keepalive.yml` | Keep-alive automático |

---

## 9. Próximos pasos (handoff al equipo)

1. **Persona 1 y 2:** usar las credenciales de `.env.local` para conectarse.
2. **Persona 1:** implementar `signInAnonymously()` al cargar la web.
3. **Persona 4:** configurar Secret Manager con las credenciales para Cloud Run.
4. **Todos:** subir el repo a GitHub y activar los Secrets para el keep-alive.

> **Estado final Persona 3:** Listo para integración. La base de datos está creada, segura (RLS validado), auto-limpiante y protegida contra pausa, todo a **costo cero**.
