(function(){
'use strict';
var W = 'https://galerias-api.alexandergeerre.workers.dev';
var BASE = 'https://alexandergeerre.github.io/galeria/cliente.html?c=';
var BASEG = 'https://alexandergeerre.github.io/galeria/cliente.html?g=';
var MAX = 45 * 1048576;
var ESTADOS = { draft: 'Borrador', selection: 'En selección', selection_sent: 'Selección enviada', delivered: 'Entregada', expired: 'Expirada' };
var EXTS = ['.png.jpg', '.jpg.jpg', '.jpg', '.png', '.jpeg', '.webp', '.png.png'];
var db, ph, root, gals = [], favs = {}, vista = 'inicio', galId = null, tab = 'panel', busca = '', fEst = '', cur = null;

var CSS = '.pn{--f:#FAF8F5;--t:#2B2623;--s:#7a7068;--l:#E6DFD6;--a:#B08968;--p:#F3EFE9;--c:#fff;display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:var(--f);color:var(--t);font-family:Jost,system-ui,sans-serif}' +
'.pn[data-e=dark]{--f:#151413;--t:#F1ECE4;--s:#a39a91;--l:#2c2926;--a:#C9A27A;--p:#1c1a18;--c:#1c1a18}.pn[data-e=dark] .pn-il{mix-blend-mode:normal!important;filter:none!important;border-radius:8px}' +
'.pn-franja{display:flex;flex-wrap:wrap;border:1px solid var(--l);border-radius:10px;background:var(--c);margin:.6rem 0 1.4rem;font-size:.9rem}.pn-franja span{padding:.6rem 1rem;border-right:1px solid var(--l)}.pn-franja span:last-child{border:0}.pn-dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:var(--a);margin-right:.5rem}' +
'.pn-portada{border-radius:12px;overflow:hidden;background:var(--l);max-width:34rem;aspect-ratio:3/2;display:grid;place-items:center;margin:.6rem 0}.pn-portada>img{width:100%;height:100%;object-fit:cover}.pn-portada .pn-il{width:30%}' +
'.pn aside .gt{font-family:"Cormorant Garamond",serif;font-size:1.3rem;line-height:1.15;margin:.4rem 0 .5rem;padding:0 .7rem}.pn aside .sep{border-top:1px solid var(--l);margin:.8rem 0}.pn aside .pn-pill{align-self:flex-start;margin-left:.7rem}' +
'.pn-tema{display:flex;gap:.25rem;margin-bottom:.4rem}.pn-tema button{flex:1;text-align:center!important;padding:.35rem .2rem!important;font-size:.8rem;border:1px solid var(--l)!important;border-radius:999px!important}' +
'.pn-pbtn{background:none;border:0;padding:0;cursor:pointer}.pn-pbtn img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block}#pn-dport{width:min(46rem,94vw)}#pn-gport{max-height:60vh;overflow:auto;margin:.8rem 0}' +
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
'.pn-opts{display:flex;gap:.7rem;flex-wrap:wrap}.pn-opt{background:var(--c);border:1px solid var(--l);border-radius:12px;padding:.7rem .9rem;text-align:left;color:var(--t);cursor:pointer;max-width:13rem;font:inherit}.pn-opt b{display:block;font-weight:500}.pn-opt span{font-size:.8rem;color:var(--s)}.pn-opt.on{border-color:var(--a);box-shadow:0 0 0 1px var(--a)}.pn-opt.pal{display:flex;align-items:center;gap:.6rem}.pn-opt i{width:1.6rem;height:1.6rem;border-radius:50%;border:1px solid var(--l);display:block}' +
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
  var g = await db.from('galleries').select('id,title,access_code,event_date,status,expires_at,created_at,cover_photo_id,client_id,downloads_enabled,selection_enabled,watermark_text,watermark_opacity,gallery_type,description,location,grid_style,palette,link_token,access_mode,print_sent_at').is('deleted_at', null).order('created_at', { ascending: false });
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

var TABS = [['panel', 'Panel de control'], ['detalles', 'Detalles'], ['fotos', 'Fotos y medios'], ['diseno', 'Diseño'], ['config', 'Configuración'], ['favoritas', 'Favoritas'], ['impresiones', 'Impresiones'], ['compartir', 'Compartir']];
var ESTILOS = [['clasico', 'Clásico', 'Fotos con su proporción original'], ['uniforme', 'Uniforme', 'Cuadrícula ordenada, todas del mismo tamaño'], ['amplio', 'Amplio', 'Fotos grandes, menos por fila']];
var PALETAS = [['auto', 'Automática', '#FAF8F5', '#151413'], ['blanco', 'Blanco', '#FFFFFF', '#111111'], ['beige', 'Beige', '#F3EDE3', '#8A6A3B'], ['oliva', 'Oliva', '#F1EFE4', '#6B7A3A'], ['noche', 'Azul noche', '#0F1B2D', '#8FB4E3'], ['negro', 'Negro', '#0B0B0B', '#C9A27A']];
var TITULOS = { panel: 'Descripción general', detalles: 'Detalles', fotos: 'Fotos y medios', diseno: 'Diseño', config: 'Configuración de la galería', favoritas: 'Favoritas de los clientes', impresiones: 'Fotos para imprimir', compartir: 'Compartir' };
function temaGuardado(){ try { return localStorage.getItem('pn-tema') || 'auto'; } catch(e) { return 'auto'; } }
function aplicarTema(){
  var t = temaGuardado(), e = t === 'auto' ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
  var p = root && root.querySelector('.pn'); if (p) p.dataset.e = e;
}
function pintarLado(){
  var a = root.querySelector('aside'), g = vista === 'detalle' ? gal(galId) : null, h;
  if (g) {
    h = '<div class="marca">' + esc(ph.studio_name) + '</div><button data-act="atras">← Galerías</button><div class="gt">' + esc(g.title) + '</div><span class="pn-pill">' + esc(ESTADOS[g.status] || g.status) + '</span><div class="sep"></div>' +
      TABS.map(function(t){ return '<button data-act="tab" data-t="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('');
  } else {
    h = '<div class="marca">' + esc(ph.studio_name) + '</div><button data-v="inicio"' + (vista === 'inicio' ? ' class="on"' : '') + '>Inicio</button><button data-v="galerias"' + (vista === 'galerias' ? ' class="on"' : '') + '>Galerías de clientes</button>';
  }
  var tm = temaGuardado();
  h += '<div class="pie"><div class="pn-tema" role="group" aria-label="Tema">' + [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(function(x){ return '<button data-act="tema" data-t="' + x[0] + '"' + (tm === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div><button data-act="salir">Cerrar sesión</button></div>';
  a.innerHTML = h;
}
function pintar(){
  pintarLado(); aplicarTema();
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
  var ip = await api('/api/admin/prints', { gallery: id }).catch(function(){ return { picks: [] }; });
  cur = { fotos: fotos, favs: f.data || [], vistas: v.count || 0, tk: tk, imp: (ip && ip.picks) || [] };
  pintar();
}

function fechaCad(g){ return g.expires_at ? String(g.expires_at).slice(0, 10) : ''; }
function pintarDetalle(){
  var g = gal(galId); if (!g) { vista = 'galerias'; return pintar(); }
  var sel = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }) : [];
  var fin = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'final'; }) : [];
  var cuerpo = '';
  if (!cur) cuerpo = '<p class="pn-s">Cargando…</p>';
  else if (tab === 'panel') {
    var unicas = {}, cuenta = {}; cur.favs.forEach(function(x){ unicas[x.photo_id] = 1; cuenta[x.photo_id] = (cuenta[x.photo_id] || 0) + 1; });
    var top = sel.slice().sort(function(a, b){ return (cuenta[b.id] || 0) - (cuenta[a.id] || 0); }).slice(0, 5);
    cuerpo = '<div class="pn-franja"><span><i class="pn-dot"></i>' + esc(ESTADOS[g.status] || g.status) + '</span><span>' + (sel.length + fin.length) + ' archivos guardados</span><span>Caducidad: ' + (fechaCad(g) || 'sin caducidad') + '</span></div>' +
      '<div class="pn-cifras"><div><b>' + sel.length + '</b><span class="pn-s">Fotos de selección</span></div><div><b>' + fin.length + '</b><span class="pn-s">Finales</span></div><div><b>' + Object.keys(unicas).length + '</b><span class="pn-s">Favoritas</span></div><div><b>' + cur.vistas + '</b><span class="pn-s">Vistas</span></div></div>' +
      '<div class="pn-row">' + (g.status === 'delivered' ? '<button class="pn-btn" data-act="reabrir">Reabrir selección</button>' : '<button class="pn-btn" data-act="entregar">Marcar como entregada</button>') + '</div>' +
      '<p class="pn-s">Al entregar, el cliente puede descargar las fotos finales y ya no puede cambiar sus favoritas.</p>' +
      '<h2 style="margin-top:1.6rem">Fotos principales</h2>' + (top.length ? '<div class="pn-grid">' + top.map(function(x){
        return '<figure class="pn-ph"><img loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"><figcaption>' + esc(x.filename) + (cuenta[x.id] ? ' · ♥ ' + cuenta[x.id] : '') + '</figcaption></figure>';
      }).join('') + '</div>' : '<p class="pn-s">Aún no hay fotos de selección.</p>');
  } else if (tab === 'detalles') {
    var TIPOS = ['Boda', 'Graduación', 'Quinceañera', 'Cumpleaños', 'Sesión familiar', 'Sesión de retrato', 'Evento corporativo', 'Otro'];
    cuerpo = '<div class="pn-card"><label class="pn-s">Nombre de la galería</label><input type="text" id="pn-dt" value="' + esc(g.title) + '"><label class="pn-s" style="display:block;margin-top:.9rem">Fecha del evento</label><input type="date" id="pn-dd" value="' + esc(g.event_date || '') + '">' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Tipo de galería</label><select id="pn-dtp"><option value="">Sin tipo</option>' + TIPOS.map(function(t){ return '<option' + (g.gallery_type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Ubicación</label><input type="text" id="pn-dub" maxlength="80" value="' + esc(g.location || '') + '">' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Descripción (la ve el cliente bajo el título)</label><textarea id="pn-dde" rows="3" maxlength="300" style="width:100%">' + esc(g.description || '') + '</textarea>' +
      '<div class="pn-row"><button class="pn-btn" data-act="guardar-detalles">Guardar</button></div></div>';
  } else if (tab === 'fotos') {
    cuerpo = '<div class="pn-card"><h2>Subir fotos</h2><div class="pn-row"><label><input type="radio" name="pn-dest" value="selection" checked> Selección (se reducen a 1600 px)</label><label><input type="radio" name="pn-dest" value="final"> Finales (originales, hasta 45 MB)</label></div>' +
      '<div class="pn-marcaui" id="pn-mbox"><label class="pn-s" for="pn-marca">Marca de agua</label><select id="pn-marca"><option value="si">Con marca de agua</option><option value="no">Sin marca de agua</option></select></div>' +
      '<div class="pn-row"><input type="file" id="pn-file" accept="image/jpeg,image/png,image/webp,image/tiff" multiple><button class="pn-btn" data-act="subir" id="pn-go">Subir</button></div><ul id="pn-prog"></ul></div>' +
      '<h2>Selección (' + sel.length + ')</h2>' + (sel.length ? '<div class="pn-grid">' + sel.map(function(x){
        return '<figure class="pn-ph' + (g.cover_photo_id === x.id ? ' cv' : '') + '"><img loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"><figcaption>' + esc(x.filename) + (g.cover_photo_id === x.id ? ' · Portada' : '') + '</figcaption><div class="pn-ac"><button data-act="portada" data-id="' + x.id + '">Portada</button><button data-act="borrar-foto" data-id="' + x.id + '">Eliminar</button></div></figure>';
      }).join('') + '</div>' : '<div class="pn-vacio">' + ilus('admin-subir') + '<p class="pn-s">Aún no hay fotos de selección.</p></div>') +
      '<h2 style="margin-top:1.6rem">Finales (' + fin.length + ')</h2>' + (fin.length ? fin.map(function(x){
        return '<div class="pn-fila"><span>' + esc(x.filename) + ' · ' + mb(x.file_size || 0) + '</span><button class="pn-btn sec" data-act="borrar-foto" data-id="' + x.id + '">Eliminar</button></div>';
      }).join('') : '<p class="pn-s">Aún no hay fotos finales.</p>');
  } else if (tab === 'diseno') {
    var cvId = g.cover_photo_id || (sel[0] && sel[0].id), cv = cvId && cur.tk[cvId];
    cuerpo = '<div class="pn-card"><h2>Portada</h2><p class="pn-s">Es la foto con la que tu cliente recibe su galería al abrir el enlace.</p><div class="pn-portada">' + (cv ? '<img alt="" src="' + esc(src(cv)) + '">' : ilus('admin-sin-portada')) + '</div><div class="pn-row"><button class="pn-btn" data-act="elegir-portada"' + (sel.length ? '' : ' disabled') + '>Elegir portada</button></div></div>' +
      '<div class="pn-card"><h2>Estilo de la galería</h2><p class="pn-s">Cómo se acomodan las fotos que ve tu cliente.</p><div class="pn-opts">' + ESTILOS.map(function(e){ return '<button class="pn-opt' + ((g.grid_style || 'clasico') === e[0] ? ' on' : '') + '" data-act="estilo" data-v="' + e[0] + '"><b>' + e[1] + '</b><span>' + e[2] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="pn-card"><h2>Paleta de colores</h2><p class="pn-s">Colores de la galería del cliente. “Automática” sigue el modo claro u oscuro de su dispositivo.</p><div class="pn-opts">' + PALETAS.map(function(c){ return '<button class="pn-opt pal' + ((g.palette || 'auto') === c[0] ? ' on' : '') + '" data-act="paleta" data-v="' + c[0] + '"><i style="background:linear-gradient(135deg,' + c[2] + ' 50%,' + c[3] + ' 50%)"></i><b>' + c[1] + '</b></button>'; }).join('') + '</div></div>';
  } else if (tab === 'config') {
    cuerpo = '<div class="pn-card"><h2>Marca de agua</h2><p class="pn-s">Texto que se graba en las fotos de selección que subas a partir de ahora.</p><input type="text" id="pn-wt" maxlength="40" value="' + esc(g.watermark_text || 'Buenos Momentos') + '"></div>' +
      '<div class="pn-card"><h2>Caducidad</h2><p class="pn-s">Después de esta fecha el cliente ya no podrá abrir la galería. Déjala vacía para que no caduque.</p><input type="date" id="pn-ex" value="' + esc(fechaCad(g)) + '"></div>' +
      '<div class="pn-row"><button class="pn-btn" data-act="guardar-config">Guardar cambios</button></div>' +
      '<div class="pn-card"><h2>Eliminar galería</h2><p class="pn-s">Se borran la galería y todas sus fotos. No se puede deshacer.</p><button class="pn-btn rojo" data-act="eliminar-galeria">Eliminar galería</button></div>';
  } else if (tab === 'favoritas') {
    var nombre = {}; cur.fotos.forEach(function(x){ nombre[x.id] = x.filename; });
    var por = {}; cur.favs.forEach(function(x){ (por[x.visitor_token] = por[x.visitor_token] || []).push(x.photo_id); });
    var vis = Object.keys(por);
    cuerpo = vis.length ? vis.map(function(k, i){
      var ids = por[k].sort(function(a, b){ return String(nombre[a]).localeCompare(String(nombre[b])); });
      var nom = ids.map(function(id){ return nombre[id] || '?'; }).join(', ');
      return '<div class="pn-card"><h2>Invitado ' + (i + 1) + ' · ' + ids.length + ' fotos</h2><div class="pn-grid">' + ids.map(function(id){
        return '<figure class="pn-ph"><img loading="lazy" alt="" src="' + (cur.tk[id] ? esc(src(cur.tk[id])) : '') + '"><figcaption>' + esc(nombre[id] || '?') + '</figcaption></figure>';
      }).join('') + '</div><div class="pn-row"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(nom) + '">Copiar nombres</button></div></div>';
    }).join('')
      : '<div class="pn-vacio">' + ilus('admin-sin-clientes') + '<p class="pn-s">Todavía no hay favoritas en esta galería.</p></div>';
  } else if (tab === 'impresiones') {
    var nom2 = {}; cur.fotos.forEach(function(x){ nom2[x.id] = x.filename; });
    var por2 = {}; (cur.imp || []).forEach(function(x){ (por2[x.visitor_token] = por2[x.visitor_token] || []).push(x.photo_id); });
    var vis2 = Object.keys(por2);
    cuerpo = (g.print_sent_at ? '<p class="pn-s">Pedido enviado por el cliente el ' + esc(new Date(g.print_sent_at).toLocaleString('es-GT')) + '.</p>' : '') + (vis2.length ? vis2.map(function(k, i){
      var ids = por2[k].sort(function(a, b){ return String(nom2[a]).localeCompare(String(nom2[b])); });
      var nm = ids.map(function(id){ return nom2[id] || '?'; });
      return '<div class="pn-card"><h2>Cliente ' + (i + 1) + ' · ' + ids.length + (ids.length === 1 ? ' foto' : ' fotos') + ' para imprimir</h2><ul>' + nm.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '</ul><div class="pn-row"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(nm.join(', ')) + '">Copiar nombres</button></div></div>';
    }).join('') : '<div class="pn-vacio"><p class="pn-s">Todavía nadie ha marcado fotos para imprimir. Aparecen aquí cuando la galería está entregada y el cliente toca «Imprimir» en sus fotos finales.</p></div>');
  } else {
    if (!g.link_token) {
      var bs = new Uint8Array(18); crypto.getRandomValues(bs);
      g.link_token = Array.prototype.map.call(bs, function(x){ return 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]; }).join('');
      db.from('galleries').update({ link_token: g.link_token }).eq('id', g.id).then(function(){});
    }
    var abierto = g.access_mode === 'abierto', urlG = BASEG + g.link_token, urlC = BASE + g.access_code;
    var fila = function(et, v){ return '<p class="pn-s">' + et + '</p><div class="pn-copia"><input type="text" readonly value="' + esc(v) + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(v) + '">Copiar</button></div>'; };
    cuerpo = '<div class="pn-card"><h2>Cómo entra tu cliente</h2><div class="pn-opts">' +
      '<button class="pn-opt' + (abierto ? ' on' : '') + '" data-act="modo" data-v="abierto"><b>Enlace sin clave</b><span>Cualquiera que tenga el enlace ve la galería directamente.</span></button>' +
      '<button class="pn-opt' + (abierto ? '' : ' on') + '" data-act="modo" data-v="codigo"><b>Enlace con código</b><span>Debe escribir el código para entrar.</span></button></div></div>' +
      '<div class="pn-card"><h2>' + (abierto ? 'Enlace sin clave' : 'Enlace con código') + '</h2>' +
      (abierto ? '<p class="pn-s">Envía este enlace. Entra directo, sin pedir nada.</p>' + fila('Enlace para el cliente', urlG)
        : '<p class="pn-s">Envía el enlace y el código por separado: el cliente escribe el código al abrirlo.</p>' + fila('Enlace para el cliente', urlG) + '<p class="pn-s">Código de acceso (puedes cambiarlo)</p><div class="pn-copia"><input type="text" id="pn-cod" maxlength="40" value="' + esc(g.access_code) + '"><button class="pn-btn sec" data-act="guardar-codigo">Guardar</button><button class="pn-btn sec" data-act="copiar" data-t="' + esc(g.access_code) + '">Copiar</button></div>' +
          '<details class="pn-s" style="margin-top:.6rem"><summary>Enlace con el código incluido (entra sin escribirlo)</summary>' + fila('Enlace directo con código', urlC) + '</details>') + '</div>';
  }
  $('#pn-main').innerHTML = '<h1>' + esc(TITULOS[tab] || '') + '</h1><p class="pn-s">' + esc(g.title) + '</p>' + cuerpo;
  if (cur && tab === 'fotos') {
    $('#pn-marca').addEventListener('change', mostrarMarca);
    root.querySelectorAll('input[name=pn-dest]').forEach(function(r){ r.addEventListener('change', mostrarMarca); });
    mostrarMarca();
    try { document.fonts.load('300 20px Jost'); } catch(e) {}
  }
}

var MARCA_OPACIDAD = 35, MARCA_TAM = 's';   // media y pequeña (por defecto)
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
  if (!$('#pn-marca') || $('#pn-marca').value !== 'si') return null;
  var g = gal(galId);
  return { text: (g && g.watermark_text) || 'Buenos Momentos', opacity: MARCA_OPACIDAD, size: MARCA_TAM };
}
function mostrarMarca(){
  var box = $('#pn-mbox'); if (!box) return;
  var fin = root.querySelector('input[name=pn-dest]:checked').value === 'final';
  box.hidden = fin;
}
var ERR = { muy_grande: 'pesa más de 45 MB', formato: 'formato no permitido (usa JPG, PNG, WEBP o TIFF)', sin_sesion: 'tu sesión caducó, vuelve a entrar', registro: 'no se pudo registrar', galeria: 'galería no encontrada' };

async function subirTodo(){
  var files = Array.from($('#pn-file').files), tipo = root.querySelector('input[name=pn-dest]:checked').value, marca = tipo === 'selection' ? opcionesMarca() : null;
  if (!files.length) return;
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
  if (a === 'salir') return window.cerrarSesion();
  if (a === 'tema') { try { localStorage.setItem('pn-tema', el.dataset.t); } catch(e) {} return pintar(); }
  if (a === 'modo') return cambiar({ access_mode: el.dataset.v }, el.dataset.v === 'abierto' ? 'Ahora el enlace entra sin clave' : 'Ahora el enlace pide código');
  if (a === 'guardar-codigo') {
    var nc = $('#pn-cod').value.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,40}$/.test(nc)) return aviso('El código debe tener de 4 a 40 letras, números o guiones, sin espacios.');
    if (gals.some(function(x){ return x.id !== g.id && String(x.access_code).toUpperCase() === nc; })) return aviso('Ese código ya lo usa otra galería. Elige otro.');
    return cambiar({ access_code: nc }, 'Código guardado');
  }
  if (a === 'estilo') return cambiar({ grid_style: el.dataset.v }, 'Estilo guardado');
  if (a === 'paleta') return cambiar({ palette: el.dataset.v }, 'Paleta guardada');
  if (a === 'guardar-detalles') {
    var t1 = $('#pn-dt').value.trim(); if (!t1) return aviso('Escribe un nombre para la galería.');
    return cambiar({ title: t1, event_date: $('#pn-dd').value || null, gallery_type: $('#pn-dtp').value || null, location: $('#pn-dub').value.trim() || null, description: $('#pn-dde').value.trim() || null }, 'Detalles guardados');
  }
  if (a === 'guardar-config') {
    var tx = $('#pn-wt').value.trim(); if (!tx) return aviso('Escribe el texto de la marca.');
    var ex = $('#pn-ex').value;
    return cambiar({ watermark_text: tx, expires_at: ex ? ex + 'T23:59:59-06:00' : null }, 'Configuración guardada');
  }
  if (a === 'elegir-portada') {
    var s0 = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }) : [];
    $('#pn-gport').innerHTML = s0.map(function(x){ return '<button class="pn-pbtn" data-act="portada" data-id="' + x.id + '"><img loading="lazy" alt="' + esc(x.filename) + '" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"></button>'; }).join('');
    return $('#pn-dport').showModal();
  }
  if (a === 'cerrar-portada') return $('#pn-dport').close();
  if (a === 'portada') {
    var mn = Math.min.apply(null, (cur ? cur.fotos : []).map(function(x){ return x.sort_order || 0; }).concat([0]));
    var u = await db.from('photos').update({ sort_order: mn - 1 }).eq('id', id);
    if (u.error) return aviso(u.error.message);
    try { $('#pn-dport').close(); } catch(e) {}
    await cambiar({ cover_photo_id: id }, 'Portada actualizada');
    return abrirDetalle(galId, true);
  }
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
  root.innerHTML = '<div class="pn"><aside></aside><main id="pn-main"><p class="pn-s">Cargando…</p></main>' +
    '<dialog id="pn-dnueva"><h2>Nueva galería</h2><form id="pn-fn"><input type="text" id="pn-cn" placeholder="Cliente (ej. Ana y Luis)"><input type="text" id="pn-ct" placeholder="Nombre de la galería (ej. Boda Ana y Luis)"><input type="date" id="pn-cf"><div class="pn-row"><button class="pn-btn" type="submit">Crear</button><button class="pn-btn sec" type="button" id="pn-cc">Cancelar</button></div></form></dialog><dialog id="pn-dport"><h2>Elegir portada</h2><p class="pn-s">Toca la foto que quieres como portada.</p><div class="pn-grid" id="pn-gport"></div><div class="pn-row"><button class="pn-btn sec" data-act="cerrar-portada">Cancelar</button></div></dialog></div>';
  root.onclick = function(e){
    var v = e.target.closest('aside [data-v]'); if (v) { vista = v.dataset.v; return pintar(); }
    var a = e.target.closest('[data-act]'); if (a) accion(a.dataset.act, a);
  };
  $('#pn-fn').addEventListener('submit', crearGaleria);
  $('#pn-cc').addEventListener('click', function(){ $('#pn-dnueva').close(); });
  if (window.matchMedia && !window.__pnMq) { window.__pnMq = matchMedia('(prefers-color-scheme: dark)'); window.__pnMq.addEventListener('change', function(){ aplicarTema(); }); }
  vista = 'inicio';
  await cargarGalerias();
  pintar();
};
})();
