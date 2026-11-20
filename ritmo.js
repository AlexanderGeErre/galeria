/* ritmo.js — analiza una canción: pulsos reales, tempo y energía (sin IA externa, todo en el navegador). */
(function(root){
'use strict';
function mono(buf, sr){
  var n = buf.length, c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  var paso = buf.sampleRate / sr, m = Math.floor(n / paso), d = new Float32Array(m);
  for (var i = 0; i < m; i++) { var a = Math.floor(i * paso), b = Math.max(a + 1, Math.floor((i + 1) * paso)), s = 0; for (var k = a; k < b && k < n; k++) s += c1 ? (c0[k] + c1[k]) * .5 : c0[k]; d[i] = s / (b - a); }
  return d;
}
function analizar(buf, opt){
  opt = opt || {};
  var sr = 11025, hop = 256, x = mono(buf, sr), fps = sr / hop, nF = Math.floor(x.length / hop), i, k;
  // 3 bandas con filtros simples: graves, medios, agudos
  var lp1 = 0, lp2 = 0, a1 = 1 - Math.exp(-2 * Math.PI * 150 / sr), a2 = 1 - Math.exp(-2 * Math.PI * 1500 / sr);
  var eB = new Float32Array(nF), eM = new Float32Array(nF), eH = new Float32Array(nF), rms = new Float32Array(nF);
  for (i = 0; i < nF; i++) {
    var sb = 0, sm = 0, sh = 0;
    for (k = 0; k < hop; k++) { var v = x[i * hop + k]; lp1 += a1 * (v - lp1); lp2 += a2 * (v - lp2); var b = lp1, m = lp2 - lp1, h = v - lp2; sb += b * b; sm += m * m; sh += h * h; }
    eB[i] = Math.log(1 + 400 * sb / hop); eM[i] = Math.log(1 + 400 * sm / hop); eH[i] = Math.log(1 + 400 * sh / hop); rms[i] = Math.sqrt((sb + sm + sh) / hop);
  }
  // fuerza de ataques: subida de energía en cada banda
  var on = new Float32Array(nF), p = 1;
  for (i = 1; i < nF; i++) { var d1 = Math.max(0, eB[i] - eB[i - 1]) * 1.3 + Math.max(0, eM[i] - eM[i - 1]) + Math.max(0, eH[i] - eH[i - 1]) * .6; on[i] = d1; }
  // quitar nivel local para que solo queden picos
  var on2 = new Float32Array(nF), W = Math.round(fps * .5);
  for (i = 0; i < nF; i++) { var s = 0, c = 0; for (k = Math.max(0, i - W); k <= Math.min(nF - 1, i + W); k++) { s += on[k]; c++; } on2[i] = Math.max(0, on[i] - s / c); }
  // tempo por autocorrelación
  var minL = Math.round(fps * 60 / 180), maxL = Math.round(fps * 60 / 60), best = 0, bl = minL, ac = [];
  for (var L = minL; L <= maxL; L++) { var sc = 0; for (i = L; i < nF; i++) sc += on2[i] * on2[i - L]; var bpmL = 60 * fps / L; sc *= 1 - Math.abs(Math.log2(bpmL / 105)) * .12; ac[L] = sc; if (sc > best) { best = sc; bl = L; } }
  // refinar (parábola)
  var Lf = bl; if (ac[bl - 1] != null && ac[bl + 1] != null) { var y0 = ac[bl - 1], y1 = ac[bl], y2 = ac[bl + 1], dn = y0 - 2 * y1 + y2; if (dn < 0) Lf = bl + .5 * (y0 - y2) / dn; }
  var per = Lf;
  // seguimiento de pulsos (programación dinámica)
  var sco = new Float32Array(nF), prv = new Int32Array(nF).fill(-1), tight = 90;
  for (i = 0; i < nF; i++) {
    var bs = 0, bj = -1, lo = Math.round(i - per * 1.6), hi = Math.round(i - per * .6);
    for (var j = Math.max(0, lo); j <= hi; j++) { if (j < 0 || j >= i) continue; var r = Math.log((i - j) / per); var v2 = sco[j] - tight * r * r; if (bj < 0 || v2 > bs) { bs = v2; bj = j; } }
    sco[i] = on2[i] + (bj >= 0 ? Math.max(bs, 0) : 0); prv[i] = bj;
  }
  var end = 0, bv = -1; for (i = Math.max(0, nF - Math.round(per * 2)); i < nF; i++) if (sco[i] > bv) { bv = sco[i]; end = i; }
  var idx = []; for (i = end; i >= 0; i = prv[i]) { idx.push(i); if (prv[i] < 0) break; } idx.reverse();
  // afinar cada pulso al pico más cercano
  var beats = idx.map(function(f){ var bf = f, bm = on2[f]; for (var q = f - 2; q <= f + 2; q++) if (q >= 0 && q < nF && on2[q] > bm) { bm = on2[q]; bf = q; } return bf / fps; });
  // quitar duplicados
  var bt = []; beats.forEach(function(t){ if (!bt.length || t - bt[bt.length - 1] > per / fps * .5) bt.push(t); });
  var bpm = 60 * fps / per;
  // energía suave (ventanas de .5 s), normalizada 0..1 por percentiles
  var nE = Math.ceil(buf.duration * 2), E = new Float32Array(nE), cnt = new Float32Array(nE);
  for (i = 0; i < nF; i++) { var e = Math.min(nE - 1, Math.floor(i / fps * 2)); E[e] += rms[i]; cnt[e]++; }
  for (i = 0; i < nE; i++) E[i] = cnt[i] ? E[i] / cnt[i] : 0;
  var sm2 = new Float32Array(nE); for (i = 0; i < nE; i++) { var s2 = 0, c2 = 0; for (k = Math.max(0, i - 2); k <= Math.min(nE - 1, i + 2); k++) { s2 += E[k]; c2++; } sm2[i] = s2 / c2; }
  var srt = Array.prototype.slice.call(sm2).sort(function(a, b){ return a - b; }), q10 = srt[Math.floor(srt.length * .1)] || 0, q90 = srt[Math.floor(srt.length * .9)] || 1;
  var En = Array.prototype.map.call(sm2, function(v){ return Math.max(0, Math.min(1, (v - q10) / Math.max(1e-6, q90 - q10))); });
  // fuerza de cada pulso (para elegir dónde van los efectos fuertes)
  var fz = bt.map(function(t){ var f = Math.round(t * fps), m = 0; for (var q = f - 2; q <= f + 2; q++) if (q >= 0 && q < nF) m = Math.max(m, on2[q]); return m; });
  var fs = fz.slice().sort(function(a, b){ return a - b; }), fq = fs[Math.floor(fs.length * .7)] || 0;
  var fuertes = bt.map(function(t, n){ return fz[n] >= fq; });
  return { bpm: bpm, beats: bt, fuertes: fuertes, energia: En, dur: buf.duration };
}
function energiaEn(R, t){ var x = Math.max(0, Math.min(R.energia.length - 1, t * 2)), a = Math.floor(x), b = Math.min(R.energia.length - 1, a + 1); return R.energia[a] * (1 - (x - a)) + R.energia[b] * (x - a); }
root.Ritmo = { analizar: analizar, energiaEn: energiaEn };
})(typeof window !== 'undefined' ? window : globalThis);
