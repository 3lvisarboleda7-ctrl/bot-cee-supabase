/* Verificación post-corrección: scroll, cierre, escape, sanitizado, bloqueo de fondo */
const { chromium, devices } = require('playwright');
const path = require('path');

const fileUrl = 'file:///' + path.resolve(__dirname, 'demo.html').replace(/\\/g, '/');
let fallos = 0;

function check(nombre, ok, detalle = '') {
  console.log(`${ok ? 'OK  ' : 'FALLO'} · ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
}

async function conversar(page, n) {
  for (let i = 0; i < n; i++) {
    await page.fill('#cee-input', `Pregunta ${i + 1}: ¿qué cursos tienen?`);
    await page.press('#cee-input', 'Enter');
    await page.waitForTimeout(720);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── DESKTOP ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(fileUrl);
    await page.waitForTimeout(800);
    await page.click('#cee-fab');
    await page.waitForTimeout(800);
    await conversar(page, 6);

    // Scroll: llegar al tope y quedarse ahí
    const box = await page.locator('#cee-messages').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -400); await page.waitForTimeout(100); }
    await page.waitForTimeout(700);
    const top = await page.evaluate(() => document.getElementById('cee-messages').scrollTop);
    check('desktop: scroll llega al tope del historial', top === 0, `scrollTop=${top}`);

    // Sanitizado: HTML del usuario se muestra literal
    await page.fill('#cee-input', '<b>hola</b><img src=x onerror=alert(1)>');
    await page.press('#cee-input', 'Enter');
    await page.waitForTimeout(900);
    const sane = await page.evaluate(() => {
      const filas = document.querySelectorAll('.cee-bubble-row.cee-user .cee-bubble');
      const ultima = filas[filas.length - 1];
      return { texto: ultima.textContent, tieneHijos: ultima.children.length };
    });
    check('desktop: texto del usuario no se interpreta como HTML', sane.tieneHijos === 0 && sane.texto.includes('<b>hola</b>'));

    // Cierre con ✕ del header
    await page.click('#cee-close');
    await page.waitForTimeout(400);
    let cerrado = await page.evaluate(() => !document.getElementById('cee-panel').classList.contains('cee-open'));
    check('desktop: cierra con ✕ del header', cerrado);

    // Reabrir y cerrar con Escape
    await page.click('#cee-fab');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    cerrado = await page.evaluate(() => !document.getElementById('cee-panel').classList.contains('cee-open'));
    check('desktop: cierra con tecla Escape', cerrado);

    // Reabrir y cerrar con FAB
    await page.click('#cee-fab');
    await page.waitForTimeout(500);
    await page.click('#cee-fab');
    await page.waitForTimeout(400);
    cerrado = await page.evaluate(() => !document.getElementById('cee-panel').classList.contains('cee-open'));
    check('desktop: cierra con el FAB ✕', cerrado);
    await page.close();
  }

  // ── MÓVIL (iPhone 13, táctil) ──
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    await page.goto(fileUrl);
    await page.waitForTimeout(800);
    await page.tap('#cee-fab');
    await page.waitForTimeout(800);

    // El FAB debe estar oculto con el panel abierto (ya no tapa el ✕)
    const fabOculto = await page.evaluate(() => getComputedStyle(document.getElementById('cee-fab')).display === 'none');
    check('movil: FAB oculto mientras el chat está abierto', fabOculto);

    // La página de fondo queda bloqueada
    const bloqueado = await page.evaluate(() =>
      document.documentElement.classList.contains('cee-chat-abierto') &&
      getComputedStyle(document.documentElement).overflow === 'hidden'
    );
    check('movil: scroll de la página de fondo bloqueado', bloqueado);

    await conversar(page, 5);

    // Scroll interno funciona
    const st = await page.evaluate(() => {
      const el = document.getElementById('cee-messages');
      return { desborda: el.scrollHeight > el.clientHeight };
    });
    check('movil: historial con scroll disponible', st.desborda);

    // Cierre con ✕ del header por tap (antes fallaba por intercepción)
    let cerrado = false, err = '';
    try {
      await page.tap('#cee-close', { timeout: 3000 });
      await page.waitForTimeout(400);
      cerrado = await page.evaluate(() => !document.getElementById('cee-panel').classList.contains('cee-open'));
    } catch (e) { err = e.message.split('\n')[0]; }
    check('movil: cierra con tap en ✕ del header', cerrado, err);

    // Al cerrar, el FAB reaparece y el fondo se desbloquea
    const restaurado = await page.evaluate(() =>
      getComputedStyle(document.getElementById('cee-fab')).display !== 'none' &&
      !document.documentElement.classList.contains('cee-chat-abierto')
    );
    check('movil: FAB visible y página desbloqueada tras cerrar', restaurado);

    // Simular teclado abierto: el panel debe encogerse al área visible
    await page.tap('#cee-fab');
    await page.waitForTimeout(600);
    const conTeclado = await page.evaluate(() => {
      // No se puede abrir un teclado real en headless: se verifica que el
      // ajuste responde al visualViewport actual sin romper la geometría.
      const p = document.getElementById('cee-panel').getBoundingClientRect();
      const c = document.getElementById('cee-close').getBoundingClientRect();
      return { headerVisible: c.top >= 0 && c.bottom <= innerHeight, panelAlto: Math.round(p.height) };
    });
    check('movil: ✕ del header dentro del área visible', conTeclado.headerVisible, `alto panel=${conTeclado.panelAlto}`);
    await page.screenshot({ path: path.join(__dirname, 'verif_movil.png') });
    await ctx.close();
  }

  await browser.close();
  console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} VERIFICACIONES FALLARON`);
  process.exit(fallos === 0 ? 0 : 1);
})();
