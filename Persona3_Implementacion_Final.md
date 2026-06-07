# Persona 3 — Hitos de Implementación Final (para el grafo)

Este documento registra las decisiones y componentes IMPLEMENTADOS (no solo investigados) de la capa de persistencia y autenticación del chatbot Bot a Costo Cero.

## Cambio de arquitectura: Anonymous Auth en lugar de login tradicional
Se decidió NO usar registro con email ni Google. En su lugar se usa **Anonymous Sign-ins** (inicio de sesión anónimo) de Supabase. El frontend genera una sesión anónima automática al cargar la web, y Supabase asigna un UUID único (`auth.uid()`) a cada visitante. Esto elimina la fricción de registro y mantiene la experiencia de "un solo clic" desde la web del CEE (Centro de Especialización Ejecutiva, UNI-FIIS), cuya página gestiona CCAT.

- **Relación:** Anonymous Auth ENABLES la experiencia sin login visible.
- **Relación:** Anonymous Auth REQUIRES Row Level Security para aislar datos.
- **Ventaja:** los usuarios anónimos usan el rol `authenticated`, por lo que quedan sujetos a las políticas RLS existentes.
- **Limitación:** la sesión anónima es temporal; se guarda el UUID en localStorage para reconocer al usuario al reabrir.

## Esquema SQL implementado (sin tabla de perfiles)
Se eliminó la tabla `profiles`. La identidad del usuario es directamente `auth.uid()`. Quedaron 2 tablas:
- **conversations**: id, user_id, title, created_at, updated_at.
- **messages**: id (bigint identity), conversation_id, role, content, token_count, created_at.
- 2 índices (conversations por user_id; messages por conversation_id).
- `on delete cascade` de conversations a messages.
- Trigger `touch_conversation` que actualiza updated_at al insertar un mensaje.

## RLS validado (prueba de aislamiento)
Se ejecutó una prueba simulando dos usuarios anónimos con `set local request.jwt.claims`. Resultado:
- Usuario A (dueño) ve sus propias conversaciones.
- Usuario B (intruso) ve 0 conversaciones de A.
- Conclusión: el aislamiento de datos por `auth.uid()` funciona, incluso con usuarios anónimos.

## Limpieza automática con pg_cron (retención 30 días)
Se habilitó la extensión pg_cron (desde Database -> Extensions) y se programaron 2 jobs:
- `limpieza_mensajes`: diario 3:00 AM UTC, borra mensajes con más de 30 días.
- `limpieza_conversaciones`: domingos 4:00 AM UTC, borra conversaciones inactivas (cascade borra sus mensajes).
- Ambos verificados como `active = true` en la tabla `cron.job`.
- Decisión: retención de 30 días (ultraconservador) tras analizar 30/60/90 días; el almacenamiento no es el cuello de botella.

## Protección de credenciales
- Archivo `.gitignore` creado: protege `.env.local`, `.env`, keys y secrets.
- Archivo `.env.local` creado con Project URL y anon key (para Persona 1 frontend y Persona 2 backend).
- La anon key es pública por diseño (viaja al navegador); lo que protege los datos es RLS, no ocultar la anon key.
- La service_role key es la única verdaderamente secreta; va solo en GCP Secret Manager (Persona 4), nunca en el frontend.

## Keep-alive contra la pausa por inactividad
- El plan Free pausa el proyecto tras 1 semana de inactividad.
- Mitigación: workflow de GitHub Actions (`supabase-keepalive.yml`) que hace un ping ligero a la API REST cada 3 días.
- GitHub Actions es gratis (2,000 min/mes en repos privados; ilimitado en públicos); el ping consume menos de 1 min/mes.
- El repositorio puede ser PRIVADO; los Secrets de GitHub funcionan igual y mantienen las credenciales cifradas.
- Alternativa sin código: cron-job.org o UptimeRobot.

## Entregables generados
- `Resumen_Ejecutivo_Supabase.docx`: resumen ejecutivo en Word con 8 imágenes embebidas, estructura: descripción, explicación simple, casos de uso, precios/límites, alternativas.
- `Persona3_Resumen_Ejecutivo_Supabase.zip`: el Word comprimido para entrega.
- Capturas reales en `img/`: dashboard, esquema SQL, Anonymous Auth, API keys, prueba RLS, jobs pg_cron.

## Estado final
La capa de persistencia y autenticación está implementada, validada y documentada completamente a costo cero. Lista para integración con Persona 1 (frontend), Persona 2 (backend Groq) y Persona 4 (Cloud Run).
