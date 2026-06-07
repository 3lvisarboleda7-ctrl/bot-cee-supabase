# Scripts SQL — Persona 3 (Supabase)

Estos scripts se ejecutan en **Supabase → SQL Editor**, en orden.

| Archivo | Qué hace | ¿Cuándo correr? |
|---------|----------|-----------------|
| `01_esquema.sql` | Crea tablas `conversations` y `messages`, índices, RLS y trigger | 1 vez (setup inicial) |
| `02_prueba_rls.sql` | Prueba de aislamiento RLS (usuario A vs B) | Para validar seguridad |
| `03_limpieza_pgcron.sql` | Programa la limpieza automática (retención 30 días) | 1 vez (requiere extensión pg_cron) |
| `04_datos_demo_cee.sql` | Inserta ~30 conversaciones de prueba con nombres aleatorios | Para demo |
| `05_borrar_datos_demo.sql` | Borra solo los datos de prueba (marcador `[PRUEBA]`) | Para limpiar la demo |
| `06_consultas_verificacion.sql` | SELECTs para verificar datos, RLS y jobs de limpieza | Para revisar el estado de la BD |

> **Evidencia visual** de la ejecución de estos scripts (capturas reales) en `../img/` y dentro de los documentos `../Persona3_Supabase_Investigacion.md` y `../Persona3_Resumen_Implementacion.md`.
