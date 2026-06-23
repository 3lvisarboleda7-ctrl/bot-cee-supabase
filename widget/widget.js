/* ============================================================
   CEE-FIIS · Widget de Chatbot Informativo
   Embebible con <script src="widget.js"></script>
   Configura CEE_CONFIG antes del script para personalizar.
   ============================================================ */

(function () {
  'use strict';

  // ── Configuración ────────────────────────────────────────────
  const CFG = Object.assign({
    botName:    'Ceci',
    botSubtitle: 'Asistente del CEE · FIIS-UNI',
    whatsapp:   '51966644502',
    email:      'cee-fiis@uni.edu.pe',
    cssUrl:     '',          // ruta al widget.css si no está en el mismo directorio
    supabaseUrl: '',         // se lee de window.CEE_CONFIG
    supabaseKey: '',
  }, window.CEE_CONFIG || {});

  // ── Inyectar CSS ─────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById('cee-widget-css')) return;
    const link = document.createElement('link');
    link.id   = 'cee-widget-css';
    link.rel  = 'stylesheet';
    link.href = CFG.cssUrl || (document.currentScript
      ? document.currentScript.src.replace('widget.js', 'widget.css')
      : 'widget.css');
    document.head.appendChild(link);
  })();

  // ── Supabase cliente mínimo (sin SDK) ───────────────────────
  const DB = {
    async get(table, select, filters = {}) {
      if (!CFG.supabaseUrl || !CFG.supabaseKey) return null;
      let url = `${CFG.supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}`;
      for (const [k, v] of Object.entries(filters)) {
        url += `&${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`;
      }
      try {
        const res = await fetch(url, {
          headers: {
            apikey: CFG.supabaseKey,
            Authorization: `Bearer ${CFG.supabaseKey}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    },
  };

  // ── Base de conocimiento estática (fallback sin BD) ──────────
  const KB = {
    segmentos: {
      'gestión':       'Gestión',
      'gestion':       'Gestión',
      'scrum':         'Gestión de Proyectos',
      'agile':         'Gestión de Proyectos',
      'ágil':          'Gestión de Proyectos',
      'proyectos':     'Gestión de Proyectos',
      'calidad':       'Calidad y Productividad',
      'ssoma':         'Seguridad y Salud Ocupacional',
      'seguridad':     'Seguridad y Salud Ocupacional',
      'logística':     'Logística y Procesos',
      'logistica':     'Logística y Procesos',
      'procesos':      'Logística y Procesos',
      'innovación':    'Innovación',
      'innovacion':    'Innovación',
      'liderazgo':     'Liderazgo',
    },
    faq: [
      {
        keys: ['certificado', 'certifica', 'título', 'diploma'],
        answer: 'Sí, el certificado es emitido a nombre de la <strong>Universidad Nacional de Ingeniería (UNI)</strong>, con respaldo institucional de la Facultad de Ingeniería Industrial y de Sistemas (FIIS).',
      },
      {
        keys: ['virtual', 'presencial', 'modalidad', 'clases'],
        answer: 'Tenemos modalidades <strong>virtual y presencial</strong> según el programa. La mayoría de clases son en vivo y quedan grabadas para que puedas repasar cuando quieras.',
      },
      {
        keys: ['duración', 'duracion', 'horas', 'cuánto dura', 'cuanto dura'],
        answer: 'La duración varía por programa: desde talleres de 20 horas hasta especializaciones de más de 80 horas. Cuéntame qué curso te interesa y te doy el detalle.',
      },
      {
        keys: ['ubicación', 'ubicacion', 'donde', 'dónde', 'sede'],
        answer: 'El CEE opera en las instalaciones de la <strong>UNI-FIIS</strong>, Av. Túpac Amaru 210, Rímac, Lima. Los programas virtuales se acceden desde cualquier lugar.',
      },
      {
        keys: ['que es el cee', 'qué es el cee', 'sobre el cee', 'información del cee'],
        answer: 'El <strong>CEE</strong> es el Centro de Especialización Ejecutiva de la <strong>UNI-FIIS</strong>. Brinda capacitación práctica de alta calidad en gestión, innovación, procesos, seguridad, logística y más, con certificación universitaria.',
      },
      {
        keys: ['requisitos de admisión', 'requisitos de ingreso', 'requisitos para ingresar', 'experiencia gerencial', 'perfil de ingreso'],
        answer: 'Los requisitos varían según el programa: algunos piden experiencia gerencial previa o título universitario, otros están abiertos a cualquier profesional interesado. Cuéntame qué curso te interesa y te detallo sus requisitos específicos.',
      },
    ],
    outOfScopeAdjacentAnswer(msg) {
      const lower = msg.toLowerCase();
      if (lower.includes('competencia') || lower.includes('mejor') || lower.includes('otro instituto') || lower.includes('senati') || lower.includes('tecsup') || lower.includes('certus')) {
        return 'No tengo información sobre otros institutos, pero puedo contarte todo sobre la oferta del CEE-FIIS. ¿Te interesa algún área en especial, como gestión, calidad o seguridad?';
      }
      return null;
    },
    isOutOfScope(msg) {
      const lower = msg.toLowerCase();
      const topics = [
        'política', 'politica', 'fútbol', 'futbol', 'chiste', 'amor', 'receta',
        'película', 'pelicula', 'noticias', 'clima', 'deporte', 'música', 'musica',
        'mundial', 'partido', 'serie', 'novela', 'cocina', 'dieta', 'salud personal',
        'religion', 'religión', 'dios', 'farándula', 'farandula', 'meme',
      ];
      return topics.some(t => lower.includes(t));
    },
  };

  // ── Estado de la conversación (para captura de leads) ────────
  const STATE = {
    priceQuestions: 0,
    leadCaptured: false,
  };

  // ── Helpers de UI ─────────────────────────────────────────────
  function contactBlock() {
    return `<ul><li>📱 <a href="https://wa.me/${CFG.whatsapp}" target="_blank" rel="noopener">WhatsApp: 966 644 502</a></li><li>📧 <a href="mailto:${CFG.email}">${CFG.email}</a></li></ul>`;
  }

  function waLink(text) {
    return `<a href="https://wa.me/${CFG.whatsapp}" target="_blank" rel="noopener">${text}</a>`;
  }

  function financingChip() {
    return `<button class="cee-chip cee-chip-inline" data-msg="¿Qué opciones de financiamiento tienen?">Ver opciones de financiamiento</button>`;
  }

  function leadCaptureBlock() {
    STATE.leadCaptured = true;
    return `Para enviarte el folleto detallado y la estructura de cuotas a tu correo, ¿me compartes tu email o WhatsApp? Así nuestro asesor te contacta directamente:${contactBlock()}`;
  }

  // ── Motor de respuestas ───────────────────────────────────────
  async function getReply(msg) {
    const lower = msg.toLowerCase().trim();

    // 1) Saludos
    if (/^(hola|buenas|buenos|buen dia|buen día|hey|hi|hello|saludos)\b/.test(lower)) {
      return `Hola 👋 ¿En qué puedo ayudarte hoy? Puedo informarte sobre nuestros cursos, sílabos, horarios y precios.`;
    }

    // 2) Despedidas
    if (/\b(gracias|adios|adiós|hasta luego|chau|bye)\b/.test(lower)) {
      return `Con gusto. Si necesitas más información sobre los cursos del CEE, estaré aquí. ¡Hasta pronto!`;
    }

    // 3) Derivación explícita a asesor humano → pausa la IA, transfiere de inmediato
    if (/\b(hablar con|comunicar con|asesor|persona real|humano|agente)\b/.test(lower)) {
      return `Te conecto con un asesor humano de inmediato:${contactBlock()}Le he dejado registrado tu interés para que te atienda con prioridad.`;
    }

    // 4) Intención de inscripción / pago / datos personales → escalar
    if (/\b(inscrib|matricul|pagar|pago|comprar|registrar|registrarme|enrol)\w*/.test(lower)) {
      return `Para inscribirte o consultar formas de pago, nuestro equipo puede atenderte directamente:${contactBlock()}¿Tienes alguna otra pregunta sobre los cursos?`;
    }

    // 5) Precio / costo / financiamiento / descuentos → cuenta para captura de lead
    if (/\b(precio|costo|cuesta|financiamiento|cuotas?|cr[eé]dito|descuentos?|pronto pago|corporativ[oa]|inversi[oó]n)\b/.test(lower)) {
      STATE.priceQuestions++;
      if (STATE.priceQuestions >= 3 && !STATE.leadCaptured) {
        return leadCaptureBlock();
      }
      if (/\b(financiamiento|cuotas?|cr[eé]dito|descuentos?|pronto pago|corporativ[oa])\b/.test(lower)) {
        return `Contamos con financiamiento flexible: cuotas sin intereses, crédito directo y descuentos corporativos o por pronto pago según el programa. Para la estructura exacta de cuotas, contáctanos:${contactBlock()}`;
      }
      return '¡Buena pregunta! Los precios varían por programa. Para obtener la tarifa exacta y conocer las formas de pago, lo mejor es contactar directamente al equipo del CEE:<br>' + contactBlock() + financingChip();
    }

    // 6) Certificación / ponentes
    if (/\b(certificaci[oó]n|certificado|certifica|t[ií]tulo|diploma|ponentes?|profesores?|docentes?|qui[eé]n(es)? ense[ñn]a)\b/.test(lower)) {
      return 'Sí, el certificado es emitido a nombre de la <strong>Universidad Nacional de Ingeniería (UNI)</strong>, con respaldo de la Facultad de Ingeniería Industrial y de Sistemas (FIIS). Nuestros ponentes son profesionales con amplia experiencia y peso en el mercado. ¿Quieres conocer el perfil de algún docente en particular?';
    }

    // 7) FAQ estática
    for (const item of KB.faq) {
      if (item.keys.some(k => lower.includes(k))) {
        return item.answer;
      }
    }

    // 8) Catálogo de cursos (con tarjetas visuales)
    if (/\b(cursos?|programas?|qu[eé] tienen|qu[eé] ofrecen|cat[aá]logo|requisitos?)\b/.test(lower)) {
      return await replyCatalogo(lower);
    }

    // 9) Sílabo / temas de un curso
    if (/\b(s[ií]labo|silabo|temas?|contenido|qu[eé] ve[en]|qu[eé] aprendo)\b/.test(lower)) {
      return await replySilabo(lower);
    }

    // 10) Horarios
    if (/\b(horario|d[ií]as?|horas?|cu[aá]ndo|cuando empieza|inicio)\b/.test(lower)) {
      return await replyHorario(lower);
    }

    // 11) Contacto
    if (/\b(contacto|contactar|comunicar|whatsapp|tel[eé]fono|telefono|correo|email)\b/.test(lower)) {
      return `Puedes contactarnos por:${contactBlock()}¿Hay algo más en lo que pueda ayudarte?`;
    }

    // 9) Out-of-scope adyacente (precio de otro lado, comparativas)
    const adjacentReply = KB.outOfScopeAdjacentAnswer(msg);
    if (adjacentReply) return adjacentReply;

    // 10) Out-of-scope irrelevante → declinar + redirigir
    if (KB.isOutOfScope(msg)) {
      return `Eso está fuera de lo que manejo 😄 Estoy aquí para ayudarte con los cursos y servicios del CEE. ¿Te gustaría conocer nuestra oferta formativa?`;
    }

    // 11) Fallback → escalar
    return `No tengo información exacta sobre eso. Te recomiendo contactar directamente al equipo del CEE:${contactBlock()}`;
  }

  // ── Respuesta: catálogo ───────────────────────────────────────
  async function replyCatalogo(lower) {
    // Detectar segmento mencionado
    let segmentoFiltro = null;
    for (const [kw, nombre] of Object.entries(KB.segmentos)) {
      if (lower.includes(kw)) { segmentoFiltro = nombre; break; }
    }

    // Intentar BD
    const rows = await DB.get(
      'Catalogo-Servicio-Capacitacion',
      'descripcion_servicio,tarifa_curso,estado_capacitacion,tipo_curso',
      segmentoFiltro ? {} : {}
    );

    if (rows && rows.length > 0) {
      const activos = rows.filter(r => r.estado_capacitacion === 'A');
      if (activos.length === 0) {
        return 'No hay cursos activos en este momento. Contáctanos para información actualizada:' + contactBlock();
      }
      const intro = segmentoFiltro
        ? `Estos son los programas de <strong>${segmentoFiltro}</strong> disponibles:`
        : `Estos son nuestros programas disponibles:`;
      let cards = '<div class="cee-card-row">';
      for (const r of activos.slice(0, 6)) {
        cards += `
          <div class="cee-card">
            <div class="cee-card-title">${r.descripcion_servicio}</div>
            <div class="cee-card-price">S/ ${r.tarifa_curso}</div>
            <button class="cee-card-btn" data-msg="¿Cuáles son los requisitos del curso de ${r.descripcion_servicio}?">Ver más</button>
          </div>`;
      }
      cards += '</div>';
      return `${intro}${cards}¿Quieres ver el sílabo, los requisitos de ingreso o el horario de alguno?`;
    }

    // Fallback estático con tarjetas
    const segTexto = segmentoFiltro ? ` de <strong>${segmentoFiltro}</strong>` : '';
    const areas = [
      'Gestión y Liderazgo',
      'Calidad y Productividad',
      'Seguridad y Salud Ocupacional (SSOMA)',
      'Logística y Procesos',
      'Innovación',
    ];
    let cards = '<div class="cee-card-row">';
    for (const area of areas) {
      cards += `
        <div class="cee-card">
          <div class="cee-card-title">${area}</div>
          <button class="cee-card-btn" data-msg="¿Qué cursos tienen de ${area.split(' ')[0]}?">Ver más</button>
        </div>`;
    }
    cards += '</div>';
    return `Tenemos programas${segTexto} en áreas como:${cards}Para ver la oferta completa y precios, contacta a nuestro equipo: ${waLink('WhatsApp 966 644 502')}.`;
  }

  // ── Respuesta: sílabo ─────────────────────────────────────────
  async function replySilabo(lower) {
    // Sin BD configurada → respuesta orientativa
    if (!CFG.supabaseUrl) {
      return `Para conocer el sílabo detallado de un curso (temas, duración y secuencia), puedes:<ul>
        <li>Preguntarme por el nombre del curso y te busco la información</li>
        <li>Escribirnos al ${waLink('WhatsApp 966 644 502')} para recibirlo en PDF</li>
      </ul>¿De qué curso quieres el sílabo?`;
    }

    // Con BD: intentar extraer nombre del curso del mensaje
    const cursoMencionado = extraerNombreCurso(lower);
    if (!cursoMencionado) {
      return `¿De qué curso quieres ver el sílabo? Cuéntame el nombre o el área (ej: SSOMA, calidad, logística) y lo busco.`;
    }

    const cursos = await DB.get('Catalogo-Curso', 'cod_tipo_curso,nombre_curso,descripcion_curso');
    if (!cursos) return fallbackContacto();

    const curso = cursos.find(c => c.nombre_curso.toLowerCase().includes(cursoMencionado));
    if (!curso) {
      return `No encontré un curso con ese nombre en el catálogo. ¿Puedes darme más detalle? También puedes ver la oferta completa contactándonos: ${waLink('WhatsApp')}`;
    }

    const silabus = await DB.get(
      'Relacion-Silabus-X-Curso',
      'cod_tema,secuencia_logica',
      { cod_tipo_curso: curso.cod_tipo_curso }
    );
    if (!silabus || silabus.length === 0) {
      return `El curso <strong>${curso.nombre_curso}</strong> aún no tiene su sílabo cargado en el sistema. Para obtenerlo escríbenos: ${waLink('WhatsApp 966 644 502')}`;
    }

    const temaIds = silabus.sort((a, b) => a.secuencia_logica - b.secuencia_logica).map(s => s.cod_tema);
    const temas = await DB.get('Catalogo-Tema', 'cod_tema,nombre_tema,duracion_tema');
    if (!temas) return fallbackContacto();

    const temasOrdenados = temaIds.map(id => temas.find(t => t.cod_tema === id)).filter(Boolean);
    let html = `<strong>${curso.nombre_curso}</strong> — Sílabo:<ul>`;
    for (const t of temasOrdenados) {
      html += `<li>${t.nombre_tema} <em>(${t.duracion_tema}h)</em></li>`;
    }
    html += `</ul>¿Quieres saber el horario o el precio de este curso?`;
    return html;
  }

  // ── Respuesta: horario ────────────────────────────────────────
  async function replyHorario(lower) {
    const DIAS = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };

    if (!CFG.supabaseUrl) {
      return `Los horarios varían por programa. Para obtener el calendario actualizado, contáctanos:<ul>
        <li>${waLink('WhatsApp 966 644 502')}</li>
        <li><a href="mailto:${CFG.email}">${CFG.email}</a></li>
      </ul>¿Hay algún curso en especial que te interese?`;
    }

    const horarios = await DB.get('Catalogo-Horario-Semanal', 'tipo_horario,descripcion_horario');
    const detalles = await DB.get('Detalle-Horario', 'tipo_horario,dia_semana,hora');
    if (!horarios || !detalles) return fallbackContacto();

    let html = `Estos son los horarios disponibles:<ul>`;
    for (const h of horarios) {
      const slots = detalles.filter(d => d.tipo_horario === h.tipo_horario);
      const dias  = [...new Set(slots.map(s => DIAS[s.dia_semana] || s.dia_semana))].join(', ');
      const horas = [...new Set(slots.map(s => `${s.hora}:00`))].join(' / ');
      html += `<li><strong>${h.descripcion_horario}</strong>: ${dias} — ${horas}</li>`;
    }
    html += `</ul>¿Quieres saber en qué horario está disponible un curso específico?`;
    return html;
  }

  // ── Utilidades ────────────────────────────────────────────────
  function extraerNombreCurso(lower) {
    const patrones = [
      /(?:curso|programa|silabo|s[ií]labo)\s+(?:de\s+)?([a-záéíóúüñ\s]+)/i,
      /(?:sobre|del?|en)\s+([a-záéíóúüñ\s]{4,})/i,
    ];
    for (const p of patrones) {
      const m = lower.match(p);
      if (m) return m[1].trim().toLowerCase();
    }
    return null;
  }

  function fallbackContacto() {
    return `Hubo un problema al obtener la información. Por favor contáctanos directamente:${contactBlock()}`;
  }

  // ── Construcción del DOM ──────────────────────────────────────
  function buildWidget() {
    if (document.getElementById('cee-fab')) return;

    // ── Defs SVG compartidos (gradientes clay 3D) ──
    // Se insertan una sola vez; cada avatar referencia los ids por url(#...)
    const CECI_DEFS = `
      <svg width="0" height="0" style="position:absolute" aria-hidden="true">
        <defs>
          <radialGradient id="cClayHead" cx="38%" cy="30%" r="75%">
            <stop offset="0%"  stop-color="#d65a72"/>
            <stop offset="45%" stop-color="#9b2437"/>
            <stop offset="100%" stop-color="#5a1520"/>
          </radialGradient>
          <radialGradient id="cClayBody" cx="40%" cy="28%" r="80%">
            <stop offset="0%"  stop-color="#a82a40"/>
            <stop offset="55%" stop-color="#7B1E2E"/>
            <stop offset="100%" stop-color="#4d1119"/>
          </radialGradient>
          <radialGradient id="cClayGold" cx="38%" cy="30%" r="75%">
            <stop offset="0%"  stop-color="#f4d68a"/>
            <stop offset="50%" stop-color="#C9972C"/>
            <stop offset="100%" stop-color="#9a7016"/>
          </radialGradient>
          <radialGradient id="cClayFace" cx="50%" cy="42%" r="60%">
            <stop offset="0%"  stop-color="#2b3a4a"/>
            <stop offset="100%" stop-color="#16212d"/>
          </radialGradient>
        </defs>
      </svg>`;

    // SVG de Ceci compacto (solo cabeza, para FAB y header pequeño)
    const CECI_SVG = `
      <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse class="cee-shadow" cx="20" cy="41" rx="11" ry="2.5" fill="rgba(40,10,16,0.28)"/>
        <g class="cee-antenna">
          <line x1="20" y1="9" x2="20" y2="4" stroke="url(#cClayGold)" stroke-width="2.2" stroke-linecap="round"/>
          <circle class="cee-antenna-dot" cx="20" cy="3.5" r="2.6" fill="url(#cClayGold)"/>
          <circle cx="19.3" cy="2.8" r="1" fill="#fff6d8" opacity="0.9"/>
        </g>
        <!-- Cabeza con volumen 3D (gradiente radial) -->
        <rect x="4.5" y="9" width="31" height="26" rx="13" fill="url(#cClayHead)"/>
        <!-- Highlight especular superior izquierdo -->
        <ellipse cx="14" cy="16" rx="7" ry="5" fill="#ffffff" opacity="0.16"/>
        <!-- Orejitas tipo audífono -->
        <circle cx="5" cy="22" r="3.2" fill="url(#cClayGold)"/>
        <circle cx="35" cy="22" r="3.2" fill="url(#cClayGold)"/>
        <!-- Visor/cara oscura tipo robot tierno -->
        <rect x="9" y="14.5" width="22" height="15" rx="7.5" fill="url(#cClayFace)"/>
        <ellipse cx="20" cy="17" rx="9" ry="3" fill="#ffffff" opacity="0.08"/>
        <!-- Mejillas (rubor dorado-rosado) -->
        <ellipse class="cee-cheek" cx="11.5" cy="26" rx="2.6" ry="1.6" fill="#ff8fa3" opacity="0.5"/>
        <ellipse class="cee-cheek" cx="28.5" cy="26" rx="2.6" ry="1.6" fill="#ff8fa3" opacity="0.5"/>
        <!-- Ojos brillantes dentro del visor -->
        <g class="cee-eye-l">
          <circle cx="15.5" cy="22" r="2.9" fill="#9fe8ff"/>
          <circle cx="15.5" cy="22" r="2.9" fill="url(#cClayFace)" opacity="0"/>
          <circle class="cee-eye-shine" cx="16.4" cy="21" r="1" fill="#ffffff"/>
        </g>
        <g class="cee-eye-r">
          <circle cx="24.5" cy="22" r="2.9" fill="#9fe8ff"/>
          <circle class="cee-eye-shine" cx="25.4" cy="21" r="1" fill="#ffffff"/>
        </g>
        <!-- Sonrisa dentro del visor -->
        <path class="cee-mouth" d="M16.5 26 Q20 28.5 23.5 26" stroke="#9fe8ff" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      </svg>`;

    // SVG de Ceci HERO (cuerpo completo, saludando) — bienvenida y estados vacíos
    const CECI_HERO = `
      <svg viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg" class="cee-hero-svg" aria-hidden="true">
        <!-- Sombra en el piso -->
        <ellipse class="cee-hero-shadow" cx="60" cy="122" rx="30" ry="6" fill="rgba(40,10,16,0.20)"/>
        <!-- Grupo flotante (cuerpo entero sube y baja) -->
        <g class="cee-hero-float">
          <!-- Antena -->
          <g class="cee-antenna" style="transform-origin:60px 26px">
            <line x1="60" y1="26" x2="60" y2="13" stroke="url(#cClayGold)" stroke-width="3.5" stroke-linecap="round"/>
            <circle class="cee-antenna-dot" cx="60" cy="10" r="5" fill="url(#cClayGold)"/>
            <circle cx="58" cy="8" r="1.8" fill="#fff6d8" opacity="0.9"/>
          </g>

          <!-- Cuerpo (torso clay) -->
          <rect x="38" y="74" width="44" height="40" rx="20" fill="url(#cClayBody)"/>
          <ellipse cx="52" cy="84" rx="12" ry="7" fill="#ffffff" opacity="0.12"/>
          <!-- Badge dorado "CEE" en el pecho -->
          <circle cx="60" cy="93" r="11" fill="url(#cClayGold)"/>
          <circle cx="60" cy="93" r="11" fill="none" stroke="#fff6d8" stroke-width="1" opacity="0.4"/>
          <text x="60" y="97" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="9" font-weight="800" fill="#5a1520">CEE</text>

          <!-- Brazo izquierdo (apoyado) -->
          <g style="transform-origin:40px 84px">
            <rect x="26" y="82" width="16" height="9" rx="4.5" fill="url(#cClayBody)"/>
            <circle cx="28" cy="86.5" r="5.5" fill="url(#cClayGold)"/>
          </g>
          <!-- Brazo derecho (saludando, animado) -->
          <g class="cee-hero-wave" style="transform-origin:82px 80px">
            <rect x="80" y="62" width="9" height="22" rx="4.5" fill="url(#cClayBody)" transform="rotate(20 84 73)"/>
            <circle cx="92" cy="58" r="6" fill="url(#cClayGold)"/>
            <circle cx="90" cy="56" r="1.6" fill="#fff6d8" opacity="0.7"/>
          </g>

          <!-- Cabeza grande con volumen -->
          <rect x="30" y="30" width="60" height="50" rx="25" fill="url(#cClayHead)"/>
          <ellipse cx="48" cy="44" rx="14" ry="10" fill="#ffffff" opacity="0.16"/>
          <!-- Orejitas -->
          <circle cx="31" cy="55" r="6.5" fill="url(#cClayGold)"/>
          <circle cx="89" cy="55" r="6.5" fill="url(#cClayGold)"/>
          <!-- Visor de la cara -->
          <rect x="39" y="40" width="42" height="29" rx="14.5" fill="url(#cClayFace)"/>
          <ellipse cx="60" cy="45" rx="17" ry="5" fill="#ffffff" opacity="0.08"/>
          <!-- Mejillas -->
          <ellipse class="cee-cheek" cx="44" cy="62" rx="5" ry="3" fill="#ff8fa3" opacity="0.5"/>
          <ellipse class="cee-cheek" cx="76" cy="62" rx="5" ry="3" fill="#ff8fa3" opacity="0.5"/>
          <!-- Ojos -->
          <g class="cee-eye-l" style="transform-origin:50px 54px">
            <circle cx="50" cy="54" r="5.5" fill="#9fe8ff"/>
            <circle class="cee-eye-shine" cx="52" cy="51.5" r="1.8" fill="#ffffff"/>
          </g>
          <g class="cee-eye-r" style="transform-origin:70px 54px">
            <circle cx="70" cy="54" r="5.5" fill="#9fe8ff"/>
            <circle class="cee-eye-shine" cx="72" cy="51.5" r="1.8" fill="#ffffff"/>
          </g>
          <!-- Sonrisa -->
          <path class="cee-mouth" d="M52 62 Q60 67 68 62" stroke="#9fe8ff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        </g>
      </svg>`;

    // FAB
    const fab = document.createElement('button');
    fab.id = 'cee-fab';
    fab.setAttribute('aria-label', 'Abrir chat CEE');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = `
      <div class="cee-avatar-wrap">${CECI_SVG}</div>
      <div id="cee-fab-label">
        Asesor Virtual CEE
        <span>¿En qué te ayudo?</span>
      </div>
      <div id="cee-fab-close-icon">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    `;

    // Panel
    const panel = document.createElement('div');
    panel.id = 'cee-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `Chat con ${CFG.botName}`);
    panel.innerHTML = `
      <div id="cee-header">
        <div id="cee-header-avatar-small">${CECI_SVG}</div>
        <div id="cee-header-info">
          <div id="cee-header-name">${CFG.botName}</div>
          <div id="cee-header-status">En línea · CEE FIIS-UNI</div>
        </div>
        <button id="cee-close" aria-label="Cerrar chat">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="cee-messages">
        <div id="cee-typing"><span class="cee-dot"></span><span class="cee-dot"></span><span class="cee-dot"></span></div>
      </div>
      <div id="cee-chips">
        <button class="cee-chip" data-msg="¿Qué cursos tienen?">Ver cursos</button>
        <button class="cee-chip" data-msg="¿Qué horarios hay?">Horarios</button>
        <button class="cee-chip" data-msg="¿Cómo me inscribo?">Inscripción</button>
        <button class="cee-chip" data-msg="¿Cómo los contacto?">Contacto</button>
      </div>
      <div id="cee-input-row">
        <textarea id="cee-input" rows="1" placeholder="Escribe tu pregunta..." aria-label="Mensaje"></textarea>
        <button id="cee-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;

    // Defs SVG compartidos (gradientes clay) — una sola vez en el documento
    const defsHost = document.createElement('div');
    defsHost.id = 'cee-svg-defs';
    defsHost.innerHTML = CECI_DEFS;
    document.body.appendChild(defsHost);

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // Referencias
    const messages = panel.querySelector('#cee-messages');
    const typing   = panel.querySelector('#cee-typing');
    const input    = panel.querySelector('#cee-input');
    const sendBtn  = panel.querySelector('#cee-send');
    const chips    = panel.querySelectorAll('.cee-chip');
    const closeBtn = panel.querySelector('#cee-close');

    // ── Helpers DOM ──
    function addMessage(html, role) {
      const row = document.createElement('div');
      row.className = `cee-bubble-row cee-${role}`;
      const bubble = document.createElement('div');
      bubble.className = 'cee-bubble';
      bubble.innerHTML = html;
      row.appendChild(bubble);
      messages.insertBefore(row, typing);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping(on) {
      typing.classList.toggle('visible', on);
      messages.scrollTop = messages.scrollHeight;
    }

    async function handleSend(text) {
      const msg = (text || input.value).trim();
      if (!msg) return;
      input.value = '';
      input.style.height = 'auto';
      addMessage(msg, 'user');
      showTyping(true);
      // Mínimo 600ms de typing para que no sea abrupto
      const [reply] = await Promise.all([
        getReply(msg),
        new Promise(r => setTimeout(r, 600)),
      ]);
      showTyping(false);
      addMessage(reply, 'bot');
    }

    // ── Helpers de estado ──
    function insertHero() {
      const hero = document.createElement('div');
      hero.id = 'cee-hero';
      hero.innerHTML = `
        <div id="cee-hero-stage">${CECI_HERO}</div>
        <div id="cee-hero-name">¡Hola! Soy ${CFG.botName}</div>
        <div id="cee-hero-tag">Tu asistente del CEE · FIIS-UNI</div>
      `;
      messages.insertBefore(hero, typing);
    }

    function openPanel() {
      panel.classList.add('cee-open');
      fab.classList.add('cee-fab-open');
      fab.setAttribute('aria-expanded', 'true');
      fab.setAttribute('aria-label', 'Cerrar chat CEE');
      if (messages.querySelectorAll('.cee-bubble-row').length === 0 && !messages.querySelector('#cee-hero')) {
        insertHero();
        setTimeout(() => addMessage(`Puedo informarte sobre nuestros <strong>cursos, sílabos, horarios y certificación</strong>. ¿En qué te ayudo hoy?`, 'bot'), 350);
      }
      input.focus();
    }

    function closePanel() {
      panel.classList.remove('cee-open');
      fab.classList.remove('cee-fab-open');
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Abrir chat CEE');
    }

    // ── Eventos ──
    fab.addEventListener('click', () => {
      panel.classList.contains('cee-open') ? closePanel() : openPanel();
    });

    closeBtn.addEventListener('click', closePanel);

    sendBtn.addEventListener('click', () => handleSend());

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Chips fijos
    chips.forEach(chip => {
      chip.addEventListener('click', () => handleSend(chip.dataset.msg));
    });

    // Botones dinámicos dentro de mensajes (tarjetas, chip de financiamiento)
    messages.addEventListener('click', e => {
      const btn = e.target.closest('[data-msg]');
      if (btn) handleSend(btn.dataset.msg);
    });
  }

  // ── Init ──────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
