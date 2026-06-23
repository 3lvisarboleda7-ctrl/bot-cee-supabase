# Bot a Costo Cero — Persistencia, Autenticación y Chatbot Informativo

Capa de **base de datos + autenticación** y **widget del chatbot informativo** del **CEE — Centro de Especialización Ejecutiva (UNI-FIIS)**.

> **Objetivo del proyecto:** construir el chatbot a **costo cero**, sin depender de funciones de pago. La capa de datos usa **Supabase Free Tier** (PostgreSQL + Anonymous Auth + Row Level Security) y el widget es JavaScript/CSS puro, sin frameworks ni dependencias de pago.

---

## ✅ Qué está implementado

| Componente | Estado | Evidencia |
|-----------|--------|-----------|
| Esquema SQL base (`conversations`, `messages`) | ✅ | `sql/01_esquema.sql` · `img/02_sql_schema.png` |
| Anonymous Auth (sin login visible) | ✅ | `img/03_anon_auth2.png` |
| Row Level Security (RLS) validado | ✅ | `sql/02_prueba_rls.sql` · `img/05_rls_test1.png` |
| Limpieza automática (pg_cron, 30 días) | ✅ | `sql/03_limpieza_pgcron.sql` · `img/06_pgcron_jobs.png` |
| Datos de prueba (demo CEE) | ✅ | `sql/04_datos_demo_cee.sql` |
| Protección de credenciales | ✅ | `.gitignore` + `.env.local` (no se sube) |
| Keep-alive anti-pausa | ✅ | `.github/workflows/supabase-keepalive.yml` |
| Esquema de negocio CEE (catálogo, cursos, horarios, sílabos) | ✅ | `sql/07_esquema_cee.sql` |
| Widget del chatbot informativo (Ceci) — UI, lógica, respuestas | ✅ | `widget/widget.js` · `widget/widget.css` |
| Diseño del bot: respuestas, fuera de alcance, acciones en página, visual | ✅ | `Diseno_Bot_Informativo.md` · `Informe_Integracion_Chatbot_CEE.docx` |

> ⏳ **Pendiente para producción:** cargar datos reales del CEE en las tablas de catálogo, configurar `supabaseUrl`/`supabaseKey` reales en `window.CEE_CONFIG`, y alojar `widget.js`/`widget.css` en la página real del CEE (gestionada por CCAT). Sin esto, el widget funciona igual pero con contenido estático de respaldo.

---

## 📂 Estructura del repositorio

```
.
├── README.md                              ← este archivo
├── Diseno_Bot_Informativo.md              ← diseño del bot: tablas usadas, flujos, reglas de respuesta, visual
├── Informe_Integracion_Chatbot_CEE.docx   ← informe completo (estructura BD + diseño + casos de uso + pruebas)
├── Persona3_Supabase_Investigacion.md     ← investigación completa (con imágenes)
├── Persona3_Resumen_Implementacion.md     ← resumen de lo implementado (con imágenes)
├── Persona3_Supabase_Config_Analisis.md   ← decisiones: Postgres vs OrioleDB, credenciales
├── Analisis_Impacto_Limpieza.md           ← análisis de retención (30/60/90 días)
├── Persona3_Investigacion_Supabase.docx   ← investigación completa en Word (con imágenes)
├── sql/                                   ← todos los queries y esquemas
│   ├── 01_esquema.sql
│   ├── 02_prueba_rls.sql
│   ├── 03_limpieza_pgcron.sql
│   ├── 04_datos_demo_cee.sql
│   ├── 05_borrar_datos_demo.sql
│   ├── 06_consultas_verificacion.sql
│   ├── 07_esquema_cee.sql                 ← esquema de negocio CEE (8 tablas relevantes para el bot)
│   └── README.md
├── widget/                                ← widget embebible del chatbot informativo
│   ├── widget.js                          ← lógica del bot (respuestas, Supabase, acciones en página)
│   ├── widget.css                         ← estilos visuales (Claymorphism, colores institucionales)
│   ├── demo.html                          ← página de prueba para integrar y verificar el widget
│   └── package.json                       ← dependencia de Playwright (solo para testing local)
├── img/                                   ← capturas reales de Supabase
└── .github/workflows/                     ← keep-alive (GitHub Actions)
```

---

## 🤖 El widget del chatbot (Ceci)

Asistente virtual informativo embebible con `<script>` (sin frameworks, sin build):

```html
<!-- Configuración opcional (ajustar si hay BD en Supabase) -->
<script>
  window.CEE_CONFIG = {
    botName:     'Ceci',
    botSubtitle: 'Asistente del CEE · FIIS-UNI',
    whatsapp:    '51966644502',
    email:       'cee-fiis@uni.edu.pe',
    // supabaseUrl: 'https://xxx.supabase.co',
    // supabaseKey: 'tu_anon_key',
  };
</script>

<!-- Widget -->
<script src="widget.js"></script>
```

Responde sobre cursos, sílabos, horarios, certificación y financiamiento; declina y reencauza preguntas fuera de alcance; escala a WhatsApp/correo ante intención de inscripción o pago; y captura el contacto del usuario tras varias preguntas de precio. El diseño completo (flujos, reglas de fuera de alcance, acciones en página y apartado visual) está documentado en `Diseno_Bot_Informativo.md` e `Informe_Integracion_Chatbot_CEE.docx`.

---

## 👀 Cómo revisar este trabajo (para el profesor)

1. **Documentos con capturas:** abre los archivos `.md` directamente en GitHub — se ven con imágenes incluidas.
   - Empezar por `Persona3_Supabase_Investigacion.md` (investigación + estructura solicitada).
   - Luego `Persona3_Resumen_Implementacion.md` (evidencia de lo implementado).
2. **Queries y esquemas:** entra a la carpeta [`sql/`](sql/) — cada script se ve con resaltado de sintaxis.
3. **Diseño y comportamiento del bot:** `Diseno_Bot_Informativo.md` o el informe completo `Informe_Integracion_Chatbot_CEE.docx`.
4. **Widget en vivo:** abre `widget/demo.html` en el navegador para probar el chat tal como funcionaría embebido en la página del CEE.
5. **Investigación completa en Word:** descargar `Persona3_Investigacion_Supabase.docx`.

> No se incluyen credenciales: el archivo `.env.local` está protegido por `.gitignore`. La `anon key` es pública por diseño y se respalda con RLS; la `service_role key` nunca se sube.

---

## 🔧 Cómo reproducirlo en Supabase (resumen)

1. Crear proyecto en [supabase.com](https://supabase.com) (plan Free, región más cercana).
2. **Authentication → Providers** → habilitar *Allow anonymous sign-ins*.
3. **SQL Editor** → ejecutar `sql/01_esquema.sql` y `sql/07_esquema_cee.sql`.
4. **Database → Extensions** → habilitar `pg_cron` → ejecutar `sql/03_limpieza_pgcron.sql`.
5. (Opcional) `sql/04_datos_demo_cee.sql` para datos de demostración.
6. Copiar `Project URL` y `anon key` a un `.env.local` (ver plantilla en el repo, no se sube) y a `window.CEE_CONFIG` en la página donde se embeba el widget.

---

*Proyecto académico · UNI-FIIS · 2026*
