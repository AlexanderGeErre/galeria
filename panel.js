(function(){
'use strict';
var W = 'https://galerias-api.alexandergeerre.workers.dev';
var BASE = 'https://alexandergeerre.github.io/galeria/cliente.html?c=';
var MAX = 45 * 1048576;
var ESTADOS = { draft: 'Borrador', selection: 'En selección', selection_sent: 'Selección enviada', delivered: 'Entregada', expired: 'Expirada' };
var EXTS = ['.png.jpg', '.jpg.jpg', '.jpg', '.png', '.jpeg', '.webp', '.png.png'];
var db, ph, root, gals = [], favs = {}, vista = 'inicio', galId = null, tab = 'panel', busca = '', fEst = '', cur = null;

var CSS = '.pn{--f:#FAF8F5;--t:#2B2623;--s:#7a7068;--l:#E6DFD6;--a:#B08968;--p:#F3EFE9;--c:#fff;display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:var(--f);color:var(--t);font-family:Jost,system-ui,sans-serif}' +
'@media(prefers-color-scheme:dark){.pn{--f:#151413;--t:#F1ECE4;--s:#a39a91;--l:#2c2926;--a:#C9A27A;--p:#1c1a18;--c:#1c1a18}.pn-il{mix-blend-mode:normal!important;filter:none!important;border-radius:8px}}' +
'.pn *{box-sizing:border-box}.pn aside{background:var(--c);border-right:1px solid var(--l);padding:1.4rem 1rem;display:flex;flex-direction:column;gap:.3rem;position:sticky;top:0;height:100vh}' +
'.pn .marca{font-family:"Cormorant Garamond",serif;font-size:1.35rem;margin-bottom:1.2rem}.pn aside button{background:none;border:0;text-align:left;padding:.55rem .7rem;border-radius:10px;color:var(--s)}' +
'.pn aside button.on{background:var(--l);color:var(--t)}.pn aside .pie{margin-top:auto}.pn main{padding:2rem clamp(1rem,4vw,3rem);max-width:1100px;width:100%}' +
'.pn h1,.pn h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;line-height:1.1}.pn h1{font-size:2.6rem}.pn h2{font-size:1.5rem;margin-bottom:.6rem}' +
'.pn-btn{background:var(--t);color:var(--f);border:1px solid var(--t);padding:.55rem 1.2rem;border-radius:999px;cursor:pointer;font:inherit}.pn-btn.sec{background:none;color:var(--t);border-color:var(--l)}.pn-btn.rojo{background:none;color:#b5453f;border-color:#b5453f}' +
'.pn-btn:disabled{opacity:.5}.pn input[type=text],.pn input[type=date],.pn select{width:100%;padding:.65rem .85rem;border:1px solid var(--l);background:var(--f);color:var(--t);border-radius:10px;font:inherit}' +
'.pn-s{color:var(--s);font-size:.9rem}.pn-row{display:flex;gap:.7rem;flex-wrap:wrap;align-items:center;margin:.8rem 0}.pn-row input[type=text]{flex:1;min-width:12rem}.pn-row select{width:auto}' +
'.pn-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));border:1px solid var(--l);border-radius:14px;background:var(--c);margin:.6rem 0 1.6rem}.pn-cifras div{padding:1rem 1.2rem;border-right:1px solid var(--l)}.pn-cifras div:last-child{border:0}' +
'.pn-cifras b{font-family:"Cormorant Garamond",serif;font-size:2rem;font-weight:500;display:block;line-height:1.1}' +
'.pn-rej{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}.pn-tar{background:none;border:0;text-align:left;padding:0;color:inherit;cursor:pointer;font:inherit}' +
'.pn-tar .cv{aspect-ratio:3/2;background:var(--l);border-radius:10px;overflow:hidden;display:grid;place-items:center;transition:transform .25s,box-shadow .25s}.pn-tar:hover .cv{transform:translateY(-3px);box-shadow:0 12px 28px rgba(43,38,35,.14)}' +
'.pn-tar .cv>img{width:100%;height:100%;object-fit:cover}.pn-tar .cv .pn-il{width:45%;mix-blend-mode:normal;filter:none}.pn-tar.nuevo .cv{border:1px dashed var(--s);background:none;font-size:2rem;color:var(--s)}' +
'.pn-tar h3{font-size:.85rem;font-weight:500;text-transform:uppercase;letter-spacing:.06em;margin:.5rem 0 0}.pn-pill{display:inline-block;border:1px solid var(--a);border-radius:999px;padding:0 .65rem;font-size:.8rem;margin-top:.2rem}' +
'.pn-card{border:1px solid var(--l);border-radius:14px;background:var(--c);padding:1.2rem;margin:.6rem 0 1.4rem}.pn-vacio{display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap}.pn-vacio .pn-il{width:7rem}' +
'.pn-il{mix-blend-mode:multiply;filter:contrast(1.04) brightness(1.05);max-width:100%;display:block}' +
'.pn-tabs{display:flex;gap:1.4rem;border-bottom:1px solid var(--l);margin:1rem 0 1.2rem;flex-wrap:wrap}.pn-tabs button{background:none;border:0;padding:.5rem 0;color:var(--s);border-bottom:2px solid transparent;cursor:pointer;font:inherit}.pn-tabs button.on{color:var(--t);border-color:var(--a)}' +
'.pn-marcaui{margin:.4rem 0 .8rem}.pn-marcaui select{width:auto}.pn-copia{display:flex;gap:.5rem;margin:.4rem 0 1rem}.pn-copia input{flex:1}.pn-lado{display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap}.pn-lado .pn-il{width:13rem}' +
'.pn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.pn-ph{margin:0;position:relative}.pn-ph img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--l);display:block}.pn-ph.cv img{outline:2px solid var(--a)}' +
'.pn-ph figcaption{font-size:.75rem;color:var(--s);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-ac{display:flex;gap:.3rem;margin-top:.2rem}.pn-ac button{background:none;border:1px solid var(--l);border-radius:999px;font-size:.72rem;padding:.1rem .5rem;color:var(--t);cursor:pointer}' +
'.pn-fila{display:flex;justify-content:space-between;gap:1rem;padding:.4rem 0;border-bottom:1px solid var(--l);font-size:.9rem}#pn-prog{list-style:none;padding:0;margin:.5rem 0 0;font-size:.9rem;max-height:12rem;overflow:auto}' +
'.pn dialog{border:1px solid var(--l);background:var(--f);color:var(--t);border-radius:16px;padding:1.4rem;width:min(30rem,92vw);margin:auto;box-shadow:0 24px 60px rgba(43,38,35,.25)}.pn dialog::backdrop{background:rgba(43,38,35,.5)}' +
'.pn dialog form{display:flex;flex-direction:column;gap:.7rem}.pn textarea{width:100%;height:9rem;background:none;border:1px solid var(--l);border-radius:10px;padding:.6rem;color:inherit;font:inherit}' +
'.pn-toast{position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);background:var(--t);color:var(--f);padding:.7rem 1.2rem;border-radius:999px;z-index:50;font-size:.95rem}' +
'@media(max-width:760px){.pn{grid-template-columns:1fr}.pn aside{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center}.pn .marca{margin:0 1rem 0 0}.pn aside .pie{margin:0 0 0 auto}}';

function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function $(s){ return root.querySelector(s); }
function ilus(n){ return '<img class="pn-il" data-n="' + n + '" data-i="0" src="imagenes/' + n + EXTS[0] + '" alt="">'; }
document.addEventListener('error', function(e){
  var t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset.n) return;
  var i = +t.dataset.i + 1;
  if (i < EXTS.length) { t.dataset.i = i; t.src = 'imagenes/' + t.dataset.n + EXTS[i]; } else t.style.visibility = 'hidden';
}, true);
function aviso(t){ var d = document.createElement('div'); d.className = 'pn-toast'; d.textContent = t; root.appendChild(d); setTimeout(function(){ d.remove(); }, 4200); }
function slug(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'galeria'; }
function codigo(){ var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = ''; for (var i = 0; i < 8; i++) c += a[Math.floor(Math.random() * a.length)]; return c; }
function mb(n){ return (n / 1048576).toFixed(1) + ' MB'; }
function gal(id){ return gals.filter(function(g){ return g.id === id; })[0]; }
function copiar(t){ try { navigator.clipboard.writeText(t); } catch(e) {} }

async function api(path, body){
  var s = (await db.auth.getSession()).data.session;
  var r = await fetch(W + path, { method: 'POST', headers: { Authorization: 'Bearer ' + (s ? s.access_token : ''), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
async function firmar(ids){
  var out = {};
  for (var i = 0; i < ids.length; i += 200) {
    var r = await api('/api/admin/sign', { photos: ids.slice(i, i + 200) });
    Object.assign(out, r.fotos || {});
  }
  return out;
}
function src(t){ return W + '/api/img?t=' + encodeURIComponent(t); }

async function cargarGalerias(){
  var g = await db.from('galleries').select('id,title,access_code,event_date,status,expires_at,created_at,cover_photo_id,client_id,downloads_enabled,selection_enabled,watermark_text,watermark_opacity').is('deleted_at', null).order('created_at', { ascending: false });
  if (g.error) { aviso(g.error.message); return; }
  gals = g.data || [];
  var sinPortada = gals.filter(function(x){ return !x.cover_photo_id; }).map(function(x){ return x.id; }), primeras = {};
  if (sinPortada.length) {
    var p = await db.from('photos').select('id,gallery_id').eq('photo_type', 'selection').in('gallery_id', sinPortada).order('sort_order').order('filename').limit(1000);
    (p.data || []).forEach(function(x){ if (!primeras[x.gallery_id]) primeras[x.gallery_id] = x.id; });
  }
  gals.forEach(function(x){ x.portadaId = x.cover_photo_id || primeras[x.id] || null; });
  var tk = await firmar(gals.map(function(x){ return x.portadaId; }).filter(Boolean));
  gals.forEach(function(x){ x.portada = x.portadaId && tk[x.portadaId] ? src(tk[x.portadaId]) : ''; });
  var f = await db.from('favorites').select('gallery_id').limit(1000);
  favs = {}; (f.data || []).forEach(function(x){ favs[x.gallery_id] = (favs[x.gallery_id] || 0) + 1; });
}

function tarjeta(g){
  var cv = g.portada ? '<img src="' + esc(g.portada) + '" alt="">' : ilus('admin-sin-portada');
  return '<button class="pn-tar" data-act="abrir" data-id="' + g.id + '"><div class="cv">' + cv + '</div><h3>' + esc(g.title) + '</h3><p class="pn-s">' + esc(g.event_date || '') + '</p><span class="pn-pill">' + esc(ESTADOS[g.status] || g.status) + '</span></button>';
}

function pintar(){
  root.querySelectorAll('aside [data-v]').forEach(function(b){ b.classList.toggle('on', b.dataset.v === (vista === 'detalle' ? 'galerias' : vista)); });
  if (vista === 'inicio') return pintarInicio();
  if (vista === 'galerias') return pintarLista();
  pintarDetalle();
}

async function pintarInicio(){
  var ent = gals.filter(function(g){ return g.status === 'delivered'; }).length;
  var pend = gals.filter(function(g){ return g.status === 'selection_sent'; });
  var act = pend.length ? pend.map(function(g){ return '<p><button class="pn-btn sec" data-act="abrir" data-id="' + g.id + '">' + esc(g.title) + '</button> envió su selección</p>'; }).join('')
    : '<div class="pn-vacio">' + ilus('admin-al-dia') + '<div><b>Todo al día</b><p class="pn-s">No hay selecciones nuevas por revisar.</p></div></div>';
  $('#pn-main').innerHTML = '<h1>Hola, ' + esc(ph.studio_name) + '</h1><div class="pn-row"><input type="text" id="pn-q" placeholder="Buscar galerías"><button class="pn-btn" data-act="nueva">+ Crear galería</button></div>' +
    '<h2>Resumen</h2><div class="pn-cifras"><div><b>' + gals.length + '</b><span class="pn-s">Galerías</span></div><div><b>' + ent + '</b><span class="pn-s">Entregadas</span></div><div><b id="pn-nv">–</b><span class="pn-s">Vistas</span></div><div><b id="pn-nf">–</b><span class="pn-s">Favoritas</span></div><div><b id="pn-np">–</b><span class="pn-s">Fotos</span></div></div>' +
    '<h2>Actividad reciente</h2><div class="pn-card">' + act + '</div><h2>Galerías recientes</h2><div class="pn-rej">' + gals.slice(0, 4).map(tarjeta).join('') + '</div>';
  $('#pn-q').addEventListener('keydown', function(e){ if (e.key === 'Enter') { busca = e.target.value; vista = 'galerias'; pintar(); } });
  [['gallery_views', '#pn-nv'], ['favorites', '#pn-nf'], ['photos', '#pn-np']].forEach(async function(t){
    var c = await db.from(t[0]).select('id', { count: 'exact', head: true });
    var el = $(t[1]); if (el && !c.error) el.textContent = c.count;
  });
}

function pintarLista(){
  var l = gals.filter(function(g){ return (!fEst || g.status === fEst) && (!busca || g.title.toLowerCase().indexOf(busca.toLowerCase()) >= 0); });
  var op = Object.keys(ESTADOS).map(function(k){ return '<option value="' + k + '"' + (k === fEst ? ' selected' : '') + '>' + ESTADOS[k] + '</option>'; }).join('');
  $('#pn-main').innerHTML = '<h1>Galerías de clientes</h1><div class="pn-row"><input type="text" id="pn-q" placeholder="Buscar por nombre" value="' + esc(busca) + '"><select id="pn-fe"><option value="">Todos los estados</option>' + op + '</select></div>' +
    '<div class="pn-rej"><button class="pn-tar nuevo" data-act="nueva"><div class="cv">+</div><h3>Agregar galería</h3></button>' + l.map(tarjeta).join('') + '</div>' +
    (gals.length ? '' : '<div class="pn-card pn-vacio" style="margin-top:1.4rem">' + ilus('admin-vacio') + '<div><b>Aún no hay galerías</b><p class="pn-s">Crea la primera con el botón de arriba.</p></div></div>');
  $('#pn-q').addEventListener('input', function(e){ busca = e.target.value; pintarLista(); var q = $('#pn-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); });
  $('#pn-fe').addEventListener('change', function(e){ fEst = e.target.value; pintarLista(); });
}

async function abrirDetalle(id, conservar){
  galId = id; vista = 'detalle'; if (!conservar) tab = 'panel'; cur = null; pintar();
  var p = await db.from('photos').select('id,filename,photo_type,file_size,sort_order').eq('gallery_id', id).order('sort_order').order('filename').limit(1000);
  var f = await db.from('favorites').select('photo_id,visitor_token').eq('gallery_id', id).limit(1000);
  var v = await db.from('gallery_views').select('id', { count: 'exact', head: true }).eq('gallery_id', id);
  var fotos = p.data || [];
  var tk = await firmar(fotos.filter(function(x){ return x.photo_type === 'selection'; }).map(function(x){ return x.id; }));
  cur = { fotos: fotos, favs: f.data || [], vistas: v.count || 0, tk: tk };
  pintar();
}

function pintarDetalle(){
  var g = gal(galId); if (!g) { vista = 'galerias'; return pintar(); }
  var sel = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }) : [];
  var fin = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'final'; }) : [];
  var cuerpo = '';
  if (!cur) cuerpo = '<p class="pn-s">Cargando…</p>';
  else if (tab === 'panel') {
    var unicas = {}; cur.favs.forEach(function(x){ unicas[x.photo_id] = 1; });
    cuerpo = '<div class="pn-cifras"><div><b>' + sel.length + '</b><span class="pn-s">Fotos de selección</span></div><div><b>' + fin.length + '</b><span class="pn-s">Finales</span></div><div><b>' + Object.keys(unicas).length + '</b><span class="pn-s">Favoritas</span></div><div><b>' + cur.vistas + '</b><span class="pn-s">Vistas</span></div></div>' +
      '<div class="pn-row">' + (g.status === 'delivered' ? '<button class="pn-btn" data-act="reabrir">Reabrir selección</button>' : '<button class="pn-btn" data-act="entregar">Marcar como entregada</button>') + '<button class="pn-btn rojo" data-act="eliminar-galeria">Eliminar galería</button></div>' +
      '<p class="pn-s">Al entregar, el cliente puede descargar las fotos finales y ya no puede cambiar sus favoritas.</p>';
  } else if (tab === 'fotos') {
    cuerpo = '<div class="pn-card"><h2>Subir fotos</h2><div class="pn-row"><label><input type="radio" name="pn-dest" value="selection" checked> Selección (se reducen a 1600 px)</label><label><input type="radio" name="pn-dest" value="final"> Finales (originales, hasta 45 MB)</label></div>' +
      '<div class="pn-marcaui" id="pn-mbox"><label class="pn-s"><input type="checkbox" id="pn-marca" checked> Poner marca de agua en las fotos de selección</label>' +
      '<div class="pn-row" id="pn-mopts"><input type="text" id="pn-mt" placeholder="Texto de la marca" value="' + esc(g.watermark_text || 'Buenos Momentos') + '"><select id="pn-mo"><option value="20">Suave</option><option value="35">Media</option><option value="55">Fuerte</option></select><select id="pn-ms"><option value="s">Pequeña</option><option value="m">Mediana</option><option value="l">Grande</option></select></div>' +
      '</div><div class="pn-row"><input type="file" id="pn-file" accept="image/jpeg,image/png,image/webp,image/tiff" multiple><button class="pn-btn" data-act="subir" id="pn-go">Subir</button></div><ul id="pn-prog"></ul></div>' +
      '<h2>Selección (' + sel.length + ')</h2>' + (sel.length ? '<div class="pn-grid">' + sel.map(function(x){
        return '<figure class="pn-ph' + (g.cover_photo_id === x.id ? ' cv' : '') + '"><img loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"><figcaption>' + esc(x.filename) + '</figcaption><div class="pn-ac"><button data-act="portada" data-id="' + x.id + '">Portada</button><button data-act="borrar-foto" data-id="' + x.id + '">Eliminar</button></div></figure>';
      }).join('') + '</div>' : '<div class="pn-vacio">' + ilus('admin-subir') + '<p class="pn-s">Aún no hay fotos de selección.</p></div>') +
      '<h2 style="margin-top:1.6rem">Finales (' + fin.length + ')</h2>' + (fin.length ? fin.map(function(x){
        return '<div class="pn-fila"><span>' + esc(x.filename) + ' · ' + mb(x.file_size || 0) + '</span><button class="pn-btn sec" data-act="borrar-foto" data-id="' + x.id + '">Eliminar</button></div>';
      }).join('') : '<p class="pn-s">Aún no hay fotos finales.</p>');
  } else if (tab === 'favoritas') {
    var nombre = {}; cur.fotos.forEach(function(x){ nombre[x.id] = x.filename; });
    var por = {}; cur.favs.forEach(function(x){ (por[x.visitor_token] = por[x.visitor_token] || []).push(nombre[x.photo_id] || '?'); });
    var vis = Object.keys(por);
    cuerpo = vis.length ? vis.map(function(k, i){ var n = por[k].sort(); return '<div class="pn-card"><h2>Invitado ' + (i + 1) + ' · ' + n.length + ' fotos</h2><textarea readonly>' + esc(n.join(', ')) + '</textarea><div class="pn-row"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(n.join(', ')) + '">Copiar nombres</button></div></div>'; }).join('')
      : '<div class="pn-vacio">' + ilus('admin-sin-clientes') + '<p class="pn-s">Todavía no hay favoritas en esta galería.</p></div>';
  } else {
    var url = BASE + g.access_code;
    cuerpo = '<div class="pn-lado">' + ilus('compartir-enlace') + '<div style="flex:1;min-width:15rem"><p class="pn-s">Enlace para el cliente</p><div class="pn-copia"><input type="text" readonly value="' + esc(url) + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(url) + '">Copiar</button></div><p class="pn-s">Código de acceso</p><div class="pn-copia"><input type="text" readonly value="' + esc(g.access_code) + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(g.access_code) + '">Copiar</button></div></div></div>';
  }
  $('#pn-main').innerHTML = '<button class="pn-btn sec" data-act="atras">← Galerías</button><h1 style="margin-top:1rem">' + esc(g.title) + '</h1><span class="pn-pill">' + esc(ESTADOS[g.status] || g.status) + '</span>' +
    '<div class="pn-tabs">' + [['panel', 'Panel de control'], ['fotos', 'Fotos'], ['favoritas', 'Favoritas'], ['compartir', 'Compartir']].map(function(x){ return '<button data-act="tab" data-t="' + x[0] + '"' + (tab === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>' + cuerpo;
  if (cur && tab === 'fotos') {
    $('#pn-mo').value = String(opMarca(g)); if (!$('#pn-mo').value) $('#pn-mo').value = '35'; $('#pn-ms').value = tamMarca();
    $('#pn-marca').addEventListener('change', mostrarMarca);
    root.querySelectorAll('input[name=pn-dest]').forEach(function(r){ r.addEventListener('change', mostrarMarca); });
    mostrarMarca();
    try { document.fonts.load('300 20px Jost'); } catch(e) {}
  }
}

function opMarca(g){
  var v = g && g.watermark_opacity != null ? Number(g.watermark_opacity) : 35;
  if (!isFinite(v) || v <= 0) v = 35; if (v <= 1) v = Math.round(v * 100);
  return Math.min(80, Math.max(10, v));
}
function tamMarca(){ try { return localStorage.getItem('pn-wm-tam') || 'm'; } catch(e) { return 'm'; } }
function reducir(file, marca){
  return createImageBitmap(file).then(function(b){
    var k = Math.min(1, 1600 / Math.max(b.width, b.height)), c = document.createElement('canvas');
    c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
    var cx = c.getContext('2d'); cx.drawImage(b, 0, 0, c.width, c.height);
    if (marca) marcar(cx, c.width, c.height, marca);
    return new Promise(function(r){ c.toBlob(function(bl){ r({ blob: bl, w: c.width, h: c.height }); }, 'image/jpeg', 0.85); });
  });
}
// Marca de agua: MAYÚSCULAS, letras muy separadas, cuadrícula diagonal que cubre toda la foto.
function marcar(cx, w, h, o){
  var t = String(o.text || '').trim().toUpperCase(); if (!t) return;
  var mult = { s: 0.75, m: 1, l: 1.4 }[o.size] || 1;
  var fs = Math.max(12, Math.round(Math.sqrt(w * h) * 0.023 * mult)), sp = fs * 0.4;
  var fam = '300 ' + fs + 'px Jost, "Helvetica Neue", Arial, sans-serif';
  cx.save(); cx.font = fam; cx.textAlign = 'left'; cx.textBaseline = 'middle';
  var anchos = [], tw = 0;
  for (var i = 0; i < t.length; i++) { var a = cx.measureText(t[i]).width; anchos.push(a); tw += a + sp; }
  tw -= sp;
  var op = (o.opacity || 35) / 100;
  cx.fillStyle = 'rgba(255,255,255,' + op + ')';
  cx.shadowColor = 'rgba(0,0,0,' + (op * 0.6) + ')'; cx.shadowBlur = Math.max(1, fs / 10); cx.shadowOffsetX = 0; cx.shadowOffsetY = 0;
  cx.translate(w / 2, h / 2); cx.rotate(-35 * Math.PI / 180);
  var px = tw + fs * 6, py = fs * 4.8, R = Math.hypot(w, h) / 2 + px, fila = 0;
  for (var y = -R; y <= R; y += py, fila++) {
    for (var x = -R + (fila % 2 ? px / 2 : 0); x <= R; x += px) {
      var cxp = x - tw / 2;
      for (var j = 0; j < t.length; j++) { cx.fillText(t[j], cxp, y); cxp += anchos[j] + sp; }
    }
  }
  cx.restore();
}
function opcionesMarca(){
  if (!$('#pn-marca') || !$('#pn-marca').checked) return null;
  return { text: $('#pn-mt').value, opacity: +$('#pn-mo').value, size: $('#pn-ms').value };
}
function mostrarMarca(){
  var box = $('#pn-mbox'); if (!box) return;
  var fin = root.querySelector('input[name=pn-dest]:checked').value === 'final';
  box.hidden = fin;
  var op = $('#pn-mopts'); if (op) op.hidden = !$('#pn-marca').checked;
}
var ERR = { muy_grande: 'pesa más de 45 MB', formato: 'formato no permitido (usa JPG, PNG, WEBP o TIFF)', sin_sesion: 'tu sesión caducó, vuelve a entrar', registro: 'no se pudo registrar', galeria: 'galería no encontrada' };

async function subirTodo(){
  var files = Array.from($('#pn-file').files), tipo = root.querySelector('input[name=pn-dest]:checked').value, marca = tipo === 'selection' ? opcionesMarca() : null;
  if (!files.length) return;
  if (marca) {
    try { localStorage.setItem('pn-wm-tam', marca.size); } catch(e) {}
    var gg = gal(galId), tx = marca.text.trim();
    if (gg && (tx !== (gg.watermark_text || '') || marca.opacity !== opMarca(gg))) {
      var up = await db.from('galleries').update({ watermark_text: tx, watermark_opacity: marca.opacity }).eq('id', galId);
      if (!up.error) { gg.watermark_text = tx; gg.watermark_opacity = marca.opacity; }
    }
  }
  var btn = $('#pn-go'), ul = $('#pn-prog'); btn.disabled = true; ul.innerHTML = '';
  for (var i = 0; i < files.length; i++) {
    var f = files[i], li = document.createElement('li'); li.textContent = f.name + ': subiendo…'; ul.appendChild(li);
    try {
      if (f.size > MAX) throw new Error('pesa más de 45 MB');
      var blob = f, w = null, h = null, nombre = f.name;
      if (tipo === 'selection') { var r = await reducir(f, marca); blob = r.blob; w = r.w; h = r.h; nombre = f.name.replace(/\.[^.]+$/, '') + '.jpg'; }
      else { try { var bm = await createImageBitmap(f); w = bm.width; h = bm.height; } catch (e) {} }
      var s = (await db.auth.getSession()).data.session;
      var q = '?gallery=' + galId + '&type=' + tipo + '&name=' + encodeURIComponent(nombre) + (w ? '&w=' + w + '&h=' + h : '');
      var res = await fetch(W + '/api/upload' + q, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
      var d = await res.json().catch(function(){ return {}; });
      li.textContent = f.name + (d.ok ? ': lista' : ': ' + (ERR[d.error] || 'error al subir'));
    } catch (e) { li.textContent = f.name + ': ' + (e.message || 'error'); }
  }
  btn.disabled = false;
  await abrirDetalle(galId, true);
}

async function cambiar(campos, msg){
  var r = await db.from('galleries').update(campos).eq('id', galId);
  if (r.error) { aviso(r.error.message); return; }
  var g = gal(galId); Object.assign(g, campos); aviso(msg); pintar();
}

async function accion(a, el){
  var id = el.dataset.id, g = gal(galId);
  if (a === 'abrir') return abrirDetalle(id);
  if (a === 'atras') { vista = 'galerias'; return pintar(); }
  if (a === 'tab') { tab = el.dataset.t; return pintar(); }
  if (a === 'copiar') { copiar(el.dataset.t); el.textContent = 'Copiado'; return; }
  if (a === 'nueva') return $('#pn-dnueva').showModal();
  if (a === 'subir') return subirTodo();
  if (a === 'entregar') { if (confirm('¿Marcar como entregada? El cliente podrá descargar las finales.')) cambiar({ status: 'delivered', selection_enabled: false, downloads_enabled: true }, 'Galería entregada'); return; }
  if (a === 'reabrir') return cambiar({ status: 'selection', selection_enabled: true, downloads_enabled: false }, 'Selección reabierta');
  if (a === 'portada') return cambiar({ cover_photo_id: id }, 'Portada actualizada');
  if (a === 'borrar-foto') {
    if (!confirm('¿Eliminar esta foto? No se puede deshacer.')) return;
    var r = await api('/api/admin/delete-photos', { photos: [id] });
    if (!r.ok) return aviso('No se pudo eliminar.');
    if (g && g.cover_photo_id === id) g.cover_photo_id = null;
    return abrirDetalle(galId, true);
  }
  if (a === 'eliminar-galeria') {
    if (prompt('Se borrarán la galería y todas sus fotos. Escribe el nombre exacto para confirmar:\n' + g.title) !== g.title) return;
    var r2 = await api('/api/admin/delete-gallery', { gallery: galId });
    if (!r2.ok) return aviso('No se pudo eliminar la galería.');
    await cargarGalerias(); vista = 'galerias'; aviso('Galería eliminada'); pintar();
  }
}

async function crearGaleria(e){
  e.preventDefault();
  var cli = $('#pn-cn').value.trim(), titulo = $('#pn-ct').value.trim() || cli, fecha = $('#pn-cf').value || null;
  if (!titulo) return aviso('Escribe un nombre para la galería.');
  var btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
  var cid = null;
  if (cli) { var c = await db.from('clients').insert({ photographer_id: ph.id, name: cli }).select('id').single(); if (c.error) { btn.disabled = false; return aviso(c.error.message); } cid = c.data.id; }
  var r;
  for (var i = 0; i < 4; i++) {
    r = await db.from('galleries').insert({ photographer_id: ph.id, client_id: cid, title: titulo, slug: slug(titulo) + '-' + codigo().slice(0, 4).toLowerCase(), access_code: codigo(), event_date: fecha, status: 'selection', selection_enabled: true, downloads_enabled: false, watermark_text: 'Buenos Momentos', watermark_opacity: 35 }).select('id').single();
    if (!r.error || r.error.code !== '23505') break;
  }
  btn.disabled = false;
  if (r.error) return aviso(r.error.message);
  $('#pn-dnueva').close(); e.target.reset();
  await cargarGalerias(); abrirDetalle(r.data.id);
}

window.iniciarPanel = async function(photographer, cliente){
  ph = photographer; db = cliente; root = document.getElementById('vPanel');
  if (!document.getElementById('pn-css')) { var st = document.createElement('style'); st.id = 'pn-css'; st.textContent = CSS; document.head.appendChild(st); }
  root.innerHTML = '<div class="pn"><aside><div class="marca">' + esc(ph.studio_name) + '</div><button data-v="inicio" class="on">Inicio</button><button data-v="galerias">Galerías de clientes</button><div class="pie"><button id="pn-salir">Cerrar sesión</button></div></aside><main id="pn-main"><p class="pn-s">Cargando…</p></main>' +
    '<dialog id="pn-dnueva"><h2>Nueva galería</h2><form id="pn-fn"><input type="text" id="pn-cn" placeholder="Cliente (ej. Ana y Luis)"><input type="text" id="pn-ct" placeholder="Nombre de la galería (ej. Boda Ana y Luis)"><input type="date" id="pn-cf"><div class="pn-row"><button class="pn-btn" type="submit">Crear</button><button class="pn-btn sec" type="button" id="pn-cc">Cancelar</button></div></form></dialog></div>';
  root.onclick = function(e){
    var v = e.target.closest('aside [data-v]'); if (v) { vista = v.dataset.v; return pintar(); }
    var a = e.target.closest('[data-act]'); if (a) accion(a.dataset.act, a);
  };
  $('#pn-fn').addEventListener('submit', crearGaleria);
  $('#pn-cc').addEventListener('click', function(){ $('#pn-dnueva').close(); });
  $('#pn-salir').addEventListener('click', function(){ window.cerrarSesion(); });
  vista = 'inicio';
  await cargarGalerias();
  pintar();
};
})();
