/* ============ alanews · app ============
   Lee la edición del día (ediciones/*.json) y arma la página.
   El progreso del repaso y las notas se guardan en este navegador (localStorage). */

(function () {
  'use strict';

  var TEMAS = {
    inmo:  { label: 'Inmobiliario', color: '#D9480F', fg: '#FFFFFF' },
    ia:    { label: 'IA',           color: '#3B5BDB', fg: '#FFFFFF' },
    fin:   { label: 'Finanzas',     color: '#2B7A3B', fg: '#FFFFFF' },
    peru:  { label: 'Perú',         color: '#C2255C', fg: '#FFFFFF' },
    mundo: { label: 'Mundo',        color: '#E8A317', fg: '#111111' }
  };
  var TIPOS = [
    { id: 'investiga', label: 'Investígalo',  color: '#7048E8', fg: '#FFFFFF', texto: '#7048E8', dibujo: 'ghost_lupa' },
    { id: 'pregunta',  label: 'Una pregunta', color: '#C2255C', fg: '#FFFFFF', texto: '#C2255C', dibujo: 'ghost_preg' },
    { id: 'mas',       label: 'Quiero más',   color: '#E8A317', fg: '#111111', texto: '#8A5A00', dibujo: 'ghost_star' }
  ];
  var MASCOTAS = ['llama', 'leon', 'dragon'];
  var NOMBRES = { llama: 'La llama', leon: 'El león', dragon: 'El dragón' };
  var ANIM = { wait: 'ala-wait', wow: 'ala-wow', happy: 'ala-happy', think: 'ala-think' };
  var FRASES = {
    wait: 'Está esperando que voltees la tarjeta…',
    wow: '¡Sorpresa! ¿La tenías?',
    happy: '¡Lo sabías! Vuelve en unos días.',
    think: 'Mmm… te la repite mañana.'
  };
  var INTERVALOS = [1, 2, 4, 7, 15]; // días según la caja de repaso

  var SVG = window.ALA_SVG || {};
  var PREVIEW = window.ALA_PREVIEW || {};
  var estado = { tema: 'todo', edicion: null, cola: [], idx: 0, volteada: false, animo: 'wait', sabidas: 0, mascota: null, tipo: 'investiga' };

  // ---------- utilidades ----------
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svg(inner, vb, cls, label) {
    var a = label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"';
    return '<svg ' + a + (cls ? ' class="' + cls + '"' : '') + ' viewBox="' + vb + '">' + (inner || '') + '</svg>';
  }
  function hoyISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function sumarDias(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function leer(clave, def) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function idTarjeta(q) { var h = 0; for (var i = 0; i < q.length; i++) { h = (h * 31 + q.charCodeAt(i)) | 0; } return 'c' + (h >>> 0).toString(36); }

  // ---------- carga ----------
  function cargar() {
    fetch('ediciones/index.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (indice) {
        pintarArchivo(indice.ediciones || []);
        var ultima = (indice.ediciones || [])[0];
        if (!ultima) { throw new Error('sin ediciones'); }
        return fetch(ultima.archivo, { cache: 'no-store' }).then(function (r) { return r.json(); });
      })
      .then(function (ed) { estado.edicion = ed; pintarTodo(); })
      .catch(function () {
        $('franja').textContent = 'No se pudo cargar la edición. Abre el sitio desde su link de GitHub Pages.';
      });
  }

  function pintarTodo() {
    var ed = estado.edicion;
    $('franja').textContent = 'Edición #' + ed.numero + ' · ' + ed.fecha_texto + (ed.nota_edicion ? ' · ' + ed.nota_edicion : '');
    $('fecha-movil').textContent = '#' + ed.numero + ' · ' + ed.fecha_corta;
    $('pie-edicion').textContent = 'Edición #' + ed.numero;
    pintarChips();
    pintarPortada();
    prepararRepaso();
    pintarHistorias();
    pintarCuaderno();
  }

  // ---------- chips ----------
  function pintarChips() {
    var lista = [{ id: 'todo', label: 'Todo', color: '#111111', fg: '#FFFFFF' }].concat(Object.keys(TEMAS).map(function (k) { return { id: k, label: TEMAS[k].label, color: TEMAS[k].color, fg: TEMAS[k].fg }; }));
    $('chips').innerHTML = lista.map(function (t) {
      var on = estado.tema === t.id;
      return '<button type="button" class="chip" data-tema="' + t.id + '" aria-pressed="' + on + '" style="' +
        (on ? 'background:' + t.color + ';color:' + t.fg + ';border-color:' + t.color : '') + '">' +
        '<span class="punto" style="background:' + (on ? t.fg : t.color) + '"></span>' + esc(t.label) + '</button>';
    }).join('');
  }
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (chip) { estado.tema = chip.getAttribute('data-tema'); pintarChips(); pintarHistorias(); }
  });

  // ---------- portada ----------
  function pintarPortada() {
    var p = estado.edicion.portada;
    $('portada').innerHTML =
      '<span class="etiqueta">Ponte al día · ' + esc(p.minutos) + ' min</span>' +
      '<h1>' + esc(p.titular) + '</h1>' +
      '<div class="brevity">' +
        '<p><strong>Qué pasó:</strong> ' + esc(p.que_paso) + '</p>' +
        '<p><strong>Por qué importa:</strong> ' + esc(p.por_que_importa) + '</p>' +
        (p.zoom ? '<p><strong>Zoom:</strong> ' + esc(p.zoom) + '</p>' : '') +
        '<p><strong>Para conversar:</strong> ' + esc(p.para_conversar) + '</p>' +
      '</div>' +
      '<div class="acciones"><a class="boton boton-borde" href="#cuaderno" data-ir-a="cuaderno">Anotar en mi cuaderno</a></div>';
  }

  // ---------- repaso (repetición espaciada) ----------
  function prepararRepaso() {
    var hoy = hoyISO();
    var progreso = leer('alanews.repaso', {});
    var todas = (estado.edicion.flashcards || []).map(function (c) { return { id: idTarjeta(c.q), q: c.q, a: c.a }; });
    estado.cola = todas.filter(function (c) { var p = progreso[c.id]; return !p || p.due <= hoy; });
    estado.idx = 0; estado.volteada = false; estado.animo = 'wait'; estado.sabidas = 0;
    var dia = Math.floor(Date.now() / 86400000);
    estado.mascota = leer('alanews.mascota', null) || MASCOTAS[dia % MASCOTAS.length];
    pintarRepaso();
  }

  function calificar(lo_sabia) {
    var c = estado.cola[estado.idx];
    var progreso = leer('alanews.repaso', {});
    var p = progreso[c.id] || { caja: 0 };
    p.caja = lo_sabia ? Math.min((p.caja || 0) + 1, INTERVALOS.length - 1) : 0;
    p.due = sumarDias(hoyISO(), lo_sabia ? INTERVALOS[p.caja] : 1);
    progreso[c.id] = p;
    guardar('alanews.repaso', progreso);
    if (lo_sabia) { estado.sabidas++; }
    estado.animo = lo_sabia ? 'happy' : 'think';
    pintarRepaso();
    setTimeout(function () { estado.idx++; estado.volteada = false; estado.animo = estado.idx >= estado.cola.length ? 'happy' : 'wait'; pintarRepaso(); }, 1100);
  }

  function pintarRepaso() {
    var n = estado.cola.length;
    var fin = estado.idx >= n;
    var pendientes = Math.max(n - estado.idx, 0);
    $('nav-repaso').textContent = 'Repaso · ' + pendientes;
    $('badge-repaso').textContent = pendientes || '';
    var segs = estado.cola.map(function (c, i) {
      var bg = i < estado.idx ? 'var(--acento)' : (i === estado.idx && !fin ? 'var(--tinta)' : 'var(--gris-claro)');
      return '<div class="segmento" style="background:' + bg + '"></div>';
    }).join('');
    var m = estado.mascota;
    var html =
      '<div class="repaso-cabeza etiqueta"><span>Repaso del día</span><span>' + (n ? Math.min(estado.idx + 1, n) + ' / ' + n : '0 / 0') + '</span></div>' +
      (n ? '<div class="segmentos" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + segs + '</div>' : '') +
      '<div class="mascota-fila"><button type="button" class="mascota" id="mascota" aria-label="Cambiar de compañero (ahora: ' + NOMBRES[m] + ')">' +
        svg(SVG[m + '_' + estado.animo], '0 0 160 160', ANIM[estado.animo]) + '</button>' +
        '<p class="mascota-dice"><strong>' + NOMBRES[m] + '</strong>' + (fin && n ? '¡Terminaste por hoy!' : (n ? FRASES[estado.animo] : 'Hoy no tienes tarjetas pendientes.')) + '</p></div>';
    if (n && !fin) {
      var c = estado.cola[estado.idx];
      if (!estado.volteada) {
        html += '<div class="tarjeta tarjeta-frente"><span class="etiqueta">Pregunta</span><p>' + esc(c.q) + '</p><span style="font-size:13px;color:#CFCFCF">Piensa tu respuesta y voltea.</span></div>' +
          '<button type="button" class="boton boton-negro" id="voltear">Voltear tarjeta</button>';
      } else {
        html += '<div class="tarjeta tarjeta-reverso"><span class="etiqueta">Respuesta</span><p>' + esc(c.a) + '</p><span style="font-size:13px;color:#555">¿La tenías?</span></div>' +
          '<div class="dos-botones"><button type="button" class="boton boton-borde" id="manana">Repasar mañana</button><button type="button" class="boton boton-acento" id="sabia">Lo sabía</button></div>';
      }
    } else {
      html += '<div class="tarjeta tarjeta-fin"><p class="grande">listo por hoy.</p><p>' +
        (n ? 'Sabías ' + estado.sabidas + ' de ' + n + '. Las que fallaste vuelven mañana.' : 'Vuelve mañana: tus tarjetas aparecen cuando toca repasarlas.') + '</p></div>';
    }
    $('repaso').innerHTML = html;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) { return; }
    if (t.id === 'voltear') { estado.volteada = true; estado.animo = 'wow'; pintarRepaso(); }
    else if (t.id === 'sabia') { t.disabled = true; calificar(true); }
    else if (t.id === 'manana') { t.disabled = true; calificar(false); }
    else if (t.id === 'mascota') {
      var i = MASCOTAS.indexOf(estado.mascota);
      estado.mascota = MASCOTAS[(i + 1) % MASCOTAS.length];
      guardar('alanews.mascota', estado.mascota);
      pintarRepaso();
    }
  });

  // ---------- historias ----------
  function pintarHistorias() {
    var hs = (estado.edicion.historias || []).map(function (h, i) { h._i = i; return h; })
      .filter(function (h) { return estado.tema === 'todo' || h.tema === estado.tema; });
    $('contador-historias').textContent = hs.length === 1 ? '1 historia' : hs.length + ' historias';
    $('historias').innerHTML = hs.map(function (h) {
      var t = TEMAS[h.tema] || TEMAS.inmo;
      var dibujo = (PREVIEW[h.visual] || '').split('COLOR').join(t.color);
      return '<button type="button" class="historia" data-historia="' + h._i + '">' +
        '<span class="historia-meta etiqueta"><span class="numero">#' + String(h._i + 1).padStart(3, '0') + '</span>' +
        '<span class="tema-dot"><span class="punto" style="width:10px;height:10px;border-radius:50%;background:' + t.color + '"></span>' + esc(t.label) + '</span></span>' +
        '<span class="marco" style="background:' + t.color + '"><span class="marco-interior">' + svg(dibujo, '0 0 300 210') + '</span></span>' +
        '<h3>' + esc(h.titulo) + '</h3><p>' + esc(h.bajada) + '</p></button>';
    }).join('') || '<p class="vacio">No hay historias de este tema hoy.</p>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-historia]');
    if (!b) { return; }
    var h = estado.edicion.historias[+b.getAttribute('data-historia')];
    var t = TEMAS[h.tema] || TEMAS.inmo;
    $('historia-cuerpo').innerHTML =
      '<span class="etiqueta" style="color:' + (h.tema === 'mundo' ? '#8A5A00' : t.color) + '">' + esc(t.label) + '</span>' +
      '<h2 id="historia-titulo">' + esc(h.titulo) + '</h2>' +
      '<p><strong>Qué pasó:</strong> ' + esc(h.que_paso) + '</p>' +
      '<p><strong>Por qué importa:</strong> ' + esc(h.por_que_importa) + '</p>' +
      '<p><strong>Para conversar:</strong> ' + esc(h.para_conversar) + '</p>' +
      (h.fuente ? '<p><a href="' + esc(h.fuente) + '" target="_blank" rel="noopener">Leer la fuente</a></p>' : '') +
      '<div class="acciones"><button type="button" class="boton boton-negro" id="cerrar-historia">Cerrar</button></div>';
    var d = $('historia');
    if (d.showModal) { d.showModal(); } else { d.setAttribute('open', ''); }
  });
  document.addEventListener('click', function (e) {
    if (e.target.id === 'cerrar-historia' || e.target.id === 'historia') { $('historia').close ? $('historia').close() : $('historia').removeAttribute('open'); }
  });

  // ---------- cuaderno ----------
  function pintarCuaderno() {
    $('ciclo').innerHTML = svg(SVG.diagrama, '0 -52 540 452', '', 'Cómo funciona: anotas de noche, el agente investiga a las 6 a.m. y mañana aprendes');
    pintarTipos();
    pintarNotas();
    var ed = estado.edicion;
    $('respuestas').innerHTML = (ed.respuestas || []).map(function (r) {
      var tipo = TIPOS.filter(function (x) { return x.id === r.tipo; })[0] || TIPOS[1];
      var sello = r.tipo === 'mas' ? 'Quieres más de esto' : (r.tipo === 'investiga' ? 'Lo investigamos' : 'Tu pregunta');
      var esCombo = r.ilustracion === 'combo_agente_edificio';
      return '<article class="caja respuesta"><div class="respuesta-texto">' +
        '<span class="sello" style="background:' + tipo.color + ';color:' + tipo.fg + '">' + sello + '</span>' +
        '<p class="cita">“' + esc(r.nota) + '”</p><p style="margin:0">' + esc(r.respuesta) + '</p>' +
        (r.extra ? '<span class="etiqueta" style="color:var(--morado)">' + esc(r.extra) + '</span>' : '') +
        '</div><div class="respuesta-dibujo">' + svg(SVG[r.ilustracion], esCombo ? '0 0 260 150' : '0 0 120 120', 'ala-float') + '</div></article>';
    }).join('');
    pintarCuriosidades(ed.curiosidades || []);
  }

  function pintarTipos() {
    $('tipos').innerHTML = TIPOS.map(function (t) {
      var on = estado.tipo === t.id;
      return '<button type="button" class="tipo" data-tipo="' + t.id + '" aria-pressed="' + on + '" style="--c:' + t.color + ';--fg:' + t.fg + '">' +
        svg(SVG[t.dibujo], '0 0 120 120') + esc(t.label) + '</button>';
    }).join('');
  }

  function pintarNotas() {
    var notas = leer('alanews.notas', []);
    $('contador-notas').textContent = notas.length === 1 ? '1 nota' : notas.length + ' notas';
    $('badge-cuaderno').textContent = notas.length || '+';
    $('lista-notas').innerHTML = notas.length ? notas.map(function (n, i) {
      var t = TIPOS.filter(function (x) { return x.id === n.tipo; })[0] || TIPOS[0];
      return '<div class="nota-item"><div><span class="etiqueta" style="color:' + t.texto + '">' + esc(t.label) + '</span><span>' + esc(n.texto) + '</span></div>' +
        '<button type="button" class="borrar" data-borrar="' + i + '" aria-label="Borrar nota">×</button></div>';
    }).join('') : '<p class="vacio">Todavía no dejaste notas. Lo que anotes, mañana vuelve explicado.</p>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tipo]');
    if (b) { estado.tipo = b.getAttribute('data-tipo'); pintarTipos(); return; }
    var del = e.target.closest('[data-borrar]');
    if (del) {
      var notas = leer('alanews.notas', []);
      notas.splice(+del.getAttribute('data-borrar'), 1);
      guardar('alanews.notas', notas); pintarNotas(); return;
    }
    if (e.target.id === 'guardar-nota') {
      var txt = $('nota-texto').value.trim();
      if (!txt) { $('nota-texto').focus(); return; }
      var lista = leer('alanews.notas', []);
      lista.push({ tipo: estado.tipo, texto: txt, fecha: hoyISO() });
      guardar('alanews.notas', lista);
      $('nota-texto').value = '';
      pintarNotas(); return;
    }
    if (e.target.id === 'copiar-notas') {
      var ns = leer('alanews.notas', []);
      if (!ns.length) { $('ayuda-copiar').textContent = 'Primero deja alguna nota.'; return; }
      var texto = 'Mis notas de Alanews para investigar:\n' + ns.map(function (n) {
        var t = TIPOS.filter(function (x) { return x.id === n.tipo; })[0] || TIPOS[0];
        return '- [' + t.label + '] ' + n.texto;
      }).join('\n');
      var ok = function () { $('ayuda-copiar').textContent = '¡Copiado! Pégalo en tu chat con Claude.'; };
      if (navigator.clipboard) { navigator.clipboard.writeText(texto).then(ok, function () { $('ayuda-copiar').textContent = texto; }); }
      else { $('ayuda-copiar').textContent = texto; }
    }
  });

  function pintarCuriosidades(lista) {
    if (!lista.length) { $('curiosidades').innerHTML = '<p class="vacio">Aquí aparecerán los temas que más anotas.</p>'; return; }
    var max = Math.max.apply(null, lista.map(function (c) { return c.n; }));
    var x = 20, out = '';
    lista.slice(0, 6).forEach(function (c, i) {
      var t = TEMAS[c.tema] || TEMAS.inmo;
      var r = 34 + 76 * Math.sqrt(c.n / max);
      x += r;
      var y = 170 + (i % 2 ? -36 : 30);
      out += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + t.color + '" stroke="#111111" stroke-width="3"></circle>' +
        '<text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="' + Math.max(15, r / 3.6) + '" fill="' + t.fg + '">' + esc(c.texto) + '</text>' +
        '<text x="' + x + '" y="' + (y + r * 0.45 + 6) + '" text-anchor="middle" font-family="Space Mono, monospace" font-weight="700" font-size="12" fill="' + t.fg + '">×' + c.n + '</text>';
      x += r + 14;
    });
    $('curiosidades').innerHTML = svg(out, '0 0 ' + Math.ceil(x + 10) + ' 340', '', 'Temas que más anotaste este mes (ejemplo)');
  }

  // ---------- archivo ----------
  function pintarArchivo(eds) {
    $('lista-archivo').innerHTML = eds.map(function (e, i) {
      return '<a class="edicion-link" href="#"><span class="etiqueta">#' + esc(e.numero) + ' · ' + esc(e.dia) + ' ' + esc(e.fecha_corta) + '</span>' +
        '<span class="titular-archivo">' + esc(e.titular) + '</span>' + (i === 0 ? '<span class="etiqueta" style="color:var(--acento-texto)">Hoy</span>' : '') + '</a>';
    }).join('') + '<div class="proximas">Aquí aparecerán las próximas ediciones, día por día.</div>';
  }

  // ---------- pestañas del celular ----------
  function irA(tab) {
    document.body.setAttribute('data-tab', tab);
    Array.prototype.forEach.call(document.querySelectorAll('.barra-inferior button'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-ir') === tab));
    });
    if (window.matchMedia('(max-width: 899px)').matches) { window.scrollTo(0, 0); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (b) { irA(b.getAttribute('data-ir')); return; }
    var a = e.target.closest('[data-ir-a]');
    if (a && window.matchMedia('(max-width: 899px)').matches) { e.preventDefault(); irA(a.getAttribute('data-ir-a')); }
  });

  cargar();
})();
