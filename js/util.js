/* Fichas · utilidades: DOM, textos, fechas, iconos */
(function () {
  var F = window.F = window.F || {};

  // h('div.clase', {onclick: fn, style: {...}}, hijos…)  — nunca usa innerHTML con datos
  F.h = function (sel, attrs) {
    var partes = String(sel).split('.');
    var el = document.createElement(partes[0] || 'div');
    if (partes.length > 1) el.className = partes.slice(1).join(' ');
    var hijos = Array.prototype.slice.call(arguments, 2);
    if (attrs && (attrs.nodeType || typeof attrs !== 'object' || Array.isArray(attrs))) { hijos.unshift(attrs); attrs = null; }
    var valor;
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'value') { valor = v; return; }
      if (v === undefined || v === null || v === false) return;
      if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) {
        if (p.indexOf('--') === 0) el.style.setProperty(p, v[p]); else el.style[p] = v[p];
      });
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    F.agregar(el, hijos);
    if (valor !== undefined && valor !== null) el.value = valor;
    return el;
  };
  F.agregar = function (el, hijos) {
    if (!Array.isArray(hijos)) hijos = [hijos];
    hijos.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) return F.agregar(el, c);
      el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return el;
  };
  F.vaciar = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  // Iconos de trazo (24×24)
  var P = {
    x: 'M6 6l12 12M18 6L6 18',
    mas: 'M12 5v14M5 12h14',
    abajo: 'M6 9l6 6 6-6',
    arriba: 'M6 15l6-6 6 6',
    atras: 'M15 6l-6 6 6 6',
    check: 'M5 12l5 5L20 7',
    reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    nube: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18zM9 13l2 2 4-4',
    sinSenal: 'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.3-1.6M12 20h.01',
    ajustes: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
    bandeja: 'M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6z',
    explorar: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
    estrella: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    camara: 'M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    galeria: 'M3 4h18v16H3zM9 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM21 16l-5-5-9 9',
    clip: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7L10 17.4a1.7 1.7 0 0 1-2.4-2.4L15.5 7',
    buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
    candado: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
    compartir: 'M18 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
    enlace: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    refrescar: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
    basura: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    bombillo: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'
  };
  F.icono = function (nombre, tam, extra) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', tam || 20); s.setAttribute('height', tam || 20);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', (extra && extra.grosor) || 2);
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path'); p.setAttribute('d', P[nombre] || ''); s.appendChild(p);
    if (extra && extra.relleno) p.setAttribute('fill', 'currentColor');
    return s;
  };

  // Texto: comparar sin mayúsculas ni tildes
  F.norm = function (s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  };
  F.empiezaPor = function (texto, q) {
    var t = F.norm(texto), n = F.norm(q);
    if (!n) return true;
    if (t.indexOf(n) === 0) return true;
    return t.split(/[\s\-–—/(]+/).some(function (pal) { return pal.indexOf(n) === 0; });
  };

  // Fechas (siempre la fecha local del teléfono, no UTC)
  F.hoyISO = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
  F.fechaCorta = function (iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return +m[3] + ' ' + MESES[+m[2] - 1] + ' ' + m[1];
  };
  F.cuando = function (ts) {
    if (!ts) return '';
    var d = new Date(ts), ahora = new Date();
    var seg = (ahora - d) / 1000;
    if (seg < 60) return 'hace un momento';
    if (seg < 3600) return 'hace ' + Math.round(seg / 60) + ' min';
    var hora = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
    var ayer = new Date(ahora); ayer.setDate(ahora.getDate() - 1);
    if (d.toDateString() === ahora.toDateString()) return 'Hoy, ' + hora;
    if (d.toDateString() === ayer.toDateString()) return 'Ayer, ' + hora;
    return d.getDate() + ' ' + MESES[d.getMonth()] + (d.getFullYear() !== ahora.getFullYear() ? ' ' + d.getFullYear() : '') + ', ' + hora;
  };

  F.uuid = function () {
    if (crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var x = Array.prototype.map.call(b, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
  };

  F.tamano = function (n) {
    if (!n && n !== 0) return '';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  };

  // Texto con enlaces que se abren (sin HTML)
  F.conEnlaces = function (texto) {
    var frag = document.createDocumentFragment();
    var re = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?»"'])/g, ult = 0, m;
    texto = String(texto || '');
    while ((m = re.exec(texto))) {
      if (m.index > ult) frag.appendChild(document.createTextNode(texto.slice(ult, m.index)));
      frag.appendChild(F.h('a', { href: m[1], target: '_blank', rel: 'noopener noreferrer' }, m[1]));
      ult = m.index + m[1].length;
    }
    if (ult < texto.length) frag.appendChild(document.createTextNode(texto.slice(ult)));
    return frag;
  };

  // Aviso breve abajo
  var tAviso;
  F.aviso = function (texto, tipo) {
    var el = document.getElementById('aviso');
    el.textContent = texto;
    el.className = 'visible' + (tipo ? ' ' + tipo : '');
    clearTimeout(tAviso);
    tAviso = setTimeout(function () { el.className = ''; }, 3200);
  };

  F.esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
})();
