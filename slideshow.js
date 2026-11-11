/* Generador de slideshow en video MP4 (solo para el fotógrafo).
   Todo se dibuja con código: fondo desenfocado, marco de papel, giro de cada foto,
   transiciones y partículas. No usa música ni archivos gráficos externos.
   Expone window.Slideshow = { soportado, crearEscena, exportar, cargarFoto, detectarCaras, Mp4Mux }. */
(function(root){
'use strict';

// ---------- Escritor MP4 mínimo (solo video H.264, sin audio) ----------
function u8(){ var n = 0, i, a, o, k = 0; for (i = 0; i < arguments.length; i++) n += arguments[i].length; o = new Uint8Array(n); for (i = 0; i < arguments.length; i++) { a = arguments[i]; o.set(a, k); k += a.length; } return o; }
function u32(v){ return new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]); }
function u16(v){ return new Uint8Array([(v >>> 8) & 255, v & 255]); }
function txt(s){ var o = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 255; return o; }
function box(tipo){ var p = u8.apply(null, Array.prototype.slice.call(arguments, 1)); return u8(u32(p.length + 8), txt(tipo), p); }
function ceros(n){ return new Uint8Array(n); }
var MATRIZ = u8(u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000));

function Mp4Mux(w, h){ this.w = w; this.h = h; this.s = []; this.avcC = null; }
Mp4Mux.prototype.agregar = function(chunk, meta){
  if (!this.avcC && meta && meta.decoderConfig && meta.decoderConfig.description) {
    var d = meta.decoderConfig.description;
    this.avcC = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
  }
  var b = new Uint8Array(chunk.byteLength); chunk.copyTo(b);
  this.s.push({ d: b, ts: chunk.timestamp, key: chunk.type === 'key' });
};
Mp4Mux.prototype.finalizar = function(){
  var s = this.s, n = s.length, w = this.w, h = this.h, i;
  if (!n || !this.avcC) throw new Error('El navegador no entregó video codificado.');
  var T = 90000, ts = s.map(function(x){ return Math.round(x.ts * T / 1e6); }), dur = [];
  for (i = 0; i < n; i++) { if (i > 0 && ts[i] <= ts[i - 1]) throw new Error('Este navegador usa un orden de cuadros que no se puede guardar como MP4. Prueba con Chrome o Edge actualizados.'); dur.push(i < n - 1 ? ts[i + 1] - ts[i] : (n > 1 ? dur[n - 2] : 3000)); }
  var total = 0; dur.forEach(function(x){ total += x; });
  var ms = Math.round(total * 1000 / T);
  var stts = [], cnt = 0; for (i = 0; i < n; i++) { if (i > 0 && dur[i] === dur[i - 1]) cnt++; else { if (i > 0) stts.push([cnt, dur[i - 1]]); cnt = 1; } } stts.push([cnt, dur[n - 1]]);
  var sttsB = box('stts', u32(0), u32(stts.length), u8.apply(null, stts.map(function(e){ return u8(u32(e[0]), u32(e[1])); })));
  var claves = []; for (i = 0; i < n; i++) if (s[i].key) claves.push(i + 1);
  var stss = box('stss', u32(0), u32(claves.length), u8.apply(null, claves.map(u32)));
  var stsz = box('stsz', u32(0), u32(0), u32(n), u8.apply(null, s.map(function(x){ return u32(x.d.length); })));
  var stsc = box('stsc', u32(0), u32(1), u32(1), u32(n), u32(1));
  var avc1 = box('avc1', ceros(6), u16(1), ceros(16), u16(w), u16(h), u32(0x00480000), u32(0x00480000), u32(0), u16(1), ceros(32), u16(0x18), u16(0xFFFF), box('avcC', this.avcC));
  var stsd = box('stsd', u32(0), u32(1), avc1);
  var tam = 0; s.forEach(function(x){ tam += x.d.length; });
  var ftyp = box('ftyp', txt('isom'), u32(512), txt('isom'), txt('iso2'), txt('avc1'), txt('mp41'));
  function moov(off){
    var stco = box('stco', u32(0), u32(1), u32(off));
    var stbl = box('stbl', stsd, sttsB, stss, stsc, stsz, stco);
    var minf = box('minf', box('vmhd', u32(1), ceros(8)), box('dinf', box('dref', u32(0), u32(1), box('url ', u32(1)))), stbl);
    var mdia = box('mdia', box('mdhd', u32(0), u32(0), u32(0), u32(T), u32(total), u16(0x55C4), u16(0)),
      box('hdlr', u32(0), u32(0), txt('vide'), ceros(12), txt('VideoHandler'), ceros(1)), minf);
    var trak = box('trak', box('tkhd', u32(3), u32(0), u32(0), u32(1), u32(0), u32(ms), ceros(8), u16(0), u16(0), u16(0), u16(0), MATRIZ, u32(w * 65536), u32(h * 65536)), mdia);
    var mvhd = box('mvhd', u32(0), u32(0), u32(0), u32(1000), u32(ms), u32(0x10000), u16(0x100), u16(0), ceros(8), MATRIZ, ceros(24), u32(2));
    return box('moov', mvhd, trak);
  }
  var m0 = moov(0), m = moov(ftyp.length + m0.length + 8);
  var cab = u8(u32(tam + 8), txt('mdat'));
  var partes = [ftyp, m, cab]; s.forEach(function(x){ partes.push(x.d); });
  return new Blob(partes, { type: 'video/mp4' });
};

// ---------- Utilidades de dibujo ----------
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function salida(p){ p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
function entrada(p){ p = clamp(p, 0, 1); return p * p * p; }
function lienzo(w, h){ var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function cubrir(cx, img, iw, ih, x, y, w, h){ var k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k; cx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h); }
var GIROS = [-1.6, 1.3, -1.1, 1.8, -1.4, 1.0];

// ---------- Rostros: recorte que no corta caras y las deja centradas ----------
// Rostros importantes de una foto: se ignoran los muy pequeños (personas al fondo).
function carasClave(f){
  var c = f.caras || []; if (!c.length) return null;
  var mx = 0, i; for (i = 0; i < c.length; i++) mx = Math.max(mx, c[i].h);
  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (i = 0; i < c.length; i++) if (c[i].h >= mx * 0.4) { x0 = Math.min(x0, c[i].x); y0 = Math.min(y0, c[i].y); x1 = Math.max(x1, c[i].x + c[i].w); y1 = Math.max(y1, c[i].y + c[i].h); n++; }
  return n ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
// Dibuja la foto cubriendo el rectángulo, centrada en los rostros. Si los rostros no caben
// (con margen para el movimiento de zoom), no dibuja nada y devuelve false: quien llama usa la foto completa sobre su fondo desenfocado.
function cubrirCaras(cx, f, x, y, w, h){
  var u = carasClave(f);
  if (!u) { cubrir(cx, f.bmp, f.w, f.h, x, y, w, h); return true; }
  var k = Math.max(w / f.w, h / f.h), sw = w / k, sh = h / k, mx = sw * 0.09, my = sh * 0.09;
  if (u.w > sw - 2 * mx || u.h > sh - 2 * my) return false;
  var sx = clamp(u.x + u.w / 2 - sw / 2, 0, f.w - sw), sy = clamp(u.y + u.h / 2 - sh * 0.46, 0, f.h - sh);
  if (u.x < sx + mx || u.x + u.w > sx + sw - mx || u.y < sy + my || u.y + u.h > sy + sh - my) return false;
  cx.drawImage(f.bmp, sx, sy, sw, sh, x, y, w, h); return true;
}
// Igual que cubrirCaras pero sin fallar: se usa cuando el recuadro cambia de tamaño durante el movimiento.
function cabeCaras(f, w, h){
  var u = carasClave(f); if (!u) return true;
  var k = Math.max(w / f.w, h / f.h), sw = w / k, sh = h / k, mx = sw * 0.09, my = sh * 0.09;
  if (u.w > sw - 2 * mx || u.h > sh - 2 * my) return false;
  var sx = clamp(u.x + u.w / 2 - sw / 2, 0, f.w - sw), sy = clamp(u.y + u.h / 2 - sh * 0.46, 0, f.h - sh);
  return !(u.x < sx + mx || u.x + u.w > sx + sw - mx || u.y < sy + my || u.y + u.h > sy + sh - my);
}
function cubrirCarasF(cx, f, x, y, w, h){
  var u = carasClave(f); if (!u) { cubrir(cx, f.bmp, f.w, f.h, x, y, w, h); return; }
  var k = Math.max(w / f.w, h / f.h), sw = w / k, sh = h / k;
  var sx = clamp(u.x + u.w / 2 - sw / 2, 0, f.w - sw), sy = clamp(u.y + u.h / 2 - sh * 0.46, 0, f.h - sh);
  cx.drawImage(f.bmp, sx, sy, sw, sh, x, y, w, h);
}
var MODELOS_CARAS = ['https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/', 'https://vladmandic.github.io/face-api/model/'], carasListo = null;
function cargarCaras(){
  if (carasListo) return carasListo;
  carasListo = (async function(){
    if (typeof faceapi === 'undefined') await new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js'; sc.onload = ok; sc.onerror = function(){ no(new Error('caras')); }; document.head.appendChild(sc); });
    try { await faceapi.tf.setBackend('webgl'); await faceapi.tf.ready(); } catch (e) {}
    var i, ult;
    for (i = 0; i < MODELOS_CARAS.length; i++) { try { await faceapi.nets.tinyFaceDetector.loadFromUri(MODELOS_CARAS[i]); return true; } catch (e) { ult = e; } }
    throw ult || new Error('caras');
  })();
  carasListo.catch(function(){ carasListo = null; });
  return carasListo;
}
// Detecta los rostros de cada foto (una sola vez por foto). Si no se puede, el video sigue con el recorte centrado de siempre.
async function detectarCaras(fotos, progreso, cancelado){
  var pend = fotos.filter(function(f){ return f && !f.carasListas; });
  if (!pend.length) return true;
  try { await cargarCaras(); } catch (e) { return false; }
  var i, f, k, c, g, ds, op = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 });
  for (i = 0; i < pend.length; i++) {
    if (cancelado && cancelado()) return false;
    if (progreso) progreso(i, pend.length);
    f = pend[i]; k = Math.min(1, 800 / Math.max(f.w, f.h)); c = lienzo(f.w * k, f.h * k); g = c.getContext('2d'); g.drawImage(f.bmp, 0, 0, c.width, c.height);
    try { ds = await faceapi.detectAllFaces(c, op); f.caras = ds.map(function(d){ var b = d.box || d.detection.box; return { x: b.x / k, y: b.y / k, w: b.width / k, h: b.height / k }; }).filter(function(b){ return b.h > f.h * 0.04; }); }
    catch (e) { f.caras = []; }
    f.carasListas = true; await dormir(0);
  }
  return true;
}


