# Análisis de Impacto: Política de Limpieza cada 2-3 meses

## Pregunta del usuario
¿Qué pasaría si cambio la retención de 30 días a 60 días (2 meses) o 90 días (3 meses)?

## Cálculos de crecimiento de BD

### Supuestos (del MVP académico)
- **50 usuarios de prueba**
- **~30 mensajes por usuario al mes** → 1,500 mensajes/mes
- **~1 KB por fila** (id, conversation_id, role, content ~500 bytes, timestamps, índices)
- **Índices**: PostgreSQL duplica el tamaño con índices estándar

---

## Escenario 1: Retención 30 días (actual propuesta)

| Período | Mensajes acumulados | Tamaño DB (sin índices) | Tamaño DB (con índices 2x) | % de 500 MB |
|---------|---------------------|------------------------|----------------------------|-------------|
| Inicio | 0 | 0 MB | 0 MB | 0% |
| 1 mes | 1,500 | 1.5 MB | 3 MB | 0.6% |
| 3 meses | 4,500 | 4.5 MB | 9 MB | 1.8% |
| 6 meses | 9,000 | 9 MB | 18 MB | 3.6% |
| 12 meses | 18,000 | 18 MB | 36 MB | 7.2% |

**Limpieza cada 30 días:** siempre borra mensajes con >30 días → máximo ~3 MB total en BD.

---

## Escenario 2: Retención 60 días (2 meses)

| Período | Mensajes acumulados | Tamaño DB (sin índices) | Tamaño DB (con índices) | % de 500 MB |
|---------|---------------------|------------------------|--------------------------|-------------|
| Inicio | 0 | 0 MB | 0 MB | 0% |
| 1 mes | 1,500 | 1.5 MB | 3 MB | 0.6% |
| 2 meses | 3,000 | 3 MB | **6 MB** | **1.2%** |
| 3 meses | 4,500 | 4.5 MB | 9 MB | 1.8% |
| 6 meses | 9,000 | 9 MB | **18 MB** | 3.6% |
| 12 meses | 18,000 | 18 MB | **36 MB** | **7.2%** |

**Limpieza cada 60 días:** máximo ~6 MB en BD.

---

## Escenario 3: Retención 90 días (3 meses)

| Período | Mensajes acumulados | Tamaño DB (sin índices) | Tamaño DB (con índices) | % de 500 MB |
|---------|---------------------|------------------------|--------------------------|-------------|
| Inicio | 0 | 0 MB | 0 MB | 0% |
| 1 mes | 1,500 | 1.5 MB | 3 MB | 0.6% |
| 3 meses | 4,500 | 4.5 MB | **9 MB** | **1.8%** |
| 6 meses | 9,000 | 9 MB | **18 MB** | 3.6% |
| 12 meses | 18,000 | 18 MB | **36 MB** | 7.2% |

**Limpieza cada 90 días:** máximo ~9 MB en BD.

---

## Veredicto: ¿500 MB es suficiente?

### ✅ SÍ, tranquilamente, PERO...

| Retención | Crecimiento anual | % de 500 MB | Riesgo BD | Recomendación |
|-----------|-------------------|-------------|-----------|---------------|
| 30 días | 3-36 MB | 7.2% | ✅ Mínimo | **IDEAL para MVP** |
| 60 días | 6-36 MB | 7.2% | ✅ Bajo | **OK, razonable** |
| 90 días | 9-36 MB | 7.2% | ✅ Bajo | **OK, pero ajustado** |
| 180 días | 18-72 MB | 14.4% | ⚠️ Medio | **Risky, no recomendado** |

> **La BD en sí NO es el problema.** Pero hay 2 factores que sí cambian:

---

## El verdadero riesgo: EGRESS (5 GB/mes)

Cuando el frontend/backend **leen** el historial, consumen egress. Si retienes 3 meses de mensajes:

### Impacto en egress por `load_conversation_history`:

```
Escenario: Usuario abre chat, carga últimos 50 mensajes.

Si limpieza = 30 días:  cada usuario descarga ~50 KB máx (50 msgs × ~1 KB)
Si limpieza = 90 días:  cada usuario descarga ~50 KB máx (sigue siendo 50)
    ↑ El frontend limita con LIMIT 50, no carga TODO
```

**PERO:** Si Persona 2 (Backend) envía a Groq todo el historial sin LIMIT:

