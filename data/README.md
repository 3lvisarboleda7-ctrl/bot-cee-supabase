# Datos exportados (muestra)

Esta carpeta contiene una **exportación CSV** de la base de datos del bot del CEE, para que cualquiera pueda revisar los datos **sin necesidad de acceder al proyecto de Supabase**.

| Archivo | Contenido |
|---------|-----------|
| `conversations.csv` | Conversaciones (id, user_id, title, fechas) |
| `messages.csv` | Mensajes (rol, contenido, tokens, fecha) |

> Son datos de **demostración** (usuarios anónimos simulados con nombres aleatorios). No contienen información personal real.

## Cómo se generaron

Exportados desde **Supabase → Table Editor → (tabla) → Export → CSV**.
Las consultas para analizarlos están en [`../sql/06_consultas_verificacion.sql`](../sql/06_consultas_verificacion.sql).
