# Diseño del Bot Informativo — CEE FIIS-UNI

> **Alcance:** chatbot embebido en la página web del CEE. Solo informa; no capta LEADs ni procesa ventas (eso lo hace el bot de WhatsApp).
> **Stack:** costo cero — Supabase Free Tier (lectura de BD) + Claude API (o modelo open-source).

---

## 1. Tablas de BD que usa el bot

El bot hace **solo lectura** de estas tablas:

| Tabla | Uso |
|---|---|
| `Catalogo-Curso` | Nombre, descripción del curso |
| `Catalogo_Segmento_Curso` | Agrupar cursos por área temática |
| `Catalogo-Tema` | Temas del sílabo (nombre, descripción, duración) |
| `Relacion-Silabus-X-Curso` | Unir curso ↔ temas en orden lógico |
| `Catalogo-Servicio-Capacitacion` | Tarifa, estado (activo/inactivo), nro de inscripciones |
| `Catalogo-Horario-Semanal` | Nombre del tipo de horario |
| `Detalle-Horario` | Días y horas concretas por horario |
| `Relacion-Pre-Requisito` | Prerequisitos entre cursos |

**No accede a:** clientes, compras, operadores, bitácora de movimientos.

---

## 2. Personalidad y tono

**Cálido pero formal.** El bot representa a la UNI-FIIS, una institución académica de prestigio, pero habla con cercanía para no alejar a jóvenes profesionales.

**Reglas de voz:**
- Saluda con nombre del bot y pregunta en qué puede ayudar.
- Tutea al usuario (`te`, `tu`, no `usted`).
- Sin emojis salvo en mensajes de bienvenida/cierre (máx. 1 por mensaje).
- Respuestas cortas: párrafos de 2-3 líneas máximo. Si hay mucha info, usa listas.
- No inventa datos: si no encuentra un curso en la BD, dice que no lo tiene registrado.
- Nombre del bot: **Ceci** (Chatbot del CEE — tentativo, ajustar si hay decisión oficial).

**Ejemplo de bienvenida:**
> "Hola 👋 Soy Ceci, el asistente del CEE-FIIS. Puedo informarte sobre nuestros cursos, sílabos y horarios. ¿En qué te ayudo hoy?"

---

## 3. Flujos de conversación

### 3.1 Flujo principal — Consulta de cursos

```
Usuario: "¿Qué cursos tienen de gestión?"
  → Bot consulta Catalogo-Curso + Catalogo_Segmento_Curso
  → Devuelve lista de cursos activos del segmento
  → Ofrece: "¿Quieres ver el sílabo o el horario de alguno?"

Usuario: "Cuéntame del curso de SSOMA"
  → Bot consulta Catalogo-Servicio-Capacitacion (precio, estado)
  → Consulta Relacion-Silabus-X-Curso + Catalogo-Tema (temas en orden)
  → Consulta Catalogo-Horario-Semanal + Detalle-Horario
  → Responde: descripción + temas + precio + horario
  → CTA: "Si quieres inscribirte, escríbenos al WhatsApp [enlace]"
```

### 3.2 Consulta de sílabo

```
Usuario: "¿Qué temas tiene el curso X?"
  → Bot muestra temas ordenados por secuencia_logica
  → Incluye duración por tema (duracion_tema en horas)
  → Si hay prerequisito: "Este curso recomienda haber llevado [Y] antes."
```

### 3.3 Consulta de horarios

```
Usuario: "¿En qué horario es el curso X?"
  → Bot muestra días de la semana + hora de inicio
  → Si hay varios horarios disponibles para el mismo curso, los lista todos
```

### 3.4 Pregunta fuera de alcance

Dos casos según el tipo de pregunta fuera de scope:

**Caso A — Tema adyacente (otro instituto, precio general, tema académico):**
> "Sobre eso no tengo información precisa, pero si me preguntas por los programas del CEE puedo darte todos los detalles. ¿Te interesa algún área en especial, como gestión, calidad o seguridad?"

**Caso B — Tema irrelevante (política, personal, humor, etc.):**
> "Eso está fuera de lo que manejo 😄 Estoy aquí para ayudarte con los cursos y servicios del CEE. ¿Te gustaría conocer nuestra oferta formativa?"

**Caso C — Inscripción, pago, datos personales (escalar):**
> "Para inscribirte o consultar formas de pago, nuestro equipo puede atenderte directamente:
> - 📱 WhatsApp: 966 644 502
> - 📧 cee-fiis@uni.edu.pe
> ¿Tienes alguna otra pregunta sobre los cursos?"

**Regla:** nunca dejar al usuario sin una salida hacia el CEE — siempre terminar con una opción o CTA.

