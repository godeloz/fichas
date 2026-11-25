/* Fichas · la nube (Supabase): sesión y sincronización
   Va en una sola dirección para las cards: del teléfono a la bandeja.
   Lo único que baja es el catálogo y la copia de solo lectura (espejo). */
(function () {
  var F = window.F;
  var C = window.FICHAS_CONFIG || {};
  var cliente = null;
  var oyentes = [];
  var enCurso = null;
  var GUARDAR_IMPORTADAS = 10;

  var estado = F.estadoNube = {
    enLinea: navigator.onLine,
    sesion: null,
    sincronizando: false,
    ultima: null,
    error: ''
  };

  function avisar() { oyentes.forEach(function (fn) { try { fn(estado); } catch (e) { console.error(e); } }); }

  F.nube = {
    onCambio: function (fn) { oyentes.push(fn); },
    cliente: function () { return cliente; },

    iniciar: function () {
      if (!C.configurado || !window.supabase) {
        estado.error = C.llaveSecreta ? 'config.js tiene una llave secreta. Cámbiala por la pública.' : 'Falta configurar Supabase en config.js.';
        return Promise.resolve(estado);
      }
      cliente = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'fichas-sesion', detectSessionInUrl: false }
      });
      cliente.auth.onAuthStateChange(function (_ev, s) { estado.sesion = s || null; avisar(); });
      window.addEventListener('online', function () { estado.enLinea = true; avisar(); F.nube.sincronizar(); });
      window.addEventListener('offline', function () { estado.enLinea = false; avisar(); });
      return F.db.meta('ultimaSync').then(function (u) {
        estado.ultima = u || null;
        return cliente.auth.getSession();
      }).then(function (r) {
        estado.sesion = (r && r.data && r.data.session) || null;
        avisar();
        return estado;
      });
    },

    entrar: function (correo, clave) {
      if (!cliente) return Promise.reject(new Error(estado.error || 'Sin conexión con Supabase'));
      return cliente.auth.signInWithPassword({ email: correo, password: clave }).then(function (r) {
        if (r.error) throw traducir(r.error);
        estado.sesion = r.data.session; avisar();
        return r.data.session;
      });
    },

    salir: function () {
      if (!cliente) return Promise.resolve();
      return cliente.auth.signOut().then(function () { estado.sesion = null; avisar(); });
    },

    // Una sola sincronización a la vez; si piden otra mientras corre, se encadena
    sincronizar: function (opciones) {
      if (enCurso) return enCurso.then(function () { return F.nube.sincronizar(opciones); });
      if (!cliente || !estado.sesion || !navigator.onLine) { estado.enLinea = navigator.onLine; avisar(); return Promise.resolve(false); }
      estado.sincronizando = true; estado.error = ''; avisar();
      enCurso = enviarPendientes()
        .then(borrarDescartadas)
        .then(revisarImportadas)
        .then(traerCatalogo)
        .then(function () { return (opciones && opciones.sinEspejo) ? null : traerEspejo(); })
        .then(function () {
          estado.ultima = Date.now();
          return F.db.ponerMeta('ultimaSync', estado.ultima);
        })
        .then(function () { return true; })
        .catch(function (e) {
          console.error(e);
          estado.error = mensaje(e);
          if (/JWT|token|sesión/i.test(estado.error)) { /* la sesión venció: se pide entrar otra vez */ }
          return false;
        })
        .then(function (ok) { estado.sincronizando = false; enCurso = null; avisar(); return ok; });
      return enCurso;
    }
  };

  // ── 1. Enviar lo que está pendiente o cambió ───────────────────────
  function enviarPendientes() {
    return F.db.todos('cards').then(function (cards) {
      var sucias = cards.filter(function (c) { return c.sucio; })
        .sort(function (a, b) { return String(a.creadaEn).localeCompare(String(b.creadaEn)); });
      return sucias.reduce(function (p, c) { return p.then(function () { return enviarUna(c); }); }, Promise.resolve());
    });
  }

  function subirArchivo(card, a) {
    if (a.ruta || !a.blobId) return Promise.resolve(a);
    return F.blobs.leer(a.blobId).then(function (blob) {
      if (!blob) throw new Error('Falta un archivo de «' + (card.titulo || 'sin título') + '» en el teléfono');
      var ext = (/\.([a-z0-9]{1,5})$/i.exec(a.nombre || '') || [, 'jpg'])[1].toLowerCase();
      var ruta = 'bandeja/' + card.id + '/' + a.blobId + '.' + ext;
      return cliente.storage.from(C.bucket || 'fichas').upload(ruta, blob, { upsert: true, contentType: a.mime || blob.type || 'application/octet-stream' })
        .then(function (r) { if (r.error) throw r.error; a.ruta = ruta; return a; });
    });
  }

  function aFila(c) {
    function arch(a) { return { ruta: a.ruta, nombre: a.nombre, mime: a.mime || '', tamano: a.tamano || 0 }; }
    return {
      id: c.id,
      creada_en: c.creadaEn,
      tipo: c.tipo,
      titulo: c.titulo || '',
      descripcion: c.descripcion || '',
      autor: c.autor || '',
      fuente: c.fuente || '',
      anio: c.anio || '',
      enlace: c.enlace || '',
      fuentes: c.fuentes || '',
      nota: c.nota || '',
      favorita: !!c.favorita,
      creada: c.creada || null,
      generos: c.generos || [],
      estado: c.estado || null,
      proyectos: c.proyectos || [],
      etiquetas: c.etiquetas || [],
      portada: c.portada ? Object.assign(arch(c.portada), { ancho: c.portada.ancho || null, alto: c.portada.alto || null }) : null,
      archivos: (c.archivos || []).map(arch)
    };
  }

  function enviarUna(card) {
    var tabla = function () { return cliente.from('fichas_bandeja'); };
    var archivos = (card.portada ? [card.portada] : []).concat(card.archivos || []);
    return archivos.reduce(function (p, a) { return p.then(function () { return subirArchivo(card, a); }); }, Promise.resolve())
      .then(function () { return F.db.poner('cards', card); }) // las rutas quedan guardadas aunque falle lo siguiente
      .then(function () {
        var fila = aFila(card);
        return tabla().update(fila).eq('id', card.id).is('importada_en', null).select('id');
      })
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) return 'actualizada';
        return tabla().select('id, importada_en, card_id, num').eq('id', card.id).maybeSingle().then(function (r2) {
          if (r2.error) throw r2.error;
          if (!r2.data) {
            return tabla().insert(aFila(card)).then(function (r3) { if (r3.error) throw r3.error; return 'nueva'; });
          }
          // Ya había llegado al Moodboard: los cambios de después no se pueden enviar
          card.envio = 'importada'; card.importadaEn = r2.data.importada_en; card.cardId = r2.data.card_id; card.num = r2.data.num;
          F.aviso('«' + (card.titulo || 'Sin título') + '» ya estaba en el Moodboard: los últimos cambios no se enviaron.', 'alerta');
          return 'importada';
        });
      })
      .then(function (res) {
        var borrar = card.rutasPorBorrar || [];
        card.sucio = false;
        card.rutasPorBorrar = [];
        if (res !== 'importada') card.envio = 'enviada';
        card.enviadaEn = card.enviadaEn || new Date().toISOString();
        return F.db.poner('cards', card).then(function () {
          if (borrar.length) return cliente.storage.from(C.bucket || 'fichas').remove(borrar).catch(function () {});
        });
      });
  }

  // ── 2. Cards descartadas antes de llegar al Moodboard ───────────────
  function borrarDescartadas() {
    return F.db.meta('descartadas').then(function (lista) {
      lista = lista || [];
      if (!lista.length) return;
      var quedan = [];
      return lista.reduce(function (p, d) {
        return p.then(function () {
          return cliente.from('fichas_bandeja').delete().eq('id', d.id).is('importada_en', null).then(function (r) {
            if (r.error) { quedan.push(d); return; }
            if (d.rutas && d.rutas.length) return cliente.storage.from(C.bucket || 'fichas').remove(d.rutas).catch(function () {});
          });
        });
      }, Promise.resolve()).then(function () { return F.db.ponerMeta('descartadas', quedan); });
    });
  }

  // ── 3. ¿Cuáles ya llegaron al Moodboard? ────────────────────────────
  function revisarImportadas() {
    return F.db.todos('cards').then(function (cards) {
      var enviadas = cards.filter(function (c) { return c.envio === 'enviada' && !c.sucio; });
      var ids = enviadas.map(function (c) { return c.id; });
      var p = Promise.resolve();
      for (var i = 0; i < ids.length; i += 100) (function (lote) {
        p = p.then(function () {
          return cliente.from('fichas_bandeja').select('id, importada_en, card_id, num').in('id', lote).then(function (r) {
            if (r.error) throw r.error;
            var cambios = [];
            (r.data || []).forEach(function (f) {
              if (!f.importada_en) return;
              var c = enviadas.find(function (x) { return x.id === f.id; });
              if (!c) return;
              c.envio = 'importada'; c.importadaEn = f.importada_en; c.cardId = f.card_id; c.num = f.num;
              cambios.push(c);
            });
            if (cambios.length) return F.db.ponerVarios('cards', cambios);
          });
        });
      })(ids.slice(i, i + 100));
      return p.then(podarImportadas);
    });
  }

  // En el teléfono solo quedan las últimas importadas; sus archivos se liberan
  function podarImportadas() {
    return F.db.todos('cards').then(function (cards) {
      var imp = cards.filter(function (c) { return c.envio === 'importada'; })
        .sort(function (a, b) { return String(b.importadaEn || b.creadaEn).localeCompare(String(a.importadaEn || a.creadaEn)); });
      var blobs = [];
      var cambiadas = [];
      imp.forEach(function (c, i) {
        var arch = (c.portada ? [c.portada] : []).concat(c.archivos || []);
        if (i >= GUARDAR_IMPORTADAS) { arch.forEach(function (a) { if (a.blobId) blobs.push(a.blobId); }); return; }
        // las importadas conservan solo la portada para la lista
        var suelta = false;
        (c.archivos || []).forEach(function (a) { if (a.blobId) { blobs.push(a.blobId); delete a.blobId; suelta = true; } });
        if (suelta) cambiadas.push(c);
      });
      var viejas = imp.slice(GUARDAR_IMPORTADAS).map(function (c) { return c.id; });
      return Promise.all([
        viejas.length ? F.db.borrarVarios('cards', viejas) : null,
        cambiadas.length ? F.db.ponerVarios('cards', cambiadas) : null,
        blobs.length ? F.db.borrarVarios('blobs', blobs) : null
      ]);
    });
  }

  // ── 4. Catálogo ─────────────────────────────────────────────────────
  function traerCatalogo() {
    return cliente.from('fichas_catalogo').select('datos, actualizado_en').eq('id', 1).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      if (r.data && r.data.datos && r.data.datos.tipos) {
        var cat = r.data.datos; cat.actualizadoEn = r.data.actualizado_en;
        F.catalogo.poner(cat);
        if (F.explorar && F.explorar.invalidar) F.explorar.invalidar();
        return F.db.ponerMeta('catalogo', cat);
      }
    });
  }

  // ── 5. Espejo: solo baja lo que cambió ──────────────────────────────
  function traerEspejo() {
    var remotos = [];
    function pagina(desde) {
      return cliente.from('fichas_espejo').select('id, actualizado_en').order('id').range(desde, desde + 999).then(function (r) {
        if (r.error) throw r.error;
        remotos = remotos.concat(r.data || []);
        if ((r.data || []).length === 1000) return pagina(desde + 1000);
      });
    }
    return pagina(0).then(function () { return F.db.todos('espejo'); }).then(function (locales) {
      var loc = {}; locales.forEach(function (e) { loc[e.id] = e.actualizado_en; });
      var rem = {}; remotos.forEach(function (e) { rem[e.id] = true; });
      var faltan = remotos.filter(function (e) { return loc[e.id] !== e.actualizado_en; }).map(function (e) { return e.id; });
      var sobran = locales.filter(function (e) { return !rem[e.id]; }).map(function (e) { return e.id; });
      var p = sobran.length ? F.db.borrarVarios('espejo', sobran) : Promise.resolve();
      for (var i = 0; i < faltan.length; i += 100) (function (lote) {
        p = p.then(function () {
          return cliente.from('fichas_espejo').select('id, datos, miniatura, actualizado_en').in('id', lote).then(function (r) {
            if (r.error) throw r.error;
            return F.db.ponerVarios('espejo', r.data || []);
          });
        });
      })(faltan.slice(i, i + 100));
      return p.then(function () {
        if (faltan.length || sobran.length) F.explorar && F.explorar.invalidar && F.explorar.invalidar();
        return F.db.ponerMeta('espejoSync', Date.now());
      });
    });
  }

  function traducir(e) {
    var m = String((e && e.message) || e || '');
    if (/Invalid login credentials/i.test(m)) return new Error('Correo o contraseña incorrectos.');
    if (/Email not confirmed/i.test(m)) return new Error('Ese usuario no está confirmado en Supabase.');
    if (/fetch|network/i.test(m)) return new Error('No hay conexión. Intenta cuando tengas señal.');
    return new Error(m || 'No se pudo entrar.');
  }
  function mensaje(e) {
    var m = String((e && (e.message || e.error_description)) || e || '');
    if (/fetch|network|Failed to/i.test(m)) return 'Se cortó la conexión. Se reintenta solo.';
    if (/row-level security|permission denied|42501/i.test(m)) return 'Supabase no reconoce tu usuario como administrador.';
    if (/relation .* does not exist|42P01|schema cache/i.test(m)) return 'Faltan las tablas: corre 01-instalar.sql en Supabase.';
    if (/JWT|expired/i.test(m)) return 'La sesión venció. Entra de nuevo en Ajustes.';
    return m || 'Error al sincronizar.';
  }
})();