// Fotos: se reducen a 1800 px por el lado largo para cuidar la memoria.
async function cargarFoto(url){
  var r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error('No se pudo leer una foto (' + r.status + ').');
  var blob = await r.blob(), bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  var k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  if (k < 1) { var r2 = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * k), resizeHeight: Math.round(bmp.height * k), resizeQuality: 'high' }); bmp.close(); bmp = r2; }
  return { bmp: bmp, w: bmp.width, h: bmp.height };
}

// ---------- Escena: dibuja el cuadro del tiempo t (segundos) ----------
function ease(p){ p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
var INTRO = 2.8;
function dcPostales(n){ return clamp((clamp(n * 1.5 + 2, 10, 45) - 1.4) / n, 0.9, 3.2); }
function duracionTotal(n, seg, estilo, intro){ var d = seg || 2.5; if (estilo === 'postales') return n * dcPostales(n) + 1.4 + (intro ? INTRO : 0); if (estilo === 'carriles') return clamp(n * 1.7, 12, 45) + (intro ? INTRO : 0); if (estilo === 'prisma') return Math.floor(n / 2) * 2 * d + (intro ? INTRO : 0); return n * d + (estilo === 'pantalla' ? Math.max(0, Math.max(d, 3.2) - d) : 0) + (intro ? INTRO : 0); }
// Desenfoque propio (no depende del navegador: funciona igual en iPhone y Android). Tres pasadas de promedio = suavidad tipo gaussiano.
function desenfocar(c, r){
  var x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), p = d.data, t = new Uint8ClampedArray(p.length), n = 3;
  function pasada(src, dst, w, h, r, hor){
    var len = hor ? w : h, lin = hor ? h : w, st = hor ? 4 : w * 4, ls = hor ? w * 4 : 4, k, l, i, ch, acc, o, v;
    for (l = 0; l < lin; l++){
      for (ch = 0; ch < 4; ch++){
        o = l * ls + ch; acc = 0;
        for (i = -r; i <= r; i++) acc += src[o + clamp(i, 0, len - 1) * st];
        for (i = 0; i < len; i++){
          dst[o + i * st] = acc / (2 * r + 1);
          acc += src[o + clamp(i + r + 1, 0, len - 1) * st] - src[o + clamp(i - r, 0, len - 1) * st];
        }
      }
    }
  }
  for (var k = 0; k < n; k++){ pasada(p, t, w, h, r, true); pasada(t, p, w, h, r, false); }
  x.putImageData(d, 0, 0);
}
// Copia desenfocada de la foto, tipo "bokeh cremoso": lienzo pequeño, desenfoque amplio y suave; al agrandarlo no se ven cuadros
function fondoDesenf(f, w, h, zoom, radio){
  var s = 6, c = lienzo(w / s, h / s), x = c.getContext('2d');
  x.save(); x.translate(c.width / 2, c.height / 2); x.scale(zoom, zoom); x.translate(-c.width / 2, -c.height / 2);
  x.imageSmoothingQuality = 'high'; cubrir(x, f.bmp, f.w, f.h, -c.width * 0.1, -c.height * 0.1, c.width * 1.2, c.height * 1.2); x.restore();
  var r = Math.max(4, Math.round(radio * 1.6));
  try { desenfocar(c, r); } catch (e) {}
  return c;
}
function crearEscena(fotos, W, H, seg, op){
  op = op || {};
  if (op.estilo === 'prisma') return crearEscenaPrisma(fotos, W, H, seg, op);
  if (op.estilo === 'carriles') return crearEscenaCarriles(fotos, W, H, seg, op);
  if (op.estilo === 'postales') return crearEscenaPostales(fotos, W, H, seg, op);
  var estilo = op.estilo === 'pantalla' ? 'pantalla' : 'papel';
  var n = fotos.length, vertical = H > W, u = Math.min(W, H) / 1080, D = seg || 2.5, Tr = Math.min(estilo === 'pantalla' ? 0.7 : 1.1, D * (estilo === 'pantalla' ? 0.42 : 0.55));
  var dur = [], ini = [], tot = 0;
  for (var q0 = 0; q0 < n; q0++) { dur[q0] = (estilo === 'pantalla' && q0 === 0) ? Math.max(D, 3.2) : D; ini[q0] = tot; tot += dur[q0]; }
  var VEC = { der: [1, 0], izq: [-1, 0], abajo: [0, 1], arriba: [0, -1] }, SEQ_P = ['der', 'arriba', 'izq', 'abajo', 'der', 'abajo', 'izq', 'arriba'], SEQ_S = ['izq', 'arriba', 'der', 'abajo'];
  var _sd = (op.semilla != null ? op.semilla : 12345) >>> 0;
  function _rnd(){ _sd = (_sd + 0x6D2B79F5) >>> 0; var t = _sd; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  var NOMS = ['der', 'izq', 'arriba', 'abajo'];
  function secuencia(n, ini){ var r = [], p = ini || ''; for (var k = 0; k < n; k++) { var c; do { c = NOMS[Math.floor(_rnd() * 4)]; } while (c === p); r.push(c); p = c; } return r; }
  function seqH(n){ var r = [], H2 = ['izq', 'der']; for (var k = 0; k < n; k++) { var c = H2[Math.floor(_rnd() * 2)]; if (k > 1 && r[k - 1] === c && r[k - 2] === c) c = c === 'izq' ? 'der' : 'izq'; r.push(c); } return r; }
  function seqT(n){ var r = [], T2 = ['desliza', 'disuelve']; for (var k = 0; k < n; k++) { var c = T2[_rnd() < 0.58 ? 0 : 1]; if (k > 1 && r[k - 1] === c && r[k - 2] === c) c = c === 'desliza' ? 'disuelve' : 'desliza'; r.push(c); } return r; }
  var DP = secuencia(n + 1), DS = seqH(n + 1), TS = seqT(n + 1);
  function dirP(i){ var t = op.transicion; if (VEC[t]) return t; return DP[i]; }
  function dirS(i){ return i < 1 ? 'izq' : DS[i]; }
  function tipoTr(i){ var t = op.transicion; if (t === 'desliza' || t === 'disuelve') return t; return TS[i]; }
  function trDe(i){ if (papel) return Tr; var t = tipoTr(i); return (t === 'disuelve' ? Math.min(0.8, D * 0.45) : Tr); }
  var I = op.intro ? INTRO : 0, logo = op.logo || null;
  var duracion = tot + I, cache = {}, papel = estilo === 'papel', particulas = papel && op.particulas !== false;
  var rnd = mulberry(20260601), P = [];
  if (particulas) for (var i = 0; i < Math.round(70 * (W * H) / (1080 * 1920)) + 30; i++) {
    var grande = rnd() < 0.12;
    P.push({ x: rnd(), y: rnd(), r: (grande ? 7 + rnd() * 8 : 1.2 + rnd() * 2.6) * u, a: grande ? 0.10 + rnd() * 0.10 : 0.35 + rnd() * 0.45, vx: (rnd() - 0.5) * 0.012, vy: -0.01 - rnd() * 0.03, f: rnd() * 6.28, g: grande });
  }
  var ruido = lienzo(256, 256), rc = ruido.getContext('2d'), rr0 = mulberry(7);
  for (var q = 0; q < 2600; q++) { rc.fillStyle = 'rgba(' + (rr0() < 0.5 ? '120,100,70' : '255,255,255') + ',' + (0.03 + rr0() * 0.07).toFixed(3) + ')'; rc.fillRect(rr0() * 256, rr0() * 256, 1 + rr0() * 2, 1 + rr0() * 2); }

  // Geometría del marco de papel
  var b = vertical ? 0.074 * W : 0.036 * Math.min(W, H), pad = 70 * u;
  var ow = (vertical ? 1.14 : 0.79) * W, oh = (vertical ? 0.76 : 0.79) * H, fw = Math.round(ow - 2 * b), fh = Math.round(oh - 2 * b);

  // Destellos hexagonales (sprites con desenfoque, una sola vez)
  var sprites = [];
  if (papel) [[255, 190, 60], [255, 120, 40], [210, 60, 45], [255, 165, 50], [190, 70, 55], [255, 205, 90]].forEach(function(col){
    var c = lienzo(160, 160), x = c.getContext('2d'); if ('filter' in x) x.filter = 'blur(4px)';
    x.fillStyle = 'rgb(' + col.join(',') + ')'; x.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; x[k ? 'lineTo' : 'moveTo'](80 + 56 * Math.cos(a), 80 + 56 * Math.sin(a)); } x.closePath(); x.fill(); sprites.push(c);
  });

  function ventana(f){
    var c = lienzo(fw, fh), x = c.getContext('2d'), asp = f.w / f.h, wa = fw / fh;
    x.imageSmoothingQuality = 'high';
    var rz = asp / wa; if (rz > 0.72 && rz < 1.4 && cubrirCaras(x, f, 0, 0, fw, fh)) return c;
    x.drawImage(fondoDesenf(f, fw, fh, 1.25, Math.max(2, Math.round(6 * u))), 0, 0, fw, fh);
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, 0, fw, fh);
    var k = Math.min(fw / f.w, fh / f.h), pw = f.w * k, ph = f.h * k;
    x.drawImage(f.bmp, (fw - pw) / 2, (fh - ph) / 2, pw, ph);
    return c;
  }
  function activo(i){
    if (cache[i]) return cache[i];
    var f = fotos[i], res;
    if (papel) {
      var cw = fw + 2 * b, ch = fh + 2 * b, c = lienzo(cw + 2 * pad, ch + 2 * pad), cx = c.getContext('2d');
      cx.shadowColor = 'rgba(30,20,10,.38)'; cx.shadowBlur = 46 * u; cx.shadowOffsetY = 16 * u; cx.fillStyle = '#F6F1E6'; cx.fillRect(pad, pad, cw, ch);
      cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.shadowOffsetY = 0;
      var g = cx.createLinearGradient(pad, pad, pad + cw, pad + ch); g.addColorStop(0, '#FBF8F1'); g.addColorStop(1, '#EBE3D3'); cx.fillStyle = g; cx.fillRect(pad, pad, cw, ch);
      cx.fillStyle = cx.createPattern(ruido, 'repeat'); cx.fillRect(pad, pad, cw, ch);
      cx.save(); cx.shadowColor = 'rgba(40,30,20,.35)'; cx.shadowBlur = 6 * u; cx.fillStyle = '#000'; cx.fillRect(pad + b, pad + b, fw, fh); cx.restore();
      cx.drawImage(ventana(f), pad + b, pad + b);
      // fondo: la misma foto muy desenfocada + marcos grandes inclinados
      var bg = fondoDesenf(f, W, H, 1.7, Math.max(2, Math.round(7 * u))), bx = bg.getContext('2d'), rr = mulberry(100 + i * 13);
      bx.fillStyle = 'rgba(248,244,236,.30)'; bx.fillRect(0, 0, bg.width, bg.height);
      for (var k = 0; k < 4; k++) {
        var sz = (0.55 + rr() * 0.5) * bg.width, asp = fw / fh, ww = sz, hh = sz / asp;
        bx.save(); bx.translate(rr() * bg.width, rr() * bg.height); bx.rotate((rr() < 0.5 ? -1 : 1) * (8 + rr() * 34) * Math.PI / 180);
        bx.strokeStyle = 'rgba(255,251,242,' + (0.34 + rr() * 0.2).toFixed(2) + ')'; bx.lineWidth = Math.max(2, b * 2.4 / 6); bx.strokeRect(-ww / 2, -hh / 2, ww, hh); bx.restore();
      }
      res = { card: c, bg: bg, cw: c.width, ch: c.height };
    } else {
      var c2 = lienzo(W, H), x2 = c2.getContext('2d'), asp2 = f.w / f.h, wa2 = W / H;
      x2.imageSmoothingQuality = 'high';
      if (Math.abs(asp2 / wa2 - 1) <= 0.38 && cubrirCaras(x2, f, 0, 0, W, H)) { /* recorte centrado en los rostros */ }
      else {
        x2.drawImage(fondoDesenf(f, W, H, 1.3, Math.max(2, Math.round(6 * u))), 0, 0, W, H); x2.fillStyle = 'rgba(0,0,0,.14)'; x2.fillRect(0, 0, W, H);
        var kk = Math.min(W / f.w, H / f.h), pw = f.w * kk, ph = f.h * kk; x2.drawImage(f.bmp, (W - pw) / 2, (H - ph) / 2, pw, ph);
      }
      res = { img: c2 };
    }
    cache[i] = res; Object.keys(cache).forEach(function(kk){ if (Math.abs(+kk - i) > 2) delete cache[kk]; });
    return res;
  }

  // ---- Marco de papel ----
  function capaPapel(cx, i, lt, o){
    o = o || {};
    var t = activo(i), s = (i % 2 ? -1 : 1), h = clamp(lt / D, 0, 1.3), tin = o.tin == null ? 1 : o.tin;
    cx.save(); cx.translate(W / 2 + (o.bgDx || 0), H / 2 + (o.bgDy || 0)); cx.rotate(s * 0.9 * h * Math.PI / 180); cx.scale(1.06 * (1 + 0.08 * h), 1.06 * (1 + 0.08 * h)); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.bg, -W / 2, -H / 2, W, H); cx.restore();
    var rr = GIROS[i % GIROS.length], rot = rr + s * 0.6 * h, esc = 1 + 0.035 * h;
    if (tin < 1) { var p = ease(tin); rot += (1 - p) * (rr >= 0 ? -3 : 3); esc *= 1 + (1 - p) * 0.12; }
    cx.save(); cx.translate(W / 2 + (o.cardDx || 0), H / 2 + (o.cardDy || 0)); cx.rotate(rot * Math.PI / 180); cx.scale(esc, esc); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.card, -t.cw / 2, -t.ch / 2);
    if (o.veil > 0.001) {
      var x0 = -t.cw / 2 + pad + b, y0 = -t.ch / 2 + pad + b, vd = o.veilDir || 'der', gv, ex, ey, fe;
      cx.beginPath(); cx.rect(x0, y0, fw, fh); cx.clip();
      if (vd === 'der' || vd === 'izq') {
        if (vd === 'izq') { var mx = x0 + fw / 2; cx.translate(mx, 0); cx.scale(-1, 1); cx.translate(-mx, 0); }
        fe = fw * 0.22; ex = x0 + (1 - o.veil) * (fw + fe) - fe;
        gv = cx.createLinearGradient(ex, 0, ex + fe, 0); gv.addColorStop(0, 'rgba(236,236,236,0)'); gv.addColorStop(1, 'rgba(236,236,236,.94)');
        cx.fillStyle = gv; cx.fillRect(ex, y0, fe, fh); cx.fillStyle = 'rgba(236,236,236,.94)'; cx.fillRect(ex + fe, y0, fw, fh);
      } else {
        if (vd === 'arriba') { var my = y0 + fh / 2; cx.translate(0, my); cx.scale(1, -1); cx.translate(0, -my); }
        fe = fh * 0.22; ey = y0 + (1 - o.veil) * (fh + fe) - fe;
        gv = cx.createLinearGradient(0, ey, 0, ey + fe); gv.addColorStop(0, 'rgba(236,236,236,0)'); gv.addColorStop(1, 'rgba(236,236,236,.94)');
        cx.fillStyle = gv; cx.fillRect(x0, ey, fw, fe); cx.fillStyle = 'rgba(236,236,236,.94)'; cx.fillRect(x0, ey + fe, fw, fh);
      }
    }
    cx.restore();
  }
  // Barrido blanco en 4 direcciones: la franja cruza la pantalla, el marco nuevo entra desde el lado contrario y el viejo sale hacia donde va la franja
  var tmp = null;
  function barrido(cx, i, lt, trr, dir){
    var v = VEC[dir] || VEC.der, hz = v[0] !== 0, sg = v[0] + v[1], L = hz ? W : H, p = ease(lt / trr), hw = 0.4 * L, e2 = ease(clamp((p - 0.12) / 0.88, 0, 1));
    var s0 = -0.45 * L + p * 1.9 * L, sc = sg > 0 ? s0 : L - s0;
    capaPapel(cx, i - 1, lt + dur[i - 1], { bgDx: v[0] * p * 0.10 * W, bgDy: v[1] * p * 0.10 * H, cardDx: v[0] * p * 0.32 * W, cardDy: v[1] * p * 0.32 * H });
    if (!tmp) tmp = lienzo(W, H);
    var tx = tmp.getContext('2d'); tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.globalAlpha = 1; tx.clearRect(0, 0, W, H);
    capaPapel(tx, i, lt, { bgDx: -v[0] * (1 - p) * 0.12 * W, bgDy: -v[1] * (1 - p) * 0.12 * H, cardDx: -v[0] * (1 - e2) * 1.1 * W, cardDy: -v[1] * (1 - e2) * 1.1 * H, tin: e2, veil: 1 - clamp((p - 0.42) / 0.5, 0, 1), veilDir: dir });
    tx.globalCompositeOperation = 'destination-in';
    var lin = function(c, a, b2){ return hz ? c.createLinearGradient(a, 0, b2, 0) : c.createLinearGradient(0, a, 0, b2); };
    var gm = lin(tx, sc - 0.08 * L, sc + 0.08 * L); gm.addColorStop(0, sg > 0 ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)'); gm.addColorStop(1, sg > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
    tx.fillStyle = gm; tx.fillRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over';
    cx.drawImage(tmp, 0, 0);
    var gb = lin(cx, sc - hw, sc + hw);
    gb.addColorStop(0, 'rgba(240,240,240,0)'); gb.addColorStop(0.3, 'rgba(240,240,240,.93)'); gb.addColorStop(0.7, 'rgba(240,240,240,.93)'); gb.addColorStop(1, 'rgba(240,240,240,0)');
    cx.fillStyle = gb;
    cx.save(); cx.beginPath();
    if (hz) { cx.fillRect(sc - hw, 0, 2 * hw, H); cx.rect(sc - hw, 0, 2 * hw, H); } else { cx.fillRect(0, sc - hw, W, 2 * hw); cx.rect(0, sc - hw, W, 2 * hw); }
    cx.clip();
    var bk = [[0.2, 0.22, 0.28], [-0.1, 0.55, 0.22], [0.1, 0.82, 0.3]];
    for (var q = 0; q < bk.length; q++) {
      var bs = sc + bk[q][0] * hw, bt = bk[q][1] * (hz ? H : W), bx2 = hz ? bs : bt, by2 = hz ? bt : bs, br = bk[q][2] * Math.min(W, H) * 0.9, gr = cx.createRadialGradient(bx2, by2, 0, bx2, by2, br);
      gr.addColorStop(0, 'rgba(210,210,210,.55)'); gr.addColorStop(1, 'rgba(210,210,210,0)'); cx.fillStyle = gr; cx.fillRect(bx2 - br, by2 - br, 2 * br, 2 * br);
    }
    cx.restore();
  }
  function destellos(cx, t, m){
    cx.save(); cx.globalCompositeOperation = 'lighter';
    var R = 0.62 * Math.max(W, H), L = [[0.35, 0.21, 0.0], [0.6, 0.17, 2.1]];
    for (var k = 0; k < L.length; k++) {
      var x = W * (0.5 + 0.5 * Math.cos(t * L[k][1] + L[k][2])), y = H * (0.5 + 0.45 * Math.sin(t * L[k][1] * 0.8 + L[k][2] * 1.7)), gr = cx.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(200,130,45,' + ((0.20 + 0.06 * Math.sin(t * 0.7 + k)) * m).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(200,130,45,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    }
    for (var f = 0; f < 2; f++) {
      var ph = ((t * 0.045 + f * 0.5) % 1), al = Math.sin(ph * Math.PI), ang = (-35 + 10 * Math.sin(t * 0.2 + f)) * Math.PI / 180;
      var bx = W * (-0.1 + 1.2 * ph), by = H * (0.25 + 0.5 * ((f * 0.37 + 0.2) % 1)), sp = 0.085 * Math.max(W, H), Rr = 0.07 * Math.min(W, H) * (vertical ? 1.4 : 1.9);
      for (var k2 = 0; k2 < sprites.length; k2++) {
        var d = (k2 - 1) * sp, rs = Rr * (1.1 - 0.13 * k2) / 56;
        cx.globalAlpha = m * al * (k2 === 0 ? 0.33 : 0.16 + 0.04 * (k2 % 3));
        cx.drawImage(sprites[k2], bx + d * Math.cos(ang) - 80 * rs, by + d * Math.sin(ang) - 80 * rs, 160 * rs, 160 * rs);
      }
    }
    cx.restore();
  }
  function dibujarParticulas(cx, t, m){
    if (!P.length) return;
    cx.save();
    for (var i = 0; i < P.length; i++) {
      var p = P[i], x = (((p.x + p.vx * t) % 1) + 1) % 1 * W, y = (((p.y + p.vy * t) % 1) + 1) % 1 * H, al = m * p.a * (0.55 + 0.45 * Math.sin(p.f + t * (p.g ? 0.6 : 1.4)));
      if (p.g) { var gr = cx.createRadialGradient(x, y, 0, x, y, p.r); gr.addColorStop(0, 'rgba(255,255,255,' + al.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, p.r, 0, 6.2832); cx.fill(); }
      else { cx.fillStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; cx.beginPath(); cx.arc(x, y, p.r, 0, 6.2832); cx.fill(); }
    }
    cx.restore();
  }

  // ---- Pantalla completa (estilo iPhone) ----
  function capaPantalla(cx, i, lt, dx, dy){
    var t = activo(i), h = clamp(lt / D, 0, 1.3), z = 1 + 0.08 * h, s = (i % 2 ? -1 : 1);
    cx.save(); cx.translate(W / 2 + dx + s * 0.02 * W * h, H / 2 + (dy || 0)); cx.scale(z, z); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.img, -W / 2, -H / 2); cx.restore();
  }
  function lineas(cx, txt, maxW){
    var pal = String(txt || '').split(/\s+/).filter(Boolean), out = [], cur = '';
    pal.forEach(function(w){ var t2 = cur ? cur + ' ' + w : w; if (cx.measureText(t2).width > maxW && cur) { out.push(cur); cur = w; } else cur = t2; });
    if (cur) out.push(cur); return out.slice(0, 3);
  }
  function portada(cx, t){
    var d0 = dur[0], al = Math.min(clamp((t - 0.25) / 0.55, 0, 1), clamp((d0 - 0.15 - t) / 0.45, 0, 1));
    var tit = String(op.titulo || '').trim(), sub = String(op.subtitulo || '').trim().toUpperCase();
    if (al <= 0 || (!tit && !sub)) return;
    var gr = cx.createLinearGradient(0, H * 0.45, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (0.5 * al).toFixed(3) + ')'); cx.fillStyle = gr; cx.fillRect(0, H * 0.45, W, H * 0.55);
    var fs = vertical ? W * 0.072 : H * 0.095, fam = 'Jost, "Helvetica Neue", Arial, sans-serif';
    cx.save(); cx.globalAlpha = al; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillStyle = '#fff'; cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = fs * 0.25;
    cx.font = '600 ' + fs + 'px ' + fam;
    var L = lineas(cx, tit, W * 0.82), y0 = (vertical ? 0.80 : 0.80) * H, lh = fs * 1.14, ysub = y0 + (L.length - 1) * lh * 0 ;
    var yFirst = y0 - (L.length - 1) * lh;
    L.forEach(function(s, k){ cx.fillText(s, W / 2, yFirst + k * lh + (1 - al) * fs * 0.4); });
    if (sub) { cx.font = '500 ' + (fs * 0.34) + 'px ' + fam; try { cx.letterSpacing = (fs * 0.07) + 'px'; } catch (e) {} cx.fillStyle = 'rgba(255,255,255,.88)'; cx.fillText(sub, W / 2, y0 + fs * 0.62 + (1 - al) * fs * 0.4); try { cx.letterSpacing = '0px'; } catch (e) {} }
    cx.restore();
  }

  // ---- Marca al inicio ----
  function capaIntro(cx, t, dx, dy){
    cx.save(); cx.translate(dx, dy);
    var g = cx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); g.addColorStop(0, papel ? '#3a2512' : '#1d1813'); g.addColorStop(1, '#0b0806'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    var a = clamp((t - 0.25) / 0.8, 0, 1), e = ease(a);
    cx.globalAlpha = e; cx.translate(W / 2, H / 2); cx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
    if (logo && logo.bmp) {
      var lw = (vertical ? 0.62 : 0.32) * W, lh = lw * logo.h / logo.w, mh = H * (vertical ? 0.3 : 0.4); if (lh > mh) { lw *= mh / lh; lh = mh; }
      cx.imageSmoothingQuality = 'high'; cx.drawImage(logo.bmp, -lw / 2, -lh / 2, lw, lh);
    } else if (op.nombre) {
      var fs = (vertical ? W * 0.085 : H * 0.1); cx.fillStyle = '#E9D9B8'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '300 ' + fs + 'px "Cormorant Garamond", Georgia, serif';
      try { cx.letterSpacing = (fs * 0.12) + 'px'; } catch (e2) {}
      cx.fillText(String(op.nombre).toUpperCase(), 0, 0);
    }
    cx.restore();
  }

  function dibujar(cx, t){
    t = clamp(t, 0, duracion - 0.0001);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.filter = 'none'; cx.fillStyle = papel ? '#0b0806' : '#000'; cx.fillRect(0, 0, W, H);
    var fil = 'filter' in cx, tt = t - I, i = 0, lt = 0;
    if (tt >= 0) { while (i < n - 1 && tt >= ini[i + 1]) i++; lt = tt - ini[i]; }
    if (papel) {
      if (tt < 0) capaIntro(cx, t, 0, 0);
      else if (lt < Tr && i > 0) barrido(cx, i, lt, Tr, dirP(i));
      else if (lt < Tr) {
        var p = ease(lt / Tr), bl = Math.sin(Math.PI * p) * 9 * u;
        if (fil && bl > 0.6) cx.filter = 'blur(' + bl.toFixed(1) + 'px)';
        if (I > 0) capaIntro(cx, t, 0, -p * H * 0.9);
        capaPapel(cx, i, lt, { bgDy: (1 - p) * H, cardDy: (1 - p) * H * 1.15, tin: lt / Tr });
        cx.filter = 'none';
      } else capaPapel(cx, i, lt, {});
      if (tt >= 0) { var ef = clamp((tt - 0.72 * Tr) / 0.85, 0, 1); ef = ef * ef * (3 - 2 * ef); destellos(cx, tt, ef); dibujarParticulas(cx, tt, ef); }
    } else {
      if (tt < 0) capaIntro(cx, t, 0, 0);
      else if ((i > 0 || I > 0) && lt < (i > 0 ? trDe(i) : Tr)) {
        var ty = i > 0 ? tipoTr(i) : 'desliza', trr = i > 0 ? trDe(i) : Tr;
        if (ty === 'disuelve') {
          var q = clamp(lt / trr, 0, 1), pq = q * q * (3 - 2 * q);
          capaPantalla(cx, i - 1, lt + dur[i - 1], 0); cx.globalAlpha = pq; capaPantalla(cx, i, lt, 0); cx.globalAlpha = 1;
        } else {
          var p2 = ease(lt / trr);
          var vv = VEC[dirS(i)];
          if (i > 0) capaPantalla(cx, i - 1, lt + dur[i - 1], vv[0] * p2 * W * 0.35, vv[1] * p2 * H * 0.35); else capaIntro(cx, t, vv[0] * p2 * W * 0.35, vv[1] * p2 * H * 0.35);
          cx.fillStyle = 'rgba(0,0,0,' + (0.4 * p2).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
          capaPantalla(cx, i, lt, -vv[0] * (1 - p2) * W, -vv[1] * (1 - p2) * H);
          var ex = vv[0] ? (vv[0] > 0 ? p2 * W : (1 - p2) * W) : 0, ey = vv[1] ? (vv[1] > 0 ? p2 * H : (1 - p2) * H) : 0, gr = Math.max(2, 3.5 * u); cx.fillStyle = '#000'; if (vv[0]) cx.fillRect(ex - gr / 2, 0, gr, H); else cx.fillRect(0, ey - gr / 2, W, gr);
        }
      } else capaPantalla(cx, i, lt, 0);
      if (i === 0 && tt >= 0) portada(cx, tt);
    }
    var fin = duracion - t;
    var neg = Math.max(clamp(1 - fin / 0.7, 0, 1), (papel && I === 0) ? 0 : clamp(1 - t / (I > 0 ? 0.6 : 0.35), 0, 1));
    if (neg > 0) { cx.fillStyle = 'rgba(8,6,4,' + neg.toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
  }
  return { W: W, H: H, duracion: duracion, dibujar: dibujar, n: n, seg: D, estilo: estilo };
}

// ---------- Plantilla «Prisma»: dos fotos por pantalla con corte inclinado ----------
// Horizontal (16:9): las dos fotos van lado a lado. Vertical (9:16): una arriba y otra abajo.
function crearEscenaPrisma(fotos, W, H, seg, op){
  var np = Math.floor(fotos.length / 2), D = seg || 2.5, Dp = 2 * D, vert = H > W, u = Math.min(W, H) / 1080, Tr = Math.min(0.42, Dp * 0.14);
  var I = op.intro ? INTRO : 0, logo = op.logo || null, acento = op.acento || '#C9A877';
  var tit = String(op.titulo || '').trim(), sub = String(op.subtitulo || '').trim(), conBanner = !!(tit || sub);
  var bh = conBanner ? (vert ? 0.135 * H : (W === H ? 0.27 * H : 0.215 * H)) : 0, sl = 0.028 * Math.min(W, H) * (vert ? 1.2 : 1.6);
  var m = /^#?([0-9a-f]{6})$/i.exec(acento), lum = m ? (0.299 * parseInt(m[1].slice(0, 2), 16) + 0.587 * parseInt(m[1].slice(2, 4), 16) + 0.114 * parseInt(m[1].slice(4, 6), 16)) : 200, tinta = lum > 150 ? '#1b1712' : '#fbf7ee';
  var famT = '"Cormorant Garamond", Georgia, serif', famS = 'Jost, "Helvetica Neue", Arial, sans-serif';
  var tot = np * Dp, duracion = tot + I, fondos = {};
  function lerp(a, b, p){ return a + (b - a) * p; }
  function fondo(i, rw, rh){
    var k = i + '|' + Math.round(rw) + 'x' + Math.round(rh); if (fondos[k]) return fondos[k];
    var c = fondoDesenf(fotos[i], rw, rh, 1.3, Math.max(2, Math.round(6 * u))); fondos[k] = c;
    var ks = Object.keys(fondos); if (ks.length > 24) delete fondos[ks[0]];
    return c;
  }
  // Foto i en el rectángulo. El modo (recorte centrado en rostros / foto completa sobre fondo suave) se decide UNA vez por foto con el tamaño normal del recuadro, para que no cambie durante el movimiento.
  var modos = {}, nomW = vert ? W : W / 2, nomH = vert ? (H - bh) / 2 : H - bh;
  function modoRecorte(i){
    if (modos[i] === undefined) { var f = fotos[i], dif = Math.abs(f.w / f.h / (nomW / nomH) - 1), hayCaras = !!carasClave(f); modos[i] = hayCaras ? (dif <= 0.6 && cabeCaras(f, nomW, nomH)) : dif <= 0.22; }
    return modos[i];
  }
  function foto(cx, i, rx, ry, rw, rh, zoom){
    if (rw < 2 || rh < 2) return;
    var f = fotos[i];
    cx.save(); cx.beginPath(); cx.rect(rx, ry, rw, rh); cx.clip();
    cx.translate(rx + rw / 2, ry + rh / 2); cx.scale(zoom, zoom); cx.translate(-rw / 2, -rh / 2); cx.imageSmoothingQuality = 'high';
    if (modoRecorte(i)) cubrirCarasF(cx, f, 0, 0, rw, rh);
    else {
      cx.drawImage(fondo(i, rw, rh), 0, 0, rw, rh); cx.fillStyle = 'rgba(0,0,0,.14)'; cx.fillRect(0, 0, rw, rh);
      var k = Math.min(rw / f.w, rh / f.h), pw = f.w * k, ph = f.h * k; cx.drawImage(f.bmp, (rw - pw) / 2, (rh - ph) / 2, pw, ph);
    }
    cx.restore();
  }
  // Etiqueta tipo "píldora" (ANTES / AHORA) que aparece con un pequeño rebote
  var etqA = String(op.etqA || '').trim(), etqB = String(op.etqB || '').trim();
  function pildora(cx, txt, mx, my, p, claro){
    if (!txt || p <= 0) return;
    var e = ease(clamp(p, 0, 1)), c1 = 1.70158, q = clamp(p, 0, 1) - 1, bk = 1 + (c1 + 1) * q * q * q + c1 * q * q, esc = 0.55 + 0.45 * bk, fs = 46 * u;
    cx.save(); cx.translate(mx, my); cx.scale(esc, esc); cx.globalAlpha = clamp(p * 3, 0, 1);
    cx.font = '700 ' + fs + 'px ' + famS; try { cx.letterSpacing = (fs * 0.04) + 'px'; } catch (e2) {}
    var w = cx.measureText(txt).width + fs * 1.1, h = fs * 1.55, r = h * 0.28;
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 10 * u; cx.shadowOffsetY = 3 * u;
    cx.fillStyle = claro ? '#ffffff' : acento; cx.beginPath();
    cx.moveTo(-w / 2 + r, -h / 2); cx.lineTo(w / 2 - r, -h / 2); cx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); cx.lineTo(w / 2, h / 2 - r); cx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    cx.lineTo(-w / 2 + r, h / 2); cx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); cx.lineTo(-w / 2, -h / 2 + r); cx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); cx.closePath(); cx.fill();
    cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.shadowOffsetY = 0;
    cx.fillStyle = claro ? '#1b1712' : tinta; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(txt, 0, h * 0.03);
    try { cx.letterSpacing = '0px'; } catch (e3) {}
    cx.restore();
  }
  function banner(cx, y0){
    if (!conBanner) return;
    cx.save(); cx.translate(0, y0); cx.fillStyle = acento; cx.fillRect(0, 0, W, bh); cx.fillStyle = tinta; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    var T = tit.toUpperCase(), S = sub, fs = bh * (S ? 0.36 : 0.46), fs2 = bh * 0.2;
    function ajusta(txt, tam, peso, fam){ cx.font = peso + ' ' + tam + 'px ' + fam; while (cx.measureText(txt).width > W * 0.9 && tam > 12) { tam *= 0.95; cx.font = peso + ' ' + tam + 'px ' + fam; } return tam; }
    var yt = S ? bh * 0.45 : bh * 0.62;
    if (T) { fs = ajusta(T, fs, 700, famS); cx.fillText(T, W / 2, yt); }
    if (S) { fs2 = ajusta(S, Math.min(fs2, fs * 0.62), 600, famS); cx.fillText(S, W / 2, yt + fs * 0.2 + fs2 * 1.05); }
    cx.restore();
  }
  // Un par completo en su tiempo local lt. sal = avance de salida (0..1) para subir el banner.
  function par(cx, k, lt, sal){
    var iA = 2 * k, iB = 2 * k + 1, h = clamp(lt / Dp, 0, 1.2), ban = k === 0 && conBanner, u1 = lt / Dp;
    var yTop = !conBanner ? 0 : (k === 0 ? bh * salida((lt - 0.1) / 0.4) : bh), entrando = k === 0 && lt < 0.85, alto = H - yTop;
    // Coreografía del par: mitad y mitad -> brilla la 1.ª foto (ANTES) -> brilla la 2.ª foto (AHORA)
    var fr = 0.5;
    if (u1 >= 0.42 && u1 < 0.50) fr = lerp(0.5, 0.68, ease((u1 - 0.42) / 0.08));
    else if (u1 >= 0.50 && u1 < 0.68) fr = 0.68;
    else if (u1 >= 0.68 && u1 < 0.78) fr = lerp(0.68, 0.32, ease((u1 - 0.68) / 0.10));
    else if (u1 >= 0.78) fr = 0.32;
    fr += 0.006 * Math.sin(lt * 1.3 + k);
    var ini = vert ? yTop + alto * fr : W * fr, fin = vert ? H : W, d = ini;
    if (k === 0) d = lerp(fin + 2 * sl, ini, salida((lt - (conBanner ? 0.4 : 0.3)) / 0.45));
    var sA = clamp((fr - 0.5) / 0.18, 0, 1), sB = clamp((0.5 - fr) / 0.18, 0, 1), zA = 1 + 0.06 * h + 0.05 * sA, zB = 1 + 0.06 * h + 0.05 * sB;
    cx.save(); cx.beginPath();
    if (vert) { cx.moveTo(0, yTop); cx.lineTo(W, yTop); cx.lineTo(W, d - sl); cx.lineTo(0, d + sl); } else { cx.moveTo(0, yTop); cx.lineTo(d + sl, yTop); cx.lineTo(d - sl, H); cx.lineTo(0, H); }
    cx.closePath(); cx.clip();
    if (vert) foto(cx, iA, 0, yTop, W, Math.max(2, Math.min(d + sl, H) - yTop), zA); else foto(cx, iA, 0, yTop, Math.max(2, Math.min(d + sl, W)), alto, zA);
    cx.restore();
    if (d < fin + sl) {
      cx.save(); cx.beginPath();
      if (vert) { cx.moveTo(0, d + sl); cx.lineTo(W, d - sl); cx.lineTo(W, H); cx.lineTo(0, H); } else { cx.moveTo(d + sl, yTop); cx.lineTo(W, yTop); cx.lineTo(W, H); cx.lineTo(d - sl, H); }
      cx.closePath(); cx.clip();
      if (vert) foto(cx, iB, 0, d - sl, W, entrando ? alto / 2 + sl : Math.max(2, H - d + sl), zB); else foto(cx, iB, d - sl, yTop, entrando ? W / 2 + sl : Math.max(2, W - d + sl), alto, zB);
      cx.restore();
      cx.save(); cx.strokeStyle = 'rgba(255,255,255,.95)'; cx.lineWidth = Math.max(2, 0.006 * Math.min(W, H)); cx.beginPath();
      if (vert) { cx.moveTo(0, d + sl); cx.lineTo(W, d - sl); } else { cx.moveTo(d + sl, yTop); cx.lineTo(d - sl, H); }
      cx.stroke(); cx.restore();
    }
    if (u1 < 0.5 && d < fin - sl) {
      var t0 = k === 0 ? (conBanner ? 1.0 : 0.85) : 0.3, vis = 1 - clamp((u1 - 0.40) / 0.06, 0, 1), pa = clamp((lt - t0) / 0.35, 0, 1) * vis, pb = clamp((lt - t0 - 0.18) / 0.35, 0, 1) * vis, mg = 0.045 * Math.min(W, H);
      if (vert) { pildora(cx, etqA, W / 2, d - sl - mg - 36 * u, pa, true); pildora(cx, etqB, W / 2, H - mg - 36 * u, pb, false); }
      else { pildora(cx, etqA, (d - sl) / 2, H - mg - 36 * u, pa, true); pildora(cx, etqB, (d + W) / 2, H - mg - 36 * u, pb, false); }
    }
  }
  function intro(cx, t){
    var g = cx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); g.addColorStop(0, '#1d1813'); g.addColorStop(1, '#0b0806'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    var a = clamp((t - 0.25) / 0.8, 0, 1), e = ease(a); cx.save(); cx.globalAlpha = e; cx.translate(W / 2, H / 2); cx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
    if (logo && logo.bmp) { var lw = (vert ? 0.62 : 0.32) * W, lh = lw * logo.h / logo.w, mh = H * (vert ? 0.3 : 0.4); if (lh > mh) { lw *= mh / lh; lh = mh; } cx.imageSmoothingQuality = 'high'; cx.drawImage(logo.bmp, -lw / 2, -lh / 2, lw, lh); }
    else if (op.nombre) { var fs = (vert ? W * 0.085 : H * 0.1); cx.fillStyle = '#E9D9B8'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '300 ' + fs + 'px "Cormorant Garamond", Georgia, serif'; try { cx.letterSpacing = (fs * 0.12) + 'px'; } catch (e2) {} cx.fillText(String(op.nombre).toUpperCase(), 0, 0); }
    cx.restore();
  }
  function dibujar(cx, t){
    t = clamp(t, 0, duracion - 0.0001);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.filter = 'none'; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    var fil = 'filter' in cx, tt = t - I, k = 0, lt = 0;
    if (tt >= 0) { k = Math.min(np - 1, Math.floor(tt / Dp)); lt = tt - k * Dp; }
    if (tt < 0) intro(cx, t);
    else if (k > 0 && lt < Tr) {
      var p = ease(lt / Tr), bl = Math.sin(Math.PI * p) * 16 * u, sk = 0.22 * Math.sin(Math.PI * p);
      var mover = function(dd, fn){
        cx.save(); if (fil && bl > 0.6) cx.filter = 'blur(' + bl.toFixed(1) + 'px)';
        if (vert) cx.transform(1, sk, 0, 1, 0, -sk * W / 2 + dd); else cx.transform(1, 0, sk, 1, -sk * H / 2 + dd, 0);
        fn(); cx.restore();
      }, L = (vert ? H : W) * 1.12;
      mover(-p * L, function(){ par(cx, k - 1, lt + Dp, p); });
      mover((1 - p) * L, function(){ par(cx, k, lt, 0); });
    } else {
      if (k === 0 && I > 0 && lt < 0.4) { intro(cx, t); cx.globalAlpha = ease(lt / 0.4); }
      par(cx, k, lt, 0); cx.globalAlpha = 1;
    }
    if (conBanner && tt >= 0) banner(cx, k === 0 ? bh * salida((lt - 0.1) / 0.4) - bh : 0);
    var fin = duracion - t, neg = Math.max(clamp(1 - fin / 0.6, 0, 1), I > 0 ? 0 : clamp(1 - t / 0.25, 0, 1));
    if (neg > 0) { cx.fillStyle = 'rgba(0,0,0,' + neg.toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
  }
  return { W: W, H: H, duracion: duracion, dibujar: dibujar, n: fotos.length, seg: D, estilo: 'prisma' };
}


