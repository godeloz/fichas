/* Fichas · base local en el teléfono (IndexedDB)
   cards   → lo que anotas aquí (se envía a la bandeja de Supabase)
   blobs   → fotos y adjuntos de esas cards, guardados como archivo
   espejo  → copia de solo lectura de las cards del Moodboard (Explorar)
   meta    → catálogo, fechas de sincronización, borrados pendientes */
(function () {
  var F = window.F;
  var NOMBRE = 'fichas-celular', VERSION = 1, conexion;

  function abrir() {
    if (conexion) return conexion;
    conexion = new Promise(function (ok, mal) {
      var r = indexedDB.open(NOMBRE, VERSION);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('espejo')) db.createObjectStore('espejo', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { mal(r.error); };
    });
    return conexion;
  }

  function tx(almacen, modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (ok, mal) {
        var t = db.transaction(almacen, modo), res;
        var st = t.objectStore(almacen);
        res = fn(st);
        t.oncomplete = function () { ok(res && Object.prototype.hasOwnProperty.call(res, '__valor') ? res.__valor : res); };
        t.onerror = function () { mal(t.error); };
        t.onabort = function () { mal(t.error || new Error('Transacción cancelada')); };
      });
    });
  }
  function pedir(req) { var caja = { __valor: undefined }; req.onsuccess = function () { caja.__valor = req.result; }; return caja; }

  F.db = {
    todos: function (almacen) { return tx(almacen, 'readonly', function (st) { return pedir(st.getAll()); }); },
    uno: function (almacen, id) { return tx(almacen, 'readonly', function (st) { return pedir(st.get(id)); }); },
    poner: function (almacen, obj) { return tx(almacen, 'readwrite', function (st) { st.put(obj); }); },
    ponerVarios: function (almacen, lista) { return tx(almacen, 'readwrite', function (st) { lista.forEach(function (o) { st.put(o); }); }); },
    borrar: function (almacen, id) { return tx(almacen, 'readwrite', function (st) { st.delete(id); }); },
    borrarVarios: function (almacen, ids) { return tx(almacen, 'readwrite', function (st) { ids.forEach(function (i) { st.delete(i); }); }); },
    vaciar: function (almacen) { return tx(almacen, 'readwrite', function (st) { st.clear(); }); },
    meta: function (k) { return F.db.uno('meta', k).then(function (r) { return r ? r.v : undefined; }); },
    ponerMeta: function (k, v) { return F.db.poner('meta', { k: k, v: v }); }
  };

  // Archivos: se guardan aparte y la card solo lleva su id
  F.blobs = {
    guardar: function (blob) { var id = 'b-' + F.uuid(); return F.db.poner('blobs', { id: id, blob: blob }).then(function () { return id; }); },
    leer: function (id) { return F.db.uno('blobs', id).then(function (r) { return r ? r.blob : null; }); },
    borrar: function (id) { return F.db.borrar('blobs', id); }
  };

  // URLs de vista previa para blobs (se liberan al cambiar de pantalla)
  var urls = [];
  F.urlDeBlob = function (id) {
    return F.blobs.leer(id).then(function (b) { if (!b) return null; var u = URL.createObjectURL(b); urls.push(u); return u; });
  };
  F.liberarUrls = function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; };
})();