---

## 4. Acciones del bot en la página web

Todo implementable a costo cero (sin plugins de pago ni APIs externas):

| Acción | Implementación |
|---|---|
| **Catálogo de cursos** | Muestra lista con filtro por segmento. Cada item es expandible (click → ver descripción + precio + estado). Datos desde Supabase vía `anon key`. |
| **Sílabo de un curso** | Lista ordenada de temas con duración. Incluye nota de prerequisitos si existen. |
| **Horario de un curso** | Tabla días/horas. Si hay múltiples horarios para el mismo servicio, los muestra todos. |
| **Derivación a WhatsApp** | Botón o enlace `https://wa.me/51966644502` cuando el usuario pregunta por inscripción, precio o pagos. Se abre en nueva pestaña. |
| **Chips de respuesta rápida** | Opciones predefinidas debajo del input: "Ver cursos", "Horarios", "Sílabo", "Contacto". Reducen fricción para usuarios nuevos. |

### Lo que NO se implementa (costo cero)
- Formularios de contacto con backend propio (usar WhatsApp/email directo).
- Generación de PDFs del sílabo (mostrar en pantalla).
- Autenticación del usuario visitante (el bot es anónimo para el visitante de la web).

---

## 5. Diseño visual del widget

### Posición y formato
- **Widget flotante** en esquina inferior derecha, siempre visible.
- **Icono cerrado:** círculo con logo CEE o iniciales "CEE" + burbuja de mensaje. Tamaño: 56 × 56 px.
- **Panel abierto:** 380 × 560 px (desktop) / 100% pantalla en móvil.
- **Z-index alto** para no quedar debajo de otros elementos de la página de CCAT.

### Colores (paleta institucional UNI-FIIS)
| Elemento | Color sugerido |
|---|---|
| Header del chat | Azul institucional UNI `#003087` (ajustar si CCAT tiene guía de marca) |
| Burbujas del bot | Gris claro `#F0F2F5` · texto `#1C1C1E` |
| Burbujas del usuario | Azul `#003087` · texto blanco |
| Fondo del panel | Blanco `#FFFFFF` |
| Chips de respuesta rápida | Borde azul `#003087` · fondo blanco · texto azul |
| Botón de enviar | Azul `#003087` |

### Tipografía
- Inter o sistema nativo del SO (sin costo de fuente externa).
- Tamaño base: 14 px en burbujas, 16 px en input.

### Estados del widget
| Estado | Comportamiento |
|---|---|
| **Cerrado** | Solo el FAB (botón flotante circular) |
| **Abierto** | Panel completo con header "Ceci · CEE-FIIS" + botón de cierre |
| **Escribiendo** | Tres puntos animados (typing indicator) mientras espera respuesta |
| **Error de red** | Mensaje inline: "No pude conectarme. Intenta en un momento." |
| **Sin resultados en BD** | "No encontré ese curso en nuestro catálogo actual. Puedes consultar en cee-fiis@uni.edu.pe" |

### Animación
- Apertura: slide-up suave (200 ms ease-out).
- Mensajes: fade-in por mensaje (100 ms).
- Sin animaciones pesadas — la página la gestiona CCAT y no queremos impactar su performance.

---

## 6. Límites del bot (qué NO hace)

- No recoge nombre, DNI, correo ni teléfono del visitante.
- No procesa pagos ni genera órdenes.
- No accede a si un usuario ya está inscrito.
- No responde sobre el estado de una inscripción existente.
- No da información de otros centros, universidades o competidores.
- No tiene memoria entre sesiones (cada apertura de página es conversación nueva, a menos que se implemente persistencia con Supabase anonymous auth — ya está preparado en `sql/01_esquema.sql`).

---

## 7. Preguntas frecuentes predefinidas (seed)

Para reducir carga de consultas LLM y dar respuestas instantáneas:

| Pregunta | Acción |
|---|---|
| "¿Qué cursos tienen?" | Mostrar catálogo completo agrupado por segmento |
| "¿Cuánto cuesta [curso]?" | Buscar `tarifa_curso` en `Catalogo-Servicio-Capacitacion` |
| "¿El certificado es de la UNI?" | Respuesta fija: "Sí, emitido a nombre de la Universidad Nacional de Ingeniería." |
| "¿Las clases son virtuales?" | Respuesta fija + nota de que varía por curso |
| "Quiero inscribirme" | CTA directo a WhatsApp |
| "¿Cómo los contacto?" | Mostrar email + WhatsApp + sede |

---

*Documento de diseño — Bot Informativo CEE · UNI-FIIS · 2026-06-17*
