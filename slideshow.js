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
function ease(p){ p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
var INTRO = 2.8;
function duracionTotal(n, seg, estilo, intro){ var d = seg || 2.5; return n * d + (estilo === 'pantalla' ? Math.max(0, Math.max(d, 3.2) - d) : 0) + (intro ? INTRO : 0); }
// Copia desenfocada de la foto (lienzo pequeño; al agrandarlo se ve suave)
function fondoDesenf(f, w, h, zoom, radio){
  var s = 6, c = lienzo(w / s, h / s), x = c.getContext('2d');
  if ('filter' in x) { x.filter = 'blur(' + radio + 'px)'; x.save(); x.translate(c.width / 2, c.height / 2); x.scale(zoom, zoom); x.translate(-c.width / 2, -c.height / 2); cubrir(x, f.bmp, f.w, f.h, -c.width * 0.1, -c.height * 0.1, c.width * 1.2, c.height * 1.2); x.restore(); x.filter = 'none'; }
  else { var t = lienzo(18, 18 * h / w), tx = t.getContext('2d'); cubrir(tx, f.bmp, f.w, f.h, 0, 0, t.width, t.height); x.imageSmoothingQuality = 'high'; x.drawImage(t, 0, 0, c.width, c.height); }
  return c;
}
function crearEscena(fotos, W, H, seg, op){
  op = op || {};
  var estilo = op.estilo === 'pantalla' ? 'pantalla' : 'papel';
  var n = fotos.length, vertical = H > W, u = Math.min(W, H) / 1080, D = seg || 2.5, Tr = Math.min(estilo === 'pantalla' ? 0.7 : 0.9, D * 0.42);
  var dur = [], ini = [], tot = 0;
  for (var q0 = 0; q0 < n; q0++) { dur[q0] = (estilo === 'pantalla' && q0 === 0) ? Math.max(D, 3.2) : D; ini[q0] = tot; tot += dur[q0]; }
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
  var b = 0.036 * Math.min(W, H), pad = 70 * u;
  var ow = (vertical ? 0.92 : 0.79) * W, oh = (vertical ? 0.66 : 0.79) * H, fw = Math.round(ow - 2 * b), fh = Math.round(oh - 2 * b);

  // Destellos hexagonales (sprites con desenfoque, una sola vez)
  var sprites = [];
  if (papel) [[255, 190, 60], [255, 120, 40], [210, 60, 45], [255, 165, 50], [190, 70, 55], [255, 205, 90]].forEach(function(col){
    var c = lienzo(160, 160), x = c.getContext('2d'); if ('filter' in x) x.filter = 'blur(4px)';
    x.fillStyle = 'rgb(' + col.join(',') + ')'; x.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; x[k ? 'lineTo' : 'moveTo'](80 + 56 * Math.cos(a), 80 + 56 * Math.sin(a)); } x.closePath(); x.fill(); sprites.push(c);
  });

  function ventana(f){
    var c = lienzo(fw, fh), x = c.getContext('2d'), asp = f.w / f.h, wa = fw / fh;
    x.imageSmoothingQuality = 'high';
    if (Math.abs(asp / wa - 1) < 0.10) { cubrir(x, f.bmp, f.w, f.h, 0, 0, fw, fh); return c; }
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
      if (Math.abs(asp2 / wa2 - 1) <= 0.38) cubrir(x2, f.bmp, f.w, f.h, 0, 0, W, H);
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
  function capaPapel(cx, i, lt, bgDy, cardDy, tin){
    var t = activo(i), s = (i % 2 ? -1 : 1), h = clamp(lt / D, 0, 1.3);
    cx.save(); cx.translate(W / 2, H / 2 + bgDy); cx.rotate(s * 0.9 * h * Math.PI / 180); cx.scale(1.06 * (1 + 0.08 * h), 1.06 * (1 + 0.08 * h)); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.bg, -W / 2, -H / 2, W, H); cx.restore();
    var rr = GIROS[i % GIROS.length], rot = rr + s * 0.6 * h, esc = 1 + 0.035 * h;
    if (tin < 1) { var p = ease(tin); rot += (1 - p) * (rr >= 0 ? -3 : 3); esc *= 1 + (1 - p) * 0.12; }
    cx.save(); cx.translate(W / 2, H / 2 + cardDy); cx.rotate(rot * Math.PI / 180); cx.scale(esc, esc); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.card, -t.cw / 2, -t.ch / 2); cx.restore();
  }
  function destellos(cx, t){
    cx.save(); cx.globalCompositeOperation = 'lighter';
    var R = 0.62 * Math.max(W, H), L = [[0.35, 0.21, 0.0], [0.6, 0.17, 2.1]];
    for (var k = 0; k < L.length; k++) {
      var x = W * (0.5 + 0.5 * Math.cos(t * L[k][1] + L[k][2])), y = H * (0.5 + 0.45 * Math.sin(t * L[k][1] * 0.8 + L[k][2] * 1.7)), gr = cx.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(200,130,45,' + (0.20 + 0.06 * Math.sin(t * 0.7 + k)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(200,130,45,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    }
    for (var f = 0; f < 2; f++) {
      var ph = ((t * 0.045 + f * 0.5) % 1), al = Math.sin(ph * Math.PI), ang = (-35 + 10 * Math.sin(t * 0.2 + f)) * Math.PI / 180;
      var bx = W * (-0.1 + 1.2 * ph), by = H * (0.25 + 0.5 * ((f * 0.37 + 0.2) % 1)), sp = 0.085 * Math.max(W, H), Rr = 0.07 * Math.min(W, H) * (vertical ? 1.4 : 1.9);
      for (var k2 = 0; k2 < sprites.length; k2++) {
        var d = (k2 - 1) * sp, rs = Rr * (1.1 - 0.13 * k2) / 56;
        cx.globalAlpha = al * (k2 === 0 ? 0.33 : 0.16 + 0.04 * (k2 % 3));
        cx.drawImage(sprites[k2], bx + d * Math.cos(ang) - 80 * rs, by + d * Math.sin(ang) - 80 * rs, 160 * rs, 160 * rs);
      }
    }
    cx.restore();
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

  // ---- Pantalla completa (estilo iPhone) ----
  function capaPantalla(cx, i, lt, dx){
    var t = activo(i), h = clamp(lt / D, 0, 1.3), z = 1 + 0.08 * h, s = (i % 2 ? -1 : 1);
    cx.save(); cx.translate(W / 2 + dx + s * 0.02 * W * h, H / 2); cx.scale(z, z); cx.imageSmoothingQuality = 'high'; cx.drawImage(t.img, -W / 2, -H / 2); cx.restore();
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
      else if (lt < Tr) {
        var p = ease(lt / Tr), bl = Math.sin(Math.PI * p) * 9 * u;
        if (fil && bl > 0.6) cx.filter = 'blur(' + bl.toFixed(1) + 'px)';
        if (i > 0) capaPapel(cx, i - 1, lt + dur[i - 1], -p * H * 0.9, -p * H * 1.12, 1);
        else if (I > 0) capaIntro(cx, t, 0, -p * H * 0.9);
        capaPapel(cx, i, lt, (1 - p) * H, (1 - p) * H * 1.15, lt / Tr);
        cx.filter = 'none';
      } else capaPapel(cx, i, lt, 0, 0, 1);
      destellos(cx, t); dibujarParticulas(cx, t);
    } else {
      if (tt < 0) capaIntro(cx, t, 0, 0);
      else if ((i > 0 || I > 0) && lt < Tr) {
        var p2 = ease(lt / Tr);
        if (i > 0) capaPantalla(cx, i - 1, lt + dur[i - 1], -p2 * W * 0.35); else capaIntro(cx, t, -p2 * W * 0.35, 0);
        cx.fillStyle = 'rgba(0,0,0,' + (0.4 * p2).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
        capaPantalla(cx, i, lt, (1 - p2) * W);
      } else capaPantalla(cx, i, lt, 0);
      if (i === 0 && tt >= 0) portada(cx, tt);
    }
    var fin = duracion - t;
    var neg = Math.max(clamp(1 - fin / 0.7, 0, 1), (papel && I === 0) ? 0 : clamp(1 - t / (I > 0 ? 0.6 : 0.35), 0, 1));
    if (neg > 0) { cx.fillStyle = 'rgba(8,6,4,' + neg.toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
  }
  return { W: W, H: H, duracion: duracion, dibujar: dibujar, n: n, seg: D, estilo: estilo };
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

var API = { Mp4Mux: Mp4Mux, soportado: soportado, crearEscena: crearEscena, duracionTotal: duracionTotal, exportar: exportar, cargarFoto: cargarFoto };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Slideshow = API;
})(typeof window !== 'undefined' ? window : this);