// ---------- Foco de interés: rostros si los hay; si no, la zona más llamativa (contraste + color) ----------
function foco(f){
  if (f._foco) return f._foco;
  var u = carasClave(f), r;
  if (u) r = { x: (u.x + u.w / 2) / f.w, y: (u.y + u.h / 2) / f.h, cara: true, u: u };
  else {
    r = { x: 0.5, y: 0.45, cara: false, u: null };
    try {
      var sw = 48, sh = Math.max(8, Math.round(48 * f.h / f.w)), c = lienzo(sw, sh), x = c.getContext('2d'); x.drawImage(f.bmp, 0, 0, sw, sh);
      var d = x.getImageData(0, 0, sw, sh).data, L = new Float32Array(sw * sh), S = new Float32Array(sw * sh), i, j, px, mx = 0, vals = [];
      for (i = 0; i < sw * sh; i++) { var R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], mxc = Math.max(R, G, B), mnc = Math.min(R, G, B); L[i] = 0.299 * R + 0.587 * G + 0.114 * B; S[i] = mxc ? (mxc - mnc) / mxc : 0; }
      var W2 = new Float32Array(sw * sh);
      for (j = 1; j < sh - 1; j++) for (i = 1; i < sw - 1; i++) {
        px = j * sw + i; var g = Math.abs(L[px + 1] - L[px - 1]) + Math.abs(L[px + sw] - L[px - sw]);
        var dx = (i / sw - 0.5) * 2, dy = (j / sh - 0.5) * 2, centro = 1 - 0.45 * Math.min(1, Math.sqrt(dx * dx + dy * dy));
        W2[px] = (g / 255 + S[px] * 0.6) * centro; vals.push(W2[px]);
      }
      vals.sort(function(a, b){ return a - b; }); var th = vals[Math.floor(vals.length * 0.82)] || 0, sx = 0, sy = 0, st = 0;
      for (j = 1; j < sh - 1; j++) for (i = 1; i < sw - 1; i++) { px = j * sw + i; if (W2[px] >= th) { var w = W2[px]; sx += i * w; sy += j * w; st += w; } }
      if (st > 0) { r = { x: (sx / st) / sw, y: (sy / st) / sh, cara: false, u: null }; if (f.h > f.w * 1.05) r.y = clamp(r.y * 0.5 + 0.1, 0.18, 0.42); }
    } catch (e) {}
  }
  f._foco = r; return r;
}
// Ventana de recorte (en píxeles de la foto) para una celda w×h: z = acercamiento, q = avance 0..1 de 0 a 1, dir = dirección del movimiento
function ventanaFoco(f, w, h, z, q, dir){
  var fc = foco(f), k = Math.max(w / f.w, h / f.h) * z, sw = w / k, sh = h / k, mx = sw * 0.07, my = sh * 0.07, lo = 0, hi = f.w - sw, sx, sy, cy;
  if (fc.u) {
    lo = clamp(fc.u.x + fc.u.w + mx - sw, 0, f.w - sw); hi = clamp(fc.u.x - mx, 0, f.w - sw);
    if (lo > hi) { var mid = (lo + hi) / 2; lo = hi = mid; }
    cy = fc.u.y + fc.u.h / 2 - sh * 0.4;
  } else cy = fc.y * f.h - sh * 0.5;
  sy = clamp(cy, 0, f.h - sh);
  if (fc.u) { if (fc.u.y < sy + my) sy = clamp(fc.u.y - my, 0, f.h - sh); }
  // el movimiento va de un extremo permitido al otro
  var a = dir > 0 ? hi : lo, b = dir > 0 ? lo : hi; sx = a + (b - a) * q;
  if (!fc.u) { var cxn = fc.x * f.w - sw / 2; lo = clamp(cxn - sw * 0.12, 0, f.w - sw); hi = clamp(cxn + sw * 0.12, 0, f.w - sw); a = dir > 0 ? hi : lo; b = dir > 0 ? lo : hi; sx = a + (b - a) * q; }
  return { sx: sx, sy: sy, sw: sw, sh: sh };
}

