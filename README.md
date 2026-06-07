# Bot a Costo Cero — Persistencia y Autenticación (Supabase)

Capa de **base de datos + autenticación** del chatbot del **CEE — Centro de Especialización Ejecutiva (UNI-FIIS)**.


> **Objetivo del proyecto:** construir el chatbot a **costo cero**, sin depender de funciones de pago. Esta parte (Persona 3) usa **Supabase Free Tier**: PostgreSQL + Anonymous Auth + Row Level Security, todo gratis.

---

## ✅ Qué está implementado

| Componente | Estado | Evidencia |
|-----------|--------|-----------|
| Esquema SQL (`conversations`, `messages`) | ✅ | `sql/01_esquema.sql` · `img/02_sql_schema.png` |
| Anonymous Auth (sin login visible) | ✅ | `img/03_anon_auth2.png` |
| Row Level Security (RLS) validado | ✅ | `sql/02_prueba_rls.sql` · `img/05_rls_test1.png` |
| Limpieza automática (pg_cron, 30 días) | ✅ | `sql/03_limpieza_pgcron.sql` · `img/06_pgcron_jobs.png` |
| Datos de prueba (demo CEE) | ✅ | `sql/04_datos_demo_cee.sql` |
| Protección de credenciales | ✅ | `.gitignore` + `.env.local` (no se sube) |
| Keep-alive anti-pausa | ✅ | `.github/workflows/supabase-keepalive.yml` |

---

## 📂 Estructura del repositorio

```
.
├── README.md                              ← este archivo
├── Persona3_Supabase_Investigacion.md     ← investigación completa (con imágenes)
├── Persona3_Resumen_Implementacion.md     ← resumen de lo implementado (con imágenes)
├── Persona3_Supabase_Config_Analisis.md   ← decisiones: Postgres vs OrioleDB, credenciales
├── Analisis_Impacto_Limpieza.md           ← análisis de retención (30/60/90 días)
├── Persona3_Investigacion_Supabase.docx   ← investigación completa en Word (con imágenes)
├── sql/                                   ← todos los queries y pruebas
│   ├── 01_esquema.sql
│   ├── 02_prueba_rls.sql
│   ├── 03_limpieza_pgcron.sql
│   ├── 04_datos_demo_cee.sql
│   ├── 05_borrar_datos_demo.sql
│   └── README.md
├── img/                                   ← capturas reales de Supabase
└── .github/workflows/                     ← keep-alive (GitHub Actions)
```

---

## 👀 Cómo revisar este trabajo (para el profesor)

1. **Documentos con capturas:** abre los archivos `.md` directamente en GitHub — se ven con imágenes incluidas.
   - Empezar por `Persona3_Supabase_Investigacion.md` (investigación + estructura solicitada).
   - Luego `Persona3_Resumen_Implementacion.md` (evidencia de lo implementado).
2. **Queries y pruebas:** entra a la carpeta [`sql/`](sql/) — cada script se ve con resaltado de sintaxis.
3. **Investigación completa en Word:** descargar `Persona3_Investigacion_Supabase.docx`.

> No se incluyen credenciales: el archivo `.env.local` está protegido por `.gitignore`. La `anon key` es pública por diseño y se respalda con RLS; la `service_role key` nunca se sube.

---

## 🔧 Cómo reproducirlo en Supabase (resumen)

1. Crear proyecto en [supabase.com](https://supabase.com) (plan Free, región más cercana).
2. **Authentication → Providers** → habilitar *Allow anonymous sign-ins*.
3. **SQL Editor** → ejecutar `sql/01_esquema.sql`.
4. **Database → Extensions** → habilitar `pg_cron` → ejecutar `sql/03_limpieza_pgcron.sql`.
5. (Opcional) `sql/04_datos_demo_cee.sql` para datos de demostración.
6. Copiar `Project URL` y `anon key` a un `.env.local` (ver plantilla en el repo, no se sube).

---

*Proyecto académico · UNI-FIIS  · 2026*
