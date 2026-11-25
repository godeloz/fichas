/* Fichas · piezas comunes: catálogo, colores, hojas y la barra de abajo */
(function () {
  var F = window.F, h = F.h;

  // ── Catálogo (lo sube el Moodboard; esto es solo el respaldo inicial) ──
  var BASE = {
    version: 1, origen: 'base',
    tipos: [
      { id: 'idea', nombre: 'Idea', color: '#9FE3F5', kind: 'idea' },
      { id: 'enlace', nombre: 'Enlace', color: '#8EC5FF', kind: 'link' },
      { id: 'bibliografia', nombre: 'Bibliografía', color: '#FFB37A', kind: 'biblio' },
      { id: 'video', nombre: 'Video', color: '#FF9A8B', kind: 'video' },
      { id: 'imagen', nombre: 'Imagen', color: '#C9A7FF', kind: 'image' },
      { id: 'cita', nombre: 'Cita', color: '#7EE0D0', kind: 'quote' },
      { id: 'dato', nombre: 'Dato', color: '#D9F08F', kind: 'data' },
      { id: 'nota', nombre: 'Nota personal', color: '#FFD86B', kind: 'note' },
      { id: 'apunte', nombre: 'Apunte', color: '#FFB3D9', kind: 'note' }
    ],
    generos: [
      { id: 'g-cuento', nombre: 'Cuento', color: '#9CC9FF' }, { id: 'g-novela', nombre: 'Novela', color: '#E6C18F' },
      { id: 'g-ensayo', nombre: 'Ensayo', color: '#FFAE70' }, { id: 'g-poesia', nombre: 'Poesía', color: '#C3B5F5' },
      { id: 'g-cronica', nombre: 'Crónica', color: '#F7A6C8' }, { id: 'g-apunte', nombre: 'Apunte', color: '#B9E4A0' },
      { id: 'g-hibrido', nombre: 'Híbrido', color: '#FF8F8F' }
    ],
    estados: [
      { id: 'sin-empezar', nombre: 'Sin empezar', color: '#8B5CF6' },
      { id: 'en-curso', nombre: 'En curso', color: '#2F7BEA' },
      { id: 'terminado', nombre: 'Terminado', color: '#12A594' }
    ],
    proyectos: [], etiquetas: []
  };
  var cat = BASE;

  F.catalogo = {
    cargar: function () { return F.db.meta('catalogo').then(function (c) { if (c && c.tipos) cat = c; return cat; }); },
    poner: function (c) { if (c && c.tipos) cat = c; },
    datos: function () { return cat; },
    tipos: function () {
      // Idea primero, el resto en el orden del Moodboard
      var t = cat.tipos.slice();
      t.sort(function (a, b) { return (b.kind === 'idea') - (a.kind === 'idea'); });
      return t;
    },
    tipo: function (id) { return cat.tipos.find(function (t) { return t.id === id; }) || { id: id, nombre: id || 'Card', color: '#E3E6EC', kind: 'note' }; },
    tipoIdea: function () { return cat.tipos.find(function (t) { return t.kind === 'idea'; }) || BASE.tipos[0]; },
    tipoPorNombre: function (n) { return cat.tipos.find(function (t) { return F.norm(t.nombre) === F.norm(n); }); },
    tipoPorKind: function (k) { return cat.tipos.find(function (t) { return t.kind === k; }); },
    esIdea: function (tipoId) { return F.catalogo.tipo(tipoId).kind === 'idea'; },
    generos: function () { return cat.generos || []; },
    genero: function (id) { return (cat.generos || []).find(function (g) { return g.id === id; }); },
    estados: function () { return cat.estados || []; },
    estado: function (id) { return (cat.estados || []).find(function (s) { return s.id === id; }); },
    estadoInicial: function () { return (cat.estados && cat.estados[0] && cat.estados[0].id) || null; },
    // el primero es el de partida y no se muestra en la card
    estadoVisible: function (id) { return !!id && cat.estados && cat.estados.length && cat.estados[0].id !== id && !!F.catalogo.estado(id); },
    proyectos: function () { return (cat.proyectos || []).slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }); },
    proyecto: function (id) { return (cat.proyectos || []).find(function (p) { return p.id === id; }); },
    etiquetas: function () { return (cat.etiquetas || []).slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }); },
    etiqueta: function (id) { return (cat.etiquetas || []).find(function (p) { return p.id === id; }); }
  };

  // Color de una card: el del tipo; con un género, el del género; con varios, degradado
  F.fondoCard = function (tipoId, generos) {
    var cols = (generos || []).map(function (g) { var x = F.catalogo.genero(g); return x && x.color; }).filter(Boolean);
    if (cols.length > 1) return 'linear-gradient(135deg, ' + cols.join(', ') + ')';
    if (cols.length === 1) return cols[0];
    return F.catalogo.tipo(tipoId).color;
  };
  F.lineaTipo = function (tipoId, generos) {
    return [F.catalogo.tipo(tipoId).nombre].concat((generos || []).map(function (g) {
      var x = F.catalogo.genero(g); return x ? x.nombre : null;
    }).filter(Boolean)).join(' · ');
  };

  // ── Hojas que suben desde abajo ─────────────────────────────────────
  F.hoja = function (titulo, contenido, opciones) {
    opciones = opciones || {};
    var capa = document.getElementById('capa');
    var cerrar = function () {
      fondo.classList.remove('abierta');
      document.removeEventListener('keydown', esc);
      setTimeout(function () { if (fondo.parentNode) fondo.parentNode.removeChild(fondo); }, 200);
      if (opciones.alCerrar) opciones.alCerrar();
    };
    var esc = function (e) { if (e.key === 'Escape') cerrar(); };
    var accion = opciones.accion || h('button.btn-redondo', { 'aria-label': 'Cerrar', onclick: cerrar }, F.icono('x', 18));
    var hoja = h('div.hoja', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div.hoja-asa'),
      h('div.hoja-cabeza', h('h2', titulo), accion),
      h('div.hoja-cuerpo', contenido)
    );
    var fondo = h('div.hoja-fondo', { onclick: function (e) { if (e.target === fondo) cerrar(); } }, hoja);
    capa.appendChild(fondo);
    document.addEventListener('keydown', esc);
    requestAnimationFrame(function () { fondo.classList.add('abierta'); });
    return { cerrar: cerrar, el: hoja };
  };

  // Pregunta sí/no con botones propios
  F.confirmar = function (titulo, texto, si, no) {
    return new Promise(function (ok) {
      var listo = false;
      var fin = function (v) { if (listo) return; listo = true; ok(v); hj.cerrar(); };
      var hj = F.hoja(titulo, h('div.confirmar',
        h('p', texto),
        h('div.confirmar-botones',
          h('button.btn-secundario', { onclick: function () { fin(false); } }, no || 'Cancelar'),
          h('button.btn-principal', { onclick: function () { fin(true); } }, si || 'Sí')
        )
      ), { alCerrar: function () { if (!listo) { listo = true; ok(false); } } });
    });
  };

  // ── Barra de abajo ──────────────────────────────────────────────────
  F.barra = function (activa) {
    function item(ruta, icono, texto, id) {
      return h('a.barra-item' + (activa === id ? '.activa' : ''), { href: ruta, 'aria-current': activa === id ? 'page' : null },
        F.icono(icono, 22, { grosor: 1.9 }), h('span', texto));
    }
    return h('nav.barra', { 'aria-label': 'Secciones' },
      item('#/', 'bandeja', 'Bandeja', 'bandeja'),
      h('button.barra-mas', { 'aria-label': 'Nueva card', onclick: function () { F.elegirTipo(); } }, F.icono('mas', 26, { grosor: 2.2 })),
      item('#/explorar', 'explorar', 'Explorar', 'explorar')
    );
  };

  // ── Elegir tipo de card ─────────────────────────────────────────────
  F.elegirTipo = function (alElegir, extra) {
    var idea = F.catalogo.tipoIdea();
    var otros = F.catalogo.tipos().filter(function (t) { return t.id !== idea.id; });
    var hj;
    var elegir = function (t) {
      hj.cerrar();
      if (alElegir) alElegir(t.id);
      else location.hash = '#/anotar/nueva?tipo=' + encodeURIComponent(t.id) + (extra || '');
    };
    hj = F.hoja('¿Qué vas a anotar?', [
      h('button.tipo-idea', { style: { background: idea.color }, onclick: function () { elegir(idea); } },
        h('span.tipo-idea-icono', F.icono('bombillo', 24, { grosor: 1.9 })),
        h('span.tipo-idea-texto', h('strong', idea.nombre), h('span', 'Lleva número de ficha al llegar al Moodboard')),
        h('span.num-tab', 'Nº')
      ),
      h('div.etiqueta-seccion', 'Otros tipos'),
      h('div.tipos-rejilla', otros.map(function (t) {
        return h('button.tipo-boton', { style: { background: t.color }, onclick: function () { elegir(t); } }, t.nombre);
      })),
      alElegir ? null : h('div.consejo', F.icono('compartir', 20, { grosor: 1.8 }),
        h('span', 'Desde YouTube, TikTok o el navegador, ', h('b', 'Compartir › Fichas'), ' abre una card con el enlace ya puesto.'))
    ]);
  };
})();
