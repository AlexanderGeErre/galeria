(function(){
'use strict';
var W = 'https://galerias-api.alexandergeerre.workers.dev';
var BASE = 'https://alexandergeerre.github.io/galeria/cliente.html?c=';
var BASEG = 'https://alexandergeerre.github.io/galeria/cliente.html?g=';
var MAX = 45 * 1048576;
var ESTADOS = { draft: 'Borrador', selection: 'En selección', selection_sent: 'Selección enviada', delivered: 'Entregada', expired: 'Expirada' };
var EXTS = ['.png.jpg', '.jpg.jpg', '.jpg', '.png', '.jpeg', '.webp', '.png.png'];
// Logos: primero el PNG transparente nuevo; si no existe, los archivos viejos.
var LOGO_EXTS = ['.png', '.svg', '.png.jpg', '.jpg.jpg', '.jpg', '.jpeg', '.webp', '.png.png'];
function exts(n){ return /^logo-/.test(n) ? LOGO_EXTS : EXTS; }
// Nombres de logo por el FONDO donde se usan: logo-oscuro = carbón (sobre fondo claro), logo-claro = dorado (sobre fondo oscuro)
var PAL_TIPO = { 'Boda': 'marfil', 'Quinceañera': 'vino', 'Graduación': 'azul', 'Baby shower': 'oliva', 'Cumpleaños': 'arena', 'Fiesta infantil': 'azul', 'Sesión familiar': 'oliva', 'Sesión de retrato': 'blanco', 'Evento corporativo': 'blanco' };
var PAL_VIEJA = { beige: 'marfil', noche: 'azul', negro: 'arena' };
var db, ph, root, gals = [], favs = {}, vista = 'inicio', galId = null, tab = 'panel', busca = '', fEst = '', cur = null;

var CSS = '.pn-pb{position:absolute;right:6px;bottom:34px;z-index:2;display:flex;align-items:center;gap:2px;background:var(--a);color:var(--f);border-radius:999px;padding:3px 6px;font-size:.7rem;line-height:1}.pn-pb svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.pn-pb i{font-style:normal;font-weight:700}.pn-ph.pimp img{outline:2px solid var(--a)}.pn-sec .pn-btn svg{width:15px;height:15px;vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:1.8}' + '.pn-ac{flex-wrap:wrap}.pn-grid.sm .pn-ac button{font-size:.62rem;padding:0 .35rem}.pn-add{flex:0 0 96px;aspect-ratio:1;border:1.5px dashed var(--s);background:none;border-radius:10px;color:var(--s);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;cursor:pointer;font:inherit;font-size:.78rem;transition:background .2s,color .2s,border-color .2s}.pn-add b{font-size:1.6rem;font-weight:400;line-height:1}.pn-add:hover{background:var(--p);color:var(--t);border-color:var(--a)}#pn-dsub{width:min(34rem,94vw)}.pn-vacio1{margin:.4rem 0 1rem}.pn-ck{cursor:pointer;position:absolute;top:6px;left:6px;z-index:2;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid var(--a);display:grid;place-items:center;font-size:.8rem;color:var(--a);font-weight:700}.pn-ck.off{background:rgba(255,255,255,.55);border-color:rgba(255,255,255,.9);color:transparent}.pn-ph.mk img{outline:3px solid var(--a);opacity:.85}.pn-barsel{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;position:sticky;top:0;z-index:20;background:var(--f);border:1px solid var(--l);border-radius:12px;padding:.6rem .8rem;margin:.6rem 0}.pn-barsel select{width:auto}.pn-esc{border-top:1px solid var(--l);padding:.8rem 0}.pn-fila{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.4rem 0}' +
'.pn{--f:#FAFAF8;--t:#2B2623;--s:#8A837C;--l:#E6E3DF;--a:#B8946A;--p:#F0EFED;--c:#fff;display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:var(--f);color:var(--t);font-family:Jost,system-ui,sans-serif}' +
'.pn[data-e=dark]{--f:#1A1A1A;--t:#EDEBE8;--s:#9A948D;--l:#333;--a:#C9A877;--p:#252525;--c:#202020}' +
'.pn[data-pa=marfil]{--f:#F7F3EC;--t:#2E2924;--s:#8C8276;--l:#E2D9CA;--a:#A67C52;--p:#EDE6DA;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=marfil][data-e=dark]{--f:#1C1917;--t:#EFE9E1;--s:#A0978B;--l:#34302B;--a:#C8996A;--p:#272320;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=blanco]{--f:#FFFFFF;--t:#1F1F1F;--s:#7D7D7D;--l:#E8E8E8;--a:#1F1F1F;--p:#F2F2F2;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=blanco][data-e=dark]{--f:#121212;--t:#F0F0F0;--s:#8F8F8F;--l:#2C2C2C;--a:#C2A15F;--p:#1E1E1E;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=oliva]{--f:#F6F5F0;--t:#26302A;--s:#7C8379;--l:#DDDCCF;--a:#6F7F5E;--p:#E9E8DF;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=oliva][data-e=dark]{--f:#161A17;--t:#E8EBE4;--s:#929A8E;--l:#2D332E;--a:#9DB08A;--p:#202520;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=vino]{--f:#FBF8F5;--t:#2A1F1F;--s:#8A7B79;--l:#E7DCD7;--a:#8C3B3B;--p:#F0E8E4;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=vino][data-e=dark]{--f:#1B1516;--t:#F1E9E7;--s:#A3938F;--l:#342A2B;--a:#C47A7A;--p:#261E1F;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=azul]{--f:#F6F7F9;--t:#1E2430;--s:#7A8294;--l:#DDE1E8;--a:#3F5B8C;--p:#E9ECF1;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=azul][data-e=dark]{--f:#14171C;--t:#E9ECF2;--s:#8D96A8;--l:#2A2F38;--a:#7F9BD0;--p:#1D2128;--c:color-mix(in srgb,var(--f) 55%,var(--p))}' +
'.pn{--ok:#4C8C5E}.pn[data-e=dark]{--ok:#7FCB96}.pn[data-pa=marfil]{--ok:#5E8A4F}.pn[data-pa=marfil][data-e=dark]{--ok:#93C27E}.pn[data-pa=blanco]{--ok:#2E8B57}.pn[data-pa=blanco][data-e=dark]{--ok:#6CC58C}.pn[data-pa=oliva]{--ok:#3F7D4A}.pn[data-pa=oliva][data-e=dark]{--ok:#8FD19E}.pn[data-pa=vino]{--ok:#3E7F5A}.pn[data-pa=vino][data-e=dark]{--ok:#7BC49B}.pn[data-pa=azul]{--ok:#2F8F6B}.pn[data-pa=azul][data-e=dark]{--ok:#6FD0A6}.pn-sww{display:flex;align-items:center;gap:.9rem;padding:.6rem .9rem;border:1px solid var(--l);border-radius:12px;background:var(--c);max-width:34rem}.pn-sww b{display:block;font-weight:500}.pn-sww span{font-size:.8rem;color:var(--s)}.pn-swt{flex:none;position:relative;width:4.7rem;height:2.5rem;border-radius:999px;border:1px solid var(--l);cursor:pointer;padding:0;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 100%,#fff 35%),var(--c) 55%,color-mix(in srgb,var(--c) 88%,var(--s)));box-shadow:0 4px 0 color-mix(in srgb,var(--l) 80%,var(--s)),0 9px 16px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.55);transition:box-shadow .2s}.pn-swt:active{box-shadow:0 2px 0 color-mix(in srgb,var(--l) 80%,var(--s)),0 5px 10px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.55);transform:translateY(2px)}.pn-swt:before{content:\'\';position:absolute;left:.6rem;right:.6rem;top:50%;height:1rem;margin-top:-.5rem;border-radius:999px;background:linear-gradient(180deg,color-mix(in srgb,var(--s) 70%,var(--f)),color-mix(in srgb,var(--s) 38%,var(--f)));box-shadow:inset 0 2px 3px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.35);transition:background .3s}.pn-swt.on:before{background:linear-gradient(180deg,color-mix(in srgb,var(--ok) 90%,#000),var(--ok) 50%,color-mix(in srgb,var(--ok) 62%,#fff))}.pn-swt .k{position:absolute;top:50%;left:.32rem;width:1.95rem;height:1.95rem;margin-top:-.975rem;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#ececec 55%,#d3d3d3);color:transparent;display:grid;place-items:center;box-shadow:0 3px 6px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.9) inset,0 -2px 3px rgba(0,0,0,.1) inset;transition:transform .3s cubic-bezier(.3,1.4,.5,1),color .2s}.pn-swt.on .k{transform:translateX(2.15rem);color:var(--ok)}.pn-swt:focus-visible{outline:2px solid var(--a);outline-offset:3px}.pn-tema-c{max-width:24rem}.pn .pn-tema-c button{background:transparent!important;color:var(--t)!important;cursor:pointer}.pn .pn-tema-c button.on{background:var(--a)!important;color:var(--f)!important;border-color:var(--a)!important}.pn[data-e=dark] .pn-il{mix-blend-mode:normal!important;filter:none!important;border-radius:8px}' +
'.pn-franja{display:flex;flex-wrap:wrap;border:1px solid var(--l);border-radius:10px;background:var(--c);margin:.6rem 0 1.4rem;font-size:.9rem}.pn-franja span{padding:.6rem 1rem;border-right:1px solid var(--l)}.pn-franja span:last-child{border:0}.pn-dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:var(--a);margin-right:.5rem}' +
'.pn-portada{border-radius:12px;overflow:hidden;background:var(--l);max-width:34rem;aspect-ratio:3/2;display:grid;place-items:center;margin:.6rem 0}.pn-portada>img{width:100%;height:100%;object-fit:cover}.pn-portada .pn-il{width:30%}' +
'.pn aside .gt{font-family:"Cormorant Garamond",serif;font-size:1.3rem;line-height:1.15;margin:.4rem 0 .5rem;padding:0 .7rem}.pn aside .sep{border-top:1px solid var(--l);margin:.8rem 0}.pn aside .pn-pill{align-self:flex-start;margin-left:.7rem}' +
'.pn-tema{display:flex;gap:.25rem;margin-bottom:.4rem}.pn-tema button{flex:1;text-align:center!important;padding:.35rem .2rem!important;font-size:.8rem;border:1px solid var(--l)!important;border-radius:999px!important}' +
'.pn-pbtn{background:none;border:0;padding:0;cursor:pointer}.pn-pbtn img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block}#pn-dport{width:min(46rem,94vw)}#pn-gport{max-height:60vh;overflow:auto;margin:.8rem 0}' +
'.pn *{box-sizing:border-box}.pn aside{background:var(--c);border-right:1px solid var(--l);padding:1.4rem 1rem;display:flex;flex-direction:column;gap:.3rem;position:sticky;top:0;height:100vh}' +
'.pn .marca{font-family:"Cormorant Garamond",serif;font-size:1.35rem;margin-bottom:1.2rem}.pn aside button{background:none;border:0;text-align:left;padding:.55rem .7rem;border-radius:10px;color:var(--s)}' +
'.pn aside button.on{background:var(--l);color:var(--t)}.pn aside .pie{margin-top:auto}.pn main{padding:2rem clamp(1rem,4vw,3rem);max-width:1100px;width:100%}' +
'.pn h1,.pn h2{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;line-height:1.1}.pn h1{font-size:2.6rem}.pn h2{font-size:1.5rem;margin-bottom:.6rem}' +
'.pn-btn{background:var(--t);color:var(--f);border:1px solid var(--t);padding:.55rem 1.2rem;border-radius:999px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}.pn-btn.sec{background:none;color:var(--t);border-color:var(--l)}.pn-btn.rojo{background:none;color:#b5453f;border-color:#b5453f}' +
'.pn-btn:disabled{opacity:.5}.pn input[type=text],.pn input[type=date],.pn input[type=number],.pn input[type=time],.pn input[type=tel],.pn input[type=email],.pn textarea,.pn select{width:100%;padding:.65rem .85rem;border:1px solid var(--l);background:var(--f);color:var(--t);border-radius:10px;font:inherit}' +
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
'.pn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.pn-grid.sm{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}.pn-grid.sm .pn-ac button{font-size:.65rem;padding:0 .4rem}.pn-ph img[data-act=ver]{cursor:zoom-in}#pn-dver{width:min(60rem,96vw);padding:.6rem;text-align:center}#pn-dver img{max-width:100%;max-height:78vh;display:block;margin:0 auto;border-radius:8px}#pn-dver .pn-vb{display:flex;justify-content:space-between;align-items:center;gap:.6rem;margin:.5rem 0 0}' +
'.pn-sec{display:flex;align-items:baseline;gap:.8rem;flex-wrap:wrap;margin-top:1.4rem}.pn-sec h2{margin:0}.pn-orden{margin-left:auto;display:flex;align-items:center;gap:.4rem}.pn-orden select{width:auto;font-size:.85rem}' +
'.pn-grid.fr{display:flex;gap:8px;overflow:hidden}.pn-grid.fr .pn-ph{flex:0 0 96px}' +
'.pn-vt{display:flex;align-items:center;gap:1rem;width:100%;background:none;border:0;color:var(--s);margin:1rem 0;cursor:pointer;font:inherit}.pn-vt:before,.pn-vt:after{content:"";flex:1;border-top:1px solid var(--l)}' +
'.pn-fila img{width:46px;height:46px;object-fit:cover;border-radius:6px}' +
'.pn-ph{margin:0;position:relative}.pn-ph img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--l);display:block}.pn-ph.cv img{outline:2px solid var(--a)}' +
'.pn-ph figcaption{font-size:.75rem;color:var(--s);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-ac{display:flex;gap:.3rem;margin-top:.2rem}.pn-ac button{background:none;border:1px solid var(--l);border-radius:999px;font-size:.72rem;padding:.1rem .5rem;color:var(--t);cursor:pointer}' +
'.pn-fila{display:flex;justify-content:space-between;gap:1rem;padding:.4rem 0;border-bottom:1px solid var(--l);font-size:.9rem}#pn-prog{list-style:none;padding:0;margin:.5rem 0 0;font-size:.9rem;max-height:12rem;overflow:auto}' +
'.pn dialog{border:1px solid var(--l);background:var(--f);color:var(--t);border-radius:16px;padding:1.4rem;width:min(30rem,92vw);margin:auto;box-shadow:0 24px 60px rgba(43,38,35,.25)}.pn dialog::backdrop{background:rgba(43,38,35,.5)}' +
'.pn dialog form{display:flex;flex-direction:column;gap:.7rem}.pn textarea{width:100%;height:9rem;background:none;border:1px solid var(--l);border-radius:10px;padding:.6rem;color:inherit;font:inherit}' +
'.pn-toast{position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);background:var(--t);color:var(--f);padding:.7rem 1.2rem;border-radius:999px;z-index:50;font-size:.95rem}' +
'.pn aside button{display:flex;align-items:center;gap:.75rem;transition:background .2s,color .2s}.pn aside button:hover{background:var(--p);color:var(--t)}.pn aside button.on{background:var(--p);color:var(--t);box-shadow:inset 3px 0 0 var(--a)}.pn aside .pie button{font-size:.9rem}.pn-tema button{display:block!important}.pn-tema button.on{box-shadow:none!important;background:var(--l)!important;color:var(--t)}.pn-i{width:18px;height:18px;flex:0 0 18px}.pn aside .atras{margin-bottom:.2rem}' +
'.pn-tb{width:100%;border-collapse:collapse;font-size:.95rem}.pn-tb th{text-align:left;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--s);padding:.8rem 1rem;border-bottom:1px solid var(--l)}.pn-tb td{padding:.85rem 1rem;border-bottom:1px solid var(--l);vertical-align:top}.pn-ac{white-space:nowrap;text-align:right}.pn-dos{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.pn-mes{display:flex;align-items:center;justify-content:center;gap:1.2rem;margin:1rem 0}.pn-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.pn-cal>span{font-size:.72rem;color:var(--s);text-align:center;text-transform:uppercase;letter-spacing:.08em}.pn-cal .dy{min-height:92px;background:var(--c);border:1px solid var(--l);border-radius:10px;padding:.4rem;font-size:.8rem;color:var(--s)}.pn-cal .dy.vac{background:none;border:0}.pn-cal .dy.hoy{border-color:var(--a);box-shadow:inset 0 0 0 1px var(--a)}.pn-cal .ev{display:block;width:100%;text-align:left;border:0;border-radius:6px;padding:.2rem .4rem;margin-top:.25rem;font-size:.72rem;color:#fff;background:var(--a);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-cal .ev.k-sesion{background:#7C8F6A}.pn-cal .ev.k-entrega{background:#3F5B8C}.pn-cal .ev.k-otro{background:#888}.pn-nvr{display:grid;grid-template-columns:minmax(0,340px) 1fr;gap:1.4rem;align-items:start}.pn-col{display:flex;flex-direction:column;gap:.5rem}.pn-col .pn-btn.on,.pn-row .pn-btn.on{background:var(--t);color:var(--f)}.pn dialog select,.pn dialog textarea{width:100%}@media(max-width:760px){.pn-nvr,.pn-dos{grid-template-columns:1fr}.pn-cal .dy{min-height:64px;font-size:.7rem}.pn-cal .ev{font-size:.62rem}.pn-ac{white-space:normal}}' +
'.pn aside button{border-radius:999px;padding:.62rem .9rem;font-size:.94rem}.pn aside button.on{background:var(--p);color:var(--t);font-weight:600;box-shadow:none}.pn aside button.on .pn-i{color:var(--a)}.pn aside .mo,.pn aside .ta{display:none}.pn-tabs{display:flex;flex-wrap:nowrap;gap:1.15rem;font-size:.94rem;border-bottom:1px solid var(--l);margin:.4rem 0 1.5rem;overflow-x:auto}.pn-tabs button{background:none;border:0;padding:.65rem 0;color:var(--s);font:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;cursor:pointer}.pn-tabs button:hover{color:var(--t)}.pn-tabs button.on{color:var(--t);font-weight:600;border-bottom-color:var(--a)}.pn-sub{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}' +
'.pn .marca{margin:.2rem 0 1.4rem;padding:0 .3rem}.pn .marca img{width:100%;max-width:150px;display:block;border-radius:8px}.pn .marca .lg-d{display:none}.pn[data-e=dark] .marca .lg-l{display:none}.pn[data-e=dark] .marca .lg-d{display:block}' +
'.pn main{padding:2.8rem clamp(1.2rem,5vw,4rem);max-width:1180px}.pn h1{font-size:clamp(2.2rem,4vw,3.2rem);letter-spacing:-.01em;margin-bottom:.3rem}.pn h2{font-size:1.6rem}' +
'.pn-card{border:1px solid var(--l);border-radius:14px;box-shadow:none;padding:1.2rem 1.4rem}' +
'.pn-franja,.pn-cifras{border:1px solid var(--l);border-radius:14px;box-shadow:none}.pn-cifras b{font-size:2.1rem}' +
'.pn-btn{transition:transform .15s,opacity .2s,box-shadow .2s}.pn-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(43,38,35,.16)}.pn-btn:active{transform:scale(.97)}' +
'.pn-rej{grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:26px}.pn-tar .cv{border-radius:16px}.pn-tar h3{margin-top:.7rem}' +
'.pn-ph img,.pn-tar .cv>img,.pn-pbtn img{opacity:0;transition:opacity .6s ease,transform .5s ease;background:linear-gradient(100deg,var(--l) 30%,var(--p) 50%,var(--l) 70%);background-size:200% 100%}.pn-ph img.ld,.pn-tar .cv>img.ld,.pn-pbtn img.ld{opacity:1}.pn-ph,.pn-tar .cv{background:linear-gradient(100deg,var(--l) 30%,var(--p) 50%,var(--l) 70%);background-size:200% 100%;animation:pnSh 1.5s infinite;border-radius:10px}.pn-ph img{border-radius:10px}.pn-ph:hover img.ld{transform:scale(1.03)}.pn-ph{overflow:hidden}' +
'#pn-main>*{animation:pnIn .5s cubic-bezier(.2,.7,.2,1) both}#pn-main>*:nth-child(2){animation-delay:.05s}#pn-main>*:nth-child(3){animation-delay:.1s}#pn-main>*:nth-child(4){animation-delay:.15s}#pn-main>*:nth-child(n+5){animation-delay:.2s}' +
'@keyframes pnIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes pnSh{from{background-position:200% 0}to{background-position:-200% 0}}' +
'.pn dialog[open]{animation:pnDlg .28s cubic-bezier(.2,.7,.2,1)}.pn dialog::backdrop{background:rgba(21,20,19,.55);backdrop-filter:blur(3px)}@keyframes pnDlg{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
'.pn-skel{height:3.2rem;width:60%;border-radius:12px;margin:1rem 0;background:linear-gradient(100deg,var(--l) 30%,var(--p) 50%,var(--l) 70%);background-size:200% 100%;animation:pnSh 1.5s infinite}.pn-skel.w1{width:35%;height:2.4rem}.pn-skel.h2{height:9rem;width:100%}' +
'.pn-toast{animation:pnIn .3s both}@media(prefers-reduced-motion:reduce){.pn *{animation:none!important;transition:none!important}.pn-ph img,.pn-tar .cv>img,.pn-pbtn img{opacity:1}}' +
'#pn-up{position:fixed;right:18px;bottom:18px;z-index:80;width:min(22rem,calc(100vw - 36px));background:var(--c);border:1px solid var(--l);border-radius:16px;box-shadow:0 12px 40px rgba(43,38,35,.22);padding:.9rem 1rem}.pn-up-t{display:flex;justify-content:space-between;gap:.6rem}.pn-up-b{height:6px;border-radius:99px;background:var(--l);overflow:hidden;margin:.6rem 0}.pn-up-b i{display:block;height:100%;background:var(--a);transition:width .3s}#pn-up ul{margin:.4rem 0 .5rem 1.1rem;padding:0;font-size:.8rem;color:#b5453f}#pn-up p{margin:0 0 .3rem}' +
'@media(max-width:760px){.pn aside .nd{display:none}.pn aside .ta{display:flex}.pn aside .atras.mo{display:flex}.pn-tabs{display:none}.pn{grid-template-columns:minmax(0,1fr);grid-template-rows:auto 1fr}.pn main{min-width:0;overflow-x:hidden}.pn input[type=file]{max-width:100%}.pn aside{position:sticky;top:0;z-index:30;height:auto;align-self:start;min-height:0;flex-direction:row;flex-wrap:nowrap;overflow-x:auto;align-items:center;gap:.2rem;padding:.5rem .6rem;border-right:0;border-bottom:1px solid var(--l)}.pn aside>*{flex:0 0 auto;white-space:nowrap}.pn aside .marca,.pn aside .gt,.pn aside .sep,.pn aside .pn-pill{display:none}.pn aside .pie{margin:0 0 0 .6rem;display:flex;gap:.3rem;align-items:center}.pn-tema{margin:0}.pn main{padding:1rem .9rem 4rem}.pn h1{font-size:2rem}.pn-cifras{grid-template-columns:1fr 1fr}.pn-cifras div{border-bottom:1px solid var(--l)}.pn-franja span{border-right:0;border-bottom:1px solid var(--l);width:100%}.pn-orden{margin-left:0;width:100%}.pn-orden select{flex:1;min-width:0;max-width:100%}.pn-orden{flex-wrap:wrap}.pn-grid{grid-template-columns:repeat(auto-fill,minmax(105px,1fr))}.pn-grid.fr .pn-ph{flex:0 0 84px}.pn-rej{grid-template-columns:repeat(2,1fr);gap:12px}.pn-card{padding:.9rem}.pn-row{gap:.5rem}.pn-row input[type=text]{min-width:0;width:100%}.pn-btn{padding:.5rem .9rem}#pn-dver .pn-vb{flex-wrap:wrap}.pn-lado{flex-direction:column;align-items:stretch}.pn-copia{flex-wrap:wrap}.pn-copia input{min-width:0;width:100%}.pn-opt{max-width:none;flex:1 1 100%}.pn-tabs{overflow-x:auto;flex-wrap:nowrap}}' +
'.pn-ph .pn-ck{top:auto;left:6px;bottom:28px;width:26px;height:26px;opacity:0;transition:opacity .2s}.pn-ph:hover .pn-ck,.pn-ph .pn-ck:not(.off),.pn-ph.mk .pn-ck{opacity:1}.pn-ph .pn-ck.off{background:rgba(0,0,0,.35);border-color:#fff}@media(hover:none){.pn-ph .pn-ck{opacity:.9}.pn-ph .pn-ex{opacity:.85}}.pn-ph .pn-ex{position:absolute;top:6px;right:6px;z-index:2;width:28px;height:28px;border:0;border-radius:4px;background:rgba(40,40,40,.72);color:#fff;display:grid;place-items:center;cursor:pointer;opacity:0;transition:opacity .2s;padding:0}.pn-ph:hover .pn-ex,.pn-ph .pn-ex:focus-visible{opacity:1}.pn-ph .pn-ex svg{width:16px;height:16px}.pn-pb{bottom:28px}.pn-ph:hover img.ld{transform:none}#pn-dver{width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;border-radius:0;background:var(--f);text-align:left;overflow:hidden}#pn-dver::backdrop{background:var(--f)}.pn-vh{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.9rem 1.4rem;border-bottom:1px solid var(--l);height:64px;box-sizing:border-box}.pn-vt2{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.04em}.pn-vac{display:flex;align-items:center;gap:.4rem;flex:0 0 auto}.pn-vac button{background:none;border:0;color:var(--t);font:inherit;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;padding:.5rem .7rem;border-radius:6px}.pn-vac button:hover{background:var(--p)}#pn-vx{font-size:1.3rem;padding:.2rem .6rem}.pn-vm{height:calc(100vh - 64px);display:grid;place-items:center;padding:1.2rem 4.5rem;box-sizing:border-box}#pn-dver .pn-vm img{max-width:100%;max-height:calc(100vh - 64px - 2.4rem);width:auto;height:auto;border-radius:0;display:block;margin:0}.pn-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;background:none;border:0;color:var(--s);font-size:3rem;line-height:1;cursor:pointer;padding:.5rem 1rem}.pn-nav:hover{color:var(--t)}.pn-nav.l{left:.4rem}.pn-nav.r{right:.4rem}@media(max-width:760px){.pn-vh{padding:.6rem .8rem;height:auto;flex-wrap:wrap}.pn-vac button{padding:.4rem .5rem;font-size:.68rem}.pn-vm{height:calc(100vh - 110px);padding:.6rem .2rem}#pn-dver .pn-vm img{max-height:calc(100vh - 130px)}.pn-nav{font-size:2.2rem;padding:.3rem .5rem;opacity:.7}}';

CSS += '.pn-det{border:1px solid var(--l);border-radius:14px;margin:.6rem 0;background:var(--c)}.pn-det>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:1rem;padding:.95rem 1.2rem}.pn-det>summary::-webkit-details-marker{display:none}.pn-det>summary b{font-weight:500}.pn-det>summary span{color:var(--s);font-size:.85rem;margin-left:auto;text-align:right}.pn-det>summary:after{content:"⌄";color:var(--s)}.pn-det[open]>summary:after{content:"⌃"}.pn-det>.in{padding:0 1.2rem 1.1rem}.pn-det.peli>summary b{color:#b5453f}' +
'.pn[data-ay=off] .ay{display:none}#pn-dqr{text-align:center}.pn-qr canvas{display:block;margin:.6rem auto;border-radius:10px;max-width:100%;height:auto}' +
'.pn-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.6rem;margin:.4rem 0 .8rem}.pn-mini div{background:var(--p);border-radius:10px;padding:.6rem .8rem}.pn-mini b{display:block;font-family:"Cormorant Garamond",serif;font-size:1.5rem;font-weight:500;line-height:1.15}' +
'.pn-barras{display:flex;align-items:flex-end;gap:4px;height:72px;margin:.6rem 0 .2rem}.pn-barras i{flex:1;background:var(--a);opacity:.85;border-radius:3px 3px 0 0;min-height:2px}.pn-barras-e{display:flex;gap:4px;font-size:.65rem;color:var(--s)}.pn-barras-e span{flex:1;text-align:center}' +
'.pn-form label{display:block;font-size:.85rem;color:var(--s);margin:.8rem 0 .25rem}.pn-logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem;margin-top:.6rem}.pn-lg-pv{border:1px solid var(--l);border-radius:12px;padding:1rem;display:grid;place-items:center;min-height:6.5rem;margin-bottom:.6rem}.pn-lg-pv img{max-width:100%;max-height:70px;display:block}.pn-lg-pv.cl{background:#FAFAF8}.pn-lg-pv.os{background:#1A1A1A}.pn-chk{display:flex;align-items:center;gap:.6rem;margin:.6rem 0}' +
'.pn input[type=password],.pn input[type=email],.pn input[type=tel]{width:100%;padding:.65rem .85rem;border:1px solid var(--l);background:var(--f);color:var(--t);border-radius:10px;font:inherit}';

function qrMatriz(txt){
  var data = Array.from(new TextEncoder().encode(String(txt)));
  var ECC = [10,16,26,18,24,16,18,22,22,26], NB = [1,1,1,2,2,4,4,4,5,5];
  function raw(v){ var r = (16 * v + 128) * v + 64; if (v >= 2) { var na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; } return r; }
  var ver, dcw;
  for (ver = 1; ver <= 10; ver++) { dcw = Math.floor(raw(ver) / 8) - ECC[ver - 1] * NB[ver - 1]; if (4 + (ver < 10 ? 8 : 16) + data.length * 8 <= dcw * 8) break; }
  if (ver > 10) return null;
  var bits = [];
  function put(v, n){ for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
  put(4, 4); put(data.length, ver < 10 ? 8 : 16); data.forEach(function(b){ put(b, 8); });
  put(0, Math.min(4, dcw * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  for (var pad = 0xEC; bits.length < dcw * 8; pad ^= 0xEC ^ 0x11) put(pad, 8);
  var cw = []; for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; cw.push(b); }
  function mul(x, y){ var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
  var eccLen = ECC[ver - 1], nb = NB[ver - 1], gen = [];
  for (var i = 0; i < eccLen - 1; i++) gen.push(0); gen.push(1);
  for (var i = 0, root = 1; i < eccLen; i++) { for (var j = 0; j < gen.length; j++) { gen[j] = mul(gen[j], root); if (j + 1 < gen.length) gen[j] ^= gen[j + 1]; } root = mul(root, 2); }
  var rawCw = Math.floor(raw(ver) / 8), nShort = nb - rawCw % nb, shortLen = Math.floor(rawCw / nb), blocks = [];
  for (var i = 0, k = 0; i < nb; i++) {
    var dat = cw.slice(k, k += shortLen - eccLen + (i < nShort ? 0 : 1)), r = gen.map(function(){ return 0; });
    dat.forEach(function(b){ var f = b ^ r.shift(); r.push(0); gen.forEach(function(c, q){ r[q] ^= mul(c, f); }); });
    if (i < nShort) dat.push(0); blocks.push(dat.concat(r));
  }
  var out = [];
  for (var i = 0; i < blocks[0].length; i++) blocks.forEach(function(bl, j){ if (i !== shortLen - eccLen || j >= nShort) out.push(bl[i]); });
  var size = ver * 4 + 17, M = [], F = [];
  for (var y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
  function set(x, y, v){ if (x >= 0 && y >= 0 && x < size && y < size) { M[y][x] = !!v; F[y][x] = true; } }
  for (var i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function(c){ for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var d = Math.max(Math.abs(dx), Math.abs(dy)); set(c[0] + dx, c[1] + dy, d !== 2 && d !== 4); } });
  var pos = [];
  if (ver > 1) { var na = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2; pos = [6]; for (var p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p); }
  pos.forEach(function(a, i){ pos.forEach(function(b, j){ if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }); });
  function formato(mask){
    var d = mask, r = d; for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bt = ((d << 10) | r) ^ 0x5412, g = function(i){ return ((bt >>> i) & 1) !== 0; };
    for (var i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (var i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (var i = 0; i < 8; i++) set(size - 1 - i, 8, g(i)); for (var i = 8; i < 15; i++) set(8, size - 15 + i, g(i)); set(8, size - 8, true);
  }
  formato(0);
  if (ver >= 7) { var rv = ver; for (var i = 0; i < 12; i++) rv = (rv << 1) ^ ((rv >>> 11) * 0x1F25); var vb = (ver << 12) | rv; for (var i = 0; i < 18; i++) { var c = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, b2 = Math.floor(i / 3); set(a, b2, c); set(b2, a, c); } }
  for (var i = 0, right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (var v = 0; v < size; v++) for (var j = 0; j < 2; j++) {
      var x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
      if (!F[y][x] && i < out.length * 8) { M[y][x] = ((out[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
    }
  }
  function mascara(m){ for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) { if (F[y][x]) continue; var inv; switch (m) { case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break; case 3: inv = (x + y) % 3 === 0; break; case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; case 5: inv = x * y % 2 + x * y % 3 === 0; break; case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break; default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0; } if (inv) M[y][x] = !M[y][x]; } }
  function penal(){
    var p = 0, dark = 0, lineas = [];
    for (var y = 0; y < size; y++) { var s = '', t = ''; for (var x = 0; x < size; x++) { s += M[y][x] ? '1' : '0'; t += M[x][y] ? '1' : '0'; if (M[y][x]) dark++; } lineas.push(s, t); }
    lineas.forEach(function(s){ var m = s.match(/0{5,}|1{5,}/g) || []; m.forEach(function(r){ p += 3 + r.length - 5; }); p += 40 * ((s.match(/(?=10111010000)/g) || []).length + (s.match(/(?=00001011101)/g) || []).length); });
    for (var y = 0; y < size - 1; y++) for (var x = 0; x < size - 1; x++) if (M[y][x] === M[y][x + 1] && M[y][x] === M[y + 1][x] && M[y][x] === M[y + 1][x + 1]) p += 3;
    p += (Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1) * 10;
    return p;
  }
  var mejor = 0, pm = 1e9;
  for (var m = 0; m < 8; m++) { formato(m); mascara(m); var pp = penal(); if (pp < pm) { pm = pp; mejor = m; } mascara(m); }
  formato(mejor); mascara(mejor);
  return M;
}

var qrUrl = '', qrNombre = '';
function dibujarQR(url){
  var M = qrMatriz(url), cv = document.getElementById('pn-qc'); if (!M || !cv) return false;
  var n = M.length, sc = Math.max(4, Math.floor(560 / (n + 8))), W = (n + 8) * sc; cv.width = W; cv.height = W;
  var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, W); c.fillStyle = '#1D1A15';
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (M[y][x]) c.fillRect((x + 4) * sc, (y + 4) * sc, sc, sc);
  cv.style.width = Math.min(W, 280) + 'px'; return true;
}

CSS += '.pn-ph.vsel{cursor:pointer}.pn-ph.vsel.on img{outline:3px solid var(--a);outline-offset:-3px}.pn-vn{position:absolute;left:6px;top:6px;min-width:22px;height:22px;padding:0 5px;border-radius:999px;background:var(--a);color:var(--f);font-size:.72rem;font-weight:600;display:none;place-items:center}.pn-ph.vsel.on .pn-vn{display:grid}' +
'.pn-vprev{background:#0c0a08;border-radius:12px;padding:.8rem;display:grid;place-items:center;min-height:12rem}.pn-vprev canvas{max-width:100%;height:auto;border-radius:6px;background:#000}.pn-vb{height:6px;border-radius:99px;background:var(--l);overflow:hidden;margin:.7rem 0}.pn-vb i{display:block;height:100%;width:0;background:var(--a);transition:width .2s}';

CSS += '.pn-ved{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,380px);gap:1.4rem;align-items:start;margin-bottom:1.2rem}' +
'.pn-vtabs{display:flex;gap:.3rem;border-bottom:1px solid var(--l);margin:.4rem 0 .9rem}.pn-vtabs button{background:none;border:0;border-bottom:2px solid transparent;color:var(--s);font:inherit;padding:.55rem .9rem;cursor:pointer;margin-bottom:-1px}.pn-vtabs button.on{color:var(--t);border-bottom-color:var(--a);font-weight:500}.pn-vpane[hidden]{display:none}.pn-vtam .pn-opt{flex:1 1 9rem}.pn-vtam .ar{display:block;border:2px solid currentColor;border-radius:3px;margin-bottom:.5rem;opacity:.7}.pn-vtam .ar.v{width:1.1rem;height:1.95rem}.pn-vtam .ar.h{width:2.2rem;height:1.25rem}.pn-vtam .ar.b{width:2.2rem;height:1.25rem;border-style:double;border-width:5px}.pn-vchips{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:1rem 0}.pn-vchip{background:var(--c);border:1px solid var(--l);border-radius:12px;padding:.9rem .6rem;color:var(--t);font:inherit;cursor:pointer;text-align:center;line-height:1.3}.pn-vchip small{display:block;color:var(--s);font-size:.74rem;margin-bottom:.15rem}.pn-vchip.pri{background:var(--a);color:var(--f);border-color:var(--a)}.pn-vchip.pri small{color:inherit;opacity:.8}.pn-vchip:disabled{opacity:.6;cursor:wait}' +
'.pn-vpl{background:#0c0a08;border-radius:14px;overflow:hidden}.pn-vpl .pn-vprev{border-radius:0;min-height:0}.pn-vpl canvas{max-height:62vh;width:auto;max-width:100%}.pn-vctl{display:flex;align-items:center;gap:.7rem;padding:.6rem .9rem;color:#eee;background:#161310}.pn-vctl button{background:none;border:0;color:#fff;font-size:1.05rem;cursor:pointer;width:2rem;height:2rem}.pn-vctl input{flex:1;min-width:0;accent-color:var(--a)}.pn-vctl span{font-size:.78rem;font-variant-numeric:tabular-nums;white-space:nowrap}' +
'.pn-vtira{display:flex;gap:.6rem;overflow-x:auto;padding:.3rem 0 .7rem}.pn-vt,.pn-vadd{flex:0 0 auto;width:84px;height:112px;border-radius:8px;position:relative;overflow:hidden}.pn-vadd{border:1.5px dashed var(--l);background:var(--c);color:var(--s);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;cursor:pointer;font:inherit;font-size:.78rem}.pn-vadd b{font-size:1.4rem;font-weight:300}.pn-vt img{width:100%;height:100%;object-fit:cover;display:block;cursor:grab}.pn-vt i{position:absolute;left:4px;top:4px;background:rgba(0,0,0,.6);color:#fff;font-style:normal;font-size:.68rem;border-radius:99px;padding:0 .4rem}.pn-vt button{position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;cursor:pointer;line-height:1;padding:0}.pn-vt.ov{outline:2px solid var(--a)}.pn-vl{position:absolute;left:4px;bottom:4px;background:var(--a);color:var(--f);font-style:normal;font-size:.6rem;font-weight:700;border-radius:99px;padding:.05rem .4rem}.pn-vl.no{opacity:.45}' +
'@media(max-width:760px){.pn-ved{grid-template-columns:minmax(0,1fr)}}';
function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function $(s){ return root.querySelector(s); }
function ilus(n){ return '<img class="pn-il" data-n="' + n + '" data-i="0" src="imagenes/' + n + exts(n)[0] + '" alt="">'; }
document.addEventListener('error', function(e){
  var t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset.n) return;
  var i = +t.dataset.i + 1, L = exts(t.dataset.n);
  if (i < L.length) { t.dataset.i = i; t.src = 'imagenes/' + t.dataset.n + L[i]; } else t.style.visibility = 'hidden';
}, true);
document.addEventListener('load', function(e){ var t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.pn')) t.classList.add('ld'); }, true);
document.addEventListener('error', function(e){ var t = e.target; if (t && t.tagName === 'IMG' && t.closest && t.closest('.pn') && !t.dataset.n) t.classList.add('ld'); }, true);
function marcarCargadas(){ if (root) root.querySelectorAll('img').forEach(function(i){ if (i.complete) i.classList.add('ld'); }); }
function aviso(t){ var d = document.createElement('div'); d.className = 'pn-toast'; d.textContent = t; (root.querySelector('.pn') || root).appendChild(d); setTimeout(function(){ d.remove(); }, 4200); }
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
  var COLS = 'id,title,access_code,event_date,status,expires_at,created_at,cover_photo_id,client_id,downloads_enabled,selection_enabled,watermark_text,watermark_opacity,gallery_type,description,location,grid_style,palette,link_token,access_mode,print_sent_at,finals_locked,view_quality,cover_key';
  var g = await db.from('galleries').select(COLS + ',selection_watermark').is('deleted_at', null).order('created_at', { ascending: false });
  if (g.error) g = await db.from('galleries').select(COLS).is('deleted_at', null).order('created_at', { ascending: false });
  if (g.error) { aviso(g.error.message); return; }
  gals = g.data || [];
  var sinPortada = gals.filter(function(x){ return !x.cover_photo_id && !x.cover_key; }).map(function(x){ return x.id; }), primeras = {}, primerasF = {};
  if (sinPortada.length) {
    var p = await db.from('photos').select('id,gallery_id,photo_type').in('gallery_id', sinPortada).order('sort_order').order('filename').limit(1000);
    (p.data || []).forEach(function(x){ var m = x.photo_type === 'selection' ? primeras : primerasF; if (!m[x.gallery_id]) m[x.gallery_id] = x.id; });
  }
  var conCover = gals.filter(function(x){ return x.cover_key; }).map(function(x){ return x.id; }), cvT = {};
  if (conCover.length) { var cr = await api('/api/admin/cover-sign', { galleries: conCover }).catch(function(){ return null; }); cvT = (cr && cr.t) || {}; }
  gals.forEach(function(x){ x.portadaId = x.cover_photo_id || primeras[x.id] || primerasF[x.id] || null; });
  var tk = await firmar(gals.map(function(x){ return x.portadaId; }).filter(Boolean));
  gals.forEach(function(x){ x.portada = cvT[x.id] ? src(cvT[x.id]) : (x.portadaId && tk[x.portadaId] ? src(tk[x.portadaId]) : ''); });
  var f = await db.from('favorites').select('gallery_id').limit(1000);
  favs = {}; (f.data || []).forEach(function(x){ favs[x.gallery_id] = (favs[x.gallery_id] || 0) + 1; });
}

function tarjeta(g){
  var cv = g.portada ? '<img src="' + esc(g.portada) + '" alt="">' : ilus('admin-sin-portada');
  return '<button class="pn-tar" data-act="abrir" data-id="' + g.id + '"><div class="cv">' + cv + '</div><h3>' + esc(g.title) + '</h3><p class="pn-s">' + esc(g.event_date || '') + '</p><span class="pn-pill">' + esc(ESTADOS[g.status] || g.status) + '</span></button>';
}

var TABS = [['panel', 'Panel de control'], ['detalles', 'Detalles'], ['fotos', 'Fotos y medios'], ['diseno', 'Diseño'], ['config', 'Configuración'], ['favoritas', 'Favoritas'], ['impresiones', 'Impresiones'], ['video', 'Video'], ['compartir', 'Compartir']];
var ESTILOS = [['clasico', 'Clásico', 'Fotos con su proporción original'], ['uniforme', 'Uniforme', 'Cuadrícula ordenada, todas del mismo tamaño'], ['amplio', 'Amplio', 'Fotos grandes, menos por fila']];
var PALETAS = [['auto', 'Automática (según el evento)', '#FAFAF8', '#B8946A', '#1A1A1A'], ['arena', 'Arena y carbón', '#FAFAF8', '#B8946A', '#1A1A1A'], ['marfil', 'Marfil cálido', '#F7F3EC', '#A67C52', '#1C1917'], ['blanco', 'Blanco galería', '#FFFFFF', '#1F1F1F', '#121212'], ['oliva', 'Oliva y arena', '#F6F5F0', '#6F7F5E', '#161A17'], ['vino', 'Vino y crema', '#FBF8F5', '#8C3B3B', '#1B1516'], ['azul', 'Azul noche', '#F6F7F9', '#3F5B8C', '#14171C']];
var TITULOS = { panel: 'Descripción general', detalles: 'Detalles', fotos: 'Fotos y medios', diseno: 'Diseño', config: 'Configuración de la galería', favoritas: 'Favoritas de los clientes', impresiones: 'Fotos para imprimir', compartir: 'Compartir', video: 'Video de fotos' };
function ayudasOn(){ try { return localStorage.getItem('pn-ay') !== 'off'; } catch(e) { return true; } }
function marcaBase(){ return (ph && (ph.watermark_default || ph.studio_name)) || 'Estudio'; }
function temaGuardado(){ try { return localStorage.getItem('pn-tema') || 'auto'; } catch(e) { return 'auto'; } }
var PAL_PANEL = [['arena', 'Arena y carbón', 'La más parecida a Pic-Time, con dorado como acento'], ['marfil', 'Marfil cálido', 'Cálida y cercana'], ['blanco', 'Blanco galería', 'Sobria, casi sin color'], ['oliva', 'Oliva y arena', 'Natural y tranquila'], ['vino', 'Vino y crema', 'Elegante y cálida'], ['azul', 'Azul noche', 'Moderna y tecnológica']];
var PAL_PANEL_COL = {'arena': ['#FAFAF8', '#B8946A', '#1A1A1A'], 'marfil': ['#F7F3EC', '#A67C52', '#1C1917'], 'blanco': ['#FFFFFF', '#1F1F1F', '#121212'], 'oliva': ['#F6F5F0', '#6F7F5E', '#161A17'], 'vino': ['#FBF8F5', '#8C3B3B', '#1B1516'], 'azul': ['#F6F7F9', '#3F5B8C', '#14171C']};
function palPanel(){ var v = 'arena'; try { v = localStorage.getItem('pn-pal') || 'arena'; } catch(e) {} return PAL_PANEL.some(function(x){ return x[0] === v; }) ? v : 'arena'; }
function aplicarTema(){
  var t = temaGuardado(), e = t === 'auto' ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
  var p = root && root.querySelector('.pn'); if (p) { p.dataset.e = e; p.dataset.pa = palPanel(); p.dataset.ay = ayudasOn() ? 'on' : 'off'; }
}
var ICO = {
  panel: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z"/>', detalles: '<path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"/>',
  fotos: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  diseno: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.6 0-1.2-1-1.4-1-2.4 0-.9.7-1.5 1.7-1.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
  config: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  favoritas: '<path d="M12 20.5s-7-4.4-9.2-8.9C1.3 8.5 3.1 5.3 6.2 5.3c2 0 3.2 1.1 3.8 2.2.6-1.1 1.8-2.2 3.8-2.2 3.1 0 4.9 3.2 3.4 6.3C19 16.1 12 20.5 12 20.5z"/>',
  impresiones: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z"/>',
  compartir: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  video: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/>', inicio: '<path d="M4 11l8-7 8 7v9H4z"/>', galerias: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6M16 4.5a3.5 3.5 0 010 7M18.5 14c2 .8 3 2.700 3 6"/>', cotiz: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>', salir: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>', cuenta: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
};
function ico(n){ return '<svg class="pn-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[n] || '') + '</svg>'; }
function logoImg(cls, n, dato){ return dato ? '<img class="' + cls + '" alt="" src="' + esc(dato) + '">' : '<img class="' + cls + '" alt="" data-n="' + n + '" data-i="0" src="imagenes/' + n + exts(n)[0] + '">'; }
function logo(){ var c = ph.logo_para_claro || ph.logo_para_oscuro, o = ph.logo_para_oscuro || ph.logo_para_claro; return '<div class="marca">' + logoImg('lg-l', 'logo-oscuro', c) + logoImg('lg-d', 'logo-claro', o) + '</div>'; }
function pintarLado(){
  var a = root.querySelector('aside'), g = vista === 'detalle' ? gal(galId) : null, h;
  if (g) {
    h = logo() + '<button data-act="atras" class="atras mo">' + ico('atras') + 'Galerías</button>' +
      '<button data-v="inicio" class="nd">' + ico('inicio') + '<span>Inicio</span></button><button data-v="galerias" class="nd on">' + ico('galerias') + '<span>Galerías de clientes</span></button><button data-v="clientes" class="nd">' + ico('clientes') + '<span>Clientes</span></button><button data-v="cotiz" class="nd">' + ico('cotiz') + '<span>Cotizaciones</span></button><button data-v="agenda" class="nd">' + ico('agenda') + '<span>Agenda</span></button>' +
      TABS.map(function(t){ return '<button data-act="tab" data-t="' + t[0] + '" class="ta' + (tab === t[0] ? ' on' : '') + '">' + ico(t[0]) + '<span>' + t[1] + '</span></button>'; }).join('');
  } else {
    h = logo() + '<button data-v="inicio"' + (vista === 'inicio' ? ' class="on"' : '') + '>' + ico('inicio') + '<span>Inicio</span></button><button data-v="galerias"' + (vista === 'galerias' ? ' class="on"' : '') + '>' + ico('galerias') + '<span>Galerías de clientes</span></button><button data-v="clientes"' + (vista === 'clientes' ? ' class="on"' : '') + '>' + ico('clientes') + '<span>Clientes</span></button><button data-v="cotiz"' + (vista === 'cotiz' ? ' class="on"' : '') + '>' + ico('cotiz') + '<span>Cotizaciones</span></button><button data-v="agenda"' + (vista === 'agenda' ? ' class="on"' : '') + '>' + ico('agenda') + '<span>Agenda</span></button>';
  }
  var tm = temaGuardado();
  h += '<div class="pie"><button data-v="cuenta"' + (vista === 'cuenta' ? ' class="on"' : '') + '>' + ico('cuenta') + '<span>Mi cuenta</span></button><div class="pn-tema" role="group" aria-label="Tema">' + [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(function(x){ return '<button data-act="tema" data-t="' + x[0] + '"' + (tm === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div><button data-act="salir">' + ico('salir') + '<span>Cerrar sesión</span></button></div>';
  a.innerHTML = h;
}
function pintar(){
  if (!(vista === 'detalle' && tab === 'video')) vidLiberar();
  pintarLado(); aplicarTema(); setTimeout(marcarCargadas, 0);
  if (vista === 'cuenta') return pintarCuenta();
  if (vista === 'inicio') return pintarInicio();
  if (vista === 'galerias') return pintarLista();
  if (vista === 'clientes') return pintarClientes();
  if (vista === 'cotiz') return pintarCotiz();
  if (vista === 'agenda') return pintarAgenda();
  pintarDetalle();
}

async function pintarInicio(){
  var ent = gals.filter(function(g){ return g.status === 'delivered'; }).length;
  var pend = gals.filter(function(g){ return g.status === 'selection_sent'; });
  var act = pend.length ? pend.map(function(g){ return '<p><button class="pn-btn sec" data-act="abrir" data-id="' + g.id + '">' + esc(g.title) + '</button> envió su selección</p>'; }).join('')
    : '<div class="pn-vacio">' + ilus('admin-al-dia') + '<div><b>Todo al día</b><p class="pn-s">No hay selecciones nuevas por revisar.</p></div></div>';
  $('#pn-main').innerHTML = '<h1>Hola, ' + esc(ph.studio_name) + '</h1><div class="pn-row"><input type="text" id="pn-q" placeholder="Buscar galerías"><button class="pn-btn" data-act="nueva">+ Crear galería</button></div>' +
    '<h2>Resumen</h2><div class="pn-cifras"><div><b>' + gals.length + '</b><span class="pn-s">Galerías</span></div><div><b>' + ent + '</b><span class="pn-s">Entregadas</span></div><div><b id="pn-nv">–</b><span class="pn-s">Vistas</span></div><div><b id="pn-nv7">–</b><span class="pn-s">Vistas 7 días</span></div><div><b id="pn-nf">–</b><span class="pn-s">Favoritas</span></div><div><b id="pn-np">–</b><span class="pn-s">Fotos</span></div></div>' +
    '<div id="pn-neg"></div><h2>Actividad reciente</h2><div class="pn-card">' + act + '</div><h2>Galerías recientes</h2><div class="pn-rej">' + gals.slice(0, 4).map(tarjeta).join('') + '</div>';
  $('#pn-q').addEventListener('keydown', function(e){ if (e.key === 'Enter') { busca = e.target.value; vista = 'galerias'; pintar(); } });
  negInicio().then(function(h){ var z = $('#pn-neg'); if (z) z.innerHTML = h; }).catch(function(){});
  (async function(){ var d7 = new Date(); d7.setDate(d7.getDate() - 7); var c7 = await db.from('gallery_views').select('id', { count: 'exact', head: true }).gte('created_at', d7.toISOString()); var e7 = $('#pn-nv7'); if (e7 && !c7.error) e7.textContent = c7.count; })();
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
  galId = id; vista = 'detalle'; if (!conservar) { vidLiberar(); vidIds = []; vidTit = null; vidSub = null; vidAcento = -1; tab = 'panel'; fEsc = ''; fImp = false; modoSel = false; marcadas = new Set(); } cur = null; pintar();
  var p = await db.from('photos').select('id,filename,photo_type,file_size,sort_order,scene_id').eq('gallery_id', id).order('sort_order').order('filename').limit(1000);
  var f = await db.from('favorites').select('photo_id,visitor_token').eq('gallery_id', id).limit(1000);
  var v = await db.from('gallery_views').select('created_at,visitor_token').eq('gallery_id', id).order('created_at', { ascending: false }).limit(1000), vRows = null;
  if (v.error) v = await db.from('gallery_views').select('id', { count: 'exact', head: true }).eq('gallery_id', id); else vRows = v.data || [];
  var fotos = p.data || [];
  var ca = await db.from('photos').select('id,created_at').eq('gallery_id', id).limit(1000), conFecha = !ca.error;
  if (conFecha) { var mf = {}; (ca.data || []).forEach(function(x){ mf[x.id] = x.created_at; }); fotos.forEach(function(x){ x.created_at = mf[x.id] || ''; }); }
  var tk = await firmar(fotos.map(function(x){ return x.id; }));
  var cvT = null, gg = gal(id); if (gg && gg.cover_key) { var cs = await api('/api/admin/cover-sign', { gallery: id }).catch(function(){ return null; }); cvT = cs && cs.t; }
  var es = await api('/api/admin/scenes', { gallery: id }).catch(function(){ return { escenas: [] }; });
  var ip = await api('/api/admin/prints', { gallery: id }).catch(function(){ return { picks: [] }; });
  cur = { fotos: fotos, favs: f.data || [], vistas: vRows ? vRows.length : (v.count || 0), vrows: vRows, tk: tk, cover: cvT, escenas: (es && es.escenas) || [], conFecha: conFecha, imp: (ip && Array.isArray(ip.picks)) ? ip.picks : [], impErr: ip && ip.ok === false ? (ip.detalle || ip.error || 'error') : '' };
  pintar();
}


function actividad(){
  var rows = cur && cur.vrows; if (!rows) return '';
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var kd = function(d){ return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  var dias = [], mapa = {};
  for (var i = 13; i >= 0; i--) { var d = new Date(hoy); d.setDate(d.getDate() - i); var o = { n: 0, d: d }; dias.push(o); mapa[kd(d)] = o; }
  var uni = {}, sem = 0, lim = new Date(hoy); lim.setDate(lim.getDate() - 6);
  rows.forEach(function(r){ uni[r.visitor_token] = 1; var t = new Date(r.created_at); if (isNaN(t)) return; if (mapa[kd(t)]) mapa[kd(t)].n++; if (t >= lim) sem++; });
  var mx = Math.max.apply(null, dias.map(function(x){ return x.n; }).concat(1));
  var u = rows[0] && rows[0].created_at ? new Date(rows[0].created_at) : null;
  var cuando = u && !isNaN(u) ? u.toLocaleString('es-GT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin visitas';
  var cl = {}; cur.favs.forEach(function(x){ cl[x.visitor_token] = 1; });
  var mes = function(d){ return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' }); };
  return '<div class="pn-card"><h2>Actividad de tus clientes</h2><div class="pn-mini"><div><b>' + Object.keys(uni).length + '</b><span class="pn-s">Personas que entraron</span></div><div><b>' + sem + '</b><span class="pn-s">Visitas en 7 días</span></div><div><b>' + Object.keys(cl).length + '</b><span class="pn-s">Eligieron favoritas</span></div><div><b>' + (cur.imp ? cur.imp.length : 0) + '</b><span class="pn-s">Fotos para imprimir</span></div><div><b style="font-size:1.1rem">' + esc(cuando) + '</b><span class="pn-s">Última visita</span></div></div>' +
    '<div class="pn-barras" role="img" aria-label="Visitas por día en los últimos 14 días">' + dias.map(function(x){ return '<i title="' + esc(mes(x.d)) + ': ' + x.n + (x.n === 1 ? ' visita' : ' visitas') + '" style="height:' + Math.max(3, Math.round(x.n / mx * 100)) + '%"></i>'; }).join('') + '</div>' +
    '<div class="pn-barras-e">' + dias.map(function(x, i){ return '<span>' + (i % 2 === 0 ? x.d.getDate() : '') + '</span>'; }).join('') + '</div><p class="pn-s ay">Visitas de los últimos 14 días. Una persona que abre la galería varias veces cuenta varias visitas.</p></div>';
}

function dt(titulo, resumen, html, abierta){ return '<details class="pn-det"' + (abierta ? ' open' : '') + '><summary><b>' + titulo + '</b><span>' + esc(resumen || '') + '</span></summary><div class="in">' + html + '</div></details>'; }
function errCuenta(e){ var m = e && e.message ? e.message : ''; if (!e || /column|schema cache|permission|policy|row-level/i.test(m)) return 'No se pudo guardar. Falta ejecutar el SQL de la Actualización 1 en Supabase (archivo etapa8.sql).'; return m; }
function pintarCuenta(){
  var pv = function(cual, n, dato){ return '<div class="pn-lg-pv ' + (cual === 'claro' ? 'cl' : 'os') + '">' + logoImg('', n, dato).replace('<img class=""', '<img id="pn-lgp-' + cual + '"') + '</div>'; };
  $('#pn-main').innerHTML = '<h1>Mi cuenta</h1><p class="pn-s ay">Aquí configuras cómo se ve tu estudio en las galerías de tus clientes.</p><div class="pn-form">' +
    dt('Tema', (PAL_PANEL.filter(function(x){ return x[0] === palPanel(); })[0] || [])[1] + ' · ' + ({ auto: 'Automático', light: 'Claro', dark: 'Oscuro' }[temaGuardado()]), '<p class="pn-s">Elige el tema de colores de tu panel. Es solo para ti: no cambia lo que ven tus clientes.</p><div class="pn-opts">' + PAL_PANEL.map(function(c){ var pa = PAL_PANEL_COL[c[0]]; return '<button class="pn-opt pal' + (palPanel() === c[0] ? ' on' : '') + '" type="button" data-act="pal-panel" data-v="' + c[0] + '"><i style="background:linear-gradient(135deg,' + pa[0] + ' 34%,' + pa[1] + ' 34% 67%,' + pa[2] + ' 67%)"></i><div><b>' + c[1] + '</b><span>' + c[2] + '</span></div></button>'; }).join('') + '</div><p class="pn-s" style="margin-top:1rem">Modo</p><div class="pn-tema pn-tema-c" role="group" aria-label="Modo">' + [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(function(m){ return '<button type="button" data-act="tema" data-t="' + m[0] + '"' + (temaGuardado() === m[0] ? ' class="on"' : '') + '>' + m[1] + '</button>'; }).join('') + '</div>', true) +
    dt('Estudio', ph.studio_name, '<label for="pn-cu-n">Nombre del estudio o marca</label><input type="text" id="pn-cu-n" maxlength="60" value="' + esc(ph.studio_name) + '"><p class="pn-s ay">Es el nombre que ven tus clientes arriba de su galería.</p>' +
      '<label for="pn-cu-wm">Marca de agua predeterminada</label><input type="text" id="pn-cu-wm" maxlength="40" value="' + esc(ph.watermark_default || '') + '" placeholder="' + esc(ph.studio_name) + '"><p class="pn-s ay">Se usa en las galerías nuevas. Cada galería puede cambiarla en su Configuración. Si la dejas vacía se usa el nombre del estudio.</p>' +
      '<div class="pn-row"><button class="pn-btn" data-act="cuenta-guardar" type="button">Guardar</button></div>', true) +
    dt('Logotipo', ph.logo_para_claro || ph.logo_para_oscuro ? 'Personalizado' : 'Por defecto', '<p class="pn-s ay">Sube un PNG con fondo transparente. Necesitas dos versiones: una oscura (se ve sobre fondo claro) y una clara o dorada (se ve sobre fondo oscuro). Si subes solo una, se usa en los dos modos.</p><div class="pn-logos"><div><b>Para fondo claro</b>' + pv('claro', 'logo-oscuro', ph.logo_para_claro) + '<input type="file" id="pn-lg-c" accept="image/png,image/webp,image/jpeg"><div class="pn-row"><button class="pn-btn sec" data-act="logo-quitar" data-v="claro" type="button">Volver al logo por defecto</button></div></div>' +
      '<div><b>Para fondo oscuro</b>' + pv('oscuro', 'logo-claro', ph.logo_para_oscuro) + '<input type="file" id="pn-lg-o" accept="image/png,image/webp,image/jpeg"><div class="pn-row"><button class="pn-btn sec" data-act="logo-quitar" data-v="oscuro" type="button">Volver al logo por defecto</button></div></div></div>') +
    dt('Contacto', (ph.wa_phone || ph.contact_email) ? 'Configurado' : 'Sin configurar', '<p class="pn-s ay">Aparecen como botones en la galería de tus clientes y se usarán en las cotizaciones.</p><label for="pn-cu-wa">WhatsApp (con código de país)</label><input type="tel" id="pn-cu-wa" maxlength="20" placeholder="502 5555 5555" value="' + esc(ph.wa_phone || '') + '"><label for="pn-cu-ml">Correo de contacto</label><input type="email" id="pn-cu-ml" maxlength="80" value="' + esc(ph.contact_email || '') + '"><div class="pn-row"><button class="pn-btn" data-act="cuenta-guardar" type="button">Guardar</button></div>') +
    dt('Contraseña', '', '<label for="pn-cu-p1">Nueva contraseña (mínimo 8 caracteres)</label><input type="password" id="pn-cu-p1" autocomplete="new-password"><label for="pn-cu-p2">Repite la contraseña</label><input type="password" id="pn-cu-p2" autocomplete="new-password"><div class="pn-row"><button class="pn-btn" data-act="cuenta-clave" type="button">Cambiar contraseña</button></div>') +
    dt('Preferencias del panel', ayudasOn() ? 'Con ayudas' : 'Sin ayudas', '<label class="pn-chk"><input type="checkbox" id="pn-cu-ay"' + (ayudasOn() ? ' checked' : '') + '> Mostrar ayudas y explicaciones</label><p class="pn-s ay">Si ya conoces el panel puedes ocultarlas para ver menos texto.</p>') +
 + '<p class="pn-s" style="margin-top:1.4rem">Versión del panel: 9 nov 2026, 15:50</p></div>';
}
async function guardarCuenta(){
  var nom = $('#pn-cu-n').value.trim(); if (!nom) return aviso('Escribe el nombre de tu estudio.');
  var wa = $('#pn-cu-wa').value.trim(), ml = $('#pn-cu-ml').value.trim(), wm = $('#pn-cu-wm').value.trim();
  if (wa && wa.replace(/\D/g, '').length < 8) return aviso('El número de WhatsApp parece incompleto. Escríbelo con código de país, por ejemplo 502 5555 5555.');
  if (ml && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ml)) return aviso('El correo no parece válido.');
  var campos = { studio_name: nom, wa_phone: wa || null, contact_email: ml || null, watermark_default: wm || null };
  var r = await db.from('photographers').update(campos).eq('id', ph.id).select('id');
  if (r.error || !r.data || !r.data.length) return aviso(errCuenta(r.error));
  Object.assign(ph, campos); aviso('Cuenta guardada'); pintarLado();
}
async function cambiarClave(){
  var p1 = $('#pn-cu-p1').value, p2 = $('#pn-cu-p2').value;
  if (p1.length < 8) return aviso('La contraseña debe tener al menos 8 caracteres.');
  if (p1 !== p2) return aviso('Las dos contraseñas no coinciden.');
  var r = await db.auth.updateUser({ password: p1 }); if (r.error) return aviso(r.error.message);
  $('#pn-cu-p1').value = ''; $('#pn-cu-p2').value = ''; aviso('Contraseña cambiada');
}
async function subirLogo(file, cual){
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return aviso('Usa un archivo PNG (mejor con fondo transparente), JPG o WEBP.');
  var img = new Image(), u = URL.createObjectURL(file);
  try { await new Promise(function(ok, no){ img.onload = ok; img.onerror = no; img.src = u; }); } catch(e) { URL.revokeObjectURL(u); return aviso('No pude leer esa imagen.'); }
  var dato = '';
  [700, 520, 380].some(function(mx){
    var w = Math.min(mx, img.naturalWidth), h = Math.max(1, Math.round(img.naturalHeight * w / img.naturalWidth)), c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h); dato = c.toDataURL('image/png'); return dato.length < 150000;
  });
  URL.revokeObjectURL(u);
  if (dato.length >= 150000) return aviso('El logo pesa demasiado. Exporta una versión más sencilla o más pequeña.');
  var col = cual === 'claro' ? 'logo_para_claro' : 'logo_para_oscuro', campos = {}; campos[col] = dato;
  var r = await db.from('photographers').update(campos).eq('id', ph.id).select('id');
  if (r.error || !r.data || !r.data.length) return aviso(errCuenta(r.error));
  ph[col] = dato; aviso('Logo guardado'); pintarLado();
  var pv = $('#pn-lgp-' + cual); if (pv) { pv.removeAttribute('data-n'); pv.style.visibility = ''; pv.src = dato; }
}
function plegar(abierta){
  var cards = Array.prototype.slice.call(root.querySelectorAll('#pn-main > .pn-card'));
  cards.forEach(function(c){
    var h = c.querySelector(':scope > h2'); if (!h) return;
    var tit = h.textContent, d = document.createElement('details'); d.className = 'pn-det' + (/^Eliminar/.test(tit) ? ' peli' : ''); if (abierta(tit)) d.open = true;
    var nx = h.nextElementSibling; if (nx && nx.matches('p.pn-s')) nx.classList.add('ay');
    var sm = document.createElement('summary'), b = document.createElement('b'), sp = document.createElement('span'); b.textContent = tit; sm.appendChild(b);
    var ctl = c.querySelector('select,input[type=text],input[type=date]'), on = c.querySelector('.pn-opt.on b');
    sp.textContent = tit === 'Portada' ? '' : ctl ? (ctl.tagName === 'SELECT' ? ctl.options[ctl.selectedIndex].text.replace(/\s*[(:].*$/, '') : (ctl.value || (ctl.type === 'date' ? 'Sin caducidad' : 'Sin definir'))) : (on ? on.textContent : '');
    sm.appendChild(sp); var inn = document.createElement('div'); inn.className = 'in'; while (h.nextSibling) inn.appendChild(h.nextSibling); h.remove();
    d.appendChild(sm); d.appendChild(inn); c.replaceWith(d);
  });
}

var vidIds = [], vidForm = 'v', vidSeg = 2.5, vidPart = true, vidCache = {}, vidTok = 0, vidBusy = false, vidCancel = false;
function cargarSlideshow(){
  if (window.Slideshow) return Promise.resolve();
  return new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = 'slideshow.js?v=4'; sc.onload = ok; sc.onerror = function(){ no(new Error('No se encontró slideshow.js en GitHub. Súbelo junto a panel.js.')); }; document.head.appendChild(sc); });
}
function vidEstado(t){ var e = $('#pn-vst'); if (e) e.textContent = t || ''; }
function vidBarra(x){ var b = $('#pn-vbar'); if (b) b.style.width = Math.round(clampN(x) * 100) + '%'; }
function clampN(x){ return Math.max(0, Math.min(1, x)); }
function vidStop(){ vidPlay = false; cancelAnimationFrame(vidRaf); vidCtl(); }
function vidLiberar(){ if (vidBusy) return; vidStop(); vidLoadTok++; vidEsc = null; vidLogo = undefined; Object.keys(vidCache).forEach(function(k){ try { vidCache[k].bmp.close(); } catch(e) {} }); vidCache = {}; }
var vidPest = 0, vidEstilo = 'papel', vidTit = null, vidSub = null, vidAcento = -1, vidMarca = true, vidLogo, vidTrans = 'variadas', vidTransP = 'variadas', vidSem = Math.floor(Math.random() * 4e9);
function cargarLogoVideo(){
  var dato = ph.logo_para_oscuro || ph.logo_para_claro, lista = dato ? [dato] : exts('logo-claro').map(function(e){ return 'imagenes/logo-claro' + e; });
  return new Promise(function(ok){
    (function prueba(k){
      if (k >= lista.length) return ok(null);
      var im = new Image(); im.onload = function(){ if (!im.naturalWidth) return prueba(k + 1); createImageBitmap(im).then(function(b){ try { var tc = document.createElement('canvas'); tc.width = tc.height = 2; var tx = tc.getContext('2d'); tx.drawImage(b, 0, 0, 2, 2); tx.getImageData(0, 0, 1, 1); } catch (e) { return ok(null); } ok({ bmp: b, w: b.width, h: b.height }); }, function(){ prueba(k + 1); }); }; im.onerror = function(){ prueba(k + 1); }; im.src = lista[k];
    })(0);
  });
}
var vidEsc = null, vidT = 0, vidPlay = false, vidRaf = 0, vidLast = 0, vidDeb = 0, vidDrag = -1, vidLoadTok = 0;
var VDIM = { v: [1080, 1920, 'vertical'], h: [1920, 1080, 'horizontal'] };
function vidSubDef(g){ var y = String(g.event_date || g.created_at || '').slice(0, 4); return [g.gallery_type, y].filter(Boolean).join(' · '); }
function vidPalAuto(g){ var pa = PAL_VIEJA[g.palette] || g.palette; return PAL_PANEL_COL[pa] ? pa : (PAL_TIPO[g.gallery_type] || 'arena'); }
function vidPalNom(k){ for (var i = 0; i < PAL_PANEL.length; i++) if (PAL_PANEL[i][0] === k) return PAL_PANEL[i][1]; return ''; }
function vidOp(){ var g = gal(galId) || {}; return { semilla: vidSem, particulas: vidPart, estilo: vidEstilo, transicion: vidEstilo === 'pantalla' ? vidTrans : vidTransP, intro: vidMarca, logo: vidLogo || null, nombre: (ph && ph.studio_name) || '', acento: PAL_PANEL_COL[vidAcento < 0 ? vidPalAuto(g) : PAL_PANEL[vidAcento][0]][1], titulo: vidTit !== null ? vidTit : (g.title || ''), subtitulo: vidSub !== null ? vidSub : vidSubDef(g) }; }
var VFMT = { v: 'Vertical 9:16', h: 'Horizontal 16:9', ambos: 'Los dos' }, VRIT = { 3.5: 'Lento', 2.5: 'Normal', 1.5: 'Rápido' };
function mmss(x){ x = Math.max(0, Math.round(x)); return ('0' + Math.floor(x / 60)).slice(-2) + ':' + ('0' + (x % 60)).slice(-2); }
function vidHtml(g, sel, fin){
  var todas = fin.concat(sel);
  var thumb = function(x){ return '<figure class="pn-ph vsel" data-act="vid-foto" data-id="' + x.id + '"><span class="pn-vn"></span><img loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"><figcaption>' + esc(x.filename) + (x.photo_type === 'selection' ? ' · sel.' : '') + '</figcaption></figure>'; };
  return '<div class="pn-ved"><div class="pn-vizq"><p class="pn-s" id="pn-vinfo" style="margin-top:0"></p>' +
    '<div class="pn-vtabs" id="pn-vtabs" role="tablist"><button type="button" data-act="vid-pest" data-v="0">Estilo</button><button type="button" data-act="vid-pest" data-v="1">Tamaño</button><button type="button" data-act="vid-pest" data-v="2">Marca</button><button type="button" data-act="vid-pest" data-v="3">Ajustes</button></div>' +
    '<div class="pn-vpane" data-p="0">' +
    '<div class="pn-opts" id="pn-ve"><button class="pn-opt" type="button" data-act="vid-estilo" data-v="papel"><b>Álbum de luz</b><span>Marco inclinado, fondo animado, destellos y partículas</span></button><button class="pn-opt" type="button" data-act="vid-estilo" data-v="pantalla"><b>Marea</b><span>Foto a pantalla completa, con portada con el nombre del evento</span></button><button class="pn-opt" type="button" data-act="vid-estilo" data-v="prisma"><b>Prisma</b><span>Dos fotos por pantalla con corte inclinado; el título sube al inicio y luego todo se amplía</span></button></div>' +
    '</div>' +
    '<div class="pn-vpane" data-p="1">' +
    '<div class="pn-opts pn-vtam" id="pn-vf"><button class="pn-opt" type="button" data-act="vid-fmt" data-v="v"><i class="ar v"></i><b>Vertical 9:16</b><span>Reels, historias y celular</span></button><button class="pn-opt" type="button" data-act="vid-fmt" data-v="h"><i class="ar h"></i><b>Horizontal 16:9</b><span>Pantalla, TV y YouTube</span></button><button class="pn-opt" type="button" data-act="vid-fmt" data-v="ambos"><i class="ar b"></i><b>Los dos</b><span>Genera un archivo de cada uno</span></button></div>' +
    '</div>' +
    '<div class="pn-vpane" data-p="2">' +
    '<div class="pn-opts" id="pn-vm"><button class="pn-opt" type="button" data-act="vid-marca" data-v="si"><b>Con mi logo</b><span>Empieza con tu logo, para ti y tus redes</span></button><button class="pn-opt" type="button" data-act="vid-marca" data-v="no"><b>Sin logo</b><span>Empieza directo con las fotos, para tu cliente</span></button></div>' +
    '</div>' +
    '<div class="pn-vpane" data-p="3">' +
    '<div class="pn-vchips"><button class="pn-vchip" type="button" data-act="vid-ritmo" id="pn-cr"></button><button class="pn-vchip" type="button" data-act="vid-trans" id="pn-ct"></button><button class="pn-vchip" type="button" data-act="vid-part" id="pn-cp"></button><button class="pn-vchip" type="button" data-act="vid-acento" id="pn-ca"></button></div>' +
    '<div id="pn-vtx" hidden><label class="pn-s" for="pn-vtt" id="pn-vtl">Título de la portada</label><input type="text" id="pn-vtt" maxlength="60"><label class="pn-s" for="pn-vts" id="pn-vsl" style="display:block;margin-top:.6rem">Subtítulo (tipo de evento y año)</label><input type="text" id="pn-vts" maxlength="60"></div>' +
    '</div>' +
    '<div class="pn-vchips"><button class="pn-vchip pri" style="grid-column:1/-1" type="button" data-act="vid-gen" id="pn-vgen"><small>Sin música</small>Generar y descargar MP4</button></div>' +
    '<div class="pn-vb"><i id="pn-vbar"></i></div><p class="pn-s" id="pn-vst"></p><div class="pn-row"><button class="pn-btn sec" data-act="vid-cancel" type="button" id="pn-vcan" hidden>Cancelar</button></div>' +
    '<p class="pn-s ay">Prisma: cada dos fotos forman un par que se muestra junto, con corte inclinado y deslizamientos con movimiento (lado a lado en 16:9, una arriba y otra abajo en 9:16); funciona mejor con fotos de la misma forma. Álbum de luz: marco inclinado, fondo desenfocado de la misma foto, destellos y partículas. Marea: fotos a pantalla completa, con portada de título y transiciones suaves que se mezclan (deslizar de lado y disolver). Funciona en Chrome o Edge en computadora; deja esta pestaña abierta mientras se genera. Solo tú ves este generador.</p></div>' +
    '<div class="pn-vpl"><div class="pn-vprev"><canvas id="pn-vcv" width="360" height="640"></canvas></div><div class="pn-vctl"><button type="button" data-act="vid-play" id="pn-vplay" aria-label="Reproducir">▶</button><input type="range" id="pn-vseek" min="0" max="1000" value="0" aria-label="Posición"><span id="pn-vtm">00:00 / 00:00</span></div></div></div>' +
    '<div class="pn-card"><h2>Diapositivas</h2><p class="pn-s ay">Arrastra una foto para cambiar su lugar. Toca la × para quitarla.</p><div class="pn-vtira" id="pn-vtira"></div></div>' +
    '<dialog id="pn-dvp" style="width:min(54rem,94vw)"><h2>Agregar fotos</h2><p class="pn-s">Toca las fotos para agregarlas o quitarlas. Se suman al final, en el orden en que las toques.</p>' +
    '<div class="pn-row"><button class="pn-btn sec" data-act="vid-sel" data-v="fin" type="button"' + (fin.length ? '' : ' disabled') + '>Todas las finales (' + fin.length + ')</button><button class="pn-btn sec" data-act="vid-sel" data-v="sel" type="button"' + (sel.length ? '' : ' disabled') + '>Todas las de selección (' + sel.length + ')</button><button class="pn-btn sec" data-act="vid-sel" data-v="ninguna" type="button">Quitar todas</button></div>' +
    '<div class="pn-grid sm" id="pn-vg" style="max-height:52vh;overflow:auto;margin-top:.8rem">' + (todas.length ? todas.map(thumb).join('') : '<p class="pn-s">Esta galería aún no tiene fotos.</p>') + '</div><p class="pn-s" id="pn-vc"></p><div class="pn-row"><button class="pn-btn" data-act="vid-cerrar" type="button">Listo</button></div></dialog>';
}
function vidPestana(){ root.querySelectorAll('#pn-vtabs button').forEach(function(b){ b.classList.toggle('on', +b.dataset.v === vidPest); b.setAttribute('aria-selected', +b.dataset.v === vidPest); }); root.querySelectorAll('.pn-vpane').forEach(function(d){ d.hidden = +d.dataset.p !== vidPest; }); }
function vidRefrescar(){ vidPestana(); root.querySelectorAll('#pn-vf .pn-opt').forEach(function(o){ o.classList.toggle('on', o.dataset.v === vidForm); });
  var n = vidIds.length;
  root.querySelectorAll('#pn-vg .pn-ph').forEach(function(f){ var i = vidIds.indexOf(f.dataset.id); f.classList.toggle('on', i >= 0); var b = f.querySelector('.pn-vn'); if (b) b.textContent = i >= 0 ? i + 1 : ''; });
  var c = $('#pn-vc'); if (c) c.textContent = n ? n + (n === 1 ? ' foto elegida' : ' fotos elegidas') : 'Aún no has elegido fotos.';
  var tr = $('#pn-vtira');
  if (tr) tr.innerHTML = '<button class="pn-vadd" data-act="vid-agregar" type="button"><b>+</b><span>Agregar fotos</span></button>' + vidIds.map(function(id, i){ return '<div class="pn-vt" draggable="true" data-i="' + i + '"><img draggable="false" alt="" src="' + (cur.tk[id] ? esc(src(cur.tk[id])) : '') + '"><i>' + (i + 1) + '</i>' + (vidEstilo === 'prisma' ? '<em class="pn-vl' + (i === n - 1 && n % 2 ? ' no' : '') + '">Par ' + (Math.floor(i / 2) + 1) + '</em>' : '') + '<button type="button" data-act="vid-quitar" data-i="' + i + '" aria-label="Quitar">×</button></div>'; }).join('');
  var inf = $('#pn-vinfo'); if (inf) inf.textContent = n ? (vidEstilo === 'prisma' ? Math.floor(n / 2) + (Math.floor(n / 2) === 1 ? ' par' : ' pares') + (n % 2 ? ' (la última foto sobra: falta su pareja)' : '') : n + (n === 1 ? ' diapositiva' : ' diapositivas')) + ' · ' + mmss(window.Slideshow ? window.Slideshow.duracionTotal(n, vidSeg, vidEstilo, vidMarca) : n * vidSeg) + ' de duración' : 'Aún no hay fotos. Toca «Agregar fotos» en la tira de abajo.';
  var chip = function(id, t, v){ var e = $(id); if (e) e.innerHTML = '<small>' + t + '</small>' + v; };
  root.querySelectorAll('#pn-ve .pn-opt').forEach(function(o){ o.classList.toggle('on', o.dataset.v === vidEstilo); }); root.querySelectorAll('#pn-vm .pn-opt').forEach(function(o){ o.classList.toggle('on', (o.dataset.v === 'si') === vidMarca); }); chip('#pn-cr', 'Ritmo', VRIT[vidSeg] || 'Normal'); chip('#pn-cp', 'Partículas', vidPart ? 'Sí' : 'No');
  var cpp = $('#pn-cp'); if (cpp) cpp.hidden = vidEstilo !== 'papel'; var cta = $('#pn-ct'); if (cta) cta.hidden = vidEstilo === 'prisma'; var cac = $('#pn-ca'); if (cac) { cac.hidden = vidEstilo !== 'prisma'; cac.innerHTML = '<small>Color del título</small>' + (vidAcento < 0 ? 'Automático · ' + vidPalNom(vidPalAuto(gal(galId) || {})) : PAL_PANEL[vidAcento][1]); }
  chip('#pn-ct', 'Transiciones', vidEstilo === 'pantalla' ? { variadas: 'Variadas', desliza: 'Deslizar de lado', disuelve: 'Disolver' }[vidTrans] : { variadas: 'Variadas (todas las direcciones)', der: 'Hacia la derecha', izq: 'Hacia la izquierda', arriba: 'Hacia arriba', abajo: 'Hacia abajo' }[vidTransP]);
  var tx = $('#pn-vtx'); if (tx) { tx.hidden = vidEstilo === 'papel'; var g0 = gal(galId) || {}, o0 = vidOp(); if ($('#pn-vtt') && document.activeElement !== $('#pn-vtt')) $('#pn-vtt').value = o0.titulo; if ($('#pn-vts') && document.activeElement !== $('#pn-vts')) $('#pn-vts').value = o0.subtitulo; }
  clearTimeout(vidDeb); vidEsc = null; vidDeb = setTimeout(vidPrepara, 350); vidCtl();
}
function vidCtl(){
  var d = vidEsc ? vidEsc.duracion : vidIds.length * vidSeg, sk = $('#pn-vseek'), tm = $('#pn-vtm'), pb = $('#pn-vplay');
  if (sk && document.activeElement !== sk) sk.value = d ? Math.round(vidT / d * 1000) : 0;
  if (tm) tm.textContent = mmss(vidT) + ' / ' + mmss(d);
  if (pb) pb.textContent = vidPlay ? '❚❚' : '▶';
}
function vidIniciar(){
  vidStop(); vidRefrescar();
  cargarSlideshow().then(function(){ if (!window.Slideshow.soportado()) vidEstado('Tu navegador no puede crear el video. Usa Chrome o Edge actualizados en la computadora.'); }).catch(function(e){ vidEstado(e.message); });
}
async function vidCargar(ids, prog, abort){
  var faltan = ids.filter(function(id){ return !vidCache[id]; }), tk = {};
  for (var i = 0; i < faltan.length; i += 100) { var r = await api('/api/admin/sign', { photos: faltan.slice(i, i + 100) }); Object.assign(tk, r.fotos || {}); }
  for (var k = 0; k < faltan.length; k++) {
    if (abort()) throw new Error('cancelado');
    prog(k, faltan.length);
    if (!tk[faltan[k]]) throw new Error('No se pudo acceder a una de las fotos.');
    var ft = await window.Slideshow.cargarFoto(src(tk[faltan[k]]));
    if (abort()) { try { ft.bmp.close(); } catch(e) {} throw new Error('cancelado'); }
    vidCache[faltan[k]] = ft;
  }
  return ids.map(function(id){ return vidCache[id]; });
}
function vidDibuja(){
  var cv = $('#pn-vcv'); if (!cv) return;
  var cx = cv.getContext('2d');
  if (!vidEsc) { cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height); return; }
  vidEsc.dibujar(cx, Math.min(vidT, vidEsc.duracion - 0.001)); vidCtl();
}
async function vidPrepara(){
  var cv = $('#pn-vcv'); if (!cv || vidBusy) return;
  var mi = ++vidLoadTok, ids = vidIds.slice();
  if (ids.length < 2) { vidEsc = null; vidT = 0; vidDibuja(); vidCtl(); vidEstado(ids.length ? 'Agrega al menos una foto más.' : ''); return; }
  try {
    await cargarSlideshow(); if (vidMarca && vidLogo === undefined) vidLogo = await cargarLogoVideo();
    var fotos = await vidCargar(ids, function(k, n){ vidEstado('Preparando vista previa… foto ' + (k + 1) + ' de ' + n); vidBarra((k + 1) / n); }, function(){ return mi !== vidLoadTok; });
    if (mi !== vidLoadTok) return;
    var dm = VDIM[vidForm] || VDIM.v, sc = 640 / Math.max(dm[0], dm[1]), W = Math.round(dm[0] * sc), H = Math.round(dm[1] * sc);
    cv.width = W; cv.height = H;
    vidEsc = window.Slideshow.crearEscena(fotos, W, H, vidSeg, vidOp());
    vidT = Math.min(vidT, vidEsc.duracion - 0.01); vidBarra(0); vidEstado(''); vidDibuja(); vidCtl();
  } catch(e) { if (e && e.message === 'cancelado') return; vidBarra(0); vidEstado(e && e.message ? e.message : 'No se pudo preparar la vista previa.'); }
}
function vidPlayToggle(){
  if (vidPlay) return vidStop();
  if (vidIds.length < 2) return aviso('Agrega al menos 2 fotos.');
  if (!vidEsc) return aviso('La vista previa se está preparando, espera un momento.');
  vidPlay = true; vidLast = performance.now(); vidCtl();
  (function f(now){
    if (!vidPlay || !vidEsc || !document.body.contains($('#pn-vcv'))) { vidPlay = false; vidCtl(); return; }
    vidT += (now - vidLast) / 1000; vidLast = now; if (vidT >= vidEsc.duracion) vidT = 0;
    vidDibuja(); vidRaf = requestAnimationFrame(f);
  })(vidLast);
}
async function vidGenerar(){
  if (vidBusy) return;
  if (vidIds.length < 2) return aviso('Agrega al menos 2 fotos.');
  if (vidIds.length > 60) return aviso('Para cuidar la memoria, usa 60 fotos o menos por video.');
  var g = gal(galId), btn = $('#pn-vgen'), can = $('#pn-vcan'), fin = '';
  try {
    await cargarSlideshow(); if (!window.Slideshow.soportado()) throw new Error('Tu navegador no puede crear el video. Usa Chrome o Edge actualizados en la computadora.');
    vidStop(); vidLoadTok++; vidBusy = true; vidCancel = false; btn.disabled = true; can.hidden = false;
    if (vidMarca && vidLogo === undefined) vidLogo = await cargarLogoVideo();
    var fotos = await vidCargar(vidIds.slice(), function(k, n){ vidEstado('Leyendo foto ' + (k + 1) + ' de ' + n + '…'); vidBarra(k / Math.max(1, n) * 0.25); }, function(){ return vidCancel; });
    var fmts = vidForm === 'ambos' ? ['v', 'h'] : [vidForm];
    for (var q = 0; q < fmts.length; q++) {
      var dm2 = VDIM[fmts[q]] || VDIM.v, W = dm2[0], H = dm2[1], esc2 = window.Slideshow.crearEscena(fotos, W, H, vidSeg, vidOp());
      vidEstado('Creando el video ' + dm2[2] + '… no cierres esta pestaña.');
      var blob = await window.Slideshow.exportar(esc2, { fps: 30, bitrate: 8e6, cancelado: function(){ return vidCancel; }, progreso: function(x){ vidBarra(0.25 + 0.75 * (q + x) / fmts.length); vidEstado('Creando el video ' + dm2[2] + '… ' + Math.round(x * 100) + '%'); } });
      var u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'slideshow-' + slug(g ? g.title : 'galeria') + '-' + (vidEstilo === 'pantalla' ? 'pantalla-' : vidEstilo === 'prisma' ? 'prisma-' : '') + dm2[2] + (vidMarca ? '' : '-sin-logo') + '.mp4'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 60000);
    }
    vidSem = Math.floor(Math.random() * 4e9); vidBarra(1); fin = 'Listo. El video se descargó en tu computadora.';
  } catch(e) { vidBarra(0); fin = e && e.message === 'cancelado' ? 'Cancelado.' : 'No se pudo crear el video: ' + (e && e.message ? e.message : 'error'); }
  vidBusy = false; var b2 = $('#pn-vgen'), c2 = $('#pn-vcan'); if (b2) b2.disabled = false; if (c2) c2.hidden = true;
  if (vista === 'detalle' && tab === 'video') await vidPrepara();
  vidEstado(fin);
}
function fechaCad(g){ return g.expires_at ? String(g.expires_at).slice(0, 10) : ''; }
function pintarDetalle(){
  try { pintarDetalle0(); } catch (e) { console.error(e); var m = document.getElementById('pn-main'); if (m) m.innerHTML = '<div class="pn-card"><h2>No se pudo mostrar esta pestaña</h2><p class="pn-s">' + esc(e && e.message ? e.message : 'error') + '</p></div>'; }
}
function pintarDetalle0(){
  var g = gal(galId); if (!g) { vista = 'galerias'; return pintar(); }
  var sel = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }) : [];
  var fin = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'final'; }) : [];
  var cuerpo = '';
  if (!cur) cuerpo = '<p class="pn-s">Cargando…</p>';
  else if (tab === 'panel') {
    var unicas = {}, cuenta = {}; cur.favs.forEach(function(x){ unicas[x.photo_id] = 1; cuenta[x.photo_id] = (cuenta[x.photo_id] || 0) + 1; });
    var top = sel.slice().sort(function(a, b){ return (cuenta[b.id] || 0) - (cuenta[a.id] || 0); }).slice(0, 5);
    cuerpo = '<div class="pn-franja"><span><i class="pn-dot"></i>' + esc(ESTADOS[g.status] || g.status) + '</span><span>' + (sel.length + fin.length) + ' archivos guardados</span><span>Caducidad: ' + (fechaCad(g) || 'sin caducidad') + '</span></div>' +
      '<div class="pn-cifras"><div><b>' + sel.length + '</b><span class="pn-s">Fotos de selección</span></div><div><b>' + fin.length + '</b><span class="pn-s">Finales</span></div><div><b>' + Object.keys(unicas).length + '</b><span class="pn-s">Favoritas</span></div><div><b>' + cur.vistas + '</b><span class="pn-s">Vistas</span></div></div>' + actividad() +
      '<div class="pn-row">' + (g.status === 'delivered' ? '<button class="pn-btn" data-act="reabrir">Reabrir selección</button><div class="pn-sww"><button type="button" class="pn-swt' + (g.finals_locked ? '' : ' on') + '" role="switch" aria-checked="' + (g.finals_locked ? 'false' : 'true') + '" aria-label="Pago recibido" data-act="bloqueo"><span class="k"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><div><b>' + (g.finals_locked ? 'Con marca de agua' : 'Pago recibido') + '</b><span>' + (g.finals_locked ? 'Finales bloqueadas: tu cliente las ve con marca de agua y no puede descargar' : 'Finales liberadas: tu cliente las ve sin marca de agua y puede descargar') + '</span></div></div>' : '<button class="pn-btn" data-act="entregar">Marcar como entregada</button>') + '</div>' +
      '<p class="pn-s">Al entregar, el cliente puede descargar las fotos finales y ya no puede cambiar sus favoritas.</p>' +
      '<h2 style="margin-top:1.6rem">Fotos principales</h2>' + (top.length ? '<div class="pn-grid">' + top.map(function(x){
        return '<figure class="pn-ph"><img loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"><figcaption>' + esc(x.filename) + (cuenta[x.id] ? ' · ♥ ' + cuenta[x.id] : '') + '</figcaption></figure>';
      }).join('') + '</div>' : '<p class="pn-s">Aún no hay fotos de selección.</p>');
  } else if (tab === 'detalles') {
    var TIPOS = ['Boda', 'Graduación', 'Quinceañera', 'Baby shower', 'Cumpleaños', 'Fiesta infantil', 'Sesión familiar', 'Sesión de retrato', 'Evento corporativo', 'Otro'];
    cuerpo = '<div class="pn-card"><label class="pn-s">Nombre de la galería</label><input type="text" id="pn-dt" value="' + esc(g.title) + '"><label class="pn-s" style="display:block;margin-top:.9rem">Fecha del evento</label><input type="date" id="pn-dd" value="' + esc(g.event_date || '') + '">' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Tipo de galería</label><select id="pn-dtp"><option value="">Sin tipo</option>' + TIPOS.map(function(t){ return '<option' + (g.gallery_type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Ubicación</label><input type="text" id="pn-dub" maxlength="80" value="' + esc(g.location || '') + '">' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Descripción (la ve el cliente bajo el título)</label><textarea id="pn-dde" rows="3" maxlength="300" style="width:100%">' + esc(g.description || '') + '</textarea>' +
      '<div class="pn-row"><button class="pn-btn" data-act="guardar-detalles">Guardar</button></div></div>';
  } else if (tab === 'fotos') {
    cuerpo = '<dialog id="pn-dsub"><h2>Subir fotos</h2><div class="pn-row"><label><input type="radio" name="pn-dest" value="selection" checked> Selección (se reducen según la calidad de Configuración)</label><label><input type="radio" name="pn-dest" value="final"> Finales (originales, hasta 45 MB)</label></div>' +
      (cur.escenas && cur.escenas.length ? '<div class="pn-marcaui"><label class="pn-s" for="pn-esc">Escena de destino</label><select id="pn-esc"><option value="">Sin escena</option>' + cur.escenas.map(function(e){ return '<option value="' + e.id + '"' + (fEsc === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></div>' : '') + '<p class="pn-s pn-marcaui" id="pn-mbox">De cada foto se guardan dos versiones: limpia y con marca de agua. En Configuración eliges cuál ve tu cliente.</p>' +
      '<div class="pn-row"><input type="file" id="pn-file" accept="image/jpeg,image/png,image/webp,image/tiff" multiple><button class="pn-btn" data-act="subir" id="pn-go">Subir</button></div><ul id="pn-prog"></ul><div class="pn-row"><button class="pn-btn sec" data-act="cerrar-subir" type="button">Cancelar</button></div></dialog>' +
      escenasCard(g, sel, fin) + barraSel(sel, fin) + (fImp ? '' : seccionFotos('selection', 'Selección', sel, g)) + seccionFotos('final', 'Finales', fin, g);
  } else if (tab === 'diseno') {
    var cvId = g.cover_photo_id || (sel[0] && sel[0].id), cv = cvId && cur.tk[cvId];
    var cvSrc = cur.cover ? src(cur.cover) : (cv ? src(cv) : '');
    cuerpo = '<div class="pn-card"><h2>Portada</h2><p class="pn-s">Es la imagen con la que tu cliente recibe su galería al abrir el enlace. ' + (g.cover_key ? 'Ahora usa una portada que subiste aparte.' : 'Ahora usa una foto del álbum.') + '</p><div class="pn-portada">' + (cvSrc ? '<img alt="" src="' + esc(cvSrc) + '">' : ilus('admin-sin-portada')) + '</div>' +
      '<div class="pn-row"><button class="pn-btn" data-act="elegir-portada"' + (sel.length ? '' : ' disabled') + '>Elegir de las fotos subidas</button></div>' +
      '<h2 style="margin-top:1.2rem;font-size:1.25rem">Subir una portada distinta</h2><p class="pn-s">Sirve para un diseño o una foto que solo quieres como portada. <b>No aparece en el álbum</b> del cliente.</p>' +
      '<div class="pn-marcaui"><label class="pn-s" for="pn-pm">Marca de agua</label><select id="pn-pm"><option value="no">Sin marca de agua</option><option value="si">Con marca de agua</option></select></div>' +
      '<div class="pn-row"><input type="file" id="pn-pf" accept="image/jpeg,image/png,image/webp"><button class="pn-btn" data-act="subir-portada" id="pn-pg">Subir portada</button>' + (g.cover_key ? '<button class="pn-btn sec" data-act="quitar-portada">Quitar portada subida</button>' : '') + '</div></div>' +
      '<div class="pn-card"><h2>Estilo de la galería</h2><p class="pn-s">Cómo se acomodan las fotos que ve tu cliente.</p><div class="pn-opts">' + ESTILOS.map(function(e){ return '<button class="pn-opt' + ((g.grid_style || 'clasico') === e[0] ? ' on' : '') + '" data-act="estilo" data-v="' + e[0] + '"><b>' + e[1] + '</b><span>' + e[2] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="pn-card"><h2>Paleta de colores</h2><p class="pn-s">Cada paleta tiene versión clara y oscura, y se adapta al modo del dispositivo de tu cliente. “Automática” elige una según el tipo de evento (ahora: ' + esc((PALETAS.filter(function(c){ return c[0] === (PAL_TIPO[g.gallery_type] || 'arena'); })[0] || [])[1] || '') + ').</p><div class="pn-opts">' + PALETAS.map(function(c){ var pa = PAL_VIEJA[g.palette] || g.palette || 'auto'; return '<button class="pn-opt pal' + (pa === c[0] ? ' on' : '') + '" data-act="paleta" data-v="' + c[0] + '"><i style="background:linear-gradient(135deg,' + c[2] + ' 34%,' + c[3] + ' 34% 67%,' + c[4] + ' 67%)"></i><b>' + c[1] + '</b></button>'; }).join('') + '</div></div>';
  } else if (tab === 'config') {
    cuerpo = '<div class="pn-card"><h2>Marca de agua</h2><p class="pn-s">Texto de la marca de agua. Se graba en las fotos que subas a partir de ahora.</p><input type="text" id="pn-wt" maxlength="40" value="' + esc(g.watermark_text || marcaBase()) + '"></div>' +
      '<div class="pn-card"><h2>Fotos de selección y marca de agua</h2><p class="pn-s">Decide si tu cliente ve con marca de agua las fotos donde elige sus favoritas. Por defecto la ve.</p><select id="pn-sw"><option value="1"' + (g.selection_watermark === false ? '' : ' selected') + '>Con marca de agua (recomendado)</option><option value="0"' + (g.selection_watermark === false ? ' selected' : '') + '>Sin marca de agua</option></select><p class="pn-s">Se aplica a las fotos de selección que subas desde ahora. Las que ya subiste antes tienen la marca grabada y para quitarla hay que subirlas de nuevo.</p></div>' +
      '<div class="pn-card"><h2>Calidad de las fotos de selección</h2><p class="pn-s">Tamaño con el que tu cliente ve las fotos que subas a partir de ahora. Más calidad se ve mejor pero pesa más.</p><select id="pn-vq"><option value="baja"' + (g.view_quality === 'baja' ? ' selected' : '') + '>Baja (ligera, 1000 px)</option><option value="media"' + (!g.view_quality || g.view_quality === 'media' ? ' selected' : '') + '>Media (1600 px)</option><option value="alta"' + (g.view_quality === 'alta' ? ' selected' : '') + '>Alta (2400 px)</option></select></div>' +
      '<div class="pn-card"><h2>Fotos finales y pago</h2><p class="pn-s">Controla si tu cliente ve y descarga las finales sin marca de agua. Mientras estén bloqueadas, las ve con marca de agua y no puede descargarlas.</p><select id="pn-fl"><option value="0"' + (g.finals_locked ? '' : ' selected') + '>Liberadas: sin marca de agua y con descarga</option><option value="1"' + (g.finals_locked ? ' selected' : '') + '>Bloqueadas: con marca de agua, sin descarga (hasta recibir el pago)</option></select><p class="pn-s">Las finales que subas desde ahora guardan una vista con marca de agua. Las que ya subiste antes deben subirse de nuevo para poder bloquearse.</p></div>' +
      '<div class="pn-card"><h2>Caducidad</h2><p class="pn-s">Después de esta fecha el cliente ya no podrá abrir la galería. Déjala vacía para que no caduque.</p><input type="date" id="pn-ex" value="' + esc(fechaCad(g)) + '"></div>' +
      '<div class="pn-row"><button class="pn-btn" data-act="guardar-config">Guardar cambios</button></div>' +
      '<div class="pn-card"><h2>Eliminar galería</h2><p class="pn-s">Se borran la galería y todas sus fotos. No se puede deshacer.</p><button class="pn-btn rojo" data-act="eliminar-galeria">Eliminar galería</button></div>';
  } else if (tab === 'video') {
    cuerpo = vidHtml(g, sel, fin);
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
    if (cur.impErr) { cuerpo = '<div class="pn-card"><h2>Falta activar las impresiones</h2><p class="pn-s">La tabla de impresiones todavía no existe en Supabase, por eso los pedidos de tus clientes no se guardan. Abre Supabase → SQL Editor, pega el contenido de <b>etapa4.sql</b> y pulsa Run. Después recarga esta página.</p><p class="pn-s">Detalle técnico: ' + esc(cur.impErr) + '</p></div>'; }
    else {
    var nom2 = {}; cur.fotos.forEach(function(x){ nom2[x.id] = x.filename; });
    var por2 = {}; (cur.imp || []).forEach(function(x){ (por2[x.visitor_token] = por2[x.visitor_token] || []).push(x.photo_id); });
    var vis2 = Object.keys(por2);
    cuerpo = (g.print_sent_at ? '<p class="pn-s">Pedido enviado por el cliente el ' + esc(new Date(g.print_sent_at).toLocaleString('es-GT')) + '.</p>' : '') + (vis2.length ? vis2.map(function(k, i){
      var ids = por2[k].sort(function(a, b){ return String(nom2[a]).localeCompare(String(nom2[b])); });
      var nm = ids.map(function(id){ return nom2[id] || '?'; });
      return '<div class="pn-card"><h2>Cliente ' + (i + 1) + ' · ' + ids.length + (ids.length === 1 ? ' foto' : ' fotos') + ' para imprimir</h2><ul>' + nm.map(function(n){ return '<li>' + esc(n) + '</li>'; }).join('') + '</ul><div class="pn-row"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(nm.join(', ')) + '">Copiar nombres</button></div></div>';
    }).join('') : '<div class="pn-vacio"><p class="pn-s">Todavía nadie ha marcado fotos para imprimir. Aparecen aquí cuando la galería está entregada y el cliente toca «Imprimir» en sus fotos finales.</p></div>');
    }
  } else {
    if (!g.link_token) {
      var bs = new Uint8Array(18); crypto.getRandomValues(bs);
      g.link_token = Array.prototype.map.call(bs, function(x){ return 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]; }).join('');
      db.from('galleries').update({ link_token: g.link_token }).eq('id', g.id).then(function(){});
    }
    var abierto = g.access_mode === 'abierto', urlG = BASEG + g.link_token, urlC = BASE + g.access_code;
    var fila = function(et, v, cod){ return '<p class="pn-s">' + et + '</p><div class="pn-copia"><input type="text" readonly value="' + esc(v) + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(v) + '">Copiar</button><button class="pn-btn sec" data-act="qr" data-t="' + esc(v) + '" data-n="' + esc(g.title) + '">QR</button><button class="pn-btn sec" data-act="wa" data-t="' + esc('Hola, te comparto tu galería de fotos: ' + v + (cod ? '\nCódigo de acceso: ' + cod : '')) + '">WhatsApp</button></div>'; };
    cuerpo = '<div class="pn-card"><h2>Cómo entra tu cliente</h2><div class="pn-opts">' +
      '<button class="pn-opt' + (abierto ? ' on' : '') + '" data-act="modo" data-v="abierto"><b>Enlace sin clave</b><span>Cualquiera que tenga el enlace ve la galería directamente.</span></button>' +
      '<button class="pn-opt' + (abierto ? '' : ' on') + '" data-act="modo" data-v="codigo"><b>Enlace con código</b><span>Debe escribir el código para entrar.</span></button></div></div>' +
      escenasEnlaces(fila) +
      '<div class="pn-card"><h2>' + (abierto ? 'Enlace sin clave' : 'Enlace con código') + '</h2>' +
      (abierto ? '<p class="pn-s">Envía este enlace. Entra directo, sin pedir nada.</p>' + fila('Enlace para el cliente', urlG)
        : '<p class="pn-s">Envía el enlace y el código por separado: el cliente escribe el código al abrirlo.</p>' + fila('Enlace para el cliente', urlG, g.access_code) + '<p class="pn-s">Código de acceso (puedes cambiarlo)</p><div class="pn-copia"><input type="text" id="pn-cod" maxlength="40" value="' + esc(g.access_code) + '"><button class="pn-btn sec" data-act="guardar-codigo">Guardar</button><button class="pn-btn sec" data-act="copiar" data-t="' + esc(g.access_code) + '">Copiar</button></div>' +
          '<details class="pn-s" style="margin-top:.6rem"><summary>Enlace con el código incluido (entra sin escribirlo)</summary>' + fila('Enlace directo con código', urlC) + '</details>') + '</div>';
  }
  $('#pn-main').innerHTML = '<h1>' + esc(TITULOS[tab] || '') + '</h1><div class="pn-sub"><p class="pn-s" style="margin:0">' + esc(g.title) + '</p><span class="pn-pill">' + esc(ESTADOS[g.status] || g.status) + '</span></div><div class="pn-tabs" role="tablist">' + TABS.map(function(t){ return '<button type="button" data-act="tab" data-t="' + t[0] + '"' + (tab === t[0] ? ' class="on" aria-selected="true"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div>' + cuerpo;
  if (cur && tab === 'video') vidIniciar();
  if (cur && (tab === 'config' || tab === 'diseno')) plegar(function(t){ return t === 'Portada' || t === 'Paleta de colores'; });
  else root.querySelectorAll('#pn-main .pn-card > h2 + p.pn-s').forEach(function(x){ x.classList.add('ay'); });
  if (cur && tab === 'fotos') {
    if ($('#pn-marca')) $('#pn-marca').addEventListener('change', mostrarMarca);
    root.querySelectorAll('input[name=pn-dest]').forEach(function(r){ r.addEventListener('change', mostrarMarca); });
    mostrarMarca();
    try { document.fonts.load('300 20px Jost'); } catch(e) {}
  }
}

var MARCA_OPACIDAD = 35, MARCA_TAM = 's';   // media y pequeña (por defecto)
var CALIDAD = { baja: [1000, 0.72], media: [1600, 0.85], alta: [2400, 0.9] };
function reducir(file, marca, cal){
  var qd = CALIDAD[cal] || CALIDAD.media;
  return createImageBitmap(file).then(function(b){
    var k = Math.min(1, qd[0] / Math.max(b.width, b.height)), c = document.createElement('canvas');
    c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
    var cx = c.getContext('2d'); cx.drawImage(b, 0, 0, c.width, c.height);
    if (marca) marcar(cx, c.width, c.height, marca);
    return new Promise(function(r){ c.toBlob(function(bl){ r({ blob: bl, w: c.width, h: c.height }); }, 'image/jpeg', qd[1]); });
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
  return { text: (g && g.watermark_text) || marcaBase(), opacity: MARCA_OPACIDAD, size: MARCA_TAM };
}
function mostrarMarca(){
  var box = $('#pn-mbox'); if (!box) return;
  var fin = root.querySelector('input[name=pn-dest]:checked').value === 'final';
  box.hidden = fin;
}
var ERR = { muy_grande: 'pesa más de 45 MB', formato: 'formato no permitido (usa JPG, PNG, WEBP o TIFF)', sin_sesion: 'tu sesión caducó, vuelve a entrar', registro: 'no se pudo registrar', galeria: 'galería no encontrada' };

// ---------- Cola de subida en segundo plano ----------
var cola = { trabajos: [], activos: 0, total: 0, hechas: 0, fallos: [], gids: {} };
function subiendo(){ return cola.activos > 0 || cola.trabajos.length > 0; }
window.addEventListener('beforeunload', function(e){ if (subiendo()) { e.preventDefault(); e.returnValue = ''; } });
function pintarCola(){
  var el = document.getElementById('pn-up'); if (!el) return;
  if (!cola.total) { el.hidden = true; return; }
  el.hidden = false;
  var fin = !subiendo(), pct = Math.round(cola.hechas / cola.total * 100);
  el.innerHTML = '<div class="pn-up-t"><b>' + (fin ? 'Subida terminada' : 'Subiendo fotos…') + '</b><span>' + cola.hechas + ' de ' + cola.total + '</span></div>' +
    '<div class="pn-up-b"><i style="width:' + pct + '%"></i></div>' +
    (fin ? '' : '<p class="pn-s">Puedes seguir trabajando en el panel. No cierres esta pestaña hasta que termine.</p>') +
    (cola.fallos.length ? '<ul>' + cola.fallos.slice(-5).map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    (fin ? '<button class="pn-btn sec" data-act="cerrar-cola">Cerrar</button>' : '');
}
async function subirUna(t){
  var f = t.file, blob = f, w = null, h = null, nombre = f.name;
  if (f.size > MAX) throw new Error('pesa más de 45 MB');
  if (t.tipo === 'selection') { var r = await reducir(f, t.marca, t.cal); blob = r.blob; w = r.w; h = r.h; nombre = f.name.replace(/\.[^.]+$/, '') + '.jpg'; }
  else { try { var bm = await createImageBitmap(f); w = bm.width; h = bm.height; } catch (e) {} }
  var s = (await db.auth.getSession()).data.session;
  var q = '?gallery=' + t.gid + (t.esc ? '&scene=' + t.esc : '') + '&type=' + t.tipo + '&name=' + encodeURIComponent(nombre) + (w ? '&w=' + w + '&h=' + h : '');
  var res = await fetch(W + '/api/upload' + q, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': blob.type || 'image/jpeg' }, body: blob });
  var d = await res.json().catch(function(){ return {}; });
  if (!d.ok) throw new Error(ERR[d.error] || 'error al subir');
  if (d.photo) {
    var okp = false;
    for (var n = 0; n < 3 && !okp; n++) {
      try {
        var pv = await reducir(f, { text: t.texto || marcaBase(), opacity: MARCA_OPACIDAD, size: MARCA_TAM }, t.tipo === 'selection' ? t.cal : 'media');
        var rp = await fetch(W + '/api/upload-preview?photo=' + d.photo.id, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'image/jpeg' }, body: pv.blob });
        var dp = await rp.json().catch(function(){ return {}; }); okp = !!dp.ok;
      } catch (e) {}
    }
    if (!okp && t.tipo === 'selection') { try { await api('/api/admin/delete-photos', { photos: [d.photo.id] }); } catch (e) {} throw new Error('no se pudo guardar la versión con marca de agua, vuelve a subirla'); }
  }
}
async function correrCola(){
  while (cola.trabajos.length) {
    var t = cola.trabajos.shift(); cola.activos++; pintarCola();
    try { await subirUna(t); cola.gids[t.gid] = 1; }
    catch (e) { cola.fallos.push(t.file.name + ': ' + (e.message || 'error')); }
    cola.activos--; cola.hechas++; pintarCola();
  }
}
async function subirTodo(){
  var files = Array.from($('#pn-file').files); if (!files.length) return;
  var tipo = root.querySelector('input[name=pn-dest]:checked').value, g0 = gal(galId);
  var base = { tipo: tipo, marca: null, gid: galId, cal: (g0 && g0.view_quality) || 'media', texto: g0 && g0.watermark_text, esc: $('#pn-esc') && $('#pn-esc').value ? $('#pn-esc').value : '' };
  if (!subiendo()) { cola.total = 0; cola.hechas = 0; cola.fallos = []; cola.gids = {}; }
  files.forEach(function(f){ cola.trabajos.push(Object.assign({ file: f }, base)); }); cola.total += files.length;
  $('#pn-file').value = ''; try { $('#pn-dsub').close(); } catch (e) {} pintarCola();
  aviso('Subiendo ' + files.length + (files.length === 1 ? ' foto' : ' fotos') + ' en segundo plano. Puedes seguir trabajando.');
  var corriendo = cola.activos;
  var hilos = Math.max(0, 3 - corriendo); var ps = [];
  for (var k = 0; k < hilos; k++) ps.push(correrCola());
  await Promise.all(ps);
  if (!subiendo()) { aviso(cola.fallos.length ? 'Subida terminada con ' + cola.fallos.length + ' error(es).' : 'Subida terminada.'); if (vista === 'detalle' && cola.gids[galId]) await abrirDetalle(galId, true); }
}

function escenasCard(g, sel, fin){
  var es = cur.escenas || [], todas = sel.concat(fin);
  var cuenta = function(id){ return todas.filter(function(x){ return x.scene_id === id; }).length; };
  var filas = es.map(function(e){ return '<div class="pn-fila"><span>' + esc(e.name) + ' · ' + cuenta(e.id) + ' fotos' + (e.hidden ? ' · solo con su enlace' : '') + '</span><span><button class="pn-btn sec" data-act="esc-renombrar" data-id="' + e.id + '">Renombrar</button> <button class="pn-btn sec" data-act="esc-borrar" data-id="' + e.id + '">Eliminar</button></span></div>'; }).join('');
  var opts = '<option value="">Todas las fotos</option><option value="_none"' + (fEsc === '_none' ? ' selected' : '') + '>Sin escena</option>' + es.map(function(e){ return '<option value="' + e.id + '"' + (fEsc === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('');
  return '<div class="pn-card"><h2>Escenas</h2><p class="pn-s">Divide la galería en secciones, por ejemplo una por estudiante. Cada escena tiene su propio enlace (en la pestaña Compartir).</p>' + filas +
    '<div class="pn-row"><input type="text" id="pn-nesc" maxlength="80" placeholder="Nombre de la nueva escena"><button class="pn-btn" data-act="esc-crear">Agregar escena</button></div>' +
    (es.length ? '<div class="pn-row"><label class="pn-s">Ver en esta pantalla</label><select id="pn-fesc">' + opts + '</select></div>' : '') + '</div>';
}
function barraSel(sel, fin){
  var todas = filtrarEsc(sel).concat(filtrarEsc(fin));
  if (!todas.length) return '';
  if (!modoSel) return '<div class="pn-row"><button class="pn-btn" data-act="modo-sel">Seleccionar varias fotos</button><span class="pn-s">Toca el círculo de cualquier foto, o este botón, para eliminar o mover varias a la vez.</span></div>';
  var es = cur.escenas || [];
  return '<div class="pn-barsel"><b>' + marcadas.size + ' seleccionadas</b><button class="pn-btn sec" data-act="sel-todas">Seleccionar todas (' + todas.length + ')</button><button class="pn-btn sec" data-act="sel-ninguna">Quitar selección</button>' +
    (es.length ? '<select id="pn-mv"' + (marcadas.size ? '' : ' disabled') + '><option value="">Mover a escena…</option><option value="_none">Sin escena</option>' + es.map(function(e){ return '<option value="' + e.id + '">' + esc(e.name) + '</option>'; }).join('') + '</select>' : '') +
    '<button class="pn-btn rojo" data-act="borrar-sel"' + (marcadas.size ? '' : ' disabled') + '>Eliminar seleccionadas</button><button class="pn-btn" data-act="modo-sel">Listo</button></div>';
}
function escenasEnlaces(fila){
  var es = cur.escenas || []; if (!es.length) return '';
  return '<div class="pn-card"><h2>Enlaces por escena</h2><p class="pn-s">Cada escena tiene su propio enlace. El cliente que lo abre ve solo las fotos de esa escena.</p>' + es.map(function(e){
    return '<div class="pn-esc"><b>' + esc(e.name) + '</b>' + fila('Enlace', BASES + e.link_token, e.access_mode === 'codigo' ? e.access_code : '') +
      '<div class="pn-row"><select data-escmodo="' + e.id + '"><option value="abierto"' + (e.access_mode === 'abierto' ? ' selected' : '') + '>Sin clave</option><option value="codigo"' + (e.access_mode === 'codigo' ? ' selected' : '') + '>Con código</option></select>' +
      (e.access_mode === 'codigo' ? '<input type="text" id="pn-sc-' + e.id + '" maxlength="40" value="' + esc(e.access_code || '') + '"><button class="pn-btn sec" data-act="esc-codigo" data-id="' + e.id + '">Guardar código</button>' : '') + '</div>' +
      '<label class="pn-s"><input type="checkbox" data-eschid="' + e.id + '"' + (e.hidden ? ' checked' : '') + '> Solo con su enlace (no aparece en la galería principal)</label></div>';
  }).join('') + '</div>';
}
var EXP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
var ORDENES = [['nombre', 'Nombre del archivo'], ['nombre-inv', 'Nombre del archivo (inverso)'], ['carga', 'Tiempo de carga (primero las más antiguas)'], ['carga-inv', 'Tiempo de carga (primero las más recientes)'], ['azar', 'Aleatorio']];
function impCuenta(){ var m = {}; (cur && Array.isArray(cur.imp) ? cur.imp : []).forEach(function(x){ m[x.photo_id] = (m[x.photo_id] || 0) + 1; }); return m; }
function filtrarEsc(l){ var ic = fImp ? impCuenta() : null; return l.filter(function(x){ return (!fEsc || (fEsc === '_none' ? !x.scene_id : x.scene_id === fEsc)) && (!ic || ic[x.id]); }); }
function seccionFotos(tipo, titulo, lista, g){
  lista = filtrarEsc(lista);
  var ic = impCuenta(), nImp = Object.keys(ic).length;
  var ab = abiertas[tipo] || modoSel, mostrar = ab ? lista : lista.slice(0, PRIM), mas = lista.length > PRIM;
  var cab = '<div class="pn-sec"><h2>' + titulo + '</h2><span class="pn-s">' + lista.length + (lista.length === 1 ? ' artículo' : ' artículos') + '</span>' +
    (tipo === 'final' && (nImp || fImp) ? '<button class="pn-btn ' + (fImp ? '' : 'sec') + '" data-act="filtro-imp" type="button">' + ico('impresiones') + ' Para imprimir (' + nImp + ')' + (fImp ? ' ✕' : '') + '</button>' : '') + ' ' + (lista.length > 1 ? '<span class="pn-orden"><label class="pn-s">Clasificar</label><select data-ord="' + tipo + '"><option value="">Elegir orden…</option>' + ORDENES.filter(function(o){ return cur.conFecha || o[0].indexOf('carga') < 0; }).map(function(o){ return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></span>' : '') + '</div>';
  var add = '<button class="pn-add" data-act="abrir-subir" data-tipo="' + tipo + '" type="button"><b>+</b><span>' + (tipo === 'selection' ? 'Subir fotos' : 'Subir finales') + '</span></button>';
  var fig = mostrar.map(function(x){
    var esPort = g.cover_photo_id === x.id;
    return '<figure class="pn-ph' + (esPort ? ' cv' : '') + (marcadas.has(x.id) ? ' mk' : '') + (ic[x.id] ? ' pimp' : '') + '">' + (ic[x.id] ? '<span class="pn-pb" title="Marcada para imprimir">' + ico('impresiones') + (ic[x.id] > 1 ? '<i>' + ic[x.id] + '</i>' : '') + '</span>' : '') + '<span class="pn-ck' + (modoSel ? '' : ' off') + '" data-act="marcar" data-id="' + x.id + '">' + (marcadas.has(x.id) ? '✓' : '') + '</span>' +
      '<img data-act="' + (modoSel ? 'marcar' : 'ver') + '" data-id="' + x.id + '" loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '">' +
      '<figcaption>' + esc(x.filename) + (esPort ? ' · Portada' : '') + (tipo === 'final' ? ' · ' + mb(x.file_size || 0) : '') + '</figcaption>' +
      '<button class="pn-ex" data-act="ver" data-id="' + x.id + '" type="button" aria-label="Ampliar" title="Ampliar">' + EXP + '</button></figure>';
  }).join('');
  var vacio = lista.length ? '' : '<p class="pn-s pn-vacio1">' + (fImp ? 'Ninguna foto final está marcada para imprimir.' : tipo === 'selection' ? 'Aún no hay fotos de selección.' : 'Aún no hay fotos finales.') + '</p>';
  return cab + '<div class="pn-grid sm' + (ab ? '' : ' fr') + '">' + add + fig + '</div>' + vacio +
    (mas ? '<button class="pn-vt" data-act="vertodo" data-tipo="' + tipo + '"><span>' + (ab ? 'Ver menos ⌃' : 'Ver todo ⌄') + '</span></button>' : '');
}
async function ordenar(tipo, modo){
  var lista = cur.fotos.filter(function(x){ return x.photo_type === tipo; });
  var cmpN = function(a, b){ return String(a.filename).localeCompare(String(b.filename), undefined, { numeric: true }); };
  if (modo === 'nombre') lista.sort(cmpN);
  else if (modo === 'nombre-inv') lista.sort(function(a, b){ return cmpN(b, a); });
  else if (modo === 'carga') lista.sort(function(a, b){ return String(a.created_at).localeCompare(String(b.created_at)); });
  else if (modo === 'carga-inv') lista.sort(function(a, b){ return String(b.created_at).localeCompare(String(a.created_at)); });
  else if (modo === 'azar') { for (var i = lista.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = lista[i]; lista[i] = lista[j]; lista[j] = t; } }
  else return;
  aviso('Guardando el orden…');
  var fallo = false;
  for (var k = 0; k < lista.length; k += 15) {
    var rs = await Promise.all(lista.slice(k, k + 15).map(function(x, n){ return db.from('photos').update({ sort_order: (k + n) * 10 }).eq('id', x.id); }));
    rs.forEach(function(r){ if (r.error) fallo = true; });
  }
  if (fallo) return aviso('No se pudo guardar todo el orden. Inténtalo de nuevo.');
  lista.forEach(function(x, n){ x.sort_order = n * 10; });
  cur.fotos.sort(function(a, b){ return (a.sort_order - b.sort_order) || String(a.filename).localeCompare(String(b.filename)); });
  aviso('Orden guardado: así lo verá tu cliente.'); pintar();
}
var BASES = 'https://alexandergeerre.github.io/galeria/cliente.html?s=', fEsc = '', fImp = false, modoSel = false, marcadas = new Set();
var vl = [], vix = 0, abiertas = { selection: false, final: false }, PRIM = 7;
async function mostrarVer(){
  var f = vl[vix]; if (!f) return;
  if (!cur.tk[f.id]) { var t = await firmar([f.id]); Object.assign(cur.tk, t); }
  $('#pn-vimg').src = cur.tk[f.id] ? src(cur.tk[f.id]) : '';
  $('#pn-vnm').textContent = f.filename; $('#pn-vct').textContent = ' · ' + (vix + 1) + ' de ' + vl.length;
  var vpo = $('#pn-vpo'); vpo.hidden = f.photo_type !== 'selection'; vpo.dataset.id = f.id; $('#pn-vdel').dataset.id = f.id;
}
function abrirVer(id){
  var f = cur.fotos.filter(function(x){ return x.id === id; })[0]; if (!f) return;
  vl = cur.fotos.filter(function(x){ return x.photo_type === f.photo_type; });
  vix = vl.indexOf(f); $('#pn-dver').showModal(); mostrarVer();
}
function pasarVer(d){ if (!vl.length) return; vix = (vix + d + vl.length) % vl.length; mostrarVer(); }

async function cambiar(campos, msg){
  var r = await db.from('galleries').update(campos).eq('id', galId);
  if (r.error) { aviso(/selection_watermark/.test(r.error.message || '') ? 'Falta ejecutar etapa9.sql en Supabase (ver instrucciones).' : r.error.message); return; }
  var g = gal(galId); Object.assign(g, campos); aviso(msg); pintar();
}

async function accion(a, el){
  var id = el.dataset.id, g = gal(galId);
  if (a === 'qr') { qrUrl = el.dataset.t; qrNombre = el.dataset.n || 'galeria'; if (!dibujarQR(qrUrl)) return aviso('El enlace es demasiado largo para un QR.'); $('#pn-qt').textContent = 'Código QR · ' + qrNombre; return $('#pn-dqr').showModal(); }
  if (a === 'qr-cerrar') return $('#pn-dqr').close();
  if (a === 'qr-bajar') { $('#pn-qc').toBlob(function(b){ var u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'QR-' + slug(qrNombre) + '.png'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 2000); }); return; }
  if (a === 'cuenta-guardar') return guardarCuenta();
  if (a === 'cuenta-clave') return cambiarClave();
  if (a === 'logo-quitar') { var col = el.dataset.v === 'claro' ? 'logo_para_claro' : 'logo_para_oscuro', cam = {}; cam[col] = null; var rq = await db.from('photographers').update(cam).eq('id', ph.id).select('id'); if (rq.error || !rq.data || !rq.data.length) return aviso(errCuenta(rq.error)); ph[col] = null; aviso('Se volvió al logo por defecto'); pintarLado(); return pintarCuenta(); }
  if (a === 'vid-foto') { var vi2 = vidIds.indexOf(id); if (vi2 >= 0) vidIds.splice(vi2, 1); else vidIds.push(id); vidStop(); return vidRefrescar(); }
  if (a === 'vid-sel') {
    var v0 = el.dataset.v, fl = cur.fotos;
    if (v0 === 'fin') vidIds = fl.filter(function(x){ return x.photo_type === 'final'; }).map(function(x){ return x.id; });
    else if (v0 === 'sel') vidIds = fl.filter(function(x){ return x.photo_type === 'selection'; }).map(function(x){ return x.id; });
    else vidIds = [];
    vidStop(); vidT = 0; return vidRefrescar();
  }
  if (a === 'vid-agregar') return $('#pn-dvp').showModal();
  if (a === 'vid-cerrar') return $('#pn-dvp').close();
  if (a === 'vid-quitar') { vidIds.splice(+el.dataset.i, 1); vidStop(); return vidRefrescar(); }
  if (a === 'vid-estilo') { vidEstilo = el.dataset.v === 'pantalla' ? 'pantalla' : el.dataset.v === 'prisma' ? 'prisma' : 'papel'; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-acento') { vidAcento = vidAcento + 1 >= PAL_PANEL.length ? -1 : vidAcento + 1; vidStop(); return vidRefrescar(); }
  if (a === 'vid-trans') { if (vidEstilo === 'pantalla') vidTrans = { variadas: 'desliza', desliza: 'disuelve', disuelve: 'variadas' }[vidTrans]; else vidTransP = { variadas: 'der', der: 'izq', izq: 'arriba', arriba: 'abajo', abajo: 'variadas' }[vidTransP]; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-marca') { vidMarca = el.dataset.v !== 'no'; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-pest') { vidPest = +el.dataset.v || 0; return vidPestana(); }
  if (a === 'vid-fmt') { vidForm = VFMT[el.dataset.v] ? el.dataset.v : 'v'; vidStop(); return vidRefrescar(); }
  if (a === 'vid-ritmo') { vidSeg = vidSeg === 2.5 ? 1.5 : vidSeg === 1.5 ? 3.5 : 2.5; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-part') { vidPart = !vidPart; vidStop(); return vidRefrescar(); }
  if (a === 'vid-play') return vidPlayToggle();
  if (a === 'vid-gen') return vidGenerar();
  if (a === 'vid-cancel') { vidCancel = true; return vidEstado('Cancelando…'); }
  if (a === 'abrir') return abrirDetalle(id);
  if (a === 'atras') { await cargarGalerias(); vista = 'galerias'; return pintar(); }
  if (a === 'tab') { tab = el.dataset.t; return pintar(); }
  if (a === 'copiar') { copiar(el.dataset.t); el.textContent = 'Copiado'; return; }
  if (a === 'nueva') return $('#pn-dnueva').showModal();
  if (a === 'subir') return subirTodo();
  if (a === 'entregar') { if (confirm('¿Marcar como entregada? El cliente podrá descargar las finales.')) cambiar({ status: 'delivered', selection_enabled: false, downloads_enabled: true }, 'Galería entregada'); return; }
  if (a === 'reabrir') return cambiar({ status: 'selection', selection_enabled: true, downloads_enabled: false }, 'Selección reabierta');
  if (a === 'salir') return window.cerrarSesion();
  if (a === 'pal-panel') { try { localStorage.setItem('pn-pal', el.dataset.v); } catch(e) {} aplicarTema(); return pintar(); }
  if (a === 'tema') { try { localStorage.setItem('pn-tema', el.dataset.t); } catch(e) {} return pintar(); }
  if (a === 'bloqueo') return cambiar({ finals_locked: !g.finals_locked }, g.finals_locked ? 'Fotos liberadas: el cliente ya las ve sin marca de agua' : 'Finales bloqueadas con marca de agua');
  if (a === 'ver') return abrirVer(el.dataset.id);
  if (a === 'cerrar-cola') { cola.total = 0; cola.hechas = 0; cola.fallos = []; return pintarCola(); }
  if (a === 'abrir-subir') { var rd = root.querySelector('input[name=pn-dest][value=' + (el.dataset.tipo === 'final' ? 'final' : 'selection') + ']'); if (rd) { rd.checked = true; mostrarMarca(); } return $('#pn-dsub').showModal(); }
  if (a === 'cerrar-subir') return $('#pn-dsub').close();
  if (a === 'wa') return window.open('https://wa.me/?text=' + encodeURIComponent(el.dataset.t), '_blank');
  if (a === 'modo-sel') { modoSel = !modoSel; marcadas = new Set(); return pintar(); }
  if (a === 'marcar') {
    if (!modoSel) { modoSel = true; marcadas = new Set([id]); return pintar(); }
    if (marcadas.has(id)) marcadas.delete(id); else marcadas.add(id);
    var fg = el.closest('figure'); if (fg) { fg.classList.toggle('mk', marcadas.has(id)); var ck = fg.querySelector('.pn-ck'); if (ck) ck.textContent = marcadas.has(id) ? '✓' : ''; }
    var bc = root.querySelector('.pn-barsel b'); if (bc) bc.textContent = marcadas.size + ' seleccionadas';
    root.querySelectorAll('[data-act=borrar-sel],#pn-mv').forEach(function(x){ x.disabled = !marcadas.size; });
    return;
  }
  if (a === 'sel-todas') { marcadas = new Set(filtrarEsc(cur.fotos).map(function(x){ return x.id; })); return pintar(); }
  if (a === 'filtro-imp') { fImp = !fImp; return pintar(); }
  if (a === 'sel-ninguna') { marcadas = new Set(); return pintar(); }
  if (a === 'borrar-sel') {
    var ids = Array.from(marcadas); if (!ids.length) return;
    if (!confirm('¿Eliminar ' + ids.length + (ids.length === 1 ? ' foto' : ' fotos') + '? No se puede deshacer.')) return;
    aviso('Eliminando…'); var okn = 0;
    for (var i = 0; i < ids.length; i += 100) { var rr = await api('/api/admin/delete-photos', { photos: ids.slice(i, i + 100) }); if (rr.ok) okn += rr.borradas || 0; else break; }
    if (g && ids.indexOf(g.cover_photo_id) >= 0) g.cover_photo_id = null;
    marcadas = new Set(); modoSel = false; aviso(okn + ' eliminadas.'); return abrirDetalle(galId, true);
  }
  if (a === 'esc-crear') {
    var nn = $('#pn-nesc').value.trim(); if (!nn) return aviso('Escribe el nombre de la escena.');
    var rc = await api('/api/admin/scene', { gallery: galId, action: 'create', name: nn }); if (!rc.ok) return aviso('No se pudo crear la escena.');
    cur.escenas.push(rc.escena); aviso('Escena creada'); return pintar();
  }
  if (a === 'esc-renombrar') {
    var ee = cur.escenas.filter(function(x){ return x.id === id; })[0]; var nm = prompt('Nuevo nombre de la escena:', ee ? ee.name : ''); if (!nm || !nm.trim()) return;
    var ru = await api('/api/admin/scene', { gallery: galId, action: 'update', id: id, name: nm.trim() }); if (!ru.ok) return aviso('No se pudo renombrar.');
    ee.name = nm.trim().slice(0, 80); return pintar();
  }
  if (a === 'esc-borrar') {
    if (!confirm('¿Eliminar esta escena? Sus fotos no se borran: quedan sin escena.')) return;
    var rd = await api('/api/admin/scene', { gallery: galId, action: 'delete', id: id }); if (!rd.ok) return aviso('No se pudo eliminar.');
    cur.fotos.forEach(function(x){ if (x.scene_id === id) x.scene_id = null; }); cur.escenas = cur.escenas.filter(function(x){ return x.id !== id; }); if (fEsc === id) fEsc = ''; return pintar();
  }
  if (a === 'esc-codigo') {
    var cd = $('#pn-sc-' + id).value.trim().toUpperCase(); if (!/^[A-Z0-9-]{4,40}$/.test(cd)) return aviso('El código debe tener de 4 a 40 letras, números o guiones.');
    var rk = await api('/api/admin/scene', { gallery: galId, action: 'update', id: id, access_code: cd }); if (!rk.ok) return aviso('No se pudo guardar el código.');
    cur.escenas.filter(function(x){ return x.id === id; })[0].access_code = cd; return aviso('Código guardado');
  }
  if (a === 'vertodo') { abiertas[el.dataset.tipo] = !abiertas[el.dataset.tipo]; return pintar(); }
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
    return cambiar({ watermark_text: tx, expires_at: ex ? ex + 'T23:59:59-06:00' : null, view_quality: $('#pn-vq').value, finals_locked: $('#pn-fl').value === '1', selection_watermark: $('#pn-sw').value !== '0' }, 'Configuración guardada');
  }
  if (a === 'elegir-portada') {
    var s0 = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }) : [];
    $('#pn-gport').innerHTML = s0.map(function(x){ return '<button class="pn-pbtn" data-act="portada" data-id="' + x.id + '"><img loading="lazy" alt="' + esc(x.filename) + '" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"></button>'; }).join('');
    return $('#pn-dport').showModal();
  }
  if (a === 'cerrar-portada') return $('#pn-dport').close();
  if (a === 'subir-portada') {
    var pf = $('#pn-pf').files[0]; if (!pf) return aviso('Elige primero una imagen.');
    var pmarca = $('#pn-pm').value === 'si' ? { text: (g && g.watermark_text) || marcaBase(), opacity: MARCA_OPACIDAD, size: MARCA_TAM } : null;
    var pgo = $('#pn-pg'); pgo.disabled = true; pgo.textContent = 'Subiendo…';
    try {
      var rp = await reducir(pf, pmarca, 'alta'); var ss = (await db.auth.getSession()).data.session;
      var rs = await fetch(W + '/api/admin/cover-upload?gallery=' + galId, { method: 'POST', headers: { Authorization: 'Bearer ' + ss.access_token, 'Content-Type': 'image/jpeg' }, body: rp.blob });
      var dd = await rs.json().catch(function(){ return {}; });
      if (!dd.ok) throw new Error('no se pudo subir');
      g.cover_key = 'x'; if (cur) cur.cover = dd.t; aviso('Portada actualizada');
    } catch (e) { aviso('No se pudo subir la portada: ' + (e.message || 'error')); }
    return pintar();
  }
  if (a === 'quitar-portada') {
    var rq = await api('/api/admin/cover-clear', { gallery: galId }); if (!rq.ok) return aviso('No se pudo quitar.');
    g.cover_key = null; if (cur) cur.cover = null; aviso('Portada subida eliminada'); return pintar();
  }
  if (a === 'portada') {
    if (g && g.cover_key) { await api('/api/admin/cover-clear', { gallery: galId }); g.cover_key = null; if (cur) cur.cover = null; }
    var mn = Math.min.apply(null, (cur ? cur.fotos : []).map(function(x){ return x.sort_order || 0; }).concat([0]));
    var u = await db.from('photos').update({ sort_order: mn - 1 }).eq('id', id);
    if (u.error) return aviso(u.error.message);
    try { $('#pn-dport').close(); $('#pn-dver').close(); } catch(e) {}
    await cambiar({ cover_photo_id: id }, 'Portada actualizada');
    return abrirDetalle(galId, true);
  }
  if (a === 'borrar-foto') {
    if (!confirm('¿Eliminar esta foto? No se puede deshacer.')) return;
    try { $('#pn-dver').close(); } catch(e) {}
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

/* ===== Clientes, Cotizaciones y Agenda ===== */
var neg = { ok: true, clientes: [], cots: [], evs: [], mes: new Date(), cargado: false, cotEd: null, cliEd: null, evEd: null, cotImg: null, cotDis: 1 };
var COT_ST = { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' };
var EV_K = { sesion: 'Sesión', evento: 'Evento', entrega: 'Entrega', otro: 'Otro' };
var TIPOS_EV = ['Boda', 'Graduación', 'Quinceañera', 'Baby shower', 'Cumpleaños', 'Fiesta infantil', 'Sesión familiar', 'Sesión de retrato', 'Evento corporativo', 'Otro'];
function qFmt(n){ return 'Q ' + Number(n || 0).toLocaleString('es-GT', { maximumFractionDigits: 2 }); }
function fFmt(d, o){ if (!d) return ''; var x = typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d); return x.toLocaleDateString('es-GT', o || { day: 'numeric', month: 'long', year: 'numeric' }); }
function hFmt(d){ return new Date(d).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }); }
async function negCargar(forzar){
  if (neg.cargado && !forzar) return;
  var a = await db.from('clients').select('id,name,phone,email,notes,created_at').order('name');
  if (a.error) { var b = await db.from('clients').select('id,name,created_at').order('name'); neg.clientes = (b.data || []); } else neg.clientes = a.data || [];
  var q = await db.from('quotes').select('*').order('created_at', { ascending: false });
  var e = await db.from('events').select('*').order('starts_at');
  neg.ok = !q.error && !e.error;
  neg.cots = q.data || []; neg.evs = e.data || []; neg.cargado = true;
}
function negFalta(){ return '<div class="pn-card"><h2>Falta un paso</h2><p class="pn-s">Para usar esta sección hay que ejecutar <b>etapa10.sql</b> en Supabase (SQL Editor, pegar y Run). Después recarga el panel.</p></div>'; }
function cliPorId(id){ return neg.clientes.filter(function(c){ return c.id === id; })[0]; }
function waLink(tel, txt){ var n = String(tel || '').replace(/\D/g, ''); if (n.length === 8) n = '502' + n; return 'https://wa.me/' + n + (txt ? '?text=' + encodeURIComponent(txt) : ''); }

/* ---------- Clientes ---------- */
async function pintarClientes(){
  $('#pn-main').innerHTML = '<h1>Clientes</h1><p class="pn-s">Cargando…</p>'; await negCargar();
  var q = (busca || '').toLowerCase();
  var l = neg.clientes.filter(function(c){ return !q || (c.name || '').toLowerCase().indexOf(q) >= 0 || (c.phone || '').indexOf(q) >= 0; });
  var filas = l.map(function(c){
    var ng = gals.filter(function(g){ return g.client_id === c.id; }).length, nq = neg.cots.filter(function(x){ return x.client_id === c.id; }).length;
    return '<tr><td><b>' + esc(c.name) + '</b>' + (c.notes ? '<br><span class="pn-s">' + esc(c.notes) + '</span>' : '') + '</td><td>' + esc(c.phone || '—') + '<br><span class="pn-s">' + esc(c.email || '') + '</span></td><td>' + ng + ' gal. · ' + nq + ' cot.</td><td class="pn-ac">' +
      (c.phone ? '<a class="pn-btn sec" target="_blank" rel="noopener" href="' + esc(waLink(c.phone)) + '">WhatsApp</a> ' : '') +
      '<button class="pn-btn sec" data-act="n-cot-nueva" data-id="' + c.id + '">Cotizar</button> <button class="pn-btn sec" data-act="n-cli-edit" data-id="' + c.id + '">Editar</button></td></tr>';
  }).join('');
  $('#pn-main').innerHTML = '<h1>Clientes</h1><div class="pn-row"><input type="text" id="pn-nq" placeholder="Buscar por nombre o teléfono" value="' + esc(busca) + '"><button class="pn-btn" data-act="n-cli-nuevo">+ Nuevo cliente</button></div>' +
    (!neg.ok ? negFalta() : (l.length ? '<div class="pn-card" style="padding:0;overflow:auto"><table class="pn-tb"><tr><th>Cliente</th><th>Contacto</th><th>Historial</th><th></th></tr>' + filas + '</table></div>' : '<div class="pn-card"><p class="pn-s">Aún no hay clientes. Se crean solos al hacer una galería, o agrégalos aquí.</p></div>'));
  var s = $('#pn-nq'); if (s) s.addEventListener('input', function(e){ busca = e.target.value; clearTimeout(s._t); s._t = setTimeout(pintarClientes, 250); });
}
function cliAbrir(id){
  neg.cliEd = id || null; var c = id ? cliPorId(id) : {};
  $('#n-cn').value = c.name || ''; $('#n-ct').value = c.phone || ''; $('#n-ce').value = c.email || ''; $('#n-cno').value = c.notes || '';
  $('#n-cdel').hidden = !id; $('#n-dcli').showModal();
}
async function cliGuardar(e){
  e.preventDefault(); var d = { name: $('#n-cn').value.trim(), phone: $('#n-ct').value.trim() || null, email: $('#n-ce').value.trim() || null, notes: $('#n-cno').value.trim() || null };
  if (!d.name) return aviso('Escribe el nombre del cliente.');
  var r = neg.cliEd ? await db.from('clients').update(d).eq('id', neg.cliEd) : await db.from('clients').insert(Object.assign({ photographer_id: ph.id }, d));
  if (r.error) return aviso(r.error.message);
  $('#n-dcli').close(); await negCargar(true); aviso('Cliente guardado'); pintar();
}

/* ---------- Cotizaciones ---------- */
async function pintarCotiz(){
  $('#pn-main').innerHTML = '<h1>Cotizaciones</h1><p class="pn-s">Cargando…</p>'; await negCargar();
  var sum = { sent: 0, accepted: 0 }; neg.cots.forEach(function(c){ if (c.status === 'sent') sum.sent += Number(c.total); if (c.status === 'accepted') sum.accepted += Number(c.total); });
  var filas = neg.cots.map(function(c){
    return '<tr><td><b>N.º ' + String(c.num).padStart(4, '0') + '</b><br><span class="pn-s">' + esc(fFmt(c.created_at, { day: 'numeric', month: 'short' })) + '</span></td><td><b>' + esc(c.client_name) + '</b><br><span class="pn-s">' + esc([c.event_type, c.event_date ? fFmt(c.event_date) : ''].filter(Boolean).join(' · ')) + '</span></td><td>' + c.digital_count + ' digitales' + (c.print_count ? ' · ' + c.print_count + ' impresas' : '') + '</td><td><b>' + qFmt(c.total) + '</b></td><td><span class="pn-pill">' + esc(COT_ST[c.status] || c.status) + '</span></td><td class="pn-ac"><button class="pn-btn sec" data-act="n-cot-ver" data-id="' + c.id + '">Abrir</button></td></tr>';
  }).join('');
  $('#pn-main').innerHTML = '<h1>Cotizaciones</h1><div class="pn-row"><button class="pn-btn" data-act="n-cot-nueva">+ Nueva cotización</button></div>' +
    (!neg.ok ? negFalta() : '<div class="pn-cifras"><div><b>' + neg.cots.length + '</b><span class="pn-s">Cotizaciones</span></div><div><b>' + qFmt(sum.sent) + '</b><span class="pn-s">Enviadas, por responder</span></div><div><b>' + qFmt(sum.accepted) + '</b><span class="pn-s">Aceptadas</span></div></div>' +
    (neg.cots.length ? '<div class="pn-card" style="padding:0;overflow:auto;margin-top:1rem"><table class="pn-tb"><tr><th>N.º</th><th>Cliente</th><th>Incluye</th><th>Total</th><th>Estado</th><th></th></tr>' + filas + '</table></div>' : '<div class="pn-card" style="margin-top:1rem"><p class="pn-s">Todavía no hay cotizaciones. Crea la primera y obtén una imagen lista para enviar por WhatsApp.</p></div>'));
}
function cotAbrir(id, clienteId){
  var c = id ? neg.cots.filter(function(x){ return x.id === id; })[0] : null; neg.cotEd = id || null; var cl = clienteId ? cliPorId(clienteId) : null;
  $('#n-qcl').innerHTML = '<option value="">— Cliente nuevo o sin ficha —</option>' + neg.clientes.map(function(x){ return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
  $('#n-qcl').value = c ? (c.client_id || '') : (cl ? cl.id : '');
  $('#n-qnm').value = c ? c.client_name : (cl ? cl.name : '');
  $('#n-qtp').innerHTML = TIPOS_EV.map(function(t){ return '<option>' + t + '</option>'; }).join(''); $('#n-qtp').value = c && c.event_type ? c.event_type : 'Boda';
  $('#n-qfe').value = c ? (c.event_date || '') : ''; $('#n-qlu').value = c ? (c.location || '') : '';
  $('#n-qdg').value = c ? c.digital_count : 40; $('#n-qim').value = c ? c.print_count : 0; $('#n-qto').value = c ? c.total : ''; $('#n-qva').value = c ? c.valid_days : 7;
  $('#n-qdel').hidden = !c; $('#n-dcot').showModal();
}
async function cotGuardar(e){
  e.preventDefault();
  var d = { client_id: $('#n-qcl').value || null, client_name: $('#n-qnm').value.trim(), event_type: $('#n-qtp').value, event_date: $('#n-qfe').value || null, location: $('#n-qlu').value.trim() || null,
    digital_count: parseInt($('#n-qdg').value, 10) || 0, print_count: parseInt($('#n-qim').value, 10) || 0, total: parseFloat($('#n-qto').value) || 0, valid_days: parseInt($('#n-qva').value, 10) || 7 };
  if (!d.client_name) return aviso('Escribe el nombre del cliente.');
  var r = neg.cotEd ? await db.from('quotes').update(d).eq('id', neg.cotEd).select('id').single() : await db.from('quotes').insert(Object.assign({ photographer_id: ph.id }, d)).select('id').single();
  if (r.error) return aviso(r.error.message);
  $('#n-dcot').close(); await negCargar(true); aviso('Cotización guardada'); vista = 'cotiz'; pintar(); cotVer(r.data.id);
}
function cotTexto(c){
  var n = ph.studio_name || 'Alexander Ge Erre';
  return 'Hola ' + c.client_name + ' 👋 Te comparto tu cotización de ' + n + '.\n\n' + (c.event_type ? c.event_type + (c.event_date ? ' · ' + fFmt(c.event_date) : '') + '\n' : '') + (c.location ? c.location + '\n' : '') +
    '📸 ' + c.digital_count + ' fotografías digitales\n' + (c.print_count ? '🖼️ ' + c.print_count + ' fotografías impresas\n' : '') + '\n💰 Total: ' + qFmt(c.total) + '\nVálida por ' + c.valid_days + ' días.\n\n¿Te la reservo?';
}
function cotVer(id){
  var c = neg.cots.filter(function(x){ return x.id === id; })[0]; if (!c) return; neg.cotImg = c; neg.cotDis = c.design || 1;
  $('#n-vti').textContent = 'Cotización N.º ' + String(c.num).padStart(4, '0') + ' · ' + c.client_name;
  $('#n-vst').value = c.status; cotDibujar(); $('#n-dver').showModal();
}
function cotDibujar(){
  var cv = $('#n-vcv'), c = neg.cotImg; if (!cv || !c) return;
  cotLienzo(cv, c, neg.cotDis);
  if (document.fonts) Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'), document.fonts.load('300 30px Jost')]).then(function(){ var d = $('#n-dver'); if (d && d.open && neg.cotImg) cotLienzo($('#n-vcv'), neg.cotImg, neg.cotDis); }).catch(function(){});
  root.querySelectorAll('[data-act=n-cot-dis]').forEach(function(b){ b.classList.toggle('on', +b.dataset.d === neg.cotDis); });
}
function cotLienzo(cv, c, dis){
  var W = 1080, H = 1350; cv.width = W; cv.height = H; var x = cv.getContext('2d');
  var oscuro = dis === 3, bg = oscuro ? '#14110e' : (dis === 2 ? '#FFFFFF' : '#F6EFE3'), tx = oscuro ? '#F2EFEA' : '#1c1a17', mu = oscuro ? '#a99f8f' : '#7b7366', or = '#B8946A';
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  var SER = '"Cormorant Garamond", Georgia, serif', SAN = 'Jost, Inter, Arial, sans-serif';
  function t(s, px, py, font, col, al, sp){ x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; try { x.letterSpacing = (sp || 0) + 'px'; } catch (e) {} x.fillText(s, px, py); try { x.letterSpacing = '0px'; } catch (e) {} }
  function fit(s, px, py, size, col, al, maxw, fam){ var f = size; x.font = '500 ' + f + 'px ' + fam; while (x.measureText(s).width > maxw && f > 28) { f -= 2; x.font = '500 ' + f + 'px ' + fam; } t(s, px, py, '500 ' + f + 'px ' + fam, col, al); }
  var estudio = (ph.studio_name || 'Alexander Ge Erre'), fecha = c.event_date ? fFmt(c.event_date) : '';
  var linea = [c.event_type, fecha].filter(Boolean).join(' · ');
  if (dis === 2) {
    x.fillStyle = tx; x.fillRect(80, 150, W - 160, 2);
    t(estudio.toUpperCase(), 80, 110, '400 26px ' + SAN, tx, 'left', 8); t('Cotización N.º ' + String(c.num).padStart(4, '0'), W - 80, 110, '400 26px ' + SAN, mu, 'right', 2);
    t('Tu cotización', 80, 300, '400 34px ' + SAN, or, 'left', 6);
    fit('Preparada para ' + c.client_name, 80, 400, 76, tx, 'left', W - 160, SER);
    t(linea, 80, 470, '300 34px ' + SAN, mu, 'left'); if (c.location) t(c.location, 80, 520, '300 34px ' + SAN, mu, 'left');
    x.fillStyle = tx; x.fillRect(80, 600, W - 160, 2);
    t(String(c.digital_count), 80, 820, '500 200px ' + SER, tx, 'left'); t('fotografías digitales', 80, 880, '300 34px ' + SAN, mu, 'left');
    if (c.print_count) { t(String(c.print_count), 600, 820, '500 200px ' + SER, tx, 'left'); t('fotografías impresas', 600, 880, '300 34px ' + SAN, mu, 'left'); }
    x.fillRect(80, 980, W - 160, 2);
    t('TOTAL', 80, 1110, '400 34px ' + SAN, mu, 'left', 8); t(qFmt(c.total), W - 80, 1120, '500 130px ' + SER, or, 'right');
    t('Válida por ' + c.valid_days + ' días', 80, 1250, '300 30px ' + SAN, mu, 'left');
  } else {
    t(estudio, W / 2, 190, '500 78px ' + SER, oscuro ? or : tx, 'center'); t('FOTOGRAFÍA Y VIDEOGRAFÍA PROFESIONAL', W / 2, 245, '400 24px ' + SAN, mu, 'center', 6);
    x.fillStyle = or; x.fillRect(W / 2 - 40, 290, 80, 3);
    t('Cotización para', W / 2, 400, '300 36px ' + SAN, mu, 'center', 2);
    fit(c.client_name, W / 2, 500, 96, tx, 'center', W - 160, SER);
    t(linea, W / 2, 580, '300 34px ' + SAN, mu, 'center'); if (c.location) t(c.location, W / 2, 630, '300 34px ' + SAN, mu, 'center');
    var cols = c.print_count ? 2 : 1, cw = c.print_count ? 360 : 0, cx0 = W / 2 - (cols === 2 ? cw / 2 + 60 : 0);
    t(String(c.digital_count), cx0, 830, '500 190px ' + SER, tx, 'center'); t('digitales', cx0, 890, '300 34px ' + SAN, mu, 'center');
    if (c.print_count) { t(String(c.print_count), W / 2 + cw / 2 + 60, 830, '500 190px ' + SER, tx, 'center'); t('impresas', W / 2 + cw / 2 + 60, 890, '300 34px ' + SAN, mu, 'center'); }
    t('T O T A L', W / 2, 1010, '400 28px ' + SAN, mu, 'center', 4); t(qFmt(c.total), W / 2, 1130, '500 140px ' + SER, or, 'center');
    t('Válida por ' + c.valid_days + ' días', W / 2, 1250, '300 30px ' + SAN, mu, 'center');
  }
}
async function cotAccion(a, el){
  var c = neg.cotImg;
  if (a === 'n-cot-dis') { neg.cotDis = +el.dataset.d; cotDibujar(); if (c) db.from('quotes').update({ design: neg.cotDis }).eq('id', c.id).then(function(){ c.design = neg.cotDis; }); return; }
  if (a === 'n-cot-png') { var cv = $('#n-vcv'), l = document.createElement('a'); l.download = 'cotizacion-' + slug(c.client_name) + '.png'; l.href = cv.toDataURL('image/png'); l.click(); return; }
  if (a === 'n-cot-txt') { copiar(cotTexto(c)); return aviso('Mensaje copiado. Pégalo en WhatsApp.'); }
  if (a === 'n-cot-wa') { var cl = c.client_id ? cliPorId(c.client_id) : null; window.open(cl && cl.phone ? waLink(cl.phone, cotTexto(c)) : 'https://wa.me/?text=' + encodeURIComponent(cotTexto(c)), '_blank'); return; }
  if (a === 'n-cot-edit') { $('#n-dver').close(); return cotAbrir(c.id); }
  if (a === 'n-cot-agenda') { if (!c.event_date) return aviso('Pon la fecha del evento en la cotización.'); $('#n-dver').close(); return evAbrir(null, { title: c.event_type + ' · ' + c.client_name, fecha: c.event_date, lugar: c.location, client: c.client_id, kind: 'evento' }); }
  if (a === 'n-cot-del') { if (!confirm('¿Eliminar esta cotización?')) return; var r = await db.from('quotes').delete().eq('id', c.id); if (r.error) return aviso(r.error.message); $('#n-dver').close(); await negCargar(true); pintar(); return aviso('Cotización eliminada'); }
}

/* ---------- Agenda ---------- */
function pad(n){ return String(n).padStart(2, '0'); }
function dKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
async function pintarAgenda(){
  $('#pn-main').innerHTML = '<h1>Agenda</h1><p class="pn-s">Cargando…</p>'; await negCargar();
  var m = neg.mes, y = m.getFullYear(), mo = m.getMonth(), prim = new Date(y, mo, 1), off = (prim.getDay() + 6) % 7, dias = new Date(y, mo + 1, 0).getDate(), hoy = dKey(new Date());
  var porDia = {}; neg.evs.forEach(function(e){ var k = dKey(new Date(e.starts_at)); (porDia[k] = porDia[k] || []).push(e); });
  var cel = ''; for (var i = 0; i < off; i++) cel += '<div class="dy vac"></div>';
  for (var d = 1; d <= dias; d++) { var k = y + '-' + pad(mo + 1) + '-' + pad(d); cel += '<div class="dy' + (k === hoy ? ' hoy' : '') + '"><span>' + d + '</span>' + (porDia[k] || []).map(function(e){ return '<button data-act="n-ev-edit" data-id="' + e.id + '" class="ev k-' + e.kind + '">' + esc(hFmt(e.starts_at)) + ' ' + esc(e.title) + '</button>'; }).join('') + '</div>'; }
  var prox = neg.evs.filter(function(e){ return new Date(e.starts_at) >= new Date(new Date().toDateString()); }).slice(0, 6);
  $('#pn-main').innerHTML = '<h1>Agenda</h1><div class="pn-row"><button class="pn-btn" data-act="n-ev-nuevo">+ Nuevo evento</button><button class="pn-btn sec" data-act="n-ics-todo">Descargar agenda (.ics)</button></div>' +
    (!neg.ok ? negFalta() : '<div class="pn-mes"><button class="pn-btn sec" data-act="n-mes" data-d="-1">‹</button><b>' + esc(m.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' }).replace(/^./, function(c){ return c.toUpperCase(); })) + '</b><button class="pn-btn sec" data-act="n-mes" data-d="1">›</button></div>' +
    '<div class="pn-cal"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>' + cel + '</div>' +
    '<h2>Próximos</h2><div class="pn-card">' + (prox.length ? prox.map(function(e){ return '<p><b>' + esc(fFmt(e.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + esc(hFmt(e.starts_at)) + '</b> — ' + esc(e.title) + (e.location ? ' <span class="pn-s">(' + esc(e.location) + ')</span>' : '') + ' <button class="pn-btn sec" data-act="n-ics-uno" data-id="' + e.id + '">.ics</button></p>'; }).join('') : '<p class="pn-s">No hay eventos próximos.</p>') + '</div>');
}
function evAbrir(id, pre){
  neg.evEd = id || null; var e = id ? neg.evs.filter(function(x){ return x.id === id; })[0] : null; pre = pre || {};
  $('#n-ecl').innerHTML = '<option value="">— Sin cliente —</option>' + neg.clientes.map(function(x){ return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
  $('#n-eti').value = e ? e.title : (pre.title || ''); $('#n-eki').value = e ? e.kind : (pre.kind || 'evento'); $('#n-ecl').value = e ? (e.client_id || '') : (pre.client || '');
  var s = e ? new Date(e.starts_at) : (pre.fecha ? new Date(pre.fecha + 'T09:00:00') : new Date(new Date().setHours(9, 0, 0, 0)));
  $('#n-efe').value = dKey(s); $('#n-eho').value = pad(s.getHours()) + ':' + pad(s.getMinutes());
  $('#n-edu').value = e && e.ends_at ? Math.round((new Date(e.ends_at) - new Date(e.starts_at)) / 3600000 * 10) / 10 : 2;
  $('#n-elu').value = e ? (e.location || '') : (pre.lugar || ''); $('#n-eno').value = e ? (e.notes || '') : '';
  $('#n-edel').hidden = !e; $('#n-ics1').hidden = !e; $('#n-dev').showModal();
}
async function evGuardar(e){
  e.preventDefault(); var ini = new Date($('#n-efe').value + 'T' + ($('#n-eho').value || '09:00') + ':00'); if (isNaN(ini)) return aviso('Revisa la fecha y la hora.');
  var dur = parseFloat($('#n-edu').value) || 0;
  var d = { title: $('#n-eti').value.trim(), kind: $('#n-eki').value, client_id: $('#n-ecl').value || null, starts_at: ini.toISOString(), ends_at: dur ? new Date(ini.getTime() + dur * 3600000).toISOString() : null, location: $('#n-elu').value.trim() || null, notes: $('#n-eno').value.trim() || null };
  if (!d.title) return aviso('Escribe un título.');
  var r = neg.evEd ? await db.from('events').update(d).eq('id', neg.evEd) : await db.from('events').insert(Object.assign({ photographer_id: ph.id }, d));
  if (r.error) return aviso(r.error.message);
  $('#n-dev').close(); neg.mes = new Date(ini.getFullYear(), ini.getMonth(), 1); await negCargar(true); aviso('Evento guardado'); pintar();
}
function icsFecha(d){ var x = new Date(d); return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()) + 'T' + pad(x.getUTCHours()) + pad(x.getUTCMinutes()) + '00Z'; }
function icsTxt(s){ return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function icsDe(lista){
  var o = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Alexander Ge Erre//Agenda//ES', 'CALSCALE:GREGORIAN'];
  lista.forEach(function(e){ var fin = e.ends_at || new Date(new Date(e.starts_at).getTime() + 7200000).toISOString(); o.push('BEGIN:VEVENT', 'UID:' + e.id + '@alexandergeerre', 'DTSTAMP:' + icsFecha(new Date()), 'DTSTART:' + icsFecha(e.starts_at), 'DTEND:' + icsFecha(fin), 'SUMMARY:' + icsTxt(e.title), e.location ? 'LOCATION:' + icsTxt(e.location) : '', e.notes ? 'DESCRIPTION:' + icsTxt(e.notes) : '', 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsTxt(e.title), 'END:VALARM', 'END:VEVENT'); });
  o.push('END:VCALENDAR'); return o.filter(Boolean).join('\r\n');
}
function icsBajar(lista, nombre){ var b = new Blob([icsDe(lista)], { type: 'text/calendar;charset=utf-8' }), l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = nombre + '.ics'; l.click(); setTimeout(function(){ URL.revokeObjectURL(l.href); }, 4000); }

/* ---------- Inicio: próximos y pendientes ---------- */
async function negInicio(){
  await negCargar(); if (!neg.ok) return '';
  var prox = neg.evs.filter(function(e){ return new Date(e.starts_at) >= new Date(new Date().toDateString()); }).slice(0, 3);
  var pend = neg.cots.filter(function(c){ return c.status === 'sent'; });
  return '<h2>Tu agenda y cotizaciones</h2><div class="pn-dos"><div class="pn-card"><h3>Próximos eventos</h3>' + (prox.length ? prox.map(function(e){ return '<p><b>' + esc(fFmt(e.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })) + ' · ' + esc(hFmt(e.starts_at)) + '</b><br>' + esc(e.title) + '</p>'; }).join('') : '<p class="pn-s">Nada agendado.</p>') + '<button class="pn-btn sec" data-act="n-ir" data-v="agenda">Ver agenda</button></div><div class="pn-card"><h3>Cotizaciones por responder</h3>' + (pend.length ? pend.slice(0, 3).map(function(c){ return '<p><b>' + esc(c.client_name) + '</b> · ' + qFmt(c.total) + '</p>'; }).join('') : '<p class="pn-s">No hay cotizaciones pendientes.</p>') + '<button class="pn-btn sec" data-act="n-ir" data-v="cotiz">Ver cotizaciones</button></div></div>';
}

/* ---------- Acciones y formularios ---------- */
function negAccion(a, el){
  if (a === 'n-ir') { vista = el.dataset.v; return pintar(); }
  if (a === 'n-cli-nuevo') return cliAbrir(null);
  if (a === 'n-cli-edit') return cliAbrir(el.dataset.id);
  if (a === 'n-cot-nueva') return cotAbrir(null, el.dataset.id || null);
  if (a === 'n-cot-ver') return cotVer(el.dataset.id);
  if (a === 'n-ev-nuevo') return evAbrir(null);
  if (a === 'n-ev-edit') return evAbrir(el.dataset.id);
  if (a === 'n-mes') { neg.mes = new Date(neg.mes.getFullYear(), neg.mes.getMonth() + (+el.dataset.d), 1); return pintarAgenda(); }
  if (a === 'n-ics-todo') { var l = neg.evs.filter(function(e){ return new Date(e.starts_at) >= new Date(new Date().toDateString()); }); if (!l.length) return aviso('No hay eventos próximos.'); return icsBajar(l, 'agenda-alexander'); }
  if (a === 'n-ics-uno') { var e1 = neg.evs.filter(function(x){ return x.id === el.dataset.id; })[0]; if (e1) icsBajar([e1], 'evento-' + slug(e1.title)); return; }
  if (a === 'n-ics-este') { var e2 = neg.evs.filter(function(x){ return x.id === neg.evEd; })[0]; if (e2) icsBajar([e2], 'evento-' + slug(e2.title)); return; }
  if (a === 'n-cli-del') { if (!confirm('¿Eliminar este cliente? Sus galerías no se borran.')) return; return db.from('clients').delete().eq('id', neg.cliEd).then(async function(r){ if (r.error) return aviso(r.error.message); $('#n-dcli').close(); await negCargar(true); pintar(); }); }
  if (a === 'n-ev-del') { if (!confirm('¿Eliminar este evento?')) return; return db.from('events').delete().eq('id', neg.evEd).then(async function(r){ if (r.error) return aviso(r.error.message); $('#n-dev').close(); await negCargar(true); pintar(); }); }
  if (a === 'n-qdel') { if (!confirm('¿Eliminar esta cotización?')) return; return db.from('quotes').delete().eq('id', neg.cotEd).then(async function(r){ if (r.error) return aviso(r.error.message); $('#n-dcot').close(); await negCargar(true); pintar(); }); }
  if (a === 'n-cerrar') { var dg = el.closest('dialog'); if (dg) dg.close(); return; }
  if (a.indexOf('n-cot-') === 0) return cotAccion(a, el);
}
function negHtml(){
  var F = function(id, t, ty, ex){ return '<label class="pn-s" for="' + id + '" style="display:block;margin-top:.6rem">' + t + '</label><input type="' + (ty || 'text') + '" id="' + id + '" ' + (ex || '') + '>'; };
  return '<dialog id="n-dcli"><h2>Cliente</h2><form id="n-fcli">' + F('n-cn', 'Nombre', 'text', 'maxlength="80"') + F('n-ct', 'Teléfono / WhatsApp', 'tel', 'maxlength="30"') + F('n-ce', 'Correo', 'email', 'maxlength="80"') + '<label class="pn-s" for="n-cno" style="display:block;margin-top:.6rem">Notas</label><textarea id="n-cno" rows="3" maxlength="300" style="width:100%"></textarea><div class="pn-row"><button class="pn-btn" type="submit">Guardar</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button><button class="pn-btn sec" type="button" id="n-cdel" data-act="n-cli-del" hidden>Eliminar</button></div></form></dialog>' +
    '<dialog id="n-dcot"><h2>Cotización</h2><form id="n-fcot"><label class="pn-s" for="n-qcl" style="display:block">Cliente</label><select id="n-qcl"></select>' + F('n-qnm', 'Nombre que aparece en la cotización', 'text', 'maxlength="80"') + '<label class="pn-s" for="n-qtp" style="display:block;margin-top:.6rem">Tipo de evento</label><select id="n-qtp"></select>' + F('n-qfe', 'Fecha del evento', 'date') + F('n-qlu', 'Lugar', 'text', 'maxlength="80"') +
    '<div class="pn-dos">' + '<div>' + F('n-qdg', 'Fotografías digitales', 'number', 'min="0"') + '</div><div>' + F('n-qim', 'Fotografías impresas', 'number', 'min="0"') + '</div></div><div class="pn-dos"><div>' + F('n-qto', 'Total (Q)', 'number', 'min="0" step="0.01"') + '</div><div>' + F('n-qva', 'Válida (días)', 'number', 'min="1"') + '</div></div><p class="pn-s">El cliente solo ve cantidades y el total; tus costos no aparecen.</p><div class="pn-row"><button class="pn-btn" type="submit">Guardar y ver imagen</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button><button class="pn-btn sec" type="button" id="n-qdel" data-act="n-qdel" hidden>Eliminar</button></div></form></dialog>' +
    '<dialog id="n-dver" style="width:min(46rem,96vw)"><h2 id="n-vti"></h2><div class="pn-nvr"><canvas id="n-vcv" style="width:100%;max-width:340px;border-radius:10px;border:1px solid var(--l)"></canvas><div><p class="pn-s">Diseño</p><div class="pn-row"><button class="pn-btn sec" data-act="n-cot-dis" data-d="1">Clásica</button><button class="pn-btn sec" data-act="n-cot-dis" data-d="2">Editorial</button><button class="pn-btn sec" data-act="n-cot-dis" data-d="3">Oscura</button></div><p class="pn-s">Estado</p><select id="n-vst"><option value="draft">Borrador</option><option value="sent">Enviada</option><option value="accepted">Aceptada</option><option value="rejected">Rechazada</option></select>' +
    '<div class="pn-col" style="margin-top:1rem"><button class="pn-btn" data-act="n-cot-png">Descargar imagen (WhatsApp)</button><button class="pn-btn sec" data-act="n-cot-wa">Abrir WhatsApp con mensaje</button><button class="pn-btn sec" data-act="n-cot-txt">Copiar mensaje</button><button class="pn-btn sec" data-act="n-cot-agenda">Agendar el evento</button><button class="pn-btn sec" data-act="n-cot-edit">Editar datos</button><button class="pn-btn sec" data-act="n-cot-del">Eliminar</button><button class="pn-btn sec" data-act="n-cerrar">Cerrar</button></div></div></div></dialog>' +
    '<dialog id="n-dev"><h2>Evento</h2><form id="n-fev">' + F('n-eti', 'Título', 'text', 'maxlength="100"') + '<label class="pn-s" for="n-eki" style="display:block;margin-top:.6rem">Tipo</label><select id="n-eki"><option value="evento">Evento</option><option value="sesion">Sesión</option><option value="entrega">Entrega</option><option value="otro">Otro</option></select><label class="pn-s" for="n-ecl" style="display:block;margin-top:.6rem">Cliente</label><select id="n-ecl"></select><div class="pn-dos"><div>' + F('n-efe', 'Fecha', 'date') + '</div><div>' + F('n-eho', 'Hora', 'time') + '</div></div>' + F('n-edu', 'Duración (horas)', 'number', 'min="0" step="0.5"') + F('n-elu', 'Lugar', 'text', 'maxlength="100"') + '<label class="pn-s" for="n-eno" style="display:block;margin-top:.6rem">Notas</label><textarea id="n-eno" rows="2" maxlength="300" style="width:100%"></textarea><div class="pn-row"><button class="pn-btn" type="submit">Guardar</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button><button class="pn-btn sec" type="button" id="n-ics1" data-act="n-ics-este" hidden>Agregar a mi calendario (.ics)</button><button class="pn-btn sec" type="button" id="n-edel" data-act="n-ev-del" hidden>Eliminar</button></div></form></dialog>';
}
function negIniciar(){
  root.querySelector('.pn').insertAdjacentHTML('beforeend', negHtml());
  root.addEventListener('click', function(e){ var a = e.target.closest('[data-act^="n-"]'); if (a) negAccion(a.dataset.act, a); });
  root.addEventListener('submit', function(e){ if (e.target.id === 'n-fcli') cliGuardar(e); else if (e.target.id === 'n-fcot') cotGuardar(e); else if (e.target.id === 'n-fev') evGuardar(e); });
  root.addEventListener('change', async function(e){ if (e.target.id === 'n-vst' && neg.cotImg) { var r = await db.from('quotes').update({ status: e.target.value }).eq('id', neg.cotImg.id); if (r.error) return aviso(r.error.message); neg.cotImg.status = e.target.value; aviso('Estado actualizado'); } });
  root.addEventListener('close', function(e){ if (e.target.id === 'n-dver' && (vista === 'cotiz')) negCargar(true).then(pintarCotiz); }, true);
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
    r = await db.from('galleries').insert({ photographer_id: ph.id, client_id: cid, title: titulo, slug: slug(titulo) + '-' + codigo().slice(0, 4).toLowerCase(), access_code: codigo(), event_date: fecha, status: 'selection', selection_enabled: true, downloads_enabled: false, watermark_text: marcaBase(), watermark_opacity: 35 }).select('id').single();
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
  root.innerHTML = '<div class="pn"><aside></aside><main id="pn-main"><div class="pn-skel w1"></div><div class="pn-skel"></div><div class="pn-skel h2"></div></main>' +
    '<dialog id="pn-dnueva"><h2>Nueva galería</h2><form id="pn-fn"><input type="text" id="pn-cn" placeholder="Cliente (ej. Ana y Luis)"><input type="text" id="pn-ct" placeholder="Nombre de la galería (ej. Boda Ana y Luis)"><input type="date" id="pn-cf"><div class="pn-row"><button class="pn-btn" type="submit">Crear</button><button class="pn-btn sec" type="button" id="pn-cc">Cancelar</button></div></form></dialog><dialog id="pn-dqr"><h2 id="pn-qt">Código QR</h2><div class="pn-qr"><canvas id="pn-qc" width="10" height="10"></canvas></div><p class="pn-s ay">Quien lo escanee con la cámara del celular abre la galería. Puedes imprimirlo o mandarlo por WhatsApp.</p><div class="pn-row"><button class="pn-btn" data-act="qr-bajar" type="button">Descargar imagen</button><button class="pn-btn sec" data-act="qr-cerrar" type="button">Cerrar</button></div></dialog><dialog id="pn-dport"><h2>Elegir portada</h2><p class="pn-s">Toca la foto que quieres como portada.</p><div class="pn-grid" id="pn-gport"></div><div class="pn-row"><button class="pn-btn sec" data-act="cerrar-portada">Cancelar</button></div></dialog></div>';
  root.querySelector('.pn').insertAdjacentHTML('beforeend', '<div id="pn-up" hidden></div>');
  root.querySelector('.pn').insertAdjacentHTML('beforeend', '<dialog id="pn-dver"><header class="pn-vh"><div class="pn-vt2"><b id="pn-vnm"></b><span class="pn-s" id="pn-vct"></span></div><div class="pn-vac"><button type="button" id="pn-vpo" data-act="portada">★ Establecer como portada</button><button type="button" id="pn-vdel" data-act="borrar-foto">Borrar</button><button type="button" id="pn-vx" aria-label="Cerrar">✕</button></div></header><button class="pn-nav l" id="pn-vp" type="button" aria-label="Anterior">‹</button><div class="pn-vm"><img id="pn-vimg" alt=""></div><button class="pn-nav r" id="pn-vn" type="button" aria-label="Siguiente">›</button></dialog>');
  $('#pn-vp').onclick = function(){ pasarVer(-1); }; $('#pn-vn').onclick = function(){ pasarVer(1); }; $('#pn-vx').onclick = function(){ $('#pn-dver').close(); };
  var vx0 = null, dv = $('#pn-dver');
  dv.addEventListener('touchstart', function(e){ vx0 = e.touches[0].clientX; }, { passive: true });
  dv.addEventListener('touchend', function(e){ if (vx0 === null) return; var dx = e.changedTouches[0].clientX - vx0; vx0 = null; if (Math.abs(dx) > 50) pasarVer(dx < 0 ? 1 : -1); });
  dv.addEventListener('keydown', function(e){ if (e.key === 'ArrowLeft') pasarVer(-1); if (e.key === 'ArrowRight') pasarVer(1); });
  root.addEventListener('dragstart', function(e){ var t = e.target.closest && e.target.closest('.pn-vt'); if (!t) return; vidDrag = +t.dataset.i; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(vidDrag)); } catch(x) {} });
  root.addEventListener('dragover', function(e){ var t = e.target.closest && e.target.closest('.pn-vt'); if (!t || vidDrag < 0) return; e.preventDefault(); root.querySelectorAll('.pn-vt.ov').forEach(function(x){ x.classList.remove('ov'); }); t.classList.add('ov'); });
  root.addEventListener('drop', function(e){ var t = e.target.closest && e.target.closest('.pn-vt'); if (!t || vidDrag < 0) return; e.preventDefault(); var j = +t.dataset.i, i = vidDrag; vidDrag = -1; if (i === j) return vidRefrescar(); var x = vidIds.splice(i, 1)[0]; vidIds.splice(j, 0, x); vidStop(); vidRefrescar(); });
  root.addEventListener('dragend', function(){ vidDrag = -1; root.querySelectorAll('.pn-vt.ov').forEach(function(x){ x.classList.remove('ov'); }); });
  root.addEventListener('input', function(e){
    if (e.target.id === 'pn-vtt' || e.target.id === 'pn-vts') { if (e.target.id === 'pn-vtt') vidTit = e.target.value; else vidSub = e.target.value; vidStop(); clearTimeout(vidDeb); vidEsc = null; vidDeb = setTimeout(vidPrepara, 500); return; }
    if (e.target.id !== 'pn-vseek' || !vidEsc) return; vidT = e.target.value / 1000 * vidEsc.duracion; vidDibuja(); });
  root.addEventListener('change', async function(e){
    if (e.target.id === 'pn-lg-c' || e.target.id === 'pn-lg-o') { var fl = e.target.files && e.target.files[0]; e.target.value = ''; return subirLogo(fl, e.target.id === 'pn-lg-c' ? 'claro' : 'oscuro'); }
    if (e.target.id === 'pn-cu-ay') { try { localStorage.setItem('pn-ay', e.target.checked ? 'on' : 'off'); } catch(x) {} return aplicarTema(); }
    var s = e.target.closest('select[data-ord]'); if (s && s.value) return ordenar(s.dataset.ord, s.value);
    if (e.target.id === 'pn-fesc') { fEsc = e.target.value; return pintar(); }
    if (e.target.id === 'pn-mv' && e.target.value) {
      var dest = e.target.value === '_none' ? null : e.target.value, ids = Array.from(marcadas);
      var rm = await db.from('photos').update({ scene_id: dest }).in('id', ids);
      if (rm.error) return aviso('No se pudieron mover: ' + rm.error.message);
      cur.fotos.forEach(function(x){ if (marcadas.has(x.id)) x.scene_id = dest; }); aviso('Fotos movidas'); marcadas = new Set(); return pintar();
    }
    var sm = e.target.closest('select[data-escmodo]');
    if (sm) { var r1 = await api('/api/admin/scene', { gallery: galId, action: 'update', id: sm.dataset.escmodo, access_mode: sm.value }); if (!r1.ok) return aviso('No se pudo cambiar.'); cur.escenas.filter(function(x){ return x.id === sm.dataset.escmodo; })[0].access_mode = sm.value; return pintar(); }
    var ch = e.target.closest('input[data-eschid]');
    if (ch) { var r2 = await api('/api/admin/scene', { gallery: galId, action: 'update', id: ch.dataset.eschid, hidden: ch.checked }); if (!r2.ok) return aviso('No se pudo cambiar.'); cur.escenas.filter(function(x){ return x.id === ch.dataset.eschid; })[0].hidden = ch.checked; return aviso(ch.checked ? 'Solo se ve con su enlace' : 'Aparece también en la galería principal'); }
  });
  root.onclick = function(e){
    var v = e.target.closest('aside [data-v]'); if (v) { vista = v.dataset.v; return pintar(); }
    var a = e.target.closest('[data-act]'); if (a) accion(a.dataset.act, a);
  };
  $('#pn-fn').addEventListener('submit', crearGaleria);
  negIniciar();
  $('#pn-cc').addEventListener('click', function(){ $('#pn-dnueva').close(); });
  if (window.matchMedia && !window.__pnMq) { window.__pnMq = matchMedia('(prefers-color-scheme: dark)'); window.__pnMq.addEventListener('change', function(){ aplicarTema(); }); }
  vista = 'inicio';
  await cargarGalerias();
  pintar();
};
})();