// ---------- Tres bandas: arriba y abajo se deslizan a un lado, la del medio al otro (con acercamiento) ----------
// Color bonito de una foto: tono dominante (le resta peso al tono de la piel para que no todo salga naranja), suavizado
function colorFoto(f, respaldo){
  if (f._tono) return f._tono;
  var m = /^#?([0-9a-f]{6})$/i.exec(respaldo || ''), rf = m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : [201, 168, 119], res = rf;
  try {
    var c = lienzo(24, 24), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(f.bmp, 0, 0, 24, 24); var d = x.getImageData(0, 0, 24, 24).data, bins = [], i, k;
    for (k = 0; k < 12; k++) bins.push({ w: 0, cx: 0, cy: 0, ls: 0 });
    var lum = 0;
    for (i = 0; i < d.length; i += 4) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx, sa = mx ? (mx - mn) / mx : 0, h = 0, dd = mx - mn; lum += 0.299 * r + 0.587 * g + 0.114 * b;
      if (sa < 0.18 || v < 0.22) continue;
      if (dd) h = mx === r ? ((g - b) / dd + 6) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60;
      var w = sa * v * ((h > 8 && h < 42) ? 0.4 : 1), bi = bins[Math.floor(h / 30) % 12]; bi.w += w; bi.cx += w * Math.cos(h * Math.PI / 180); bi.cy += w * Math.sin(h * Math.PI / 180);
    }
    var best = bins[0]; bins.forEach(function(b2){ if (b2.w > best.w) best = b2; });
    if (best.w > 2.5) {
      var hh = (Math.atan2(best.cy, best.cx) * 180 / Math.PI + 360) % 360, L = 0.6, S = 0.42, q2 = L < .5 ? L * (1 + S) : L + S - L * S, p2 = 2 * L - q2;
      var hue = function(t){ t = (t + 1) % 1; return t < 1 / 6 ? p2 + (q2 - p2) * 6 * t : t < .5 ? q2 : t < 2 / 3 ? p2 + (q2 - p2) * (2 / 3 - t) * 6 : p2; };
      res = [hue(hh / 360 + 1 / 3) * 255, hue(hh / 360) * 255, hue(hh / 360 - 1 / 3) * 255];
    } else { var l2 = Math.round(150 + 70 * (lum / (d.length / 4))); res = [Math.min(235, l2 + 8), l2, Math.max(120, l2 - 14)]; }
  } catch (e) {}
  f._tono = res; return res;
}
function crearEscenaCarriles(fotos, W, H, seg, op){
  var n = fotos.length, u = Math.min(W, H) / 1080, I = op.intro ? INTRO : 0, logo = op.logo || null, acento = op.acento || '#C9A877';
  var tit = String(op.titulo || '').trim(), sub = String(op.subtitulo || '').trim(), conTit = !!(tit || sub);
  var m = /^#?([0-9a-f]{6})$/i.exec(acento), lum = m ? (0.299 * parseInt(m[1].slice(0, 2), 16) + 0.587 * parseInt(m[1].slice(2, 4), 16) + 0.114 * parseInt(m[1].slice(4, 6), 16)) : 200, tinta = lum > 150 ? '#1b1712' : '#fbf7ee';
  var famS = 'Jost, "Helvetica Neue", Arial, sans-serif';
  // La cantidad de fotos decide la velocidad: el video dura entre 12 y 45 s y cada banda reparte ese tiempo entre sus fotos
  var maxL = Math.ceil(n / 3), dur = clamp(n * 1.7, 12, 45), Dp = clamp(dur / maxL, 1.9, 9), duracion = dur + I;
  var th = 0, g = 12 * u, bh = (H - th - 2 * g) / 3, DIR = [1, -1, 1];
  var listas = [0, 1, 2].map(function(r){ var L = []; for (var i = r; i < n; i += 3) L.push(i); if (!L.length) L.push(r % n); return L; });
  // Color de cada foto: se toma el tono más presente (cielo, vegetación, ropa…) y se suaviza para que combine siempre
  var tonos0 = fotos.map(function(f){ return colorFoto(f, acento); }), base = tonos0[0], mejor = 1e12;
  tonos0.forEach(function(c){ var sd = 0; tonos0.forEach(function(o){ sd += Math.abs(c[0] - o[0]) + Math.abs(c[1] - o[1]) + Math.abs(c[2] - o[2]); }); if (sd < mejor) { mejor = sd; base = c; } });
  var tonos = tonos0.map(function(c){ return [base[0] + (c[0] - base[0]) * 0.3, base[1] + (c[1] - base[1]) * 0.3, base[2] + (c[2] - base[2]) * 0.3]; });
  function mezclaC(a, b, t){ return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgbS(c){ return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  function estado(r, tt){
    var L = listas[r], mL = L.length, s = tt + r * Dp / 3, idx = Math.floor(s / Dp), ph = s - idx * Dp, Tt = Math.min(0.95, Dp * 0.3), uu = mL > 1 ? clamp((ph - (Dp - Tt)) / Tt, 0, 1) : 0;
    return { idx: idx, ph: ph, uu: uu, cur: L[idx % mL], nxt: L[(idx + 1) % mL], col: mezclaC(tonos[L[idx % mL]], tonos[L[(idx + 1) % mL]], ease(uu)) };
  }
  function celda(cx, i, x, y, w, h, z, q, dir){
    if (x > W || x + w < 0) return;
    var f = fotos[i], v = ventanaFoco(f, w, h, z, q, dir);
    cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip(); cx.imageSmoothingQuality = 'high'; cx.drawImage(f.bmp, v.sx, v.sy, v.sw, v.sh, x, y, w, h); cx.restore();
  }
  function banda(cx, r, y, tt){
    var ent = ease(clamp((tt - 0.12 * r) / 1.1, 0, 1)), dir = DIR[r], st = estado(r, tt), idx = st.idx, ph = st.ph, uu = st.uu, q = clamp(ph / Dp, 0, 1);
    var cur = st.cur, nxt = st.nxt, e = ease(uu), zb = r === 1 ? 1.04 + 0.24 * (idx % 2 ? 1 - q : q) : 1.12, zn = r === 1 ? ((idx + 1) % 2 ? 1.28 : 1.04) : 1.12;
    cx.save(); cx.beginPath(); cx.rect(0, y, W, bh); cx.clip(); cx.fillStyle = rgbS(st.col); cx.fillRect(0, y, W, bh);
    var off = -dir * W * (1 - ent), curX = dir * e * (W + g) + off, nxtX = curX - dir * (W + g);
    celda(cx, cur, curX, y, W, bh, zb, q, dir);
    if (uu > 0) celda(cx, nxt, nxtX, y, W, bh, zn, 0, dir);
    cx.restore();
  }
  // Rótulo de inicio: nombre, tipo de evento y año sobre las fotos; aparece, se queda unos segundos y desaparece
  function rotulo(cx, tt){
    if (!conTit) return;
    var a = ease(clamp((tt - 0.15) / 0.7, 0, 1)) * (1 - ease(clamp((tt - 2.7) / 0.8, 0, 1))); if (a <= 0.002) return;
    cx.save(); cx.fillStyle = 'rgba(10,8,6,' + (0.52 * a).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
    var T = tit.toUpperCase(), S = sub.toUpperCase(), fs = Math.min(W * 0.1, H * 0.06), up = (1 - ease(clamp((tt - 0.15) / 0.9, 0, 1))) * 26 * u, cy = H / 2 + up;
    cx.globalAlpha = a; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = 18 * u;
    cx.font = '700 ' + fs + 'px ' + famS; try { cx.letterSpacing = (fs * 0.12) + 'px'; } catch (e) {}
    while (cx.measureText(T).width > W * 0.84 && fs > 14) { fs *= 0.95; cx.font = '700 ' + fs + 'px ' + famS; }
    cx.fillStyle = '#fbf7ee'; if (T) cx.fillText(T, W / 2, cy - (S ? fs * 0.55 : 0));
    cx.shadowBlur = 0; if (T && S) { cx.fillStyle = acento; cx.fillRect(W / 2 - 34 * u, cy + fs * 0.02, 68 * u, 3 * u); }
    var f2 = fs * 0.5; cx.font = '500 ' + f2 + 'px ' + famS; try { cx.letterSpacing = (f2 * 0.2) + 'px'; } catch (e) {}
    while (cx.measureText(S).width > W * 0.84 && f2 > 10) { f2 *= 0.95; cx.font = '500 ' + f2 + 'px ' + famS; }
    cx.shadowBlur = 14 * u; cx.fillStyle = '#fbf7ee'; if (S) cx.fillText(S, W / 2, cy + fs * 0.62); try { cx.letterSpacing = '0px'; } catch (e) {}
    cx.restore();
  }
  function intro(cx, t){
    var gr = cx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); gr.addColorStop(0, '#1d1813'); gr.addColorStop(1, '#0b0806'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    var a = clamp((t - 0.25) / 0.8, 0, 1), e = ease(a); cx.save(); cx.globalAlpha = e; cx.translate(W / 2, H / 2); cx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
    if (logo && logo.bmp) { var lw = (H > W ? 0.62 : 0.32) * W, lh = lw * logo.h / logo.w, mh = H * (H > W ? 0.3 : 0.4); if (lh > mh) { lw *= mh / lh; lh = mh; } cx.imageSmoothingQuality = 'high'; cx.drawImage(logo.bmp, -lw / 2, -lh / 2, lw, lh); }
    else if (op.nombre) { var fs = (H > W ? W * 0.085 : H * 0.1); cx.fillStyle = '#E9D9B8'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '300 ' + fs + 'px "Cormorant Garamond", Georgia, serif'; try { cx.letterSpacing = (fs * 0.12) + 'px'; } catch (e2) {} cx.fillText(String(op.nombre).toUpperCase(), 0, 0); }
    cx.restore();
  }
  function dibujar(cx, t){
    t = clamp(t, 0, duracion - 0.0001);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.filter = 'none'; cx.fillStyle = acento; cx.fillRect(0, 0, W, H);
    var tt = t - I; if (tt < 0) { intro(cx, t); return; }
    var cs = [0, 1, 2].map(function(r){ return estado(r, tt).col; });
    for (var r = 0; r < 3; r++) banda(cx, r, th + r * (bh + g), tt);
    for (var k = 0; k < 2; k++) { var yg = th + (k + 1) * bh + k * g, gr2 = cx.createLinearGradient(0, yg, 0, yg + g); gr2.addColorStop(0, rgbS(cs[k])); gr2.addColorStop(1, rgbS(cs[k + 1])); cx.fillStyle = gr2; cx.fillRect(0, yg, W, g); }
    rotulo(cx, tt);
    var fin = duracion - t; if (fin < 0.6) { cx.fillStyle = 'rgba(11,10,9,' + clamp(1 - fin / 0.6, 0, 1).toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
  }
  return { W: W, H: H, duracion: duracion, dibujar: dibujar, n: n, seg: Dp, estilo: 'carriles' };
}

// ---------- Postales: las fotos caen una a una como tarjetas con borde blanco sobre un fondo de papel ----------
function crearEscenaPostales(fotos, W, H, seg, op){
  var n = fotos.length, u = Math.min(W, H) / 1080, I = op.intro ? INTRO : 0, logo = op.logo || null, acento = op.acento || '#C9A877';
  var tit = String(op.titulo || '').trim(), sub = String(op.subtitulo || '').trim();
  var famS = 'Jost, "Helvetica Neue", Arial, sans-serif', famT = '"Cormorant Garamond", Georgia, serif';
  var Dc = dcPostales(n), duracion = n * Dc + 1.4 + I, vert = H >= W;
  var rnd = (function(s){ return function(){ s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })((op.semilla || 7) * 99991 + 13);
  var cards = fotos.map(function(f, k){
    var a = clamp(f.w / f.h, 0.72, 1.45), maxW = vert ? 0.74 * W : 0.42 * W, maxH = (vert ? 0.46 : 0.62) * H, pw = Math.min(maxW, maxH * a), ph = pw / a, b = pw * 0.045, bb = pw * 0.15;
    return { i: k, pw: pw, ph: ph, b: b, bb: bb, cw: pw + 2 * b, ch: ph + b + bb, cx: W / 2 + (rnd() - 0.5) * W * (vert ? 0.2 : 0.34), cy: H * (vert ? 0.54 : 0.55) + (rnd() - 0.5) * H * 0.06, rot: (rnd() < 0.5 ? -1 : 1) * (0.03 + rnd() * 0.07), side: rnd() < 0.5 ? -1 : 1, cinta: k % 2 === 0 };
  });
  // Fondo de papel con grano suave (se prepara una sola vez)
  var fondo = null;
  function papel(){
    if (fondo) return fondo; fondo = lienzo(W, H); var x = fondo.getContext('2d'), g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f3ede1'); g.addColorStop(1, '#e4dac8'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(255,255,255,.18)'); v.addColorStop(1, 'rgba(90,65,30,.16)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    var rg = (function(s){ return function(){ s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })(5);
    for (var i = 0; i < W * H / 260; i++) { x.fillStyle = 'rgba(90,70,40,' + (0.02 + rg() * 0.04).toFixed(3) + ')'; x.fillRect(rg() * W, rg() * H, 1.3, 1.3); }
    return fondo;
  }
  function bote(p){ // caída con un pequeño rebote
    if (p >= 1) return 1; if (p < 0.72) { var q = p / 0.72; return q * q; } var q2 = (p - 0.72) / 0.28; return 1 - 0.035 * Math.sin(q2 * Math.PI);
  }
  function tarjeta(cx, c, t0, tt){
    var age = tt - t0; if (age < 0) return;
    var p = clamp(age / 0.75, 0, 1), landed = ease(clamp(age / 0.75, 0, 1)), vivas = 4, salida = clamp((age - vivas * Dc) / 0.9, 0, 1), es = ease(salida);
    if (salida >= 1) return;
    var f = fotos[c.i], dy = -(1 - bote(p)) * H * 0.85, rot = c.rot * (1 + 1.4 * (1 - landed)), esc = 1.1 - 0.1 * landed, ex = c.side * W * 0.7 * es;
    cx.save(); cx.globalAlpha = (1 - es) * clamp(p * 4, 0, 1); cx.translate(c.cx + ex, c.cy + dy + es * H * 0.05); cx.rotate(rot + c.side * es * 0.25); cx.scale(esc, esc);
    cx.shadowColor = 'rgba(55,36,12,' + (0.12 + 0.2 * landed).toFixed(3) + ')'; cx.shadowBlur = (14 + 26 * landed) * u; cx.shadowOffsetY = (6 + 14 * landed) * u;
    cx.fillStyle = '#fdfbf7'; cx.fillRect(-c.cw / 2, -c.ch / 2, c.cw, c.ch); cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.shadowOffsetY = 0;
    var v = ventanaFoco(f, c.pw, c.ph, 1, 0.5, 1); cx.save(); cx.beginPath(); cx.rect(-c.cw / 2 + c.b, -c.ch / 2 + c.b, c.pw, c.ph); cx.clip(); cx.imageSmoothingQuality = 'high'; cx.drawImage(f.bmp, v.sx, v.sy, v.sw, v.sh, -c.cw / 2 + c.b, -c.ch / 2 + c.b, c.pw, c.ph); cx.restore();
    // pie de la postal
    var fs = c.bb * 0.36, yb = -c.ch / 2 + c.b + c.ph + c.bb * 0.6; cx.fillStyle = '#6b5a45'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.font = 'italic 500 ' + fs + 'px ' + famT;
    var cap = tit || sub || ''; while (cx.measureText(cap).width > c.pw * 0.68 && fs > 8) { fs *= 0.95; cx.font = 'italic 500 ' + fs + 'px ' + famT; } cx.fillText(cap, -c.cw / 2 + c.b, yb);
    cx.textAlign = 'right'; cx.font = '500 ' + (c.bb * 0.26) + 'px ' + famS; try { cx.letterSpacing = (c.bb * 0.03) + 'px'; } catch (e) {} cx.fillStyle = '#a08c6b'; cx.fillText(('0' + (c.i + 1)).slice(-2) + ' / ' + ('0' + n).slice(-2), c.cw / 2 - c.b, yb); try { cx.letterSpacing = '0px'; } catch (e) {}
    if (c.cinta) { cx.save(); cx.translate(0, -c.ch / 2); cx.rotate(-0.06); cx.globalAlpha *= 0.82; cx.fillStyle = acento; cx.fillRect(-c.cw * 0.14, -c.cw * 0.03, c.cw * 0.28, c.cw * 0.07); cx.restore(); }
    cx.restore();
  }
  function cabecera(cx, al){
    if (!tit && !sub) return; cx.save(); cx.globalAlpha = al; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    var fs = H * 0.03; cx.fillStyle = '#3a2f22'; cx.font = '600 ' + fs + 'px ' + famS; try { cx.letterSpacing = (fs * 0.22) + 'px'; } catch (e) {}
    var T = tit.toUpperCase(); while (cx.measureText(T).width > W * 0.86 && fs > 12) { fs *= 0.95; cx.font = '600 ' + fs + 'px ' + famS; } cx.fillText(T, W / 2, H * 0.075);
    try { cx.letterSpacing = '0px'; } catch (e) {} cx.fillStyle = '#8a6d3b'; cx.font = 'italic 500 ' + (H * 0.026) + 'px ' + famT; cx.fillText(sub, W / 2, H * 0.075 + H * 0.034);
    cx.fillStyle = acento; cx.fillRect(W / 2 - 24 * u, H * 0.075 + H * 0.05, 48 * u, 3 * u); cx.restore();
  }
  function intro(cx, t){
    var gr = cx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); gr.addColorStop(0, '#1d1813'); gr.addColorStop(1, '#0b0806'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    var a = clamp((t - 0.25) / 0.8, 0, 1), e = ease(a); cx.save(); cx.globalAlpha = e; cx.translate(W / 2, H / 2); cx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
    if (logo && logo.bmp) { var lw = (H > W ? 0.62 : 0.32) * W, lh = lw * logo.h / logo.w, mh = H * (H > W ? 0.3 : 0.4); if (lh > mh) { lw *= mh / lh; lh = mh; } cx.imageSmoothingQuality = 'high'; cx.drawImage(logo.bmp, -lw / 2, -lh / 2, lw, lh); }
    else if (op.nombre) { var fs = (H > W ? W * 0.085 : H * 0.1); cx.fillStyle = '#E9D9B8'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '300 ' + fs + 'px ' + famT; try { cx.letterSpacing = (fs * 0.12) + 'px'; } catch (e2) {} cx.fillText(String(op.nombre).toUpperCase(), 0, 0); }
    cx.restore();
  }
  function dibujar(cx, t){
    t = clamp(t, 0, duracion - 0.0001);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.filter = 'none'; cx.shadowColor = 'transparent';
    var tt = t - I; if (tt < 0) { intro(cx, t); return; }
    cx.drawImage(papel(), 0, 0); cabecera(cx, ease(clamp(tt / 0.8, 0, 1)));
    cx.save(); cx.translate(Math.sin(tt * 0.35) * 6 * u, Math.cos(tt * 0.3) * 5 * u);
    for (var k = 0; k < n; k++) tarjeta(cx, cards[k], 0.5 + k * Dc, tt);
    cx.restore();
    var fin = duracion - t; if (fin < 0.7) { cx.fillStyle = 'rgba(243,237,225,' + clamp(1 - fin / 0.7, 0, 1).toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
  }
  return { W: W, H: H, duracion: duracion, dibujar: dibujar, n: n, seg: Dc, estilo: 'postales' };
}

// ---------- Exportar a MP4 ----------
function soportado(){ return typeof VideoEncoder === 'function' && typeof VideoFrame === 'function'; }
var CODECS = ['avc1.640028', 'avc1.4D0028', 'avc1.42E028', 'avc1.640032'];
function dormir(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
async function exportar(escena, o){
  o = o || {};
  if (!soportado()) throw new Error('Este navegador no puede crear el video. Usa Chrome o Edge actualizados en la computadora.');
  var W = escena.W, H = escena.H, fps = o.fps || 30, total = Math.round(escena.duracion * fps), cfg = null, lista = o.codecs || CODECS;
  for (var i = 0; i < lista.length && !cfg; i++) {
    var c = { codec: lista[i], width: W, height: H, bitrate: o.bitrate || 8e6, framerate: fps, latencyMode: 'quality' };
    if (/^avc1/.test(lista[i])) c.avc = { format: 'avc' };
    try { var sp = await VideoEncoder.isConfigSupported(c); if (sp && sp.supported) cfg = c; } catch (e) {}
  }
  if (!cfg) throw new Error('Tu navegador no tiene el codificador de video H.264. Usa Chrome o Edge actualizados.');
  var mux = o.mux || new Mp4Mux(W, H), err = null;
  var enc = new VideoEncoder({ output: function(ch, meta){ try { mux.agregar(ch, meta); } catch (e) { err = e; } }, error: function(e){ err = e; } });
  enc.configure(cfg);
  var cv = lienzo(W, H), cx = cv.getContext('2d');
  for (var f = 0; f < total; f++) {
    if (o.cancelado && o.cancelado()) { try { enc.close(); } catch (e) {} throw new Error('cancelado'); }
    if (err) throw err;
    escena.dibujar(cx, f / fps);
    var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
    while (enc.encodeQueueSize > 8) await dormir(5);
    if (f % 4 === 0) { if (o.progreso) o.progreso(f / total); await dormir(0); }
  }
  await enc.flush(); try { enc.close(); } catch (e) {}
  if (err) throw err;
  if (o.progreso) o.progreso(1);
  return mux.finalizar();
}

var API = { Mp4Mux: Mp4Mux, soportado: soportado, crearEscena: crearEscena, duracionTotal: duracionTotal, exportar: exportar, cargarFoto: cargarFoto, detectarCaras: detectarCaras };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Slideshow = API;
})(typeof window !== 'undefined' ? window : this);
