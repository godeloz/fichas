/* Fichas · Explorar: la copia de solo lectura del Moodboard, y el detalle de una card */
(function () {
  var F = window.F, h = F.h;
  var cache = null;          // [{id, d, m, texto}]
  var filtro = { q: '', tipo: '', proyecto: '', genero: '', estado: '', orden: 'recientes', limite: 40 };
  var scrollGuardado = 0;

  F.explorar = {
    invalidar: function () { cache = null; },
    filtro: filtro
  };

  function cargar() {
    if (cache) return Promise.resolve(cache);
    return F.db.todos('espejo').then(function (filas) {
      cache = filas.map(function (f) {
        var d = f.datos || {};
        var nombresP = (d.proyectos || []).map(function (id) { var p = F.catalogo.proyecto(id); return p ? p.nombre : ''; });
        var nombresE = (d.etiquetas || []).map(function (id) { var p = F.catalogo.etiqueta(id); return p ? p.nombre : ''; });
        var nombresG = (d.generos || []).map(function (id) { var g = F.catalogo.genero(id); return g ? g.nombre : ''; });
        var texto = F.norm([d.titulo, d.descripcion, d.autor, d.fuente, d.anio, d.fuentes, d.enlace, d.nota,
          nombresP.join(' '), nombresE.join(' '), nombresG.join(' '), (d.adjuntos || []).join(' ')].join(' \n '));
        return { id: f.id, d: d, m: f.miniatura || null, texto: texto };
      });
      return cache;
    });
  }

  function aplicar(lista) {
    var q = filtro.q.trim();
    var num = /^(?:n\s*[º°o.]?\s*|#)\s*(\d+)$/i.exec(q);
    var res = lista.filter(function (c) {
      var d = c.d;
      if (num) return d.num === +num[1] && F.catalogo.esIdea(d.tipo);
      if (filtro.tipo && d.tipo !== filtro.tipo) return false;
      if (filtro.proyecto && (d.proyectos || []).indexOf(filtro.proyecto) < 0) return false;
      if (filtro.genero && (d.generos || []).indexOf(filtro.genero) < 0) return false;
      if (filtro.estado && d.estado !== filtro.estado) return false;
      if (q) {
        var partes = F.norm(q).split(/\s+/);
        for (var i = 0; i < partes.length; i++) if (c.texto.indexOf(partes[i]) < 0) return false;
      }
      return true;
    });
    var clave = function (c) { return c.d.creadaEn || (c.d.creada ? Date.parse(c.d.creada) : 0) || 0; };
    if (filtro.orden === 'numero') res.sort(function (a, b) { return (a.d.num || 1e9) - (b.d.num || 1e9) || clave(b) - clave(a); });
    else if (filtro.orden === 'antiguas') res.sort(function (a, b) { return clave(a) - clave(b); });
    else res.sort(function (a, b) { return clave(b) - clave(a); });
    return res;
  }

  // Una card en la cuadrícula
  F.cardMini = function (c) {
    var d = c.d;
    var esIdea = F.catalogo.esIdea(d.tipo);
    var estadoTxt = F.catalogo.estadoVisible(d.estado) ? F.catalogo.estado(d.estado) : null;
    var proyectos = (d.proyectos || []).map(function (id) { var p = F.catalogo.proyecto(id); return p && p.nombre; }).filter(Boolean);
    return h('a.card-mini', { href: '#/card/' + encodeURIComponent(c.id), style: { background: F.fondoCard(d.tipo, d.generos) } },
      c.m ? h('img.card-mini-img', { src: c.m, alt: '', loading: 'lazy' }) : null,
      h('div.card-mini-cuerpo',
        esIdea && d.num ? h('span.num-tab', 'Nº ' + d.num) : null,
        h('div.card-mini-tipo', F.lineaTipo(d.tipo, d.generos)),
        h('div.card-mini-titulo', d.titulo || (d.enlace ? d.enlace.replace(/^https?:\/\/(www\.)?/, '') : 'Sin título')),
        (!c.m && d.descripcion) ? h('div.card-mini-texto', d.descripcion.slice(0, 160)) : null,
        proyectos.length ? h('div.chips.mini', proyectos.slice(0, 2).map(function (n) { return h('span.chip-blanco', n); })) : null,
        estadoTxt ? h('div.card-mini-estado', h('span.punto', { style: { background: estadoTxt.color, borderColor: estadoTxt.color } }), estadoTxt.nombre) : null
      )
    );
  };

  F.vistaExplorar = function (raiz) {
    var vista = { salir: function () { scrollGuardado = window.scrollY; return Promise.resolve(true); } };
    var cuenta = h('span.cuenta');
    var rejilla = h('div.rejilla');
    var masBtn = h('button.btn-secundario.ver-mas', { type: 'button', onclick: function () { filtro.limite += 40; pintarLista(); } }, 'Ver más');
    var aviso = h('p.vacio');
    var todas = [];

    var buscar = h('input', { type: 'search', placeholder: 'Buscar, o «nº 16»', 'aria-label': 'Buscar en el Moodboard', value: filtro.q, autocomplete: 'off', enterkeyhint: 'search',
      oninput: function (e) { filtro.q = e.target.value; filtro.limite = 40; pintarLista(); } });

    function selector(etiqueta, clave, opciones) {
      var s = h('select.filtro', { 'aria-label': etiqueta, onchange: function (e) { filtro[clave] = e.target.value; filtro.limite = 40; pintarLista(); s.classList.toggle('activo', !!e.target.value); } },
        h('option', { value: '' }, etiqueta),
        opciones.map(function (o) { return h('option', { value: o.id }, o.nombre); }));
      s.value = filtro[clave] || '';
      s.classList.toggle('activo', !!filtro[clave]);
      return s;
    }
    var orden = h('select.filtro', { 'aria-label': 'Orden', onchange: function (e) { filtro.orden = e.target.value; pintarLista(); } },
      h('option', { value: 'recientes' }, 'Más recientes'), h('option', { value: 'antiguas' }, 'Más antiguas'), h('option', { value: 'numero' }, 'Por número'));
    orden.value = filtro.orden;

    var tiposFila = h('div.tipos-filtro', { role: 'group', 'aria-label': 'Tipo de card' });
    function pintarTipos() {
      F.vaciar(tiposFila);
      var cuentas = {}; todas.forEach(function (c) { cuentas[c.d.tipo] = (cuentas[c.d.tipo] || 0) + 1; });
      function boton(id, nombre, color) {
        var act = filtro.tipo === id;
        return h('button.pildora' + (act ? '.activa' : ''), { type: 'button', 'aria-pressed': act ? 'true' : 'false',
          style: color && !act ? { background: color } : null,
          onclick: function () { filtro.tipo = act ? '' : id; filtro.limite = 40; pintarTipos(); pintarLista(); } }, nombre);
      }
      tiposFila.appendChild(boton('', 'Todas'));
      F.catalogo.tipos().forEach(function (t) { if (cuentas[t.id]) tiposFila.appendChild(boton(t.id, t.nombre + ' ' + cuentas[t.id], t.color)); });
    }

    function pintarLista() {
      var res = aplicar(todas);
      cuenta.textContent = res.length === todas.length ? todas.length + ' cards' : res.length + ' de ' + todas.length;
      F.vaciar(rejilla);
      var col1 = h('div.columna'), col2 = h('div.columna');
      res.slice(0, filtro.limite).forEach(function (c, i) { (i % 2 ? col2 : col1).appendChild(F.cardMini(c)); });
      rejilla.appendChild(col1); rejilla.appendChild(col2);
      masBtn.style.display = res.length > filtro.limite ? '' : 'none';
      aviso.textContent = res.length ? '' : (todas.length ? 'Nada coincide con la búsqueda.' : '');
    }

    var estadoCopia = h('span.subtitulo', F.icono('candado', 13, { grosor: 2.2 }), 'Solo lectura');
    F.agregar(raiz, [
      h('div.pagina.explorar',
        h('header.cabeza',
          h('div', estadoCopia, h('h1', 'Explorar')),
          cuenta),
        h('label.buscador', F.icono('buscar', 18), buscar),
        tiposFila,
        h('div.filtros',
          selector('Proyecto', 'proyecto', F.catalogo.proyectos()),
          selector('Género', 'genero', F.catalogo.generos()),
          selector('Estado', 'estado', F.catalogo.estados()),
          orden),
        aviso,
        rejilla,
        masBtn
      ),
      F.barra('explorar')
    ]);

    Promise.all([cargar(), F.db.meta('espejoSync')]).then(function (r) {
      todas = r[0];
      if (r[1]) { F.vaciar(estadoCopia); F.agregar(estadoCopia, [F.icono('candado', 13, { grosor: 2.2 }), 'Solo lectura · copia ' + F.cuando(r[1]).replace(/^Hoy, /, 'de hoy, ').toLowerCase()]); }
      if (!todas.length) {
        aviso.textContent = F.estadoNube.sesion
          ? 'Todavía no hay copia del Moodboard. Aparece cuando el Moodboard sincronice (o con la semilla inicial).'
          : 'Entra con tu usuario en Ajustes para ver el Moodboard.';
      }
      pintarTipos(); pintarLista();
      if (scrollGuardado) { window.scrollTo(0, scrollGuardado); }
    });
    return vista;
  };

  // ── Detalle (solo lectura) ─────────────────────────────────────────
  // v = {tipo, titulo, descripcion, autor, fuente, anio, enlace, num, creada, generos, estado,
  //      fuentes, nota, favorita, proyectos:[nombres], etiquetas:[nombres], adjuntos:[nombres], imagen}
  F.detalle = function (raiz, v, o) {
    o = o || {};
    var esIdea = F.catalogo.esIdea(v.tipo);
    var est = F.catalogo.estado(v.estado);
    var img = h('img.detalle-img', { alt: '' });
    if (v.imagen) img.src = v.imagen;
    F.agregar(raiz, [
      h('header.banda.detalle', { style: { background: F.fondoCard(v.tipo, v.generos) } },
        h('div.banda-fila',
          h('a.btn-redondo.claro', { href: o.volver || '#/explorar', 'aria-label': 'Volver' }, F.icono('atras', 18, { grosor: 2.2 })),
          h('span.sello', F.icono('candado', 13, { grosor: 2.2 }), o.sello || 'Solo lectura')),
        h('div.banda-linea',
          esIdea && v.num ? h('span.num-tab.grande', 'Nº ' + v.num) : null,
          h('span.linea-tipo', F.lineaTipo(v.tipo, v.generos)),
          v.favorita ? h('span.fav', { 'aria-label': 'Favorita' }, F.icono('estrella', 16, { relleno: true })) : null),
        h('h1.detalle-titulo', v.titulo || 'Sin título')
      ),
      h('main.detalle-cuerpo',
        v.imagen ? img : null,
        v.descripcion ? h('p.detalle-texto', F.conEnlaces(v.descripcion)) : null,
        (v.proyectos.length || v.etiquetas.length) ? h('div.chips',
          v.proyectos.map(function (n) { return h('span.chip-nombre.oscuro', n); }),
          v.etiquetas.map(function (n) { return h('span.chip-nombre', n); })) : null,
        h('div.fila-campos',
          h('div.caja-dato', h('span.rotulo', 'Estado'), h('span.valor', est ? h('span.punto', { style: { background: est.color, borderColor: est.color } }) : null, est ? est.nombre : 'Sin estado')),
          h('div.caja-dato', h('span.rotulo', 'Creada'), h('span.valor', v.creada ? F.fechaCorta(v.creada) : '—'))),
        v.enlace ? h('a.caja-dato.enlace', { href: v.enlace, target: '_blank', rel: 'noopener noreferrer' }, h('span.rotulo', 'Enlace'), h('span.valor', F.icono('enlace', 16), v.enlace.replace(/^https?:\/\/(www\.)?/, ''))) : null,
        (v.autor || v.fuente || v.anio) ? h('div.caja-dato', h('span.rotulo', 'Autor · fuente · año'), h('span.valor', [v.autor, v.fuente, v.anio].filter(Boolean).join(' · '))) : null,
        v.fuentes ? h('div.caja-dato', h('span.rotulo', 'Fuentes y referentes'), h('span.valor.largo', F.conEnlaces(v.fuentes))) : null,
        v.adjuntos && v.adjuntos.length ? h('div.caja-dato', h('span.rotulo', 'Adjuntos (se abren en el Moodboard)'), h('span.valor.largo', v.adjuntos.join(' · '))) : null,
        v.nota ? h('div.caja-dato.nota', h('span.rotulo', 'Nota propia'), h('span.valor.largo', F.conEnlaces(v.nota))) : null
      ),
      h('footer.pie-guardar',
        o.accion || null,
        h('span.pista', o.pista || 'Para cambiar esta card, ábrela en el Moodboard'))
    ]);
  };

  F.vistaCard = function (raiz, id) {
    cargar().then(function (lista) {
      var c = lista.find(function (x) { return x.id === id; });
      if (!c) { F.aviso('Esa card no está en la copia.'); location.hash = '#/explorar'; return; }
      var d = c.d;
      var proyectos = (d.proyectos || []).map(function (i) { var p = F.catalogo.proyecto(i); return p && p.nombre; }).filter(Boolean);
      F.detalle(raiz, {
        tipo: d.tipo, titulo: d.titulo, descripcion: d.descripcion, autor: d.autor, fuente: d.fuente, anio: d.anio, enlace: d.enlace,
        num: d.num, creada: d.creada, generos: d.generos || [], estado: d.estado, fuentes: d.fuentes, nota: d.nota, favorita: d.favorita,
        proyectos: proyectos,
        etiquetas: (d.etiquetas || []).map(function (i) { var p = F.catalogo.etiqueta(i); return p && p.nombre; }).filter(Boolean),
        adjuntos: d.adjuntos || [], imagen: c.m
      }, {
        accion: h('button.btn-principal.grande', { type: 'button', onclick: function () {
          F.elegirTipo(null, proyectos[0] ? '&proyecto=' + encodeURIComponent(proyectos[0]) : '');
        } }, F.icono('mas', 18, { grosor: 2.4 }), proyectos[0] ? 'Nueva card en este proyecto' : 'Nueva card')
      });
    });
    return {};
  };

  // Una card del teléfono que ya llegó al Moodboard
  F.vistaLocal = function (raiz, id) {
    F.db.uno('cards', id).then(function (c) {
      if (!c) { location.hash = '#/'; return; }
      var v = {
        tipo: c.tipo, titulo: c.titulo, descripcion: c.descripcion, autor: c.autor, fuente: c.fuente, anio: c.anio, enlace: c.enlace,
        num: c.num, creada: c.creada, generos: c.generos || [], estado: c.estado, fuentes: c.fuentes, nota: c.nota, favorita: c.favorita,
        proyectos: c.proyectos || [], etiquetas: c.etiquetas || [], adjuntos: (c.archivos || []).map(function (a) { return a.nombre; }), imagen: null
      };
      var pintar = function () {
        F.detalle(raiz, v, { volver: '#/', sello: 'En el Moodboard', pista: 'Llegó al Moodboard ' + F.cuando(c.importadaEn).toLowerCase() + '. Para cambiarla, ábrela allá.' });
      };
      if (c.portada && c.portada.blobId) F.urlDeBlob(c.portada.blobId).then(function (u) { v.imagen = u; pintar(); });
      else pintar();
    });
    return {};
  };
})();
