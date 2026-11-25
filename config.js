/* ════════════════════════════════════════════════════════════════════
   Fichas · configuración pública

   Los mismos dos datos que usa «Resistencias del aura» (mismo proyecto
   de Supabase): la URL y la llave PÚBLICA (publishable o anon).
   Esa llave está hecha para ir en una página web: sola no abre nada,
   porque las tablas de las fichas solo responden a tu usuario.

   ⚠ NUNCA pongas aquí la service_role ni una llave secreta (sb_secret_…).
   ════════════════════════════════════════════════════════════════════ */

window.FICHAS_CONFIG = {
  supabaseUrl: 'https://cmhwyeyzahoyfolmmmni.supabase.co',
  supabaseKey: 'sb_publishable_O-1DltoG8JrQ5lClZnlVqw_z_q9F1q_',
  bucket: 'fichas'
};

/* Guardia: si por error se pega una llave secreta, la app se niega a usarla. */
(function () {
  var c = window.FICHAS_CONFIG;
  var k = String(c.supabaseKey || '');
  var secreta = k.indexOf('sb_secret_') === 0;
  if (!secreta && k.indexOf('eyJ') === 0) {
    try {
      var p = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      secreta = p.role === 'service_role';
    } catch (e) { /* llave mal copiada: lo detecta la conexión */ }
  }
  if (secreta) { c.supabaseKey = ''; console.error('config.js tiene una llave SECRETA. Bórrala y usa la pública.'); }
  c.llaveSecreta = secreta;
  c.configurado = !secreta && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(c.supabaseUrl) &&
    (k.indexOf('eyJ') === 0 || k.indexOf('sb_publishable_') === 0);
})();
