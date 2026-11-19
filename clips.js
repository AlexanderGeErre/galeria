/* Videos con clips (antes y después) - Alexander Ge Erre
   Usa tus clips ya editados (MP4) y una canción: detecta el ritmo, corta al compás,
   hace el efecto de la línea antes/después, barridos, cierre con tarjetas y mezcla el audio.
   Todo se procesa en tu computadora: los clips y la música no se suben a ningún lado. */
(function(root){
'use strict';
var S = null;                       // window.Slideshow (para exportar)
var SR = 48000;
var EFECTOS = [['ad', 'Línea antes y después →'], ['ad2', 'Línea antes y después ←'], ['solo', 'Solo barrido (sin antes)'], ['zoom', 'Zoom lento']];
var FORMATOS = [['v', '9:16', 1080, 1920, 'ar v'], ['h', '16:9', 1920, 1080, 'ar h'], ['s', '1:1', 1080, 1080, 'ar s'], ['f', '4:5', 1080, 1350, 'ar f']];
var ANTES = 'saturate(0.45) contrast(0.78) brightness(1.1)';

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function ease(p){ p = clamp(p, 0, 1); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
function easeIn(p){ p = clamp(p, 0, 1); return p * p * p; }
function easeOut(p){ p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
function lienzo(w, h){ var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function dormir(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
function numNombre(n){ var m = /^\D*(\d+)/.exec(n || ''); return m ? parseInt(m[1], 10) : 1e9; }
function cubrir(cx, src, sw, sh, W, H, z){
  var k = Math.max(W / sw, H / sh) * (z || 1), w = sw * k, h = sh * k;
  cx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
}

var MARCA_BASE = { nombre: 'Alexander Ge Erre', sub: 'Fotografía y video', lineas: [['Instagram', '@alexander_ge_erre'], ['WhatsApp', '+502 4465-8195'], ['Facebook', '@alexandergr32']] };
function marcaGuardada(){
  try { var j = JSON.parse(localStorage.getItem('pn-clips-marca') || 'null'); if (j && j.lineas && j.lineas.length === 3) return j; } catch (e) {}
  return JSON.parse(JSON.stringify(MARCA_BASE));
}
function marcaGuardar(m){ try { localStorage.setItem('pn-clips-marca', JSON.stringify(m)); } catch (e) {} }
function efectosDe(tpl){ return tpl === 'tr' && root.Trailer ? [['auto', 'Automático (al azar)']].concat(Object.keys(root.Trailer.TRANS).map(function(k){ return [k, root.Trailer.TRANS[k].n]; })) : EFECTOS; }

/* ---------- Clips (videos locales) ---------- */
function abrirClip(file){
  return new Promise(function(ok, no){
    var v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(file);
    var fin = false, t = setTimeout(function(){ if (!fin) { fin = true; no(new Error('no_lee')); } }, 15000);
    v.onloadeddata = function(){ if (fin) return; fin = true; clearTimeout(t); if (!v.videoWidth) return no(new Error('no_lee')); ok({ v: v, w: v.videoWidth, h: v.videoHeight, dur: v.duration || 0, nombre: file.name, url: v.src }); };
    v.onerror = function(){ if (fin) return; fin = true; clearTimeout(t); no(new Error('no_lee')); };
  });
}
function irA(v, t){
  return new Promise(function(ok){
    t = clamp(t, 0, Math.max(0, (v.duration || 0) - 0.02));
    if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2) return ok();
    var fin = false, h = function(){ if (fin) return; fin = true; v.removeEventListener('seeked', h); clearTimeout(tm); ok(); };
    var tm = setTimeout(h, 5000);
    v.addEventListener('seeked', h); v.currentTime = t;
  });
}

/* ---------- Ritmo de la canción ---------- */
async function analizarAudio(file){
  var AC = root.AudioContext || root.webkitAudioContext; if (!AC) throw new Error('Este navegador no puede leer audio.');
  var ctx = new AC(), buf;
  try { buf = await ctx.decodeAudioData(await file.arrayBuffer()); } finally { try { ctx.close(); } catch (e) {} }
  var info = { buf: buf, dur: buf.duration, nombre: file.name };
  var m = mono(buf, 22050, 90), env = envolvente(m.d, m.sr);
  var r = mejorRitmo(env.f, env.hop, 70, 180);
  info.bpm = r.bpm; info.fase = r.fase; info.env = env;
  return info;
}
function mono(buf, sr, maxSeg){
  var n = Math.min(buf.length, Math.floor(maxSeg * buf.sampleRate)), c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  var paso = buf.sampleRate / sr, m = Math.floor(n / paso), d = new Float32Array(m);
  for (var i = 0; i < m; i++) { var j = Math.floor(i * paso); d[i] = c1 ? (c0[j] + c1[j]) / 2 : c0[j]; }
  return { d: d, sr: sr };
}
function envolvente(d, sr){
  var hop = Math.round(sr * 0.01), n = Math.floor(d.length / hop), e = new Float32Array(n), i, j;
  var prev = 0, pasa = 0;
  for (i = 0; i < n; i++) { var s2 = 0; for (j = 0; j < hop; j++) { var x = d[i * hop + j], y = x - pasa; pasa = x; s2 += y * y; } e[i] = Math.sqrt(s2 / hop); }
  var f = new Float32Array(n), med = 0;
  for (i = 1; i < n; i++) { f[i] = Math.max(0, e[i] - e[i - 1]); med += f[i]; } med /= Math.max(1, n);
  for (i = 0; i < n; i++) f[i] = Math.max(0, f[i] - med);
  return { f: f, hop: 0.01 };
}
function puntaje(f, hop, bpm, fase){
  var per = 60 / bpm / hop, tot = 0, k = 0;
  for (var p = fase / hop; p < f.length - 1; p += per, k++) { var i = Math.round(p); var v = Math.max(f[i] || 0, (f[i - 1] || 0) * .6, (f[i + 1] || 0) * .6); tot += v; }
  return k ? tot / k : 0;
}
function mejorRitmo(f, hop, lo, hi){
  var peso = function(bpm){ return 1 - Math.abs(Math.log2(bpm / 110)) * 0.12; };
  var buscar = function(bpm){
    var per = 60 / bpm, m = { bpm: bpm, fase: 0, p: -1 };
    for (var fase = 0; fase < per; fase += 0.005) { var p = puntaje(f, hop, bpm, fase) * peso(bpm); if (p > m.p) { m.p = p; m.fase = fase; } }
    return m;
  };
  var mejor = { bpm: 120, fase: 0, p: -1 }, bpm;
  for (bpm = lo; bpm <= hi; bpm += 0.5) { var per = 60 / bpm, mm = { bpm: bpm, fase: 0, p: -1 }; for (var fase = 0; fase < per; fase += 0.01) { var p = puntaje(f, hop, bpm, fase) * peso(bpm); if (p > mm.p) { mm.p = p; mm.fase = fase; } } if (mm.p > mejor.p) mejor = mm; }
  var fino = mejor;
  for (bpm = mejor.bpm - 0.6; bpm <= mejor.bpm + 0.6; bpm += 0.05) { var r = buscar(bpm); if (r.p > fino.p) fino = r; }
  var ent = buscar(Math.round(fino.bpm));
  return ent.p >= fino.p * 0.88 ? ent : fino;
}
function fasePara(info, bpm){
  var per = 60 / bpm, mejor = 0, mp = -1;
  for (var fase = 0; fase < per; fase += 0.005) { var p = puntaje(info.env.f, info.env.hop, bpm, fase); if (p > mp) { mp = p; mejor = fase; } }
  return mejor;
}

/* ---------- Mezcla de audio (música + efectos de sonido) ---------- */
async function mezclar(info, o){
  var dur = o.dur, OA = root.OfflineAudioContext || root.webkitOfflineAudioContext;
  var ctx = new OA(2, Math.ceil(dur * SR), SR);
  var g = ctx.createGain(); g.connect(ctx.destination);
  var ini = clamp(o.ini, 0, Math.max(0, info.dur - 1));
  var src = ctx.createBufferSource(); src.buffer = info.buf;
  var gm = ctx.createGain(); src.connect(gm); gm.connect(g);
  var mv = o.volMusica, fadeIn = 0.25, fadeOut = Math.min(1.4, dur / 3);
  gm.gain.setValueAtTime(0.0001, 0); gm.gain.linearRampToValueAtTime(mv, fadeIn);
  gm.gain.setValueAtTime(mv, Math.max(fadeIn, dur - fadeOut)); gm.gain.linearRampToValueAtTime(0.0001, dur);
  src.start(0, ini, Math.min(dur, info.dur - ini));
  if (o.efectos) {
    var nz = ctx.createBuffer(1, Math.ceil(SR * 1.2), SR), nd = nz.getChannelData(0), sem = 12345;
    for (var i = 0; i < nd.length; i++) { sem = (sem * 1664525 + 1013904223) >>> 0; nd[i] = (sem / 4294967296) * 2 - 1; }
    var ev = o.volEfectos;
    (o.cortes || []).forEach(function(tb){
      // "whoosh" que termina justo en el golpe del compás
      var d = o.whoosh || 0.42, t0 = Math.max(0, tb - d);
      var s1 = ctx.createBufferSource(); s1.buffer = nz;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(350, t0); bp.frequency.exponentialRampToValueAtTime(7000, tb);
      var gw = ctx.createGain(); gw.gain.setValueAtTime(0.0001, t0); gw.gain.exponentialRampToValueAtTime(0.9 * ev, tb - 0.04); gw.gain.exponentialRampToValueAtTime(0.0001, tb + 0.16);
      s1.connect(bp); bp.connect(gw); gw.connect(g); s1.start(t0, 0, d + 0.3);
      // golpe grave suave
      var os = ctx.createOscillator(); os.type = 'sine'; os.frequency.setValueAtTime(110, tb); os.frequency.exponentialRampToValueAtTime(42, tb + 0.28);
      var go = ctx.createGain(); go.gain.setValueAtTime(0.0001, tb); go.gain.exponentialRampToValueAtTime(0.7 * ev, tb + 0.015); go.gain.exponentialRampToValueAtTime(0.0001, tb + 0.34);
      os.connect(go); go.connect(g); os.start(tb); os.stop(tb + 0.4);
    });
    (o.barridos || []).forEach(function(tb){
      // brillo suave mientras pasa la línea
      var d2 = o.durBarrido || 0.65, s2 = ctx.createBufferSource(); s2.buffer = nz;
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2500, tb); hp.frequency.exponentialRampToValueAtTime(9000, tb + d2);
      var gs = ctx.createGain(); gs.gain.setValueAtTime(0.0001, tb); gs.gain.exponentialRampToValueAtTime(0.16 * ev, tb + d2 * 0.55); gs.gain.exponentialRampToValueAtTime(0.0001, tb + d2 + 0.12);
      s2.connect(hp); hp.connect(gs); gs.connect(g); s2.start(tb, 0, d2 + 0.3);
    });
  }
  return ctx.startRendering();
}

function aWav(buf){
  var ch = buf.numberOfChannels, n = buf.length, tam = n * ch * 2, ab = new ArrayBuffer(44 + tam), v = new DataView(ab), i, c, o = 44;
  var t = function(p, s){ for (var k = 0; k < s.length; k++) v.setUint8(p + k, s.charCodeAt(k)); };
  t(0, 'RIFF'); v.setUint32(4, 36 + tam, true); t(8, 'WAVE'); t(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); t(36, 'data'); v.setUint32(40, tam, true);
  var d = []; for (c = 0; c < ch; c++) d.push(buf.getChannelData(c));
  for (i = 0; i < n; i++) for (c = 0; c < ch; c++) { var x = Math.max(-1, Math.min(1, d[c][i])); v.setInt16(o, x < 0 ? x * 32768 : x * 32767, true); o += 2; }
  return new Blob([ab], { type: 'audio/wav' });
}

/* ---------- Escena de clips ---------- */
async function crearEscena(o){
  var W = o.W, H = o.H, clips = o.clips, N = clips.length;
  var beat = 60 / o.bpm, Sx = beat * o.beatsEsc, C = o.cierre ? beat * o.beatsCierre : 0, wt = Math.min(0.32, Sx * 0.15);
  var total = N * Sx + C;
  var marco = {}, bg = lienzo(W, H), bx = bg.getContext('2d'), tA = lienzo(W, H), tB = lienzo(W, H), tAx = tA.getContext('2d'), tBx = tB.getContext('2d');
  var cw = Math.round(W * 0.5), ch = Math.round(cw * 16 / 9);
  if (ch > H * 0.55) { ch = Math.round(H * 0.55); cw = Math.round(ch * 9 / 16); }
  var tarjetas = [], fondo = null;

  async function capturar(c, t, ancho, alto){
    await irA(c.v, t); var cv = lienzo(ancho, alto); cubrir(cv.getContext('2d'), c.v, c.w, c.h, ancho, alto); return cv;
  }
  // tarjetas del cierre (fotogramas de los clips) y fondo desenfocado
  if (o.cierre && N) {
    var idx = [0]; var otros = []; for (var q = 1; q < N; q++) otros.push(q);
    var pasoO = Math.max(1, Math.floor(otros.length / 4));
    for (q = 0; q < otros.length && idx.length < 5; q += pasoO) idx.push(otros[q]);
    for (var k = 0; k < idx.length; k++) { var cc = clips[idx[k]]; tarjetas.push(await capturar(cc, Math.min(cc.dur * 0.4, Math.max(0, cc.dur - 0.1)), cw, ch)); }
    var gran = await capturar(clips[N - 1], Math.min(clips[N - 1].dur * 0.5, Math.max(0, clips[N - 1].dur - 0.1)), W, H);
    var pq = lienzo(Math.ceil(W / 28), Math.ceil(H / 28)), pqx = pq.getContext('2d'); pqx.drawImage(gran, 0, 0, pq.width, pq.height);
    var pq2 = lienzo(Math.ceil(W / 9), Math.ceil(H / 9)); pq2.getContext('2d').drawImage(pq, 0, 0, pq2.width, pq2.height);
    fondo = lienzo(W, H); var fx = fondo.getContext('2d'); fx.imageSmoothingQuality = 'high'; fx.drawImage(pq2, -W * .05, -H * .05, W * 1.1, H * 1.1);
    fx.fillStyle = 'rgba(24,40,52,.58)'; fx.fillRect(0, 0, W, H);
  }

  function cuadro(i){ return marco[i]; }
  function pintarEscena(cx, i, u){
    var fr = cuadro(i), ef = clips[i].ef, p = u / Sx;
    cx.save(); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    if (!fr) { cx.restore(); return; }
    if (ef === 'zoom') {
      var z = 1 + 0.07 * ease(p), w = W * z, h = H * z; cx.drawImage(fr, (W - w) / 2, (H - h) / 2, w, h);
    } else if (ef === 'ad' || ef === 'ad2') {
      var s0 = 0.15, s1 = 0.475, q = clamp((p - s0) / (s1 - s0), 0, 1), e = ease(q);
      cx.filter = ANTES; cx.drawImage(fr, 0, 0); cx.filter = 'none';
      cx.fillStyle = 'rgba(190,205,215,.13)'; cx.fillRect(0, 0, W, H);
      if (q > 0) {
        var inv = ef === 'ad2', xl = e * W;
        cx.save(); cx.beginPath(); if (inv) cx.rect(W - xl, 0, xl, H); else cx.rect(0, 0, xl, H); cx.clip(); cx.drawImage(fr, 0, 0); cx.restore();
        if (q < 1) linea(cx, inv ? W - xl : xl, clamp(Math.min(q / 0.1, (1 - q) / 0.1), 0, 1));
      }
    } else cx.drawImage(fr, 0, 0);
    cx.restore();
  }
  function linea(cx, x, a){
    var yc = H * 0.62, r = W * 0.024;
    cx.save(); cx.globalAlpha = a; cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = W * 0.012;
    cx.fillStyle = 'rgba(255,255,255,.95)'; cx.fillRect(x - W * 0.0016, 0, W * 0.0032, H);
    cx.beginPath(); cx.arc(x, yc, r, 0, 7); cx.fill(); cx.shadowBlur = 0;
    cx.fillStyle = 'rgba(40,40,40,.85)'; cx.beginPath(); cx.arc(x - r * 0.36, yc, r * 0.16, 0, 7); cx.arc(x + r * 0.36, yc, r * 0.16, 0, 7); cx.fill();
    cx.restore();
  }
  function tarjeta(cx, img, x, y, w, h, ang, sombra){
    cx.save(); cx.translate(x, y); cx.rotate(ang * Math.PI / 180);
    cx.shadowColor = 'rgba(0,0,0,' + (sombra || .4) + ')'; cx.shadowBlur = W * 0.035; cx.shadowOffsetY = W * 0.012;
    cx.beginPath(); cx.roundRect(-w / 2, -h / 2, w, h, W * 0.02); cx.fillStyle = '#222'; cx.fill(); cx.shadowColor = 'transparent';
    cx.clip(); cx.drawImage(img, -w / 2, -h / 2, w, h); cx.restore();
  }
  function pintarCierre(cx, tc){
    cx.drawImage(fondo, 0, 0);
    var n = tarjetas.length, cxm = W / 2, cym = H * 0.56;
    // posiciones del abanico: [indice de tarjeta, desplazamiento x, y, ángulo, escala, retraso]
    var P = [[0, 0, 0, 0, 1, 0.55]];
    if (n > 1) P.push([1, -0.34, 0.015, -9, 0.9, 0.10]);
    if (n > 2) P.push([2, 0.34, 0.015, 9, 0.9, 0.18]);
    if (n > 3) P.push([3, -0.62, 0.05, -17, 0.8, 0.04]);
    if (n > 4) P.push([4, 0.62, 0.05, 17, 0.8, 0.12]);
    P.sort(function(a, b){ return a[4] - b[4]; });
    P.forEach(function(pp){
      var q = easeOut(clamp((tc - (pp[0] === 0 ? 0.34 : pp[5])) / 0.8, 0, 1));
      var xx = cxm + pp[1] * W + (1 - q) * (pp[1] >= 0 ? W * 0.9 : -W * 0.9) * (pp[0] === 0 ? 0 : 1), yy = cym + pp[2] * H + (pp[0] === 0 ? (1 - q) * H * 0.7 : 0);
      var img = tarjetas[pp[0]]; if (!img) return;
      if (pp[0] === 0) {
        // la tarjeta central repite el efecto antes y después
        var c2 = lienzo(cw, ch), x2 = c2.getContext('2d'), tt = clamp((tc - 1.1) / 0.8, 0, 1), xl = ease(tt) * cw;
        x2.filter = ANTES; x2.drawImage(img, 0, 0); x2.filter = 'none'; x2.fillStyle = 'rgba(190,205,215,.13)'; x2.fillRect(0, 0, cw, ch);
        x2.save(); x2.beginPath(); x2.rect(0, 0, xl, ch); x2.clip(); x2.drawImage(img, 0, 0); x2.restore();
        if (tt > 0 && tt < 1) { x2.fillStyle = 'rgba(255,255,255,.95)'; x2.fillRect(xl - 2, 0, 4, ch); }
        tarjeta(cx, c2, xx, yy, cw * pp[4], ch * pp[4], 0, .5);
      } else tarjeta(cx, img, xx, yy, cw * pp[4], ch * pp[4], pp[3] * q, .4);
    });
  }
  function texto(cx, t){
    if (!o.titulo && !o.subtitulo) return;
    cx.save(); cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = W * 0.02;
    if (o.titulo) { cx.font = '500 ' + Math.round(W * 0.085) + 'px "Cormorant Garamond",Georgia,serif'; cx.fillText(o.titulo, W / 2, H * 0.075); }
    if (o.subtitulo) { cx.font = '300 ' + Math.round(W * 0.026) + 'px Jost,system-ui,sans-serif'; if ('letterSpacing' in cx) cx.letterSpacing = Math.round(W * 0.003) + 'px'; cx.fillText(o.subtitulo, W / 2, H * (o.titulo ? 0.105 : 0.075)); }
    cx.restore();
  }
  function barrido(cx, a, b, q){
    // a sale hacia la izquierda y b entra desde la derecha, con estela de movimiento
    var salida = easeIn(q) * W * 0.95, entrada = (1 - easeOut(q)) * W * 0.95, bl = Math.sin(q * Math.PI) * W * 0.16, K = 7;
    cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    for (var j = 0; j < K; j++) { var f = K > 1 ? j / (K - 1) - 0.5 : 0; cx.globalAlpha = 1 / (j + 1); cx.drawImage(a, -salida + f * bl, 0); }
    for (j = 0; j < K; j++) { var f2 = K > 1 ? j / (K - 1) - 0.5 : 0; cx.globalAlpha = (j === 0 ? 1 : 1 / (j + 1)) * clamp(q * 3, 0, 1); cx.drawImage(b, entrada + f2 * bl, 0); }
    cx.globalAlpha = 1;
  }

  var pEsc = null;
  var esc = {
    W: W, H: H, duracion: total, N: N, S: Sx, C: C, beat: beat, wt: wt, estilo: 'clips',
    cortes: function(){ var a = []; for (var i = 1; i <= N; i++) if (i < N || o.cierre) a.push(i * Sx); return a; },
    barridos: function(){ var a = []; for (var i = 0; i < N; i++) if (clips[i].ef === 'ad' || clips[i].ef === 'ad2') a.push(i * Sx + Sx * 0.15); return a; },
    preparar: async function(t){
      var i = Math.floor(t / Sx), nec = {};
      if (i < N) { var u = t - i * Sx; nec[i] = Math.min(u, Math.max(0, clips[i].dur - 0.04)); if (u > Sx - wt && (i + 1 < N)) nec[i + 1] = 0; }
      var ks = Object.keys(nec);
      for (var k = 0; k < ks.length; k++) {
        var id = +ks[k], c = clips[id]; await irA(c.v, nec[id]);
        var cv = marco[id] || (marco[id] = lienzo(W, H)); cubrir(cv.getContext('2d'), c.v, c.w, c.h, W, H);
      }
      Object.keys(marco).forEach(function(id){ if (!(id in nec)) delete marco[id]; });
    },
    dibujar: function(cx, t){
      t = clamp(t, 0, total - 1e-6);
      var i = Math.floor(t / Sx);
      if (o.cierre && i >= N) pintarCierre(cx, t - N * Sx);
      else {
        i = Math.min(i, N - 1); var u = t - i * Sx;
        var hayNext = (i + 1 < N) || o.cierre;
        if (u > Sx - wt && hayNext) {
          var q = (u - (Sx - wt)) / wt;
          pintarEscena(tAx, i, u);
          if (i + 1 < N) pintarEscena(tBx, i + 1, 0); else pintarCierre(tBx, 0);
          barrido(cx, tA, tB, q);
        } else pintarEscena(cx, i, u);
      }
      texto(cx, t);
      var fin = total - t; if (fin < 0.6) { cx.fillStyle = 'rgba(0,0,0,' + clamp(1 - fin / 0.6, 0, 1).toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
    }
  };
  return esc;
}

/* ---------- Recorte de persona (MediaPipe Selfie Segmentation) ---------- */
var SEG = { p: null, ss: null, cb: null, mal: false, copia: null };
var SEG_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
function cargarSegmentador(avisar){
  if (SEG.ss) return Promise.resolve(true); if (SEG.mal) return Promise.resolve(false); if (SEG.p) return SEG.p;
  SEG.p = (async function(){
    if (avisar) avisar('Cargando modelo de recorte…');
    var tiempo = function(ms){ return new Promise(function(ok, no){ setTimeout(function(){ no(new Error('tiempo')); }, ms); }); };
    if (!root.SelfieSegmentation) await Promise.race([new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = SEG_BASE + 'selfie_segmentation.js'; sc.crossOrigin = 'anonymous'; sc.onload = ok; sc.onerror = function(){ no(new Error('red')); }; document.head.appendChild(sc); }), tiempo(25000)]);
    var ss = new root.SelfieSegmentation({ locateFile: function(f){ return SEG_BASE + f; } });
    ss.setOptions({ modelSelection: 0 });
    ss.onResults(function(r){ if (SEG.cb) { var f = SEG.cb; SEG.cb = null; f(r.segmentationMask); } });
    await Promise.race([ss.initialize(), tiempo(40000)]);
    SEG.ss = ss; return true;
  })().catch(function(){ SEG.mal = true; SEG.p = null; return false; });
  return SEG.p;
}
function segmentar(cnv){
  return new Promise(function(ok){
    if (!SEG.ss) return ok(null);
    var fin = false, to = setTimeout(function(){ if (!fin) { fin = true; SEG.cb = null; ok(null); } }, 8000);
    SEG.cb = function(m){ if (fin) return; fin = true; clearTimeout(to); var c = SEG.copia; if (!c || c.width !== m.width || c.height !== m.height) { c = SEG.copia = document.createElement('canvas'); c.width = m.width; c.height = m.height; } var x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(m, 0, 0); ok(c); };
    try { SEG.ss.send({ image: cnv }).catch(function(){ if (!fin) { fin = true; clearTimeout(to); SEG.cb = null; ok(null); } }); } catch (e) { if (!fin) { fin = true; clearTimeout(to); ok(null); } }
  });
}

/* ---------- Pantalla del panel ---------- */
function montar(el, A){
  A = A || {};
  var aviso = A.aviso || function(t){ alert(t); };
  var st = { clips: [], audio: null, bpm: 120, ini: 0, ocupado: false, cancelar: false, fmt: 'v', titulo: '', subtitulo: '', beatsEsc: 4, cierre: true, efectos: true, volM: 0.9, volE: 0.7, esc: null, fases: {}, tpl: 'tr', n1: '', e1: 'Novia', n2: '', e2: 'Novio', semilla: 1 + Math.floor(Math.random() * 9970), total: 45, alinear: true, marca: marcaGuardada(), cal: 'fhd', t: 0, play: false, caras: {}, mix: null, mixK: '' };
  var h = '<style>.cl-ad[hidden],.cl-tr[hidden],#cl-mcd[hidden]{display:none!important}</style><h1>Tráilers</h1><p class="pn-s ay">Crea un tráiler de evento con tus clips ya editados y una canción: nombres, cámara lenta, transiciones y sonidos al azar en cada versión. Todo se hace en tu computadora: nada se sube a internet.</p>' +
  '<input id="cl-tpl" type="hidden" value="tr">' +
  '<div class="pn-card"><h2>1. Tus clips</h2><p class="pn-s">Pon un número al inicio del nombre para el orden: <b>01.mp4, 02.mp4, 03.mp4…</b> (puede decir más, como 01_novia.mp4). <span class="cl-ad">Cada clip dura una escena.</span><span class="cl-tr"> Aunque duren más, se usan solo los segundos necesarios para que no haya espacios en negro.</span></p>' +
  '<div class="pn-row"><label class="pn-btn" style="cursor:pointer">Elegir clips<input id="cl-f" type="file" accept="video/*,.mp4,.mov" multiple hidden></label><span class="pn-s" id="cl-n"></span></div><div id="cl-l"></div></div>' +
  '<div class="pn-card"><h2>2. Música</h2><p class="pn-s">Sube la canción completa. Se detecta el ritmo y los cortes caen justo en el compás.</p>' +
  '<div class="pn-row"><label class="pn-btn" style="cursor:pointer">Elegir canción<input id="cl-a" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac" hidden></label><span class="pn-s" id="cl-an"></span></div>' +
  '<div id="cl-au" hidden><div class="pn-row"><label>Ritmo (pulsos por minuto) <input id="cl-bpm" type="number" min="50" max="220" step="0.5" style="width:6rem"></label><label>Empezar en el segundo <input id="cl-ini" type="number" min="0" step="0.1" style="width:6rem"></label></div>' +
  '<div class="pn-row"><label><input id="cl-fx" type="checkbox" checked> Efectos de sonido (subida, golpe y un sonido en cada transición)</label></div><div class="pn-row cl-tr"><label><input id="cl-al" type="checkbox" checked> Hacer coincidir la parte más fuerte de la canción con el golpe del video</label></div>' +
  '<div class="pn-row"><label>Volumen música <input id="cl-vm" type="range" min="0" max="1" step="0.05" value="0.9"></label><label>Volumen efectos <input id="cl-ve" type="range" min="0" max="1" step="0.05" value="0.7"></label></div></div></div>' +
  '<div class="pn-card cl-tr"><h2>3. Nombres y cierre</h2><p class="pn-s">Los nombres salen grandes al inicio con niebla. Déjalos vacíos si no los quieres.</p><div class="pn-row"><label>Nombre 1 <input id="cl-n1" type="text" maxlength="16" placeholder="Ej: RIYA"></label><label>Etiqueta <input id="cl-e1" type="text" maxlength="16" value="Novia"></label></div><div class="pn-row"><label>Nombre 2 <input id="cl-n2" type="text" maxlength="16" placeholder="Ej: UDAY"></label><label>Etiqueta <input id="cl-e2" type="text" maxlength="16" value="Novio"></label></div><div class="pn-row"><label><input id="cl-ci2" type="checkbox" checked> Cierre con mis datos</label><label>Duración del video <select id="cl-dtot"><option value="30">30 segundos</option><option value="45" selected>45 segundos</option><option value="60">60 segundos</option><option value="90">90 segundos</option></select></label></div><div id="cl-mc"></div><div class="pn-row"><button class="pn-btn sec" type="button" id="cl-otra">Otra versión (efectos distintos)</button></div><p class="pn-s">Cada versión combina los efectos de forma distinta: cámara lenta, zoom crash, tirones de cámara, fugas de luz, glitch y sonidos. El audio original de tus clips nunca se usa.</p></div>' +
  '<div class="pn-card cl-ad"><h2>3. Estilo</h2><div class="pn-row"><label>Título (opcional) <input id="cl-t" type="text" maxlength="30" placeholder="Ej: Antes y después"></label><label>Subtítulo (opcional) <input id="cl-s" type="text" maxlength="50" placeholder="Ej: Edición de color"></label></div>' +
  '<div class="pn-row"><label>Duración de cada escena <select id="cl-be"><option value="2">2 pulsos (rápido)</option><option value="4" selected>4 pulsos (normal)</option><option value="8">8 pulsos (lento)</option></select></label><label><input id="cl-ci" type="checkbox" checked> Cierre con tarjetas</label></div></div>' +
  '<div class="pn-card"><h2>4. Vista previa y descarga</h2><div class="np-pv vs-pv" style="border-radius:16px"><div class="vs-pcol"><div class="np-dev v" id="cl-dev"><canvas id="cl-cv" width="360" height="640"></canvas></div>' +
  '<div class="pn-vctl vs-ctl"><button type="button" id="cl-play" aria-label="Reproducir">▶</button><input type="range" id="cl-t0" min="0" max="1000" value="0" aria-label="Posición del video"><span id="cl-tm">00:00 / 00:00</span></div>' +
  '<div class="pn-s" id="cl-st"></div><div id="cl-av" hidden style="background:#fff3cd;color:#664d03;border:1px solid #ecd078;border-radius:10px;padding:.7rem .9rem;margin:.4rem 0;font-size:.9rem"></div><progress id="cl-pr" value="0" max="1" hidden style="width:100%"></progress>' +
  '<div class="vs-bar"><div class="vs-pill" id="cl-fm">' + FORMATOS.map(function(f){ return '<button type="button" class="pn-opt" data-clf="' + f[0] + '"><i class="' + f[4] + '"></i>' + f[1] + '</button>'; }).join('') + '</div>' +
  '<div class="vs-pill" id="cl-cal"><button type="button" data-clq="fhd">Full HD</button><button type="button" data-clq="4k">4K</button></div>' +
  '<button class="pn-btn" type="button" id="cl-gen">Generar y descargar MP4</button><button class="pn-btn sec" type="button" id="cl-can" hidden>Cancelar</button></div><small class="vs-res" id="cl-res"></small><small class="vs-res" id="cl-plan"></small></div></div>' +
  '<p class="pn-s">La vista previa puede verse con saltos en computadoras lentas; el video final sale perfecto. Si subes una canción con derechos de autor, Instagram o TikTok pueden silenciar o bloquear el video. Conviene usar música con licencia.</p></div>';
  el.innerHTML = h;
  var q = function(id){ return el.querySelector('#' + id); };
  var estado = function(t){ q('cl-st').textContent = t || ''; };

  function pintarLista(){
    q('cl-n').textContent = st.clips.length ? st.clips.length + (st.clips.length === 1 ? ' clip' : ' clips') : '';
    q('cl-l').innerHTML = st.clips.length ? '<div class="pn-card" style="padding:0;overflow:auto;margin-top:.6rem"><table class="pn-tb pn-ta"><tr><th>N.º</th><th>Clip</th><th></th></tr>' + st.clips.map(function(c, i){
      return '<tr><td><b>' + String(i + 1).padStart(2, '0') + '</b></td><td>' + esc(c.nombre) + '<br><span class="pn-s">' + c.w + '×' + c.h + ' · ' + c.dur.toFixed(1) + ' s</span></td><td><button class="pn-btn sec" type="button" data-qt="' + i + '">Quitar</button></td></tr>';
    }).join('') + '</table></div>' : '';
    q('cl-l').querySelectorAll('[data-qt]').forEach(function(b){ b.onclick = function(){ var c = st.clips.splice(+b.dataset.qt, 1)[0]; try { URL.revokeObjectURL(c.url); } catch (e) {} st.esc = null; pintarLista(); vista(); }; });
  }
  function dims(){ var f = FORMATOS.filter(function(x){ return x[0] === st.fmt; })[0] || FORMATOS[0], k = st.cal === '4k' ? 2 : 1; return [f[2] * k, f[3] * k]; }
  function mmss(t){ t = Math.max(0, Math.round(t)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function resumenPlan(){ var P = st.esc && st.esc.plan; q('cl-plan').textContent = P ? 'Acto 1: ' + P.nIntro + ' clips lentos · Ráfaga: ' + P.nRapido + ' cortes de ' + P.u.toFixed(2) + ' s · Acto 3: ' + P.nCalma + ' clips lentos + tarjeta · Versión ' + st.semilla : ''; }
  function alerta(t){ var a = q('cl-av'); a.hidden = !t; a.textContent = t || ''; }
  function controles(){ var d = st.esc ? st.esc.duracion : duracionTotal(), sk = q('cl-t0'); if (document.activeElement !== sk) sk.value = d ? Math.round(st.t / d * 1000) : 0; q('cl-tm').textContent = mmss(st.t) + ' / ' + mmss(d); q('cl-play').textContent = st.play ? '❚❚' : '▶'; }
  function pintarOpc(){ var d = dims(); q('cl-dev').className = 'np-dev ' + st.fmt; q('cl-res').textContent = d[0] + ' × ' + d[1] + ' px'; el.querySelectorAll('[data-clf]').forEach(function(b){ b.classList.toggle('on', b.dataset.clf === st.fmt); }); el.querySelectorAll('[data-clq]').forEach(function(b){ b.classList.toggle('on', b.dataset.clq === st.cal); }); }
  function totalPedido(){ var T = st.total; if (st.audio) T = Math.min(T, Math.max(20, Math.floor(st.audio.dur - 1))); return T; }
  function opcionesPlan(){ return { bpm: st.bpm, clips: st.clips, nombre1: st.n1, nombre2: st.n2, cierre: st.cierre, semilla: st.semilla, total: totalPedido() }; }
  function duracionTotal(){ if (!st.clips.length) return 0; if (st.tpl === 'tr' && root.Trailer) return root.Trailer.planear(opcionesPlan()).total; var beat = 60 / st.bpm; return st.clips.length * beat * st.beatsEsc + (st.cierre ? beat * 8 : 0); }
  function actualizarDur(){ controles(); }

  var vistaOcupada = false, vistaPend = false;
  async function caras(cnv, idx){
    var key = (st.clips[idx] ? st.clips[idx].nombre : idx) + '|' + cnv.width + 'x' + cnv.height + '|' + st.bpm;
    if (st.caras[key]) return st.caras[key];
    if (!S || !S.detectarCaras) return [];
    var f = { bmp: cnv, w: cnv.width, h: cnv.height };
    await S.detectarCaras([f], null, function(){ return st.cancelar; });
    st.caras[key] = f.caras || []; return st.caras[key];
  }
  async function crear(Wd, Hd, esc){
    if (st.tpl === 'tr' && root.Trailer) { var o2 = opcionesPlan(); o2.W = Wd; o2.H = Hd; o2.etq1 = st.e1; o2.etq2 = st.e2; o2.marca = st.marca; o2.color = true; o2.textoAtras = true; o2.detectarCaras = caras; o2.cargarSegmentador = function(){ return cargarSegmentador(estado); }; o2.segmentar = segmentar; return root.Trailer.crearEscena(o2); }
    return crearEscena({ W: Wd, H: Hd, clips: st.clips, bpm: st.bpm, beatsEsc: st.beatsEsc, beatsCierre: 8, cierre: st.cierre, titulo: st.titulo, subtitulo: st.subtitulo });
  }
  function medidasVista(){ var d = dims(), k = 640 / Math.max(d[0], d[1]); return [Math.round(d[0] * k), Math.round(d[1] * k)]; }
  function pintarVacio(){ var cv0 = q('cl-cv'), m = medidasVista(); cv0.width = m[0]; cv0.height = m[1]; var x0 = cv0.getContext('2d'); x0.fillStyle = '#111'; x0.fillRect(0, 0, m[0], m[1]); x0.fillStyle = '#999'; x0.font = Math.round(m[0] / 22) + 'px sans-serif'; x0.textAlign = 'center'; x0.fillText('Elige tus clips para ver la vista previa', m[0] / 2, m[1] / 2); }
  async function vista(){
    pintarOpc();
    if (!st.clips.length) { pintarVacio(); controles(); return; }
    if (st.ocupado) return;
    if (vistaOcupada) { vistaPend = true; return; }
    vistaOcupada = true;
    try {
      var m = medidasVista(), Wd = m[0], Hd = m[1];
      var cv = q('cl-cv'); if (cv.width !== Wd || cv.height !== Hd) { cv.width = Wd; cv.height = Hd; }
      if (!st.esc || st.esc.W !== Wd || st.esc.H !== Hd) { estado('Preparando la vista previa…'); st.mix = null; st.esc = await crear(Wd, Hd); estado(st.esc.usaSegmentacion || !(st.n1 || st.n2) ? '' : 'No se pudo cargar el modelo de recorte: el nombre usa un recorte aproximado.'); }
      resumenPlan();
      var d = st.esc.duracion; st.t = clamp(st.t, 0, d - 0.01);
      var t = st.t; if (st.esc.estilo === 'trailer' && t < 0.4) t = 0.4;
      await st.esc.preparar(t); st.esc.dibujar(cv.getContext('2d'), t); controles();
    } catch (e) { estado('No se pudo preparar la vista previa: ' + (e && e.message === 'no_lee' ? 'un clip no se puede leer.' : (e && e.message) || '')); }
    vistaOcupada = false; if (vistaPend) { vistaPend = false; vista(); }
  }
  /* reproducción con sonido (mezcla real) */
  var ac = null, fuente = null, rafId = 0, t0r = 0;
  function parar(){ st.play = false; cancelAnimationFrame(rafId); if (fuente) { try { fuente.stop(); } catch (e) {} fuente = null; } controles(); }
  async function mezcla(esc){
    if (esc.estilo === 'trailer') return root.Trailer.mezclar(st.audio || { buf: null, dur: 0 }, { dur: esc.duracion, ini: iniTrailer(esc), volMusica: st.volM, volEfectos: st.volE, efectos: st.efectos, plan: esc.plan, cierre: st.cierre });
    return mezclar(st.audio, { dur: esc.duracion, ini: st.ini, volMusica: st.volM, volEfectos: st.volE, efectos: st.efectos, cortes: esc.cortes(), barridos: esc.barridos(), whoosh: Math.min(0.45, esc.S * 0.22), durBarrido: esc.S * 0.325 });
  }
  async function alternar(){
    if (st.play) return parar();
    if (st.ocupado) return;
    if (!st.clips.length) return aviso('Elige primero tus clips.');
    st.play = true; controles();
    try {
      var m = medidasVista(); if (!st.esc || st.esc.W !== m[0] || st.esc.H !== m[1]) { estado('Preparando la vista previa…'); st.mix = null; st.esc = await crear(m[0], m[1]); estado(''); }
      var esc = st.esc, k = JSON.stringify([st.tpl, st.semilla, st.total, !!st.audio, st.n1, st.n2, st.bpm, st.ini, st.volM, st.volE, st.efectos, st.cierre, st.alinear, esc.duracion, st.clips.length]);
      if (!st.mix || st.mixK !== k) { estado('Preparando el sonido…'); st.mix = await mezcla(esc); st.mixK = k; estado(''); }
      if (!st.play) return;
      if (st.t >= esc.duracion - 0.2) st.t = 0;
      if (st.mix) { ac = ac || new (root.AudioContext || root.webkitAudioContext)(); if (ac.state === 'suspended') await ac.resume(); fuente = ac.createBufferSource(); fuente.buffer = st.mix; fuente.connect(ac.destination); fuente.start(0, st.t); }
      t0r = performance.now() - st.t * 1000; var cv = q('cl-cv'), cx = cv.getContext('2d'), ocu = false;
      (async function f(){
        if (!st.play) return;
        if (!document.body.contains(cv)) { parar(); return; }
        var t = (performance.now() - t0r) / 1000;
        if (t >= esc.duracion) { st.t = 0; parar(); vista(); return; }
        st.t = t; if (!ocu) { ocu = true; try { await esc.preparar(Math.max(.4, t)); if (st.play) esc.dibujar(cx, Math.max(.4, t)); } catch (e) {} ocu = false; }
        controles(); rafId = requestAnimationFrame(f);
      })();
    } catch (e) { parar(); estado('No se pudo reproducir: ' + ((e && e.message) || 'error')); }
  }
  q('cl-play').onclick = alternar;
  q('cl-t0').oninput = function(){ var d = st.esc ? st.esc.duracion : duracionTotal(); st.t = d * (+q('cl-t0').value) / 1000; if (st.play) { parar(); } vista(); };
  el.querySelectorAll('[data-clf]').forEach(function(b){ b.onclick = function(){ parar(); st.fmt = b.dataset.clf; st.esc = null; vista(); }; });
  el.querySelectorAll('[data-clq]').forEach(function(b){ b.onclick = function(){ st.cal = b.dataset.clq; pintarOpc(); }; });

  q('cl-f').onchange = async function(){
    var fs = Array.prototype.slice.call(q('cl-f').files || []); q('cl-f').value = '';
    if (!fs.length) return;
    fs.sort(function(a, b){ return numNombre(a.name) - numNombre(b.name) || a.name.localeCompare(b.name); });
    estado('Leyendo clips…');
    for (var i = 0; i < fs.length; i++) {
      try { var c = await abrirClip(fs[i]); c.ef = st.tpl === 'tr' ? 'auto' : 'ad'; st.clips.push(c); }
      catch (e) { aviso('No se pudo leer «' + fs[i].name + '». Expórtalo desde Premiere en H.264 (MP4) a 1080p y vuelve a intentar.'); }
    }
    st.clips.sort(function(a, b){ return numNombre(a.nombre) - numNombre(b.nombre) || a.nombre.localeCompare(b.nombre); });
    var nums = st.clips.map(function(c){ return numNombre(c.nombre); });
    if (nums.some(function(n){ return n === 1e9; })) aviso('Algún clip no empieza con número. Se ordenó por nombre. Usa 01, 02, 03… para controlar el orden.');
    st.esc = null; estado(''); pintarLista(); vista();
  };
  q('cl-a').onchange = async function(){
    var f = q('cl-a').files && q('cl-a').files[0]; q('cl-a').value = ''; if (!f) return;
    estado('Analizando la canción y buscando el ritmo…'); q('cl-an').textContent = f.name;
    try {
      st.audio = await analizarAudio(f); if (root.Trailer) { try { st.audio.drop = root.Trailer.detectarDrop(st.audio.buf, 6); } catch (e) { st.audio.drop = null; } } st.bpm = Math.round(st.audio.bpm * 2) / 2; st.ini = Math.round(st.audio.fase * 100) / 100;
      q('cl-bpm').value = st.bpm; q('cl-ini').value = st.ini.toFixed(2); q('cl-au').hidden = false; estado('Ritmo detectado: ' + st.bpm + ' pulsos por minuto. Si no suena bien, cámbialo a mano.');
      st.esc = null; vista();
    } catch (e) { st.audio = null; q('cl-an').textContent = ''; estado(''); aviso('No se pudo leer esa canción. Prueba con un MP3 o WAV.'); }
  };
  q('cl-bpm').onchange = function(){ var v = clamp(parseFloat(q('cl-bpm').value) || 120, 50, 220); st.bpm = v; q('cl-bpm').value = v; if (st.audio) { st.ini = Math.round(fasePara(st.audio, v) * 100) / 100; q('cl-ini').value = st.ini.toFixed(2); } st.esc = null; vista(); };
  q('cl-ini').onchange = function(){ var v = Math.max(0, parseFloat(q('cl-ini').value) || 0); if (st.audio) { var beat = 60 / st.bpm, ph = st.audio.fase; v = ph + Math.round((v - ph) / beat) * beat; if (v < 0) v += beat; } st.ini = Math.round(v * 100) / 100; q('cl-ini').value = st.ini.toFixed(2); };
  q('cl-fx').onchange = function(){ st.efectos = q('cl-fx').checked; };
  q('cl-vm').oninput = function(){ st.volM = +q('cl-vm').value; };
  q('cl-ve').oninput = function(){ st.volE = +q('cl-ve').value; };
  q('cl-t').oninput = function(){ st.titulo = q('cl-t').value.trim(); st.esc = null; vista(); };
  q('cl-s').oninput = function(){ st.subtitulo = q('cl-s').value.trim(); st.esc = null; vista(); };
  q('cl-be').onchange = function(){ st.beatsEsc = +q('cl-be').value; st.esc = null; vista(); };
  function pintarMarca(){
    var m = st.marca;
    q('cl-mc').innerHTML = '<div id="cl-mcd" hidden><div class="pn-row"><label>Nombre <input id="cl-m0" type="text" maxlength="30" value="' + esc(m.nombre) + '"></label><label>Subtítulo <input id="cl-m1" type="text" maxlength="30" value="' + esc(m.sub) + '"></label></div>' +
      m.lineas.map(function(l, i){ return '<div class="pn-row"><label>' + esc(l[0]) + ' <input data-ml="' + i + '" type="text" maxlength="30" value="' + esc(l[1]) + '"></label></div>'; }).join('') + '</div><div class="pn-row"><button class="pn-btn sec" type="button" id="cl-mt">Editar mis datos del cierre</button></div>';
    q('cl-mt').onclick = function(){ var d = q('cl-mcd'); d.hidden = !d.hidden; q('cl-mt').textContent = d.hidden ? 'Editar mis datos del cierre' : 'Ocultar mis datos'; };
    var guardar = function(){ st.marca = { nombre: q('cl-m0').value, sub: q('cl-m1').value, lineas: m.lineas.map(function(l, i){ return [l[0], q('cl-mcd').querySelector('[data-ml="' + i + '"]').value]; }) }; marcaGuardar(st.marca); st.esc = null; vista(); };
    q('cl-m0').oninput = guardar; q('cl-m1').oninput = guardar; q('cl-mcd').querySelectorAll('[data-ml]').forEach(function(x){ x.oninput = guardar; });
  }
  function aplicarTpl(){
    el.querySelectorAll('.cl-ad').forEach(function(x){ x.hidden = st.tpl !== 'ad'; });
    el.querySelectorAll('.cl-tr').forEach(function(x){ x.hidden = st.tpl !== 'tr'; });
    st.clips.forEach(function(c){ var ok = efectosDe(st.tpl).some(function(e){ return e[0] === c.ef; }); if (!ok) c.ef = st.tpl === 'tr' ? 'auto' : 'ad'; });
    q('cl-tpl').value = st.tpl; q('cl-ci').checked = st.cierre; q('cl-ci2').checked = st.cierre;
    st.esc = null; pintarLista(); vista();
  }
  if (!root.Trailer) { st.tpl = 'ad'; }
  q('cl-tpl').onchange = function(){ st.tpl = q('cl-tpl').value; aplicarTpl(); };
  q('cl-n1').oninput = function(){ st.n1 = q('cl-n1').value.trim(); st.esc = null; vista(); };
  q('cl-n2').oninput = function(){ st.n2 = q('cl-n2').value.trim(); st.esc = null; vista(); };
  q('cl-e1').oninput = function(){ st.e1 = q('cl-e1').value.trim(); st.esc = null; vista(); };
  q('cl-e2').oninput = function(){ st.e2 = q('cl-e2').value.trim(); st.esc = null; vista(); };
  q('cl-ci2').onchange = function(){ st.cierre = q('cl-ci2').checked; q('cl-ci').checked = st.cierre; st.esc = null; vista(); };
  q('cl-ci').onchange = function(){ st.cierre = q('cl-ci').checked; q('cl-ci2').checked = st.cierre; st.esc = null; vista(); };
  q('cl-otra').onclick = function(){ st.semilla = 1 + Math.floor(Math.random() * 9970); st.esc = null; vista(); estado('Nueva versión: los efectos y su orden cambiaron.'); };
  q('cl-dtot').onchange = function(){ st.total = +q('cl-dtot').value; st.esc = null; st.mix = null; vista(); };
  q('cl-al').onchange = function(){ st.alinear = q('cl-al').checked; };
  pintarMarca();
  q('cl-can').onclick = function(){ st.cancelar = true; estado('Cancelando…'); };

  function iniTrailer(esc){
    var beat = 60 / st.bpm, ini = st.ini, dr = st.audio && st.audio.drop;
    if (st.alinear && dr && esc.plan.tDrop != null) {
      var ph = ((st.ini % beat) + beat) % beat, tb = ph + Math.round((dr.t - ph) / beat) * beat, i2 = tb - esc.plan.tDrop;
      while (i2 < 0) i2 += beat;
      if (i2 + esc.duracion <= st.audio.dur + 0.5) ini = i2;
    }
    return Math.max(0, ini);
  }
  async function generar(){
    if (st.ocupado) return;
    if (!st.clips.length) return aviso('Elige primero tus clips.');
    parar();
    if (!S || !S.soportado()) return aviso('Tu navegador no puede crear el video. Usa Chrome o Edge actualizados en la computadora.');
    st.ocupado = true; st.cancelar = false; q('cl-gen').disabled = true; q('cl-can').hidden = false; q('cl-pr').hidden = false; q('cl-pr').value = 0;
    try {
      var d = dims(), Wd = d[0], Hd = d[1];
      estado('Preparando el video…'); var esc = await crear(Wd, Hd);
      alerta('');
      estado(st.audio ? 'Mezclando la música y los efectos…' : 'Creando los efectos de sonido…');
      var audio = await mezcla(esc);
      var aacOk = await S.aacSoportado(), wavAparte = !aacOk;
      if (wavAparte) alerta('⚠ Tu navegador no puede guardar el audio dentro del MP4 (necesita el formato AAC). Se descargarán DOS archivos: el video y el audio (WAV). Para que salga con sonido en un solo archivo, usa Chrome o Edge actualizados en computadora.');
      estado('Creando el video… no cierres esta pestaña.');
      var blob = await S.exportar(esc, { fps: 30, bitrate: 10e6, audio: wavAparte ? null : audio, cancelado: function(){ return st.cancelar; }, progreso: function(p){ q('cl-pr').value = p; estado('Creando el video… ' + Math.round(p * 100) + '%'); } });
      if (!wavAparte) {
        var cab = await blob.slice(0, 3000000).arrayBuffer(), col = await blob.slice(Math.max(0, blob.size - 3000000)).arrayBuffer(), hay = false;
        [cab, col].forEach(function(ab){ var u8 = new Uint8Array(ab), i3; for (i3 = 0; i3 < u8.length - 3 && !hay; i3++) if (u8[i3] === 0x6d && u8[i3 + 1] === 0x70 && u8[i3 + 2] === 0x34 && u8[i3 + 3] === 0x61) hay = true; });
        if (!hay) { wavAparte = true; alerta('⚠ El video salió sin pista de audio dentro del MP4. Se descargará también el audio en un archivo aparte (WAV) para que lo unas en tu editor.'); }
      }
      var nombre = (st.tpl === 'tr' ? [st.n1, st.n2].filter(Boolean).join('-') || 'trailer' : st.titulo || 'antes-y-despues').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'video';
      var bajar = function(bl, nom){ var u = URL.createObjectURL(bl), l = document.createElement('a'); l.href = u; l.download = nom; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 60000); };
      bajar(blob, nombre + '-' + st.fmt + '.mp4');
      if (wavAparte) { await dormir(400); bajar(aWav(audio), nombre + '-audio.wav'); estado('Listo. Tu navegador no puede unir el audio al MP4, así que se descargaron dos archivos: el video y el audio (WAV). Júntalos en Premiere, CapCut o tu editor.'); aviso('Video y audio descargados'); }
      else { estado('Listo: el video se descargó con ' + (st.audio ? 'música y efectos de sonido.' : 'efectos de sonido (sin canción).') + ' La próxima versión saldrá distinta.'); aviso('Video listo'); }
    } catch (e) {
      estado(e && e.message === 'cancelado' ? 'Cancelado.' : 'No se pudo crear el video: ' + ((e && e.message) || 'error'));
    }
    st.ocupado = false; q('cl-gen').disabled = false; q('cl-can').hidden = true; q('cl-pr').hidden = true; st.semilla = 1 + Math.floor(Math.random() * 9970); st.esc = null; vista();
  }
  q('cl-gen').onclick = generar;
  aplicarTpl();
  return { estado: st, generar: generar, liberar: function(){ parar(); try { ac && ac.close(); } catch (e) {} st.clips.forEach(function(c){ try { URL.revokeObjectURL(c.url); } catch (e) {} }); } };
}

function cargar(Slideshow){ S = Slideshow; }
var API = { cargar: cargar, marcaGuardada: marcaGuardada, montar: montar, crearEscena: crearEscena, analizarAudio: analizarAudio, mezclar: mezclar, abrirClip: abrirClip, mejorRitmo: mejorRitmo, EFECTOS: EFECTOS };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Clips = API;
})(typeof window !== 'undefined' ? window : this);
