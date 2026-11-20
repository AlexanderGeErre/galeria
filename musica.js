/* Música por código - Alexander Ge Erre
   Instrumentos grabados (carpeta instrumentos/) + sintetizados de respaldo, progresión de 4 acordes al azar,
   arpegio continuo, melodía principal con motivo que varía, dinámica por actos y respiros antes de cada golpe. */
(function(root){
'use strict';
var SR = 48000;
/* ---------- Instrumentos grabados (carpeta instrumentos/) ---------- */
var INST_LISTA = {"piano": ["A2", "A3", "A4", "A5", "A6", "C2", "C3", "C4", "C5", "C6", "Ds2", "Ds3", "Ds4", "Ds5", "Ds6", "Fs2", "Fs3", "Fs4", "Fs5", "Fs6"], "violin": ["A3", "A4", "A5", "A6", "C4", "C5", "C6", "C7", "E4", "E5", "E6", "G3", "G4", "G5", "G6"], "xylophone": ["C5", "C6", "C7", "C8", "G4", "G5", "G6", "G7"], "cello": ["C2", "C3", "C4", "C5", "E2", "E3", "E4", "Gs2", "Gs3", "Gs4"], "harp": ["A2", "A4", "A6", "B1", "B3", "B5", "B6", "C3", "C5", "D2", "D4", "D6", "D7", "E1", "E3", "E5", "F2", "F4", "F6", "F7", "G1", "G3", "G5"]};
var INST_CACHE = null, INST_P = null;
function notaMidi(n){ var m = /^([A-G])(s?)(\d)$/.exec(n); if (!m) return null; return ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[m[1]] + (m[2] ? 1 : 0) + 12 * (+m[3] + 1); }
function cargarInstrumentos(base){
  if (INST_CACHE) return Promise.resolve(INST_CACHE); if (INST_P) return INST_P;
  var OA = root.OfflineAudioContext || root.webkitOfflineAudioContext; if (!OA || typeof fetch === 'undefined') return Promise.resolve(null);
  INST_P = (async function(){
    var dc = new OA(1, 1, SR), res = {}, jobs = [];
    Object.keys(INST_LISTA).forEach(function(ins){ res[ins] = []; INST_LISTA[ins].forEach(function(n){ jobs.push((async function(){
      try { var r = await fetch((base || 'instrumentos/') + ins + '/' + n + '.mp3'); if (!r.ok) return; var b = await dc.decodeAudioData(await r.arrayBuffer()); res[ins].push({ m: notaMidi(n), b: b }); } catch (e) {} })()); }); });
    await Promise.all(jobs);
    Object.keys(res).forEach(function(k){ res[k].sort(function(a, b){ return a.m - b.m; }); if (!res[k].length) delete res[k]; });
    INST_CACHE = Object.keys(res).length ? res : null; if (!INST_CACHE) INST_P = null; return INST_CACHE;
  })().catch(function(){ INST_P = null; return null; });
  return INST_P;
}


/* ---------- Compositor musical por código (sin archivos): arpegio continuo sobre una progresión de 4 acordes ---------- */
function componer(ctx, out, P, pf, dur, mv, R, nz, INS_S){
  var M = pf.musica, beat = P.beat, bus = ctx.createGain(); bus.gain.value = 1;
  // reverb larga (impulso de ruido que decae)
  var cv = ctx.createConvolver(), L = Math.floor(SR * 3.2), imp = ctx.createBuffer(2, L, SR), ch, q;
  for (ch = 0; ch < 2; ch++) { var d = imp.getChannelData(ch); for (q = 0; q < L; q++) d[q] = (R() * 2 - 1) * Math.pow(1 - q / L, 2.6); }
  cv.buffer = imp; var wet = ctx.createGain(); wet.gain.value = .5; bus.connect(cv); cv.connect(wet); wet.connect(out);
  var dry = ctx.createGain(); dry.gain.value = .9; bus.connect(dry); dry.connect(out);
  // curva general
  var g0 = ctx.createGain(); g0.gain.value = 1; // (el nivel se controla en cada nota con mv)
  var f = function(m){ return 440 * Math.pow(2, (m - 69) / 12); };
  function env(g, t, a, d2, pk, hold){ t = Math.max(0, t); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, pk * mv), t + a); if (hold) g.gain.setValueAtTime(Math.max(.0002, pk * mv), t + a + hold); g.gain.exponentialRampToValueAtTime(.0001, t + a + (hold || 0) + d2); }
  function osc(tipo, fr, t, d2){ t = Math.max(0, t); var o2 = ctx.createOscillator(); o2.type = tipo; o2.frequency.value = fr; o2.start(t); o2.stop(t + d2 + .1); return o2; }
  // muestra grabada: se usa la nota más cercana y se ajusta el tono (igual que hace Tone.js con su Sampler)
  function muestra(ins, t, m, v, d2, ataque, soltar, dest){
    var L = INS_S && INS_S[ins]; if (!L) return false; var best = L[0], q2; for (q2 = 1; q2 < L.length; q2++) if (Math.abs(L[q2].m - m) < Math.abs(best.m - m)) best = L[q2];
    t = Math.max(0, t); var s = ctx.createBufferSource(); s.buffer = best.b; s.playbackRate.value = Math.pow(2, (m - best.m) / 12); var g = ctx.createGain(), at = ataque || .004, fin = Math.min(best.b.duration / s.playbackRate.value - .05, d2 + (soltar || .25));
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(Math.max(.0002, v * mv), t + at); g.gain.setValueAtTime(Math.max(.0002, v * mv), t + Math.max(at, d2)); g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(at + .05, fin));
    s.connect(g); g.connect(dest || bus); s.start(t); s.stop(t + Math.max(at + .1, fin) + .05); return true;
  }
  function pianoSyn(t, m, v, d2){ var g = ctx.createGain(); env(g, t, .006, d2, .17 * v); [[1, 'triangle', 1], [2, 'sine', .45], [3, 'sine', .2], [4, 'sine', .1]].forEach(function(p){ var o2 = osc(p[1], f(m) * p[0], t, d2), gg = ctx.createGain(); gg.gain.value = p[2]; o2.connect(gg); gg.connect(g); }); g.connect(bus); }
  function piano(t, m, v, d2){ if (!muestra('piano', t, m, .4 * v, d2 + .5, .004, 1.2)) pianoSyn(t, m, v, d2); }
  function arpaSyn(t, m, v){ var g = ctx.createGain(); env(g, t, .004, 1.3, .15 * v); [[1, 'sine', 1], [2, 'triangle', .35], [3, 'sine', .12]].forEach(function(p){ var o2 = osc(p[1], f(m) * p[0], t, 1.3), gg = ctx.createGain(); gg.gain.value = p[2]; o2.connect(gg); gg.connect(g); }); g.connect(bus); }
  function arpa(t, m, v){ if (!muestra('harp', t, m, .4 * v, 1.2, .003, .5)) arpaSyn(t, m, v); }
  function campana(t, m, v){ var g = ctx.createGain(); env(g, t, .003, 1.8, .12 * v); [1, 2.76, 5.4].forEach(function(p, i){ var o2 = osc('sine', f(m + 12) * p, t, 1.8), gg = ctx.createGain(); gg.gain.value = 1 / (1 + i * 1.6); o2.connect(gg); gg.connect(g); }); g.connect(bus); }
  function cajita(t, m, v){ var g = ctx.createGain(); env(g, t, .002, .9, .13 * v); [1, 4.01].forEach(function(p, i){ var o2 = osc(i ? 'sine' : 'triangle', f(m + 12) * p, t, .9), gg = ctx.createGain(); gg.gain.value = i ? .2 : 1; o2.connect(gg); gg.connect(g); }); g.connect(bus); }
  function marimbaSyn(t, m, v){ var g = ctx.createGain(); env(g, t, .003, .35, .2 * v); [1, 4].forEach(function(p, i){ var o2 = osc('sine', f(m) * p, t, .35), gg = ctx.createGain(); gg.gain.value = i ? .25 : 1; o2.connect(gg); gg.connect(g); }); g.connect(bus); }
  function marimba(t, m, v){ if (!muestra('xylophone', t, m + 12, .4 * v, .5, .002, .3)) marimbaSyn(t, m, v); }
  function pluck(t, m, v){ var g = ctx.createGain(); env(g, t, .004, .28, .13 * v); var o2 = osc('sawtooth', f(m), t, .3), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(500, t + .25); o2.connect(lp); lp.connect(g); g.connect(bus); }
  function cuerdas(t, notas, d2){ if (INS_S && (INS_S.violin || INS_S.cello)) { notas.forEach(function(m){ var ins = (m < 55 && INS_S.cello) ? 'cello' : (INS_S.violin && m >= 52 ? 'violin' : 'cello'); if (!INS_S[ins] || !muestra(ins, t, m, .3, d2 * .8, Math.min(.7, d2 * .3), d2 * .35)) { } }); return; }
    notas.forEach(function(m){ [-6, 6].forEach(function(dt){ var g = ctx.createGain(); env(g, t, Math.min(.9, d2 * .4), d2 * .5, .05, d2 * .2); var o2 = osc('sawtooth', f(m), t, d2 * 1.3); o2.detune.value = dt; var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; o2.connect(lp); lp.connect(g); g.connect(bus); }); }); }
  function pad(t, notas, d2){ notas.forEach(function(m){ var g = ctx.createGain(); env(g, t, d2 * .45, d2 * .45, .06, d2 * .1); var o2 = osc('sine', f(m), t, d2 * 1.2); o2.connect(g); g.connect(bus); var o3 = osc('triangle', f(m + 12), t, d2 * 1.2), g3 = ctx.createGain(); g3.gain.value = .25; o3.connect(g3); g3.connect(g); }); }
  function bajo(t, m, d2, tipo){ var g = ctx.createGain(); env(g, t, .02, d2, .3); var o2 = osc(tipo === 'synth' ? 'sawtooth' : 'sine', f(m), t, d2); var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = tipo === 'synth' ? 380 : 260; o2.connect(lp); lp.connect(g); g.connect(out); }
  function ruidoM(t, d2, tipo, fr, pk, rosa){ var s = ctx.createBufferSource(); s.buffer = nz; var fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.value = fr; var g = ctx.createGain(); env(g, t, .002, d2, pk); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, R() * 1.5, d2 + .1); }
  function bombo(t, v){ var o2 = ctx.createOscillator(); o2.frequency.setValueAtTime(140, t); o2.frequency.exponentialRampToValueAtTime(42, t + .16); var g = ctx.createGain(); env(g, t, .004, .22, .42 * v); o2.connect(g); g.connect(out); o2.start(t); o2.stop(t + .3); }
  function taiko(t, v){ var o2 = ctx.createOscillator(); o2.frequency.setValueAtTime(110, t); o2.frequency.exponentialRampToValueAtTime(45, t + .35); var g = ctx.createGain(); env(g, t, .004, .5, .55 * v); o2.connect(g); g.connect(out); o2.start(t); o2.stop(t + .6); ruidoM(t, .08, 'lowpass', 1500, .25 * v); }
  // escala, progresión de 4 acordes al azar y tónica al azar
  var ESC = M.escala === 'menor' ? [0, 2, 3, 5, 7, 8, 10] : (M.escala === 'pent' ? [0, 2, 4, 7, 9, 12, 14] : [0, 2, 4, 5, 7, 9, 11]);
  var PROGS = M.escala === 'menor' ? [[0, 5, 2, 6], [0, 3, 5, 4], [0, 5, 6, 4]] : [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 3], [5, 3, 0, 4]];
  var prog = PROGS[Math.floor(R() * PROGS.length)], ton = [57, 60, 62, 55, 59][Math.floor(R() * 5)];
  function nota(gr){ var oc = Math.floor(gr / 7), i = ((gr % 7) + 7) % 7; return ton + ESC[i] + 12 * oc; }
  function acorde(gr){ return [nota(gr), nota(gr + 2), nota(gr + 4)]; }
  var INS = { piano: piano, arpa: arpa, campana: campana, cajita: cajita, marimba: marimba, pluck: pluck, pad: function(t, m, v){ piano(t, m, v * .8, 1.1); } };
  var act, cut = pf.revelacion ? [P.tAct2 - .55, P.tAct2 - .02] : null;
  var step = beat / 2, n = Math.ceil(dur / step), bar = 4 * beat, pat = [0, 1, 2, 3, 2, 1, 2, 1];
  for (q = 0; q < n; q++) {
    var t = q * step; if (t >= dur - .05) break;
    var a = t < P.tAct2 - 1e-6 ? 1 : (t < P.tAct3 - 1e-6 ? 2 : 3), a0 = a === 1 ? 0 : (a === 2 ? P.tAct2 : P.tAct3);
    var ib = Math.floor((t - a0 + 1e-6) / bar), ps = Math.round(((t - a0) % bar) / step), ch2 = prog[((ib % 4) + 4) % 4], ac = acorde(ch2);
    if (cut && t >= cut[0] && t < cut[1]) continue;
    if ((t >= P.tAct2 - beat * .9 && t < P.tAct2 - 1e-6) || (t >= P.tAct3 - beat * .45 && t < P.tAct3 - 1e-6)) continue; // respiro antes del golpe
    var ins = INS[a === 1 ? M.a1 : (a === 2 ? M.a2 : M.a3)];
    var idx = pat[ps % 8], m = idx === 3 ? ac[0] + 12 : ac[idx], fr = ((ib % 4) + 4) % 4, vel = (a === 1 ? .6 + .25 * Math.min(1, t / Math.max(1, P.tAct2)) : (a === 2 ? .8 + .06 * fr : .85 - .06 * Math.min(3, ib))) * (ps === 0 ? 1.12 : 1), humano = (R() - .5) * .012; if (t + humano < 0) humano = 0;
    var dur2 = a === 3 ? 1.4 : .6;
    if (a === 3 && ps % 2) { /* arpegio de cierre: un poco más suelto */ }
    ins(t + humano, m + 12 * (a === 3 ? 0 : 0), vel * (.8 + .2 * (ps % 2 ? 0 : 1)), dur2);
    if (ps === 0) {
      if (a === 1 && M.pad) pad(t, acorde(ch2).map(function(x){ return x - 12; }), bar);
      if (a === 1) bajo(t, ac[0] - 24, bar * .9, 'sub');
      if (a === 2) {
        if (M.cuerdas) cuerdas(t, [ac[0] - 12, ac[1] - 12, ac[2] - 12, ac[0]], bar);
        else pad(t, [ac[0], ac[1], ac[2]], bar);
        bajo(t, ac[0] - 24, bar * .45, M.bajo);
      }
      if (a === 3) { pad(t, [ac[0] - 12, ac[1] - 12, ac[2] - 12], bar * 1.1); bajo(t, ac[0] - 24, bar * .9, 'sub'); }
    }
    if (a === 2) {
      if (ps === 4) bajo(t, ac[0] - 24, bar * .45, M.bajo);
      if (M.perc === 'baile') { if (ps % 2 === 0) bombo(t, 1); if (ps % 2 === 1) ruidoM(t, .05, 'highpass', 7000, .12); if (ps === 2 || ps === 6) ruidoM(t, .12, 'bandpass', 1800, .2); }
      else if (M.perc === 'epica') { if (ps === 0 || ps === 4) taiko(t, 1); if (ps === 2 || ps === 6) taiko(t, .55); if (ps % 2) ruidoM(t, .04, 'highpass', 8000, .08); }
      else if (M.perc === 'suave') { if (ps === 0 || ps === 4) bombo(t, .6); if (ps === 2 || ps === 6) ruidoM(t, .08, 'bandpass', 2400, .07); }
    }
  }
  // Melodía principal: un motivo corto que se repite y varía en cada compás (actos 2 y 3)
  var RIT = [[1, 1, 1, 1], [1.5, .5, 1, 1], [2, 1, 1], [1, .5, .5, 2], [.5, .5, 1, 2], [1, 1, 2]], rm = RIT[Math.floor(R() * RIT.length)], mot = [], dg = [0, 2, 4, 1, 2][Math.floor(R() * 5)];
  rm.forEach(function(){ dg += [-2, -1, 1, 1, 2, 0][Math.floor(R() * 6)]; mot.push(dg); });
  var bt0 = P.tAct2 + 0, nb = Math.floor((dur - 1.5 - bt0) / bar);
  for (q = 0; q < nb; q++) {
    var tb = bt0 + q * bar, act3 = tb >= P.tAct3 - 1e-6, a0b = act3 ? P.tAct3 : P.tAct2, ib2 = Math.floor((tb - a0b + 1e-6) / bar), cg = prog[((ib2 % 4) + 4) % 4];
    if (act3 && ib2 > 1) break; // en el final solo suena el arpegio con eco
    var tt = tb, qv = (act3 ? .55 : .5 + .1 * (ib2 % 4)) * (ib2 % 2 === 1 && R() < .4 ? .6 : 1);
    rm.forEach(function(du, ix){
      var dd = mot[ix] + (ib2 % 2 === 1 && ix === rm.length - 1 ? 1 : 0), mm = nota(cg + dd) + 12, t2 = tt;
      if (!(ib2 % 4 === 3 && ix === rm.length - 1 && R() < .5) && t2 < dur - 1.2) {
        if (act3) campana(t2, mm - 12, qv * .9); else if (!(INS_S && INS_S.violin && muestra('violin', t2, mm, qv * .5, du * beat * .9, .06, .3))) piano(t2, mm, qv, du * beat);
      }
      tt += du * beat;
    });
  }
  return bus;
}


root.Musica = { cargarInstrumentos: cargarInstrumentos, componer: componer };
})(typeof window !== 'undefined' ? window : this);
