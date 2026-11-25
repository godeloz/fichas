/* Fichas · arranque, rutas, bandeja, entrada y ajustes */
(function () {
  var F = window.F, h = F.h;
  var raiz = document.getElementById('app');
  var vistaActual = null, rutaActual = '', ignorarCambio = false;
  var VERSION_APP = '1.0.0';

  // ── Rutas ───────────────────────────────────────────────────────────
  function leerRuta() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var partes = hash.split('?');
    var params = {};
    (partes[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
    return { camino: partes[0].split('/').filter(Boolean), params: params, hash: '#' + hash };
  }

  function mostrar() {
    var r = leerRuta();
    var guardia = vistaActual && vistaActual.salir ? vistaActual.salir() : Promise.resolve(true);
    guardia.then(function (ok) {
      if (!ok) { ignorarCambio = true; location.hash = rutaActual; return; }
      rutaActual = r.hash;
      F.liberarUrls();
      F.vaciar(raiz);
      document.getElementById('capa').textContent = '';
      window.scrollTo(0, 0);
      var c = r.camino;
      raiz.className = '';
      if (!F.estadoNube.sesion && !yaEntro && c[0] !== 'ajustes') { vistaActual = vistaEntrar(raiz); return; }
      if (c[0] === 'anotar') { raiz.className = 'con-pie'; vistaActual = F.vistaAnotar(raiz, Object.assign({ id: c[1] || 'nueva' }, r.params, compartidoPendiente(c[1]))); }
      else if (c[0] === 'explorar') vistaActual = F.vistaExplorar(raiz);
      else if (c[0] === 'card') { raiz.className = 'con-pie'; vistaActual = F.vistaCard(raiz, decodeURIComponent(c[1] || '')); }
      else if (c[0] === 'vista') { raiz.className = 'con-pie'; vistaActual = F.vistaLocal(raiz, c[1]); }
      else if (c[0] === 'ajustes') vistaActual = vistaAjustes(raiz);
      else vistaActual = vistaBandeja(raiz);
    });
  }
  window.addEventListener('hashchange', function () {
    if (ignorarCambio) { ignorarCambio = false; return; }
    mostrar();
  });

  // ── Llegadas desde «Compartir» ──────────────────────────────────────
  var compartido = null;
  function compartidoPendiente(id) {
    if (id !== 'nueva' || !compartido) return {};
    var c = compartido; compartido = null; return c;
  }
  function leerCompartido() {
    var q = new URLSearchParams(location.search);
    if (!q.has('compartir_url') && !q.has('compartir_texto') && !q.has('compartir_titulo')) return false;
    var url = (q.get('compartir_url') || '').trim();
    var texto = (q.get('compartir_texto') || '').trim();
    var titulo = (q.get('compartir_titulo') || '').trim();
    if (!url) { var m = /https?:\/\/\S+/.exec(texto); if (m) url = m[0].replace(/[).,;!?»"']+$/, ''); }
    if (url) texto = texto.replace(url, '').trim();
    if (titulo && /^https?:\/\//.test(titulo)) titulo = '';
    var host = '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { /* sin enlace */ }
    var t = null;
    if (/tiktok\.com$/.test(host)) t = F.catalogo.tipoPorNombre('TikTok');
    else if (/substack\.com$/.test(host)) t = F.catalogo.tipoPorNombre('Substack');
    if (!t && /(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) t = F.catalogo.tipoPorKind('video');
    if (!t && url) t = F.catalogo.tipoPorKind('link');
    compartido = { compartida: true, enlace: url, titulo: titulo, descripcion: texto, tipo: t ? t.id : null };
    history.replaceState(null, '', location.pathname + '#/anotar/nueva');
    return true;
  }

  // ── Bandeja ─────────────────────────────────────────────────────────
  function marcaEstado(c) {
    if (c.sucio) return h('span.marca', F.icono('reloj', 14), c.enviadaEn ? 'Cambios sin enviar' : 'Sin enviar');
    return h('span.marca', F.icono('nube', 14), 'Enviada');
  }

  function cardBandeja(c, imgUrl) {
    var esIdea = F.catalogo.esIdea(c.tipo);
    return h('a.card-bandeja' + (c.sucio ? '.sin-enviar' : '.enviada'), { href: '#/anotar/' + c.id, style: { background: F.fondoCard(c.tipo, c.generos) } },
      h('div.card-bandeja-arriba',
        esIdea ? h('span.num-tab.claro', 'Nueva') : null,
        h('span.card-bandeja-tipo', F.lineaTipo(c.tipo, c.generos)),
        c.favorita ? h('span.fav', F.icono('estrella', 14, { relleno: true })) : null),
      h('div.card-bandeja-medio',
        h('div.card-bandeja-textos',
          h('div.card-bandeja-titulo', c.titulo || (c.enlace ? c.enlace.replace(/^https?:\/\/(www\.)?/, '') : 'Sin título')),
          c.descripcion ? h('div.card-bandeja-desc', c.descripcion) : null),
        imgUrl ? h('img.card-bandeja-img', { src: imgUrl, alt: '' }) : null),
      h('div.card-bandeja-abajo',
        (c.proyectos || []).slice(0, 2).map(function (n) { return h('span.chip-blanco', n); }),
        (c.etiquetas || []).slice(0, 2).map(function (n) { return h('span.chip-claro', '# ' + n); }),
        marcaEstado(c))
    );
  }

  function filaImportada(c) {
    var tipo = F.catalogo.tipo(c.tipo);
    var esIdea = tipo.kind === 'idea';
    return h('a.fila-importada', { href: '#/vista/' + c.id },
      h('span.franja', { style: { background: F.fondoCard(c.tipo, c.generos) } }),
      h('span.fila-textos',
        h('span.fila-arriba', esIdea && c.num ? h('span.num-tab.chico', 'Nº ' + c.num) : h('span.tipo-chico', tipo.nombre), h('span.cuando', F.cuando(c.importadaEn || c.creadaEn))),
        h('span.fila-titulo', c.titulo || c.enlace || 'Sin título')),
      h('span.ok', { 'aria-label': 'En el Moodboard' }, F.icono('check', 20, { grosor: 2.4 })));
  }

  var bandejaPintar = null;
  function vistaBandeja(raiz) {
    var estadoCaja = h('div.estado-caja');
    var lista = h('div.lista-bandeja');
    var subtitulo = h('button.estado-sync', { type: 'button', onclick: function () { if (navigator.onLine) F.nube.sincronizar(); } });
    F.agregar(raiz, [
      h('div.pagina',
        h('header.cabeza',
          h('div', h('span.subtitulo', 'Moodboard · celular'), h('h1', 'Bandeja')),
          h('a.btn-redondo', { href: '#/ajustes', 'aria-label': 'Ajustes' }, F.icono('ajustes', 20, { grosor: 1.9 }))),
        estadoCaja,
        lista,
        subtitulo
      ),
      F.barra('bandeja')
    ]);

    function pintarEstado(pendientes) {
      F.vaciar(estadoCaja);
      var e = F.estadoNube;
      if (!navigator.onLine) {
        estadoCaja.appendChild(h('div.franja-estado', F.icono('sinSenal', 18, { grosor: 1.8 }),
          h('span', 'Sin señal.' + (pendientes ? ' ' + pendientes + (pendientes === 1 ? ' card se envía' : ' cards se envían') + ' al volver la conexión.' : ' Puedes anotar igual.'))));
      } else if (!e.sesion) {
        estadoCaja.appendChild(h('a.franja-estado.alerta', { href: '#/ajustes' }, F.icono('candado', 18), h('span', 'Entra con tu usuario para enviar las cards.')));
      } else if (e.error) {
        estadoCaja.appendChild(h('div.franja-estado.alerta', F.icono('refrescar', 18), h('span', e.error)));
      }
      F.vaciar(subtitulo);
      if (e.sincronizando) F.agregar(subtitulo, [F.icono('refrescar', 14), 'Sincronizando…']);
      else if (e.ultima) F.agregar(subtitulo, [F.icono('check', 14), 'Al día · ' + F.cuando(e.ultima).replace(/^Hoy, /, 'hoy, ').replace(/^Ayer, /, 'ayer, ')]);
    }

    function pintar() {
      return F.db.todos('cards').then(function (cards) {
        var sinEnviar = cards.filter(function (c) { return c.sucio && c.envio !== 'importada'; });
        var enCamino = cards.filter(function (c) { return !c.sucio && c.envio === 'enviada'; });
        var importadas = cards.filter(function (c) { return c.envio === 'importada'; });
        var porFecha = function (a, b) { return String(b.creadaEn).localeCompare(String(a.creadaEn)); };
        sinEnviar.sort(porFecha); enCamino.sort(porFecha);
        importadas.sort(function (a, b) { return String(b.importadaEn).localeCompare(String(a.importadaEn)); });
        pintarEstado(sinEnviar.length);
        var urls = {};
        return Promise.all(sinEnviar.concat(enCamino).filter(function (c) { return c.portada && c.portada.blobId; }).map(function (c) {
          return F.urlDeBlob(c.portada.blobId).then(function (u) { urls[c.id] = u; });
        })).then(function () {
          F.vaciar(lista);
          if (!cards.length) {
            lista.appendChild(h('div.vacio-grande',
              h('p', h('strong', 'Nada pendiente.')),
              h('p', 'Toca ', h('b', '+'), ' para anotar una card. Llega sola al Moodboard, con su número si es una Idea.')));
            return;
          }
          if (sinEnviar.length) {
            lista.appendChild(h('div.seccion-cabeza', h('h2', 'Sin enviar'), h('span', sinEnviar.length + ' · se pueden corregir')));
            sinEnviar.forEach(function (c) { lista.appendChild(cardBandeja(c, urls[c.id])); });
          }
          if (enCamino.length) {
            lista.appendChild(h('div.seccion-cabeza', h('h2', 'Enviadas'), h('span', 'Esperan a que abras el Moodboard')));
            enCamino.forEach(function (c) { lista.appendChild(cardBandeja(c, urls[c.id])); });
          }
          if (importadas.length) {
            lista.appendChild(h('div.seccion-cabeza', h('h2', 'Ya en el Moodboard'), h('span', 'Últimas ' + importadas.length)));
            lista.appendChild(h('div.lista-importadas', importadas.map(filaImportada)));
          }
        });
      });
    }
    bandejaPintar = pintar;
    pintar();
    return { salir: function () { bandejaPintar = null; return Promise.resolve(true); } };
  }

  // ── Entrar ──────────────────────────────────────────────────────────
  var yaEntro = false;
  function formularioEntrar(alEntrar) {
    var correo = h('input', { id: 'e-correo', type: 'email', autocomplete: 'username', required: true, inputmode: 'email' });
    var clave = h('input', { id: 'e-clave', type: 'password', autocomplete: 'current-password', required: true });
    var error = h('p.error', { role: 'alert' });
    var boton = h('button.btn-principal.grande', { type: 'submit' }, 'Entrar');
    return h('form.entrar', { onsubmit: function (e) {
      e.preventDefault();
      error.textContent = '';
      if (!correo.value.trim() || !clave.value) { error.textContent = 'Escribe tu correo y tu contraseña.'; return; }
      boton.disabled = true; boton.textContent = 'Entrando…';
      F.nube.entrar(correo.value.trim(), clave.value).then(function () {
        yaEntro = true;
        return F.db.ponerMeta('usuario', correo.value.trim());
      }).then(function () {
        F.aviso('Listo. Trayendo el catálogo y el Moodboard…');
        F.nube.sincronizar();
        alEntrar();
      }).catch(function (e) {
        error.textContent = e.message;
        boton.disabled = false; boton.textContent = 'Entrar';
      });
    } },
      h('div.campo', h('label', { for: 'e-correo' }, 'Correo'), correo),
      h('div.campo', h('label', { for: 'e-clave' }, 'Contraseña'), clave),
      error, boton,
      h('p.pista', 'Es el mismo usuario del administrador de «Resistencias del aura». Solo se pide una vez.'));
  }

  function vistaEntrar(raiz) {
    F.agregar(raiz, h('div.pagina.pantalla-entrar',
      h('img.logo', { src: 'icons/icon-192.png', alt: '' }),
      h('h1', 'Fichas'),
      h('p.subtitulo', 'Anota en el celular. Llega solo al Moodboard.'),
      F.estadoNube.error && !window.FICHAS_CONFIG.configurado ? h('p.error', F.estadoNube.error) : null,
      formularioEntrar(function () { location.hash = '#/'; mostrar(); })
    ));
    return {};
  }

  // ── Ajustes ─────────────────────────────────────────────────────────
  var instalar = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); instalar = e; });

  function vistaAjustes(raiz) {
    var cuerpo = h('div.ajustes');
    F.agregar(raiz, [
      h('div.pagina',
        h('header.cabeza', h('div', h('span.subtitulo', 'Fichas ' + VERSION_APP), h('h1', 'Ajustes')),
          h('a.btn-redondo', { href: '#/', 'aria-label': 'Volver' }, F.icono('x', 18))),
        cuerpo),
      F.barra('')
    ]);
    function pintar() {
      Promise.all([F.db.meta('usuario'), F.db.todos('cards'), F.db.meta('espejoSync'), F.db.meta('catalogo')]).then(function (r) {
        var usuario = r[0], cards = r[1], espejoSync = r[2], cat = r[3];
        var e = F.estadoNube;
        var pendientes = cards.filter(function (c) { return c.sucio; }).length;
        F.vaciar(cuerpo);
        cuerpo.appendChild(h('section.caja-ajuste',
          h('h2', 'Cuenta'),
          e.sesion
            ? [h('p', 'Entraste como ', h('b', (e.sesion.user && e.sesion.user.email) || usuario || 'tu usuario'), '.'),
               h('button.btn-secundario', { type: 'button', onclick: function () {
                 var msg = pendientes ? 'Tienes ' + pendientes + ' card(s) sin enviar. Quedan en el teléfono y se envían cuando vuelvas a entrar.' : 'Para enviar cards tendrás que entrar otra vez.';
                 F.confirmar('¿Cerrar sesión?', msg, 'Cerrar sesión', 'Cancelar').then(function (si) { if (si) F.nube.salir().then(pintar); });
               } }, F.icono('salir', 18), 'Cerrar sesión')]
            : formularioEntrar(pintar)
        ));
        cuerpo.appendChild(h('section.caja-ajuste',
          h('h2', 'Sincronización'),
          h('p', !navigator.onLine ? 'Sin señal ahora.' : e.sincronizando ? 'Sincronizando…' : e.ultima ? 'Última: ' + F.cuando(e.ultima).toLowerCase() + '.' : 'Todavía no se ha sincronizado.'),
          pendientes ? h('p', pendientes + (pendientes === 1 ? ' card espera' : ' cards esperan') + ' para enviarse.') : null,
          e.error ? h('p.error', e.error) : null,
          h('button.btn-secundario', { type: 'button', disabled: !e.sesion || !navigator.onLine || e.sincronizando, onclick: function () { F.nube.sincronizar().then(pintar); } }, F.icono('refrescar', 18), 'Sincronizar ahora')
        ));
        F.db.todos('espejo').then(function (esp) {
          cuerpo.appendChild(h('section.caja-ajuste',
            h('h2', 'Copia del Moodboard'),
            h('p', esp.length ? esp.length + ' cards para Explorar' + (espejoSync ? ', revisada ' + F.cuando(espejoSync).toLowerCase() : '') + '.' : 'Aún no hay copia.'),
            h('p', cat && cat.tipos ? 'Catálogo: ' + cat.tipos.length + ' tipos, ' + (cat.proyectos || []).length + ' proyectos, ' + (cat.etiquetas || []).length + ' etiquetas' + (cat.origen === 'semilla' ? ' (semilla inicial)' : '') + '.' : 'Catálogo: el básico, mientras sincroniza.')
          ));
          if (instalar) cuerpo.appendChild(h('section.caja-ajuste',
            h('h2', 'Pantalla de inicio'),
            h('button.btn-principal', { type: 'button', onclick: function () { instalar.prompt(); instalar = null; pintar(); } }, 'Instalar Fichas')));
        });
      });
    }
    pintar();
    var oyente = function () { if (rutaActual === '#/ajustes') pintar(); };
    vistaAjustesOyente = oyente;
    return { salir: function () { vistaAjustesOyente = null; return Promise.resolve(true); } };
  }
  var vistaAjustesOyente = null;

  // ── Arranque ────────────────────────────────────────────────────────
  var tCambio;
  F.nube.onCambio(function () {
    clearTimeout(tCambio);
    tCambio = setTimeout(function () {
      if (bandejaPintar) bandejaPintar();
      if (vistaAjustesOyente) vistaAjustesOyente();
    }, 80);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Sin modo sin señal:', e); });
  }

  F.catalogo.cargar()
    .then(function () { return F.db.meta('usuario'); })
    .then(function (u) { yaEntro = !!u; return F.nube.iniciar(); })
    .then(function () {
      leerCompartido();
      mostrar();
      if (F.estadoNube.sesion) F.nube.sincronizar();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') F.nube.sincronizar();
      });
      setInterval(function () {
        if (document.visibilityState === 'visible') F.nube.sincronizar();
      }, 120000);
    })
    .catch(function (e) {
      console.error(e);
      F.agregar(raiz, h('div.pagina', h('h1', 'No se pudo abrir'), h('p.error', String(e && e.message || e))));
    });
})();