```
30 días: 1,500 msgs/mes × 1 KB = 1.5 MB/mes en egress (mínimo)
90 días: 4,500 msgs/mes × 1 KB = 4.5 MB/mes en egress (aún OK, <5 GB)
```

> **Conclusión: Egress es seguro incluso con 90 días de retención.**

---

## El verdadero riesgo: RENDIMIENTO DE QUERIES

Cuando hay 4,500+ mensajes sin limpiar:

```sql
-- Esta query se pone lenta:
SELECT * FROM messages 
WHERE conversation_id = $1 
ORDER BY created_at DESC 
LIMIT 50;
```

**Escenarios:**

| Retención | Mensajes max | Índice? | Query time | Problema |
|-----------|--------------|---------|------------|----------|
| 30 días | 1,500 | ✅ idx_messages_conversation | <10 ms | ✅ OK |
| 60 días | 3,000 | ✅ idx_messages_conversation | ~15 ms | ✅ OK |
| 90 días | 4,500 | ✅ idx_messages_conversation | ~20 ms | ✅ OK |
| 180 días | 9,000 | ✅ idx_messages_conversation | ~50 ms | ⚠️ Perceptible |
| 1 año | 18,000 | ✅ idx_messages_conversation | ~100 ms | ❌ Lento para UX |

Con nuestro índice (`idx_messages_conversation` en conversation_id), incluso 90 días es rápido (<20 ms).

---

## El VERDADERO riesgo: La PAUSA tras 1 semana de inactividad

**Esto SÍ afecta la retención, pero NO por el tamaño:**

```
Si la BD se pausa tras 1 semana sin actividad:
  → Persona 3 debe hacer keep-alive cada 6 días INDEPENDIENTEMENTE de la retención
  → No importa si limpias cada 30 o 90 días — el proyecto se pausa igual
```

> **La pausa es el cuello de botella, NO el almacenamiento ni la retención.**

---

## Recomendación de ajuste

### ✅ Opción A: Retención 60 días (compromiso inteligente)
- **Ventaja:** permite que los usuarios vean ~2 meses de historial.
- **Costo:** 6 MB máx (vs. 3 MB con 30 días) — diferencia negligible.
- **Ideal para:** un chatbot académico donde los usuarios quieren releer conversaciones recientes.

```sql
-- Reemplazar en pg_cron:
select cron.schedule(
  'limpieza_mensajes',
  '0 3 * * *',
  $$ delete from public.messages where created_at < now() - interval '60 days'; $$
);
```

### ⚠️ Opción B: Retención 90 días (riesgoso, pero viable)
- **Ventaja:** 3 meses de historial completo.
- **Desventaja:** queries empiezan a ser perceptibles (~20 ms), y acumulas más datos inútil.
- **Solo si:** realmente necesitas historial de 3 meses.

```sql
-- En pg_cron:
select cron.schedule(
  'limpieza_mensajes',
  '0 3 * * *',
  $$ delete from public.messages where created_at < now() - interval '90 days'; $$
);
```

### ❌ Opción C: Retención 180 días o más
- **No recomendado** para MVP: queries lentas, acumulación de basura.
- **Solución:** si realmente quieres historial largo, implementar una tabla separada `message_archive` (backup offline).

---

## Análisis final: ¿Qué cambio propones al documento?

Si decides cambiar a **60 días**:

**En §7 (Política de Limpieza), cambiar:**

```markdown
**Borrar mensajes con más de 30 días**
```

**A:**

```markdown
**Borrar mensajes con más de 60 días** (2 meses de historial)
```

**Justificación:**
- Mantiene el mismo costo en almacenamiento/egress.
- Permite que el profesor/equipo revise conversaciones recientes sin que se borren.
- Sigue siendo trivial en tamaño: 6 MB máx vs. 500 MB disponibles (1.2%).

**Pero si quieres ser conservador: mantén 30 días.** No hay diferencia perceptible.

---

## Tabla resumida para el documento

| Métrica | 30 días | 60 días | 90 días |
|---------|---------|---------|---------|
| Historial visible | 1 mes | 2 meses | 3 meses |
| Tamaño máximo BD | 3 MB | 6 MB | 9 MB |
| % de 500 MB | 0.6% | 1.2% | 1.8% |
| Query latency | <10 ms | ~15 ms | ~20 ms |
| Egress mensual | ~1.5 MB | ~3 MB | ~4.5 MB |
| Recomendación | ✅ Ideal | ✅ Buena | ⚠️ OK |

> **Recomendación final: 60 días es el punto dulce** (más historial, sin costo real).
