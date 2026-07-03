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
    assetsUrl:  '',          // carpeta assets/ (imágenes de Ceci) si no está junto al script
    supabaseUrl: '',         // se lee de window.CEE_CONFIG
    supabaseKey: '',
  }, window.CEE_CONFIG || {});

  // ── Base de rutas del script (para CSS y assets) ─────────────
  const SCRIPT_BASE = document.currentScript
    ? document.currentScript.src.replace(/widget\.js(?:\?.*)?$/, '')
    : '';
  const ASSETS_BASE = CFG.assetsUrl || (SCRIPT_BASE ? SCRIPT_BASE + 'assets/' : 'assets/');

  // ── Inyectar CSS ─────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById('cee-widget-css')) return;
    const link = document.createElement('link');
    link.id   = 'cee-widget-css';
    link.rel  = 'stylesheet';
    link.href = CFG.cssUrl || (SCRIPT_BASE ? SCRIPT_BASE + 'widget.css' : 'widget.css');
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

    async insert(table, row) {
      const token = await AUTH.getToken();
      if (!token) return null;
      try {
        const res = await fetch(`${CFG.supabaseUrl}/rest/v1/${encodeURIComponent(table)}`, {
          method: 'POST',
          headers: {
            apikey: CFG.supabaseKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(row),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return Array.isArray(data) ? data[0] : data;
      } catch { return null; }
    },
  };

  // ── Sesión anónima (Supabase Anonymous Auth) ────────────────
  // Necesaria para que RLS reconozca auth.uid() al guardar el historial.
  const AUTH = {
    _token: null,
    _userId: null,

    async getToken() {
      if (!CFG.supabaseUrl || !CFG.supabaseKey) return null;
      if (this._token) return this._token;

      const cached = sessionStorage.getItem('cee_auth_session');
      if (cached) {
        try {
          const session = JSON.parse(cached);
          this._token = session.access_token;
          this._userId = session.user_id;
          return this._token;
        } catch { /* sesión corrupta, se vuelve a crear */ }
      }

      try {
        const res = await fetch(`${CFG.supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            apikey: CFG.supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) return null;
        const data = await res.json();
        this._token = data.access_token;
        this._userId = data.user && data.user.id;
        if (this._token && this._userId) {
          sessionStorage.setItem('cee_auth_session', JSON.stringify({
            access_token: this._token,
            user_id: this._userId,
          }));
        }
        return this._token;
      } catch { return null; }
    },

    getUserId() { return this._userId; },
  };

  // ── Persistencia del historial (conversations / messages) ───
  const HISTORY = {
    conversationId: null,

    async ensureConversation() {
      if (this.conversationId) return this.conversationId;
      if (!CFG.supabaseUrl || !CFG.supabaseKey) return null;

      const token = await AUTH.getToken();
      if (!token) return null;

      const cachedId = sessionStorage.getItem('cee_conversation_id');
      if (cachedId) {
        this.conversationId = cachedId;
        return this.conversationId;
      }

      const row = await DB.insert('conversations', {
        user_id: AUTH.getUserId(),
        title: 'Chat con Ceci · CEE',
      });
      if (row && row.id) {
        this.conversationId = row.id;
        sessionStorage.setItem('cee_conversation_id', row.id);
      }
      return this.conversationId;
    },

    async saveMessage(role, content) {
      const conversationId = await this.ensureConversation();
      if (!conversationId) return;
      await DB.insert('messages', { conversation_id: conversationId, role, content });
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

    // ── Avatar CSS de Ceci (holográfico con SVG puro) ──
    const CECI_HEAD_SVG = `
      <svg class="cee-avatar-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Halo holográfico -->
        <circle cx="50" cy="45" r="42" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.5" opacity="0.7"/>
        <!-- Cabeza (esfera oscura) -->
        <circle cx="50" cy="45" r="38" fill="url(#headGrad)"/>
        <!-- Pantalla de ojos -->
        <circle cx="38" cy="40" r="9" fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.6)" stroke-width="1.5"/>
        <circle cx="62" cy="40" r="9" fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.6)" stroke-width="1.5"/>
        <!-- Ojos brillantes -->
        <circle cx="38" cy="40" r="5" fill="rgba(92,212,255,0.9)" opacity="0.85"/>
        <circle cx="62" cy="40" r="5" fill="rgba(92,212,255,0.9)" opacity="0.85"/>
        <!-- Brillo en ojos -->
        <circle cx="36" cy="38" r="1.5" fill="#fff" opacity="0.6"/>
        <circle cx="60" cy="38" r="1.5" fill="#fff" opacity="0.6"/>
        <!-- Boca sonriente -->
        <path d="M 45 55 Q 50 58 55 55" stroke="rgba(92,212,255,0.8)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <!-- Auriculares/frame guinda -->
        <path d="M 20 35 Q 15 45 20 55" stroke="#7B1E2E" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M 80 35 Q 85 45 80 55" stroke="#7B1E2E" stroke-width="4" fill="none" stroke-linecap="round"/>
        <!-- Puntos de conexión auricular -->
        <circle cx="20" cy="35" r="2.5" fill="#C9972C"/>
        <circle cx="80" cy="35" r="2.5" fill="#C9972C"/>
        <defs>
          <radialGradient id="headGrad" cx="30%" cy="30%">
            <stop offset="0%" style="stop-color:#1a2332;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#0d111a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#050608;stop-opacity:1" />
          </radialGradient>
        </defs>
      </svg>
    `;

    const CECI_HERO_SVG = `
      <svg class="cee-hero-svg" viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Halo superior -->
        <circle cx="60" cy="50" r="50" fill="none" stroke="rgba(56,189,248,0.2)" stroke-width="2" opacity="0.5"/>
        <!-- Cabeza -->
        <circle cx="60" cy="50" r="45" fill="url(#heroHeadGrad)"/>
        <!-- Ojos grandes -->
        <circle cx="45" cy="45" r="11" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.7)" stroke-width="2"/>
        <circle cx="75" cy="45" r="11" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.7)" stroke-width="2"/>
        <circle cx="45" cy="45" r="6" fill="#5cd4ff"/>
        <circle cx="75" cy="45" r="6" fill="#5cd4ff"/>
        <circle cx="43" cy="43" r="2" fill="#fff" opacity="0.7"/>
        <circle cx="73" cy="43" r="2" fill="#fff" opacity="0.7"/>
        <!-- Boca grande sonriente -->
        <path d="M 48 60 Q 60 65 72 60" stroke="#5cd4ff" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Marco guinda central (pecho) -->
        <rect x="30" y="100" width="60" height="50" rx="12" fill="#7B1E2E" opacity="0.8" stroke="rgba(56,189,248,0.4)" stroke-width="1.5"/>
        <!-- Etiqueta CEE en pecho -->
        <text x="60" y="118" font-size="14" font-weight="700" text-anchor="middle" fill="#fff" font-family="Exo 2, sans-serif">CEE</text>
        <text x="60" y="138" font-size="10" font-weight="600" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Exo 2, sans-serif">(UNI)</text>
        <!-- Brazo levantado (mano saludando) -->
        <g id="wave">
          <line x1="85" y1="105" x2="105" y2="80" stroke="#f5f5f5" stroke-width="6" stroke-linecap="round"/>
          <!-- Mano -->
          <circle cx="105" cy="80" r="8" fill="#f5f5f5"/>
          <circle cx="110" cy="75" r="3" fill="#7B1E2E"/>
          <circle cx="112" cy="82" r="3" fill="#7B1E2E"/>
          <circle cx="108" cy="88" r="3" fill="#7B1E2E"/>
        </g>
        <!-- Base holográfica inferior -->
        <ellipse cx="60" cy="185" rx="35" ry="12" fill="url(#haloBase)"/>
        <defs>
          <radialGradient id="heroHeadGrad" cx="35%" cy="35%">
            <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
            <stop offset="60%" style="stop-color:#111827;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#030712;stop-opacity:1" />
          </radialGradient>
          <radialGradient id="haloBase" cx="50%" cy="0%">
            <stop offset="0%" style="stop-color:#38bdf8;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:#38bdf8;stop-opacity:0" />
          </radialGradient>
        </defs>
      </svg>
    `;

    // FAB
    const fab = document.createElement('button');
    fab.id = 'cee-fab';
    fab.setAttribute('aria-label', 'Abrir chat CEE');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = `
      <div class="cee-avatar-wrap">${CECI_HEAD_SVG}</div>
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
        <div id="cee-header-avatar-small">${CECI_HEAD_SVG}</div>
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
      HISTORY.saveMessage('user', msg);
      showTyping(true);
      // Mínimo 600ms de typing para que no sea abrupto
      const [reply] = await Promise.all([
        getReply(msg),
        new Promise(r => setTimeout(r, 600)),
      ]);
      showTyping(false);
      addMessage(reply, 'bot');
      HISTORY.saveMessage('assistant', reply);
    }

    // ── Helpers de estado ──
    function insertHero() {
      const hero = document.createElement('div');
      hero.id = 'cee-hero';
      hero.innerHTML = `
        <div id="cee-hero-stage">${CECI_HERO_SVG}</div>
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
