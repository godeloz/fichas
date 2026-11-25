/* Fichas · anotar o corregir una card (mismo formulario del Moodboard, en una columna) */
(function () {
  var F = window.F, h = F.h;

  function nuevaCard(opc) {
    var tipo = opc.tipo && F.catalogo.tipo(opc.tipo) ? opc.tipo : F.catalogo.tipoIdea().id;
    return {
      id: F.uuid(), tipo: tipo,
      titulo: opc.titulo || '', descripcion: opc.descripcion || '', autor: '', fuente: '', anio: '',
      enlace: opc.enlace || '', fuentes: '', nota: '', favorita: false,
      creada: F.hoyISO(), creadaEn: new Date().toISOString(),
      generos: [], estado: F.catalogo.estadoInicial(),
      proyectos: opc.proyecto ? [opc.proyecto] : [], etiquetas: [],
      portada: null, archivos: [], rutasPorBorrar: [],
      envio: 'pendiente', sucio: true, compartida: !!opc.compartida
    };
  }

  function textoGuia(kind) {
    if (kind === 'idea') return 'La idea, como se te ocurrió';
    if (kind === 'quote') return 'Lo que quieres recordar';
    if (kind === 'data') return 'Contexto, cómo se midió, qué falta verificar';
    return 'De qué trata y por qué te sirve';
  }

  function crecer(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 520) + 'px'; }

  F.vistaAnotar = function (raiz, opc) {
    var card, inicial, nuevosBlobs = [], blobsPorBorrar = [], guardado = false;
    var cargar = opc.id && opc.id !== 'nueva'
      ? F.db.uno('cards', opc.id)
      : Promise.resolve(null);

    var vista = {
      salir: function () {
        if (guardado || !card) return Promise.resolve(true);
        if (JSON.stringify(recoger()) === inicial) { limpiarNuevos(); return Promise.resolve(true); }
        return F.confirmar('¿Salir sin guardar?', 'Lo que escribiste en esta card se pierde.', 'Salir sin guardar', 'Seguir escribiendo')
          .then(function (si) { if (si) limpiarNuevos(); return si; });
      }
    };

    function limpiarNuevos() { nuevosBlobs.forEach(function (id) { F.blobs.borrar(id); }); nuevosBlobs = []; }

    cargar.then(function (c) {
      if (opc.id && opc.id !== 'nueva' && !c) { F.aviso('Esa card ya no está en el teléfono.'); location.hash = '#/'; return; }
      if (c && c.envio === 'importada') { location.hash = '#/vista/' + c.id; return; }
      card = c || nuevaCard(opc);
      card.rutasPorBorrar = card.rutasPorBorrar || [];
      inicial = JSON.stringify(card);
      pintar();
    });

    function recoger() { return card; }

    function pintar() {
      F.vaciar(raiz);
      var tipo = F.catalogo.tipo(card.tipo);
      var kind = tipo.kind;
      var esIdea = kind === 'idea';
      var enlaceArriba = kind === 'link' || kind === 'video' || !!card.compartida;

      // ── Franja de color ──
      var lineaTipo = h('span.linea-tipo', F.lineaTipo(card.tipo, card.generos));
      var banda = h('header.banda', { style: { background: F.fondoCard(card.tipo, card.generos) } },
        h('div.banda-fila',
          h('a.btn-redondo.claro', { 'aria-label': 'Cerrar', href: '#/' }, F.icono('x', 18)),
          h('div.banda-acciones',
            h('button.btn-redondo.claro' + (card.favorita ? '.activo' : ''), {
              'aria-label': card.favorita ? 'Quitar de favoritas' : 'Marcar favorita', 'aria-pressed': card.favorita ? 'true' : 'false',
              onclick: function (e) { card.favorita = !card.favorita; e.currentTarget.classList.toggle('activo', card.favorita); e.currentTarget.setAttribute('aria-pressed', card.favorita ? 'true' : 'false'); }
            }, F.icono('estrella', 20, { grosor: 1.9 })),
            h('button.pildora-tipo', { onclick: function () {
              F.elegirTipo(function (nuevo) {
                card.tipo = nuevo;
                if (!F.catalogo.esIdea(nuevo)) { /* el número solo existe para las Ideas */ }
                pintar();
              });
            } }, tipo.nombre, F.icono('abajo', 16, { grosor: 2.2 }))
          )
        ),
        h('div.banda-linea',
          esIdea ? h('span.num-tab.grande', card.num ? 'Nº ' + card.num : 'Nº nueva') : null,
          lineaTipo
        )
      );
      function repintarBanda() {
        banda.style.background = F.fondoCard(card.tipo, card.generos);
        lineaTipo.textContent = F.lineaTipo(card.tipo, card.generos);
      }

      // ── Campos ──
      function campoTexto(etiqueta, clave, opciones) {
        opciones = opciones || {};
        var id = 'f-' + clave;
        var control = opciones.area
          ? h('textarea', { id: id, rows: opciones.filas || 3, placeholder: opciones.guia || '', value: card[clave] || '', class: opciones.clase || '',
              oninput: function (e) { card[clave] = e.target.value; crecer(e.target); } })
          : h('input', { id: id, type: opciones.tipo || 'text', inputmode: opciones.modo || null, placeholder: opciones.guia || '', value: card[clave] || '', class: opciones.clase || '',
              autocomplete: 'off', oninput: function (e) { card[clave] = e.target.value; } });
        if (opciones.area) requestAnimationFrame(function () { crecer(control); });
        return h('div.campo' + (opciones.ancho ? '.' + opciones.ancho : ''), h('label', { for: id }, etiqueta), control);
      }

      var enlace = campoTexto('Enlace', 'enlace', { tipo: 'url', modo: 'url', guia: 'https://' });

      var generos = h('div.chips');
      function pintarGeneros() {
        F.vaciar(generos);
        F.catalogo.generos().forEach(function (g) {
          var i = card.generos.indexOf(g.id);
          var b = h('button.chip-genero' + (i >= 0 ? '.marcado' : ''), {
            type: 'button', 'aria-pressed': i >= 0 ? 'true' : 'false',
            style: i >= 0 ? { background: g.color } : null,
            onclick: function () {
              if (i >= 0) card.generos.splice(i, 1); else card.generos.push(g.id);
              pintarGeneros(); repintarBanda();
            }
          }, i >= 0 ? h('span.orden', String(i + 1)) : null, g.nombre);
          generos.appendChild(b);
        });
      }
      pintarGeneros();

      var estado = h('select', { id: 'f-estado', onchange: function (e) { card.estado = e.target.value || null; pintarPunto(); } },
        h('option', { value: '' }, 'Sin estado'),
        F.catalogo.estados().map(function (s) { return h('option', { value: s.id }, s.nombre); })
      );
      estado.value = card.estado || '';
      var punto = h('span.punto');
      function pintarPunto() { var s = F.catalogo.estado(card.estado); punto.style.background = s ? s.color : 'transparent'; punto.style.borderColor = s ? s.color : '#9AA1B2'; }
      pintarPunto();

      var fecha = h('input', { id: 'f-creada', type: 'date', value: card.creada || '', onchange: function (e) { card.creada = e.target.value; } });

      function bloqueNombres(titulo, clave, catalogo, oscuro) {
        var caja = h('div.chips');
        function pintarN() {
          F.vaciar(caja);
          card[clave].forEach(function (n, i) {
            var existe = catalogo().some(function (x) { return F.norm(x.nombre) === F.norm(n); });
            caja.appendChild(h('span.chip-nombre' + (oscuro ? '.oscuro' : ''), n,
              existe ? null : h('span.marca-nueva', clave === 'proyectos' ? 'nuevo' : 'nueva'),
              h('button.quitar', { type: 'button', 'aria-label': 'Quitar ' + n, onclick: function () { card[clave].splice(i, 1); pintarN(); } }, F.icono('x', 14, { grosor: 2.4 }))
            ));
          });
          caja.appendChild(h('button.chip-agregar', { type: 'button', onclick: function () {
            F.elegirNombres({
              titulo: titulo, singular: clave === 'proyectos' ? 'Proyecto' : 'Etiqueta',
              opciones: catalogo().map(function (x) { return x.nombre; }),
              elegidos: card[clave].slice(),
              alListo: function (lista) { card[clave] = lista; pintarN(); }
            });
          } }, F.icono('mas', 14, { grosor: 2.4 }), clave === 'proyectos' ? 'Proyecto' : 'Etiqueta'));
        }
        pintarN();
        return h('div.campo', h('span.rotulo', titulo), caja);
      }

      // Portada
      var portadaCaja = h('div.portada');
      function pintarPortada() {
        F.vaciar(portadaCaja);
        if (card.portada) {
          var img = h('img', { alt: 'Portada de la card' });
          if (card.portada.blobId) F.urlDeBlob(card.portada.blobId).then(function (u) { if (u) img.src = u; });
          portadaCaja.appendChild(h('div.portada-vista', img,
            h('button.btn-redondo.claro.quitar-portada', { type: 'button', 'aria-label': 'Quitar portada', onclick: function () {
              quitarArchivo(card.portada); card.portada = null; pintarPortada();
            } }, F.icono('x', 16))));
        } else {
          portadaCaja.appendChild(h('div.dos',
            botonFoto('Tomar foto', 'camara', true, function (f) { ponerPortada(f); }),
            botonFoto('De la galería', 'galeria', false, function (f) { ponerPortada(f); })
          ));
        }
      }
      function ponerPortada(archivos) {
        procesar(archivos[0]).then(function (a) { if (!a) return; if (card.portada) quitarArchivo(card.portada); card.portada = a; pintarPortada(); });
      }
      pintarPortada();

      // Adjuntos
      var adjCaja = h('div.adjuntos-lista');
      function pintarAdjuntos() {
        F.vaciar(adjCaja);
        card.archivos.forEach(function (a, i) {
          var ext = ((/\.([a-z0-9]+)$/i.exec(a.nombre || '') || [, 'jpg'])[1]).toUpperCase();
          adjCaja.appendChild(h('div.adjunto', h('span.ext', ext), h('span.nombre', a.nombre), h('span.peso', F.tamano(a.tamano)),
            h('button.quitar', { type: 'button', 'aria-label': 'Quitar ' + a.nombre, onclick: function () { quitarArchivo(a); card.archivos.splice(i, 1); pintarAdjuntos(); } }, F.icono('x', 14, { grosor: 2.4 }))));
        });
        adjCaja.appendChild(h('div.dos',
          botonFoto('Tomar foto', 'camara', true, agregarAdjuntos, true),
          botonFoto('Adjuntar fotos', 'clip', false, agregarAdjuntos, true)
        ));
      }
      function agregarAdjuntos(archivos) {
        Array.prototype.reduce.call(archivos, function (p, f) {
          return p.then(function () { return procesar(f).then(function (a) { if (a) card.archivos.push(a); }); });
        }, Promise.resolve()).then(pintarAdjuntos);
      }
      pintarAdjuntos();

      var masAbierto = !!(card.autor || card.fuente || card.anio || card.portada || card.archivos.length || card.nota || (!enlaceArriba && card.enlace));
      var mas = h('details.mas-campos', { open: masAbierto },
        h('summary', h('span', 'Más campos'), F.icono('abajo', 18, { grosor: 2.2 })),
        h('div.mas-cuerpo',
          enlaceArriba ? null : enlace,
          h('div.fila-campos',
            campoTexto('Autor', 'autor', { ancho: 'ancho2' }),
            campoTexto('Año', 'anio', { modo: 'numeric', ancho: 'ancho1' })
          ),
          campoTexto('Fuente', 'fuente'),
          h('div.campo', h('span.rotulo', 'Portada de la card · la imagen que se ve'), portadaCaja),
          h('div.campo.adjuntos', h('div.rotulo-fila', h('span.rotulo', 'Adjuntos'), h('span.pista', 'No se ven en la card')), adjCaja),
          campoTexto('Nota propia', 'nota', { area: true, filas: 2, guia: 'Para qué te sirve, en qué capítulo la usarías', clase: 'nota' })
        )
      );

      var cuerpo = h('main.formulario',
        enlaceArriba ? enlace : null,
        campoTexto('Título', 'titulo', { clase: 'titulo' }),
        campoTexto('Descripción', 'descripcion', { area: true, filas: 4, guia: textoGuia(kind), clase: 'descripcion' }),
        h('div.campo',
          h('div.rotulo-fila', h('span.rotulo', 'Género'), h('span.pista', 'El orden en que marcas da el degradado')),
          generos),
        h('div.fila-campos',
          h('div.campo.caja', h('label', { for: 'f-estado' }, 'Estado'), h('div.con-punto', punto, estado)),
          h('div.campo.caja', h('label', { for: 'f-creada' }, 'Creada'), fecha)
        ),
        bloqueNombres('Proyectos', 'proyectos', F.catalogo.proyectos, true),
        bloqueNombres('Etiquetas', 'etiquetas', F.catalogo.etiquetas, false),
        campoTexto('Fuentes y referentes', 'fuentes', { area: true, filas: 2, guia: 'Libros, páginas, películas o conversaciones de donde viene' }),
        mas,
        (opc.id && opc.id !== 'nueva') ? h('button.btn-descartar', { type: 'button', onclick: descartar }, F.icono('basura', 18), 'Descartar esta card') : null
      );

      var pie = h('footer.pie-guardar',
        h('button.btn-principal.grande', { type: 'button', onclick: guardar }, 'Guardar'),
        h('span.pista', navigator.onLine ? 'Se envía al Moodboard en cuanto guardes' : 'Queda en el teléfono y se envía al volver la señal')
      );

      F.agregar(raiz, [banda, cuerpo, pie]);
      if (!opc.id || opc.id === 'nueva') {
        var foco = enlaceArriba && !card.enlace ? raiz.querySelector('#f-enlace') : raiz.querySelector('#f-titulo');
        if (foco && !card.titulo) setTimeout(function () { foco.focus(); }, 250);
      }
    }

    function botonFoto(texto, icono, camara, alElegir, varias) {
      var input = h('input', { type: 'file', accept: 'image/*', capture: camara ? 'environment' : null, multiple: varias && !camara ? true : null, class: 'oculto',
        onchange: function (e) { var fs = e.target.files; if (fs && fs.length) alElegir(fs); e.target.value = ''; } });
      return h('label.btn-foto', F.icono(icono, 18, { grosor: 1.9 }), h('span', texto), input);
    }

    function procesar(archivo) {
      F.aviso('Preparando la foto…');
      return F.comprimirFoto(archivo).then(function (a) {
        return F.blobs.guardar(a.blob).then(function (id) {
          nuevosBlobs.push(id);
          return { blobId: id, nombre: a.nombre, mime: a.mime, tamano: a.tamano, ancho: a.ancho, alto: a.alto };
        });
      }).catch(function (e) { F.aviso(e.message || 'No se pudo leer la imagen', 'alerta'); return null; });
    }

    function quitarArchivo(a) {
      if (!a) return;
      if (a.ruta) card.rutasPorBorrar.push(a.ruta);
      if (a.blobId) {
        var i = nuevosBlobs.indexOf(a.blobId);
        if (i >= 0) { nuevosBlobs.splice(i, 1); F.blobs.borrar(a.blobId); }
        else blobsPorBorrar.push(a.blobId);
      }
    }

    function guardar() {
      var vacia = !String(card.titulo).trim() && !String(card.descripcion).trim() && !String(card.enlace).trim() && !card.portada;
      if (vacia) { F.aviso('Escribe al menos un título, una descripción o un enlace.', 'alerta'); return; }
      card.titulo = String(card.titulo).trim();
      card.enlace = String(card.enlace).trim();
      card.sucio = true;
      if (card.envio !== 'enviada') card.envio = 'pendiente';
      card.actualizadaEn = new Date().toISOString();
      delete card.compartida;
      F.db.poner('cards', card).then(function () {
        guardado = true; nuevosBlobs = [];
        blobsPorBorrar.forEach(function (id) { F.blobs.borrar(id); });
        F.aviso(navigator.onLine ? 'Guardada. Enviando…' : 'Guardada en el teléfono. Se envía al volver la señal.');
        location.hash = '#/';
        F.nube.sincronizar({ sinEspejo: true });
      }).catch(function (e) { F.aviso('No se pudo guardar: ' + e.message, 'alerta'); });
    }

    function descartar() {
      F.confirmar('¿Descartar esta card?', 'Se borra del teléfono' + (card.envio === 'enviada' ? ' y de la bandeja, antes de que llegue al Moodboard.' : '.'), 'Descartar', 'Conservar')
        .then(function (si) {
          if (!si) return;
          var rutas = card.rutasPorBorrar.slice();
          var blobs = [];
          (card.portada ? [card.portada] : []).concat(card.archivos).forEach(function (a) { if (a.ruta) rutas.push(a.ruta); if (a.blobId) blobs.push(a.blobId); });
          var p = F.db.borrar('cards', card.id).then(function () { return blobs.length ? F.db.borrarVarios('blobs', blobs) : null; });
          if (card.envio === 'enviada' || card.enviadaEn) {
            p = p.then(function () { return F.db.meta('descartadas'); }).then(function (l) {
              l = l || []; l.push({ id: card.id, rutas: rutas }); return F.db.ponerMeta('descartadas', l);
            });
          }
          return p.then(function () {
            guardado = true; limpiarNuevos();
            F.aviso('Card descartada.');
            location.hash = '#/';
            F.nube.sincronizar({ sinEspejo: true });
          });
        });
    }

    return vista;
  };

  // ── Elegir proyectos o etiquetas (o crear nuevos) ─────────────────────
  F.elegirNombres = function (o) {
    var elegidos = o.elegidos.slice();
    var buscar = h('input.buscar-campo', { type: 'search', placeholder: 'Buscar o crear', 'aria-label': 'Buscar o crear ' + o.singular.toLowerCase(), autocomplete: 'off', enterkeyhint: 'done' });
    var lista = h('div.lista-nombres');
    var crear = h('div');
    var elegidosCaja = h('div.chips');
    function marcado(n) { return elegidos.some(function (x) { return F.norm(x) === F.norm(n); }); }
    function alternar(n) {
      var i = elegidos.findIndex(function (x) { return F.norm(x) === F.norm(n); });
      if (i >= 0) elegidos.splice(i, 1); else elegidos.push(n);
      pintar();
    }
    function pintar() {
      var q = buscar.value.trim();
      F.vaciar(lista); F.vaciar(crear); F.vaciar(elegidosCaja);
      var todas = o.opciones.concat(elegidos.filter(function (n) { return !o.opciones.some(function (x) { return F.norm(x) === F.norm(n); }); }));
      var vis = todas.filter(function (n) { return F.empiezaPor(n, q); });
      var exacta = todas.some(function (n) { return F.norm(n) === F.norm(q); });
      if (q && !exacta) {
        crear.appendChild(h('button.crear-nombre', { type: 'button', onclick: function () { elegidos.push(q); buscar.value = ''; pintar(); buscar.focus(); } },
          h('span.crear-icono', F.icono('mas', 16, { grosor: 2.4 })),
          h('span.crear-texto', h('strong', 'Crear «' + q + '»'), h('span', 'El Moodboard ' + (o.singular === 'Proyecto' ? 'lo crea' : 'la crea') + ' al recibir la card'))));
      }
      vis.slice(0, 80).forEach(function (n) {
        var m = marcado(n);
        lista.appendChild(h('button.fila-nombre' + (m ? '.marcada' : ''), { type: 'button', role: 'checkbox', 'aria-checked': m ? 'true' : 'false', onclick: function () { alternar(n); } },
          h('span', n), h('span.casilla', m ? F.icono('check', 16, { grosor: 2.6 }) : null)));
      });
      if (!vis.length && !q) lista.appendChild(h('p.vacio-chico', 'Aún no hay ' + o.titulo.toLowerCase() + ' en el catálogo. Escribe para crear.'));
      elegidos.forEach(function (n) {
        elegidosCaja.appendChild(h('span.chip-nombre.oscuro', n, h('button.quitar', { type: 'button', 'aria-label': 'Quitar ' + n, onclick: function () { alternar(n); } }, F.icono('x', 14, { grosor: 2.4 }))));
      });
    }
    buscar.addEventListener('input', pintar);
    buscar.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var q = buscar.value.trim(); if (q) { var b = crear.querySelector('button') || lista.querySelector('button'); if (b) b.click(); } }
    });
    var listo = h('button.btn-principal.chico', { type: 'button', onclick: function () { o.alListo(elegidos); hj.cerrar(); } }, 'Listo');
    var hj = F.hoja(o.titulo, [
      h('label.buscador', F.icono('buscar', 18), buscar),
      crear,
      h('div.etiqueta-seccion', 'Elegidos'),
      elegidosCaja,
      h('div.etiqueta-seccion', 'En el Moodboard'),
      lista
    ], { accion: listo, alCerrar: function () { o.alListo(elegidos); } });
    hj.el.classList.add('alta');
    pintar();
    setTimeout(function () { buscar.focus(); }, 250);
  };
})();
