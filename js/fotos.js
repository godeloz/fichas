/* Fichas · fotos: se achican en el teléfono antes de guardarlas
   (lado mayor 1600 px, JPEG 82 %). Una foto de 4 MB queda en unos 300–500 KB. */
(function () {
  var F = window.F;
  var LADO = 1600, CALIDAD = 0.82;

  function cargar(archivo) {
    if (window.createImageBitmap) {
      return createImageBitmap(archivo, { imageOrientation: 'from-image' }).catch(function () { return cargarImg(archivo); });
    }
    return cargarImg(archivo);
  }
  function cargarImg(archivo) {
    return new Promise(function (ok, mal) {
      var u = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () { ok(img); setTimeout(function () { URL.revokeObjectURL(u); }, 0); };
      img.onerror = function () { URL.revokeObjectURL(u); mal(new Error('No se pudo leer la imagen')); };
      img.src = u;
    });
  }

  // Devuelve {blob, nombre, mime, tamano, ancho, alto}
  F.comprimirFoto = function (archivo) {
    if (!archivo || !/^image\//.test(archivo.type)) return Promise.reject(new Error('Ese archivo no es una imagen'));
    if (/gif|svg/.test(archivo.type)) {
      return Promise.resolve({ blob: archivo, nombre: archivo.name || 'imagen', mime: archivo.type, tamano: archivo.size, ancho: null, alto: null });
    }
    return cargar(archivo).then(function (img) {
      var w = img.width, h = img.height, k = Math.min(1, LADO / Math.max(w, h));
      var cw = Math.round(w * k), ch = Math.round(h * k);
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch);
      g.drawImage(img, 0, 0, cw, ch);
      if (img.close) img.close();
      return new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', CALIDAD); }).then(function (blob) {
        if (!blob) throw new Error('No se pudo comprimir la imagen');
        // Si la original ya era más liviana, se queda la original
        var usar = (archivo.size <= blob.size && /jpeg/.test(archivo.type) && k === 1) ? archivo : blob;
        var base = String(archivo.name || 'foto').replace(/\.[a-z0-9]+$/i, '') || 'foto';
        return { blob: usar, nombre: base + '.jpg', mime: 'image/jpeg', tamano: usar.size, ancho: cw, alto: ch };
      });
    });
  };
})();
