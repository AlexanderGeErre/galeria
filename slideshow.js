/* Generador de slideshow en video MP4 (solo para el fotógrafo).
   Todo se dibuja con código: fondo desenfocado, marco de papel, giro de cada foto,
   transiciones y partículas. No usa música ni archivos gráficos externos.
   Expone window.Slideshow = { soportado, crearEscena, exportar, cargarFoto, Mp4Mux }. */
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

// Fotos: se reducen a 1800 px por el lado largo para cuidar la memoria.
async function cargarFoto(url){
  var r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error('No se pudo leer una foto (' + r.status + ').');
  var blob = await r.blob(), bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  var k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  if (k < 1) { var r2 = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * k), resizeHeight: Math.round(bmp.height * k), resizeQuality: 'high' }); bmp.close(); bmp = r2; }
  return { bmp: bmp, w: bmp.width, h: bmp.height };
}

// ---------- Escena: dibuja el cuadro del tiempo t (segundos) ----------
function crearEscena(fotos, W, H, seg, op){
  op = op || {};
  var n = fotos.length, vertical = H > W, u = Math.min(W, H) / 1080, D = seg || 2.5, Tr = Math.min(0.85, D * 0.4);
  var duracion = n * D, particulas = op.particulas !== false, cache = {};
  var rnd = mulberry(20260601), P = [];
  if (particulas) for (var i = 0; i < Math.round(70 * (W * H) / (1080 * 1920)) + 30; i++) {
    var grande = rnd() < 0.12;
    P.push({ x: rnd(), y: rnd(), r: (grande ? 7 + rnd() * 8 : 1.2 + rnd() * 2.6) * u, a: grande ? 0.10 + rnd() * 0.10 : 0.35 + rnd() * 0.45, vx: (rnd() - 0.5) * 0.012, vy: -0.01 - rnd() * 0.03, f: rnd() * 6.28, g: grande });
  }
  // textura de papel (una sola vez)
  var ruido = lienzo(256, 256), rc = ruido.getContext('2d'), rr = mulberry(7);
  for (var q = 0; q < 2600; q++) { rc.fillStyle = 'rgba(' + (rr() < 0.5 ? '120,100,70' : '255,255,255') + ',' + (0.03 + rr() * 0.07).toFixed(3) + ')'; rc.fillRect(rr() * 256, rr() * 256, 1 + rr() * 2, 1 + rr() * 2); }

  function tarjeta(i){
    if (cache[i] && cache[i].card) return cache[i];
    var f = fotos[i], a = clamp(f.w / f.h, 0.62, 1.7);
    var maxPW = (vertical ? 0.95 : 0.9) * W, maxPH = (vertical ? 0.74 : 0.8) * H;
    var pw = Math.min(maxPW, maxPH * a), ph = pw / a, b = (vertical ? 0.036 : 0.032) * Math.min(W, H) * (vertical ? 1 : 1.1), pad = 70 * u;
    var cw = pw + 2 * b, ch = ph + 2 * b, c = lienzo(cw + 2 * pad, ch + 2 * pad), cx = c.getContext('2d');
    cx.shadowColor = 'rgba(30,20,10,.38)'; cx.shadowBlur = 46 * u; cx.shadowOffsetY = 16 * u; cx.fillStyle = '#F6F1E6'; cx.fillRect(pad, pad, cw, ch);
    cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.shadowOffsetY = 0;
    var g = cx.createLinearGradient(pad, pad, pad + cw, pad + ch); g.addColorStop(0, '#FBF8F1'); g.addColorStop(1, '#EBE3D3'); cx.fillStyle = g; cx.fillRect(pad, pad, cw, ch);
    cx.fillStyle = cx.createPattern(ruido, 'repeat'); cx.fillRect(pad, pad, cw, ch);
    cx.save(); cx.shadowColor = 'rgba(40,30,20,.35)'; cx.shadowBlur = 6 * u; cx.fillStyle = '#000'; cx.fillRect(pad + b, pad + b, pw, ph); cx.restore();
    cx.imageSmoothingQuality = 'high'; cubrir(cx, f.bmp, f.w, f.h, pad + b, pad + b, pw, ph);
    var bg = lienzo(W / 6, H / 6), bx = bg.getContext('2d'), k = 1.7;
    if ('filter' in bx) { bx.filter = 'blur(' + Math.max(2, Math.round(7 * u)) + 'px)'; bx.save(); bx.translate(bg.width / 2, bg.height / 2); bx.scale(k, k); bx.translate(-bg.width / 2, -bg.height / 2); cubrir(bx, f.bmp, f.w, f.h, -bg.width * 0.1, -bg.height * 0.1, bg.width * 1.2, bg.height * 1.2); bx.restore(); bx.filter = 'none'; }
    else { var t = lienzo(18, 18 * H / W), tx = t.getContext('2d'); cubrir(tx, f.bmp, f.w, f.h, 0, 0, t.width, t.height); bx.imageSmoothingQuality = 'high'; bx.drawImage(t, 0, 0, bg.width, bg.height); }
    bx.fillStyle = 'rgba(248,244,236,.34)'; bx.fillRect(0, 0, bg.width, bg.height);
    cache[i] = { card: c, bg: bg, cw: c.width, ch: c.height };
    Object.keys(cache).forEach(function(kk){ if (Math.abs(+kk - i) > 2) delete cache[kk]; });
    return cache[i];
  }

  function dibujarFondo(cx, i, alfa, lt){
    var t = tarjeta(i), z = 1 + 0.07 * clamp(lt / D, 0, 1.2);
    cx.save(); cx.globalAlpha = alfa; cx.translate(W / 2, H / 2); cx.scale(z, z); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.bg, -W / 2, -H / 2, W, H); cx.restore();
  }
  function dibujarTarjeta(cx, i, lt, modo, tp){
    var t = tarjeta(i), s = (i % 2 ? -1 : 1), rr = GIROS[i % GIROS.length], h = clamp(lt / D, 0, 1.3);
    var rot = rr + s * 0.6 * h, esc = 1 + 0.035 * h, dy = 0, alfa = 1, desen = 0;
    if (modo === 'in') { var p = salida(tp); rot += (1 - p) * (rr >= 0 ? -4.5 : 4.5); esc *= 1 + (1 - p) * 0.3; dy = (1 - p) * 0.09 * H; alfa = clamp(tp / 0.45, 0, 1); desen = (1 - p) * 12 * u; }
    else if (modo === 'out') { var q = entrada(tp); rot += s * 3 * q; esc *= 1 + 0.1 * q; dy = -q * 0.05 * H; alfa = 1 - q; }
    cx.save(); cx.globalAlpha = alfa;
    if (desen > 0.5 && 'filter' in cx) cx.filter = 'blur(' + desen.toFixed(1) + 'px)';
    cx.translate(W / 2, H / 2 + dy); cx.rotate(rot * Math.PI / 180); cx.scale(esc, esc); cx.imageSmoothingQuality = 'high';
    cx.drawImage(t.card, -t.cw / 2, -t.ch / 2); cx.restore();
  }
  function dibujarParticulas(cx, t){
    if (!P.length) return;
    cx.save();
    for (var i = 0; i < P.length; i++) {
      var p = P[i], x = (((p.x + p.vx * t) % 1) + 1) % 1 * W, y = (((p.y + p.vy * t) % 1) + 1) % 1 * H, al = p.a * (0.55 + 0.45 * Math.sin(p.f + t * (p.g ? 0.6 : 1.4)));
      if (p.g) { var gr = cx.createRadialGradient(x, y, 0, x, y, p.r); gr.addColorStop(0, 'rgba(255,255,255,' + al.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, p.r, 0, 6.2832); cx.fill(); }
      else { cx.fillStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; cx.beginPath(); cx.arc(x, y, p.r, 0, 6.2832); cx.fill(); }
    }
    cx.restore();
  }

  function dibujar(cx, t){
    t = clamp(t, 0, duracion - 0.0001);
    var i = Math.min(n - 1, Math.floor(t / D)), lt = t - i * D;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.fillStyle = '#EDE7DA'; cx.fillRect(0, 0, W, H);
    var enTr = i > 0 && lt < Tr, entra = lt < Tr;
    if (enTr) { dibujarFondo(cx, i - 1, 1, lt + D); dibujarFondo(cx, i, salida(lt / Tr), lt); } else dibujarFondo(cx, i, 1, lt);
    if (enTr) dibujarTarjeta(cx, i - 1, lt + D, 'out', lt / Tr);
    dibujarTarjeta(cx, i, lt, entra ? 'in' : 'hold', lt / Tr);
    dibujarParticulas(cx, t);
    var fin = duracion - t, ini = t;
    var neg = Math.max(clamp(1 - fin / 0.7, 0, 1), clamp(1 - ini / 0.35, 0, 1));
    if (neg > 0) { cx.fillStyle = 'rgba(8,6,4,' + neg.toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
  }
  return { W: W, H: H, duracion: duracion, dibujar: dibujar, n: n, seg: D };
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

var API = { Mp4Mux: Mp4Mux, soportado: soportado, crearEscena: crearEscena, exportar: exportar, cargarFoto: cargarFoto };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Slideshow = API;
})(typeof window !== 'undefined' ? window : this);
