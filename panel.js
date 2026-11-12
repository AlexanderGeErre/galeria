(function(){
'use strict';
var W = 'https://galerias-api.alexandergeerre.workers.dev';
var BASE = 'https://alexandergeerre.github.io/galeria/cliente.html?c=';
var BASEG = 'https://galerias-api.alexandergeerre.workers.dev/g/';
var MAX = 45 * 1048576;
var ESTADOS = { draft: 'Borrador', selection: 'En selección', selection_sent: 'Selección enviada', delivered: 'Entregada', expired: 'Expirada' };
var EXTS = ['.png.jpg', '.jpg.jpg', '.jpg', '.png', '.jpeg', '.webp', '.png.png'];
// Logos: primero el PNG transparente nuevo; si no existe, los archivos viejos.
var LOGO_EXTS = ['.png', '.svg', '.png.jpg', '.jpg.jpg', '.jpg', '.jpeg', '.webp', '.png.png'];
function exts(n){ return /^logo-/.test(n) ? LOGO_EXTS : EXTS; }
// Nombres de logo por el FONDO donde se usan: logo-oscuro = carbón (sobre fondo claro), logo-claro = dorado (sobre fondo oscuro)
var PAL_TIPO = { 'Boda': 'marfil', 'Quinceañera': 'vino', 'Graduación': 'azul', 'Clausura': 'azul', 'Baby shower': 'oliva', 'Cumpleaños': 'arena', 'Fiesta infantil': 'azul', 'Sesión familiar': 'oliva', 'Sesión de retrato': 'blanco', 'Revelación de género': 'arena', 'Revelación': 'arena', 'Evento corporativo': 'blanco' };
var PAL_VIEJA = { beige: 'marfil', noche: 'azul', negro: 'arena' };
var db, ph, root, gals = [], favs = {}, vista = 'inicio', galId = null, tab = 'panel', busca = '', fEst = '', cur = null;

var CSS = '.pn-pb{position:absolute;right:6px;bottom:34px;z-index:2;display:flex;align-items:center;gap:2px;background:var(--a);color:var(--f);border-radius:999px;padding:3px 6px;font-size:.7rem;line-height:1}.pn-pb svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.pn-pb i{font-style:normal;font-weight:700}.pn-ph.pimp img{outline:2px solid var(--a)}.pn-sec .pn-btn svg{width:15px;height:15px;vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:1.8}' + '.pn-ac{flex-wrap:wrap}.pn-grid.sm .pn-ac button{font-size:.62rem;padding:0 .35rem}.pn-add{flex:0 0 96px;aspect-ratio:1;border:1.5px dashed var(--s);background:none;border-radius:10px;color:var(--s);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;cursor:pointer;font:inherit;font-size:.78rem;transition:background .2s,color .2s,border-color .2s}.pn-add b{font-size:1.6rem;font-weight:400;line-height:1}.pn-add:hover{background:var(--p);color:var(--t);border-color:var(--a)}#pn-dsub{width:min(34rem,94vw)}.pn-vacio1{margin:.4rem 0 1rem}.pn-ck{cursor:pointer;position:absolute;top:6px;left:6px;z-index:2;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid var(--a);display:grid;place-items:center;font-size:.8rem;color:var(--a);font-weight:700}.pn-ck.off{background:rgba(255,255,255,.55);border-color:rgba(255,255,255,.9);color:transparent}.pn-ph.mk img{outline:3px solid var(--a);opacity:.85}.pn-barsel{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;position:sticky;top:0;z-index:20;background:var(--f);border:1px solid var(--l);border-radius:12px;padding:.6rem .8rem;margin:.6rem 0}.pn-barsel select{width:auto}.pn-esc{border-top:1px solid var(--l);padding:.8rem 0}.pn-fila{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.4rem 0}' +
'.pn{--f:#FAFAF8;--t:#2B2623;--s:#8A837C;--l:#E6E3DF;--a:#B8946A;--p:#F0EFED;--c:#fff;display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:var(--f);color:var(--t);font-family:Jost,system-ui,sans-serif}' +
'.pn[data-e=dark]{--f:#1A1A1A;--t:#EDEBE8;--s:#9A948D;--l:#333;--a:#C9A877;--p:#252525;--c:#202020}' +
'.pn[data-pa=marfil]{--f:#F7F3EC;--t:#2E2924;--s:#8C8276;--l:#E2D9CA;--a:#A67C52;--p:#EDE6DA;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=marfil][data-e=dark]{--f:#1C1917;--t:#EFE9E1;--s:#A0978B;--l:#34302B;--a:#C8996A;--p:#272320;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=blanco]{--f:#FFFFFF;--t:#1F1F1F;--s:#7D7D7D;--l:#E8E8E8;--a:#1F1F1F;--p:#F2F2F2;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=blanco][data-e=dark]{--f:#121212;--t:#F0F0F0;--s:#8F8F8F;--l:#2C2C2C;--a:#C2A15F;--p:#1E1E1E;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=oliva]{--f:#F6F5F0;--t:#26302A;--s:#7C8379;--l:#DDDCCF;--a:#6F7F5E;--p:#E9E8DF;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=oliva][data-e=dark]{--f:#161A17;--t:#E8EBE4;--s:#929A8E;--l:#2D332E;--a:#9DB08A;--p:#202520;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=vino]{--f:#FBF8F5;--t:#2A1F1F;--s:#8A7B79;--l:#E7DCD7;--a:#8C3B3B;--p:#F0E8E4;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=vino][data-e=dark]{--f:#1B1516;--t:#F1E9E7;--s:#A3938F;--l:#342A2B;--a:#C47A7A;--p:#261E1F;--c:color-mix(in srgb,var(--f) 55%,var(--p))}.pn[data-pa=azul]{--f:#F6F7F9;--t:#1E2430;--s:#7A8294;--l:#DDE1E8;--a:#3F5B8C;--p:#E9ECF1;--c:color-mix(in srgb,#fff 65%,var(--f))}.pn[data-pa=azul][data-e=dark]{--f:#14171C;--t:#E9ECF2;--s:#8D96A8;--l:#2A2F38;--a:#7F9BD0;--p:#1D2128;--c:color-mix(in srgb,var(--f) 55%,var(--p))}' +
'.pn{--ok:#4C8C5E}.pn[data-e=dark]{--ok:#7FCB96}.pn[data-pa=marfil]{--ok:#5E8A4F}.pn[data-pa=marfil][data-e=dark]{--ok:#93C27E}.pn[data-pa=blanco]{--ok:#2E8B57}.pn[data-pa=blanco][data-e=dark]{--ok:#6CC58C}.pn[data-pa=oliva]{--ok:#3F7D4A}.pn[data-pa=oliva][data-e=dark]{--ok:#8FD19E}.pn[data-pa=vino]{--ok:#3E7F5A}.pn[data-pa=vino][data-e=dark]{--ok:#7BC49B}.pn[data-pa=azul]{--ok:#2F8F6B}.pn[data-pa=azul][data-e=dark]{--ok:#6FD0A6}.pn-sww{display:flex;align-items:center;gap:.9rem;padding:.6rem .9rem;border:1px solid var(--l);border-radius:12px;background:var(--c);max-width:34rem}.pn-sww b{display:block;font-weight:500}.pn-sww span{font-size:.8rem;color:var(--s)}.pn-swt{flex:none;position:relative;width:4.7rem;height:2.5rem;border-radius:999px;border:1px solid var(--l);cursor:pointer;padding:0;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 100%,#fff 35%),var(--c) 55%,color-mix(in srgb,var(--c) 88%,var(--s)));box-shadow:0 4px 0 color-mix(in srgb,var(--l) 80%,var(--s)),0 9px 16px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.55);transition:box-shadow .2s}.pn-swt:active{box-shadow:0 2px 0 color-mix(in srgb,var(--l) 80%,var(--s)),0 5px 10px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.55);transform:translateY(2px)}.pn-swt:before{content:\'\';position:absolute;left:.6rem;right:.6rem;top:50%;height:1rem;margin-top:-.5rem;border-radius:999px;background:linear-gradient(180deg,color-mix(in srgb,var(--s) 70%,var(--f)),color-mix(in srgb,var(--s) 38%,var(--f)));box-shadow:inset 0 2px 3px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.35);transition:background .3s}.pn-swt.on:before{background:linear-gradient(180deg,color-mix(in srgb,var(--ok) 90%,#000),var(--ok) 50%,color-mix(in srgb,var(--ok) 62%,#fff))}.pn-swt .k{position:absolute;top:50%;left:.32rem;width:1.95rem;height:1.95rem;margin-top:-.975rem;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#ececec 55%,#d3d3d3);color:transparent;display:grid;place-items:center;box-shadow:0 3px 6px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.9) inset,0 -2px 3px rgba(0,0,0,.1) inset;transition:transform .3s cubic-bezier(.3,1.4,.5,1),color .2s}.pn-swt.on .k{transform:translateX(2.15rem);color:var(--ok)}.pn-swt:focus-visible{outline:2px solid var(--a);outline-offset:3px}.pn-swt,.pn-swt:active{width:3.1rem;height:1.8rem;border:0;background:color-mix(in srgb,var(--s) 38%,var(--f));box-shadow:none;transform:none;transition:background .25s}.pn-swt:before{display:none}.pn-swt.on{background:var(--ok)}.pn-swt .k{top:.2rem;left:.2rem;margin:0;width:1.4rem;height:1.4rem;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .25s cubic-bezier(.3,1.3,.5,1),color .2s}.pn-swt.on .k{transform:translateX(1.3rem);color:var(--ok)}.pn-swt .k svg{width:10px;height:10px}.pn-sww{border-radius:999px;padding:.7rem 1.2rem .7rem .9rem}.pn-tema-c{max-width:24rem}.pn .pn-tema-c button{background:transparent!important;color:var(--t)!important;cursor:pointer}.pn .pn-tema-c button.on{background:var(--a)!important;color:var(--f)!important;border-color:var(--a)!important}.pn[data-e=dark] .pn-il{mix-blend-mode:normal!important;filter:none!important;border-radius:8px}' +
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
'.pn-as-p{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;margin:1rem 0}.pn-as-p li{border:1px solid var(--l);border-radius:999px;padding:.3rem .9rem;font-size:.9rem;color:var(--s)}.pn-as-p li.on{border-color:var(--a);color:var(--t);font-weight:500}.pn-as-p li.ok{color:var(--a)}' +
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
'.pn-tb{width:100%;border-collapse:collapse;font-size:.95rem}.pn-tb th{text-align:left;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--s);padding:.8rem 1rem;border-bottom:1px solid var(--l)}.pn-tb td{padding:.85rem 1rem;border-bottom:1px solid var(--l);vertical-align:top}.pn-ac{white-space:nowrap;text-align:right}.pn-dos{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.pn-mes{display:flex;align-items:center;justify-content:center;gap:1.2rem;margin:1rem 0}.pn-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.pn-cal>span{font-size:.72rem;color:var(--s);text-align:center;text-transform:uppercase;letter-spacing:.08em}.pn-cal .dy{min-height:92px;background:var(--c);border:1px solid var(--l);border-radius:10px;padding:.4rem;font-size:.8rem;color:var(--s)}.pn-cal .dy.vac{background:none;border:0}.pn-cal .dy.hoy{border-color:var(--a);box-shadow:inset 0 0 0 1px var(--a)}.pn-cal .ev{display:block;width:100%;text-align:left;border:0;border-radius:6px;padding:.2rem .4rem;margin-top:.25rem;font-size:.72rem;color:#fff;background:var(--a);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-cal .ev.k-sesion{background:#7C8F6A}.pn-cal .ev.pend{background:transparent;color:var(--t);outline:1px dashed var(--a);outline-offset:-1px}.pn-cta{color:var(--a);font-weight:600}.pn-sig{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:1rem 0}.pn-sig h3{margin:.2rem 0}.pn-cdn b{font-family:"Cormorant Garamond",Georgia,serif;font-size:2.2rem;font-weight:500;color:var(--a);white-space:nowrap}.pn-cal .ev.k-entrega{background:#3F5B8C}.pn-cal .ev.k-otro{background:#888}.pn-nvr{display:grid;grid-template-columns:minmax(0,340px) 1fr;gap:1.4rem;align-items:start}.pn-col{display:flex;flex-direction:column;gap:.5rem}.pn-col .pn-btn.on,.pn-row .pn-btn.on{background:var(--t);color:var(--f)}.pn dialog select,.pn dialog textarea{width:100%}@media(max-width:760px){.pn-nvr,.pn-dos{grid-template-columns:1fr}.pn-cal .dy{min-height:64px;font-size:.7rem}.pn-cal .ev{font-size:.62rem}.pn-ac{white-space:normal}}' +
'.pn aside button{border-radius:999px;padding:.62rem .9rem;font-size:.94rem}.pn aside button.on{background:var(--p);color:var(--t);font-weight:600;box-shadow:none}.pn aside button.on .pn-i{color:var(--a)}.pn aside .mo,.pn aside .ta{display:none}.pn-tabs{display:flex;flex-wrap:nowrap;gap:1.15rem;font-size:.94rem;border-bottom:1px solid var(--l);margin:.4rem 0 1.5rem;overflow-x:auto}.pn-tabs button{background:none;border:0;padding:.65rem 0;color:var(--s);font:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;cursor:pointer}.pn-tabs button:hover{color:var(--t)}.pn-tabs button.on{color:var(--t);font-weight:600;border-bottom-color:var(--a)}.pn-sub{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}' +
'.pn .marca{margin:.2rem 0 1.4rem;padding:0 .3rem}.pn .marca img{width:100%;max-width:150px;display:block;border-radius:8px}.pn .marca .lg-d{display:none}.pn[data-e=dark] .marca .lg-l{display:none}.pn[data-e=dark] .marca .lg-d{display:block}' +
'.pn main{padding:2.8rem clamp(1.2rem,5vw,4rem);max-width:1180px}.pn h1{font-size:clamp(2.2rem,4vw,3.2rem);letter-spacing:-.01em;margin-bottom:.3rem}.pn h2{font-size:1.6rem}' +
'.pn-card{border:1px solid var(--l);border-radius:14px;box-shadow:none;padding:1.2rem 1.4rem}' +
'.pn-franja,.pn-cifras{border:1px solid var(--l);border-radius:14px;box-shadow:none}.pn-cifras b{font-size:2.1rem}' +
'@media(min-width:1100px){.pn main{max-width:1560px;margin:0 auto}}' +
'.pn-ac a.pn-btn{background:none;border:1px solid var(--l);border-radius:999px;font-size:.72rem;padding:.1rem .5rem;color:var(--t)}.pn-cacep{margin:1rem 0}.pn-cacep p{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin:.4rem 0}' +
'.pn-btn{transition:transform .15s,opacity .2s,box-shadow .2s}.pn-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(43,38,35,.16)}.pn-btn:active{transform:scale(.97)}' +
'.pn-rej{grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:26px}.pn-tar .cv{border-radius:16px}.pn-tar h3{margin-top:.7rem}' +
'.pn-ph img,.pn-tar .cv>img,.pn-pbtn img{opacity:0;transition:opacity .6s ease,transform .5s ease;background:linear-gradient(100deg,var(--l) 30%,var(--p) 50%,var(--l) 70%);background-size:200% 100%}.pn-ph img.ld,.pn-tar .cv>img.ld,.pn-pbtn img.ld{opacity:1}.pn-ph,.pn-tar .cv{background:linear-gradient(100deg,var(--l) 30%,var(--p) 50%,var(--l) 70%);background-size:200% 100%;animation:pnSh 1.5s infinite;border-radius:10px}.pn-ph img{border-radius:10px}.pn-ph:hover img.ld{transform:scale(1.03)}.pn-ph{overflow:hidden}' +
'#pn-main>*{animation:pnIn .5s cubic-bezier(.2,.7,.2,1) both}#pn-main>*:nth-child(2){animation-delay:.05s}#pn-main>*:nth-child(3){animation-delay:.1s}#pn-main>*:nth-child(4){animation-delay:.15s}#pn-main>*:nth-child(n+5){animation-delay:.2s}' +
'@keyframes pnIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes pnSh{from{background-position:200% 0}to{background-position:-200% 0}}' +
'.pn dialog[open]{animation:pnDlg .28s cubic-bezier(.2,.7,.2,1)}.pn dialog::backdrop{background:rgba(21,20,19,.55);backdrop-filter:blur(3px)}@keyframes pnDlg{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
'.pn-skel{height:3.2rem;width:60%;border-radius:12px;margin:1rem 0;background:linear-gradient(100deg,var(--l) 30%,var(--p) 50%,var(--l) 70%);background-size:200% 100%;animation:pnSh 1.5s infinite}.pn-skel.w1{width:35%;height:2.4rem}.pn-skel.h2{height:9rem;width:100%}' +
'.pn-toast{animation:pnIn .3s both}@media(prefers-reduced-motion:reduce){.pn *{animation:none!important;transition:none!important}.pn-ph img,.pn-tar .cv>img,.pn-pbtn img{opacity:1}}' +
'#pn-up{position:fixed;right:18px;bottom:18px;z-index:80;width:min(22rem,calc(100vw - 36px));background:var(--c);border:1px solid var(--l);border-radius:16px;box-shadow:0 12px 40px rgba(43,38,35,.22);padding:.9rem 1rem}.pn-up-t{display:flex;justify-content:space-between;gap:.6rem}.pn-up-b{height:6px;border-radius:99px;background:var(--l);overflow:hidden;margin:.6rem 0}.pn-up-b i{display:block;height:100%;background:var(--a);transition:width .3s}#pn-up ul{margin:.4rem 0 .5rem 1.1rem;padding:0;font-size:.8rem;color:#b5453f}#pn-up p{margin:0 0 .3rem}' +
'.pn-rej{align-items:start}.pn-tabs{border-bottom-color:var(--t)}' +
'.pn-k{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--s);margin:0 0 .7rem}' +
'.pn-fm{display:grid;grid-template-columns:220px minmax(0,1fr);gap:2.4rem;align-items:start;margin-top:.2rem}.pn-carp{position:sticky;top:1rem}' +
'.pn-cr{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;width:100%;background:none;border:0;border-top:1px solid var(--l);border-left:2px solid transparent;border-radius:0;padding:.72rem .3rem .72rem .7rem;font:inherit;color:var(--s);cursor:pointer;text-align:left}.pn-cr:last-of-type{border-bottom:1px solid var(--l)}' +
'.pn-cr b{font-weight:400}.pn-cr i{font-style:normal;font-variant-numeric:tabular-nums;font-size:.9rem}.pn-cr.on{color:var(--t);border-left-color:var(--a)}.pn-cr.on b{font-weight:600}.pn-cr:hover{color:var(--t)}' +
'.pn-ncarp{display:flex;gap:.4rem;margin-top:1rem}.pn-ncarp input{flex:1;min-width:0;font-size:.9rem}.pn-ncarp button{width:2.5rem;padding:0}' +
'.pn-fh{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem 1rem;margin-bottom:1.1rem}.pn-fh h2{margin:0;font-size:2rem}.pn-fh h2 em{font-style:normal;color:var(--s)}.pn-fh .sp{margin-left:auto;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}' +
'.pn-seg{display:inline-flex;background:var(--p);border-radius:999px;padding:3px}.pn-seg button{border:0;background:none;color:var(--s);border-radius:999px;padding:.42rem 1rem;font:inherit;font-size:.88rem;cursor:pointer}.pn-seg button.on{background:var(--c);color:var(--t);font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.14)}' +
'.pn-tb{position:absolute;left:6px;right:auto;bottom:34px;width:fit-content;height:auto;display:block;line-height:1.5;z-index:2;font-size:.64rem;letter-spacing:.04em;border-radius:999px;padding:1px 8px;background:rgba(255,255,255,.93);color:#2B2623}.pn-tb.f{background:#2B2623;color:#fff}' +
'.pn-grid.mx{grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px}.pn-vaci{border:1px dashed var(--l);border-radius:16px;padding:2.4rem 1rem;text-align:center}' +
'.pn-rc{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.7rem;margin:.4rem 0}.pn-rcl{position:relative;display:flex;align-items:center;gap:.75rem;border:1px solid var(--l);border-radius:12px;padding:.85rem 1rem;cursor:pointer;background:var(--c)}' +
'.pn-rcl input{position:absolute;opacity:0;pointer-events:none}.pn-rcl .d{flex:none;width:22px;height:22px;border-radius:50%;background:var(--p);display:grid;place-items:center}.pn-rcl input:checked+.d:after{content:"";width:8px;height:8px;border-radius:50%;background:var(--t)}.pn-rcl:has(input:checked){border-color:var(--t)}.pn-rcl small{display:block;color:var(--s);font-size:.8rem}' +
'.pn-ev{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.85rem 0;border-top:1px solid var(--l)}.pn-ev:first-of-type{border-top:0}.pn-ev .d{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--s)}.pn-ev .t{display:block;font-family:"Cormorant Garamond",Georgia,serif;font-size:1.4rem;line-height:1.2}' +
'.pn-pl{background:var(--p);border-radius:999px;padding:.25rem .85rem;font-size:.82rem;white-space:nowrap}' +
'#pn-as-chip{position:fixed;left:240px;bottom:18px;z-index:70;background:var(--t);color:var(--f);border:0;border-radius:999px;padding:.6rem 1.1rem;font:inherit;font-size:.88rem;cursor:pointer;box-shadow:0 8px 28px rgba(43,38,35,.25)}#pn-as-chip[hidden]{display:none}' +
'.pn-as-p{align-items:center;gap:.9rem}.pn-as-p li{border:0;padding:0;display:flex;align-items:center;gap:.5rem}.pn-as-p li b{width:24px;height:24px;border-radius:50%;border:1px solid var(--l);display:grid;place-items:center;font-weight:400;font-size:.78rem}.pn-as-p li.on b{background:var(--t);color:var(--f);border-color:var(--t)}.pn-as-p li.ok b{background:var(--a);color:#fff;border-color:var(--a)}.pn-as-p li+li:before{content:"";width:40px;border-top:1px solid var(--l);margin-right:.5rem}' +
'@media(max-width:760px){.pn-fm{grid-template-columns:minmax(0,1fr)}.pn-carp{position:static}}' +
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

CSS += '.vs-body{display:grid;grid-template-columns:15.5rem minmax(0,1fr);gap:1.6rem;width:100%;align-items:center}.vs-pcol{grid-column:2;grid-row:1;display:flex;flex-direction:column;align-items:center;gap:.8rem;min-width:0}.vs-side{grid-column:1;grid-row:1;align-self:start;margin-top:.6rem;display:flex;flex-direction:column;gap:1.4rem;background:var(--c);border:1px solid var(--l);border-radius:16px;padding:1.2rem}.vs-g{display:flex;flex-direction:column;gap:.55rem}.vs-l{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--s)}.vs-g small{color:var(--s);font-size:.74rem}' +
'.vs-seg{display:flex;background:var(--p);border-radius:99px;padding:3px}.vs-seg button{flex:1;border:0;background:none;border-radius:99px;padding:.5rem .4rem;font:inherit;font-size:.88rem;color:var(--s);cursor:pointer}.vs-seg button.on{background:var(--c);color:var(--t);font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,.12)}' +
'.vs-fm{display:grid;grid-template-columns:repeat(4,1fr);gap:.3rem}.vs-fm .pn-opt{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:.4rem;height:4.7rem;padding:.4rem .1rem;border:0;border-radius:12px;background:none;color:var(--s);max-width:none;min-width:0}.vs-fm .pn-opt i{display:block;background:var(--a);opacity:.85;border-radius:3px}.vs-fm .ar.h{width:1.9rem;height:1.1rem}.vs-fm .ar.v{width:1.05rem;height:1.85rem}.vs-fm .ar.s{width:1.4rem;height:1.4rem}.vs-fm .ar.f{width:1.2rem;height:1.5rem}.vs-fm .pn-opt span{font-size:.72rem;color:inherit}.vs-fm .pn-opt.on{background:var(--p);color:var(--t);font-weight:500}.np-dev.f canvas{height:min(50vh,540px);width:auto}.np-dev.f:before{content:"";position:absolute;left:50%;top:19px;width:64px;height:8px;margin-left:-32px;border-radius:99px;background:#0a0a0a;z-index:2}' +
'@media(max-width:900px){.vs-body{grid-template-columns:minmax(0,1fr)}.vs-pcol,.vs-side{grid-column:1;grid-row:auto}.vs-side{flex-direction:row;flex-wrap:wrap;gap:1rem 1.6rem}.vs-g{flex:1 1 12rem}}';
CSS += '.vs-bar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.8rem;margin-top:.5rem}.vs-pill{display:flex;gap:4px;background:#1d1915;border-radius:99px;padding:5px 7px}.vs-pill button{display:flex;align-items:center;gap:.45rem;border:0;background:none;border-radius:99px;padding:.45rem .85rem;color:#a89f94;font:inherit;font-size:.85rem;cursor:pointer;max-width:none}.vs-pill button i{display:block;background:#c3a27e;border-radius:2px}.vs-pill button.on{background:#f4efe8;color:#222}.vs-pill .ar.h{width:1.1rem;height:.7rem}.vs-pill .ar.v{width:.7rem;height:1.1rem}.vs-pill .ar.s{width:.9rem;height:.9rem}.vs-pill .ar.f{width:.76rem;height:.95rem}.vs-bar .pn-btn{border-radius:99px;padding:.7rem 1.8rem}.vs-res{color:#8c8379;font-size:.74rem}@media(max-width:640px){.vs-bar{gap:.6rem}.vs-bar .pn-btn{flex:1 1 100%}.vs-pill button{padding:.4rem .65rem;font-size:.8rem}}';
CSS += '.vs-bar .pn-btn.sec{color:#efe6d4;border-color:rgba(239,230,212,.5)}.vs-bar .pn-btn.sec:hover{background:rgba(239,230,212,.1)}.vs-bar .pn-btn:disabled{opacity:.75}';
CSS += '.wm-tb{border:0;padding:.8rem 0 .2rem;gap:.3rem 1.8rem}.wm-pv{display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;margin-top:.6rem}.wm-pv canvas{max-height:240px;width:auto;max-width:100%;border-radius:12px;background:var(--l)}.wm-pv p{max-width:16rem;margin:0}';
CSS += '.fs-top h2{margin:0;font-size:2rem}.fs-new{display:flex;gap:.4rem;margin:0}.fs-new input{max-width:11rem}.fs-sc{margin-top:.4rem}.fs-h{display:flex;align-items:center;gap:.7rem;margin:1.5rem 0 .8rem}.fs-h h2{margin:0;font-size:1.35rem;font-weight:500}.fs-t{width:22px;height:22px;border-radius:50%;border:1px solid var(--l);background:none;color:var(--s);font-size:.68rem;cursor:pointer;padding:0}.fs-t:hover{color:var(--t);border-color:var(--s)}.fs-n{color:var(--s);font-size:.85rem;padding-left:.7rem;border-left:1px solid var(--l)}.fs-dots{background:none;border:0;color:var(--s);letter-spacing:.15em;font-size:1rem;cursor:pointer;padding:.2rem .3rem}' +
'.np-dd.r ul{left:auto;right:auto;left:0}.fs-strip{display:flex;gap:.7rem;overflow-x:auto;padding-bottom:.5rem}.fs-strip .pn-ph{flex:0 0 124px;width:124px}.fs-add{flex:0 0 124px;aspect-ratio:1;border:0;border-radius:12px;background:var(--p);color:var(--s);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.45rem;cursor:pointer;font:inherit;font-size:.82rem}.fs-add:hover{color:var(--t)}.pn-grid.mx .fs-add{width:100%}' +
'.fs-more{display:flex;align-items:center;gap:1rem;width:100%;background:none;border:0;color:var(--s);font:inherit;font-size:.85rem;letter-spacing:.06em;cursor:pointer;padding:.5rem 0}.fs-more:empty{display:none}.fs-more:before,.fs-more:after{content:"";flex:1;height:1px;background:var(--l)}.fs-more:hover{color:var(--t)}@media(max-width:640px){.fs-new input{max-width:7.5rem}}';
CSS += '.fs-strip,.pn-tabs,.pn-grid.fr{scrollbar-width:none;-ms-overflow-style:none}.fs-strip::-webkit-scrollbar,.pn-tabs::-webkit-scrollbar,.pn-grid.fr::-webkit-scrollbar{display:none;width:0;height:0}.pn-tabs{overflow-y:hidden}.pn *{scrollbar-width:thin;scrollbar-color:var(--l) transparent}';
CSS += '.ds{display:grid;grid-template-columns:minmax(290px,350px) minmax(0,1fr);gap:0;margin-top:.4rem;align-items:start}.ds-l{padding:0 1.6rem 1rem 0;border-right:1px solid var(--l)}.ds-sec{padding:1rem 0;border-bottom:1px solid var(--l)}.ds-sec:last-child{border:0}.ds-sec h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:1.3rem;margin:0 0 .7rem;display:flex;justify-content:space-between;align-items:baseline;gap:.6rem}.ds-sec h3 i{font:400 .78rem Jost,sans-serif;font-style:normal;color:var(--s)}.ds-h{margin:.6rem 0 0;font-size:.8rem}' +
'.ds-por{display:flex;gap:.9rem;align-items:flex-start}.ds-th{flex:0 0 104px;height:70px;border-radius:10px;background:var(--p);overflow:hidden}.ds-th img{width:100%;height:100%;object-fit:cover;display:block}.ds-bt{display:flex;gap:.4rem;flex-wrap:wrap}.ds-bt .pn-btn{font-size:.78rem;padding:.35rem .8rem}' +
'.ds-cds{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}.ds-cd{border:1px solid var(--l);background:var(--c);border-radius:12px;padding:.6rem .3rem .5rem;display:flex;flex-direction:column;align-items:center;gap:.3rem;color:var(--s);font:inherit;font-size:.8rem;cursor:pointer}.ds-cd:hover{border-color:var(--s)}.ds-cd.on{border:2px solid var(--a);padding:calc(.6rem - 1px) calc(.3rem - 1px) calc(.5rem - 1px);color:var(--t)}.ds-aa{font-size:1.4rem;font-weight:500;line-height:1.1;color:var(--t)}' +
'.ds-dots{display:flex;flex-wrap:wrap;gap:.6rem}.ds-dot{width:34px;height:34px;border-radius:50%;border:1px solid var(--l);cursor:pointer;padding:0}.ds-dot.on{outline:2px solid var(--t);outline-offset:2px}.ds-dot.au{background:var(--p);color:var(--s);font:500 .8rem Jost,sans-serif}' +
'.ds-r{padding-left:1.6rem;min-width:0}.ds-tb{display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-bottom:.9rem}.ds-pvbox{background:var(--p);border-radius:14px;padding:1.1rem;min-width:0}.ds-pvbox.tel{padding:1.4rem 1rem}.ds-ph{width:300px;max-width:100%;margin:0 auto;border:7px solid #2b2623;border-radius:30px;overflow:hidden}' +
'.ds-mg{background:var(--pf);color:var(--pt);border-radius:8px;overflow:hidden;box-shadow:0 6px 28px rgba(0,0,0,.14);font-size:.72rem}.ds-cv{position:relative;height:190px;background:#333;color:#fff;text-align:center}.ds-cv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ds-cv>div{position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(0,0,0,.62));display:flex;flex-direction:column;justify-content:flex-end;padding:.9rem}.ds-cv h2{font-family:var(--pff);font-style:var(--pfs);text-transform:var(--ptt);letter-spacing:var(--pls);font-size:1.5rem;margin:0;color:#fff}.ds-pvbox.tel .ds-cv{height:120px}.ds-pvbox.tel .ds-cv h2{font-size:1.05rem}' +
'.ds-nv{display:flex;gap:1rem;padding:.6rem 1rem;border-bottom:1px solid var(--pl);color:var(--ps)}.ds-nv b{color:var(--pt);font-weight:500;border-bottom:2px solid var(--pa)}.ds-nv .r{margin-left:auto}' +
'.ds-et{font-family:var(--pff);font-style:var(--pfs);text-transform:var(--ptt);letter-spacing:var(--pls);font-weight:500;font-size:1.2rem;margin:.9rem 1rem .4rem;color:var(--pt)}.ds-et.centrados{text-align:center}.ds-et.izquierda{text-align:left}' +
'.ds-gr{padding:.4rem 1rem 1rem;display:grid;gap:5px;grid-template-columns:repeat(4,1fr)}.ds-gr figure{margin:0;background:var(--pl);overflow:hidden}.ds-gr img{width:100%;height:100%;display:block;object-fit:cover}.ds-gr figure.vc{aspect-ratio:2/3}.ds-gr.clasico figure{aspect-ratio:2/3}.ds-gr.clasico figure:nth-child(3n+2){aspect-ratio:3/4}.ds-gr.uniforme figure{aspect-ratio:4/5}.ds-gr.amplio{grid-template-columns:repeat(2,1fr)}.ds-gr.amplio figure{aspect-ratio:3/2}' +
'.ds-pvbox.tel .ds-gr{padding:.3rem .5rem .8rem;grid-template-columns:repeat(2,1fr)}.ds-pvbox.tel .ds-gr.amplio{grid-template-columns:1fr}.ds-pvbox.tel .ds-nv{padding:.5rem .6rem;gap:.6rem}.ds-pvbox.tel .ds-nv .r{display:none}' +
'@media(max-width:900px){.ds{grid-template-columns:minmax(0,1fr)}.ds-r{order:-1;padding:0;margin-bottom:1rem}.ds-l{padding:0;border:0}.ds-cv{height:140px}.ds-pvbox{padding:.7rem}.ds-gr{grid-template-columns:repeat(3,1fr)}}';
CSS += '#pn-bn{display:none}#pn-denl{padding:0;border:0;border-radius:18px;width:min(460px,94vw);max-height:88vh;overflow:auto;background:var(--c);color:var(--t)}#pn-denl::backdrop{background:rgba(30,25,20,.4)}.en-h{display:flex;justify-content:space-between;align-items:center;padding:.9rem 1rem;border-bottom:1px solid var(--l);position:sticky;top:0;background:var(--c);z-index:1}.en-h b{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.25rem;font-weight:500}.en-b{width:2.2rem;height:2.2rem;border:0;background:none;color:var(--t);font-size:1.4rem;cursor:pointer;border-radius:50%}.en-c{padding:1rem}.en-ls{display:grid;gap:.5rem}.en-ls button{display:flex;justify-content:space-between;align-items:center;gap:1rem;width:100%;text-align:left;background:var(--c);border:1px solid var(--l);border-radius:14px;padding:.9rem 1rem;color:var(--t);font:inherit;cursor:pointer}.en-ls button:hover{border-color:var(--a)}.en-ls span{color:var(--s);font-size:.82rem}.en-aj{margin-top:1.2rem;border-top:1px solid var(--l);padding-top:.8rem}.en-aj summary{cursor:pointer;color:var(--s);margin-bottom:.6rem}.en-aj .pn-row{margin-bottom:.6rem}' +
'@media(max-width:760px){#pn-denl{width:100vw;max-width:100vw;height:100%;max-height:100%;border-radius:0;margin:0}' +
'.pn.con-bn aside .ta,.pn.con-bn aside .pie{display:none}.pn.con-bn main{padding-bottom:6.5rem}#pn-bn{display:block}' +
'.pn-bn{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;background:var(--c);border-top:1px solid var(--l);padding:.3rem .3rem calc(.3rem + env(safe-area-inset-bottom))}.pn-bn button{flex:1;display:flex;flex-direction:column;align-items:center;gap:.15rem;background:none;border:0;color:var(--s);font:inherit;font-size:.7rem;padding:.4rem 0;cursor:pointer;border-radius:12px}.pn-bn button.on{color:var(--a);font-weight:600}.pn-bn .pn-i,.pn-mas .pn-i{width:22px;height:22px}' +
'.pn-mas-dim{position:fixed;inset:0;background:rgba(30,25,20,.38);z-index:38}.pn-mas{position:fixed;left:0;right:0;bottom:calc(3.9rem + env(safe-area-inset-bottom));z-index:39;background:var(--c);border-radius:20px 20px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.18);padding:1rem 1.1rem .6rem}.pn-mas h4{margin:.7rem 0 .2rem;font:600 .7rem Jost,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--s)}.pn-mas button{display:flex;gap:.8rem;align-items:center;width:100%;background:none;border:0;border-bottom:1px solid var(--l);color:var(--t);font:inherit;padding:.75rem .2rem;text-align:left;cursor:pointer}.pn-mas button:last-child{border:0}.pn-mas button.on{color:var(--a);font-weight:600}}';
CSS += '.fv-tb{display:flex;justify-content:flex-end;margin:0 0 .8rem;position:relative;z-index:30}.fv-wr{position:relative}.fv-mn{position:absolute;right:0;top:calc(100% + 6px);z-index:20;min-width:15rem;background:var(--c);border:1px solid var(--l);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.18);padding:.4rem}.fv-mn button{display:flex;gap:.6rem;align-items:center;width:100%;text-align:left;background:none;border:0;color:var(--t);font:inherit;padding:.6rem .7rem;border-radius:10px;cursor:pointer}.fv-mn button:hover{background:var(--p)}.fv-mn button.on{font-weight:600}.fv-mn i{width:1rem;color:var(--a);font-style:normal;font-size:.7rem}' +
'.pn-grid.fv-gra{grid-template-columns:repeat(auto-fill,minmax(112px,1fr))}.pn-grid.fv-peq{grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:.4rem}.pn-grid.fv-peq figcaption{display:none}.pn-grid.fv-gra figcaption{font-size:.68rem}' +
'.fv-lista{margin:.2rem 0 1rem;padding:0 0 0 2.2rem;columns:200px;column-gap:1.6rem;font-size:.95rem;line-height:1.9}.fv-lista li{break-inside:avoid;padding-left:.2rem}.fv-lista li::marker{color:var(--s);font-size:.78rem}' +
'@media(max-width:760px){.fv-tb{justify-content:stretch}.fv-wr{width:100%}.fv-wr>.pn-btn{width:100%}.fv-mn{left:0;right:0;min-width:0}}';
CSS += '.pn-dz{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35rem;text-align:center;border:2px dashed var(--l);border-radius:16px;padding:1.8rem 1rem;margin:1rem 0;color:var(--s);cursor:pointer;transition:border-color .15s,background .15s}.pn-dz:hover,.pn-dz.sobre{border-color:var(--a);background:var(--p);color:var(--t)}.pn-dz.lleno{border-style:solid;border-color:var(--a)}.pn-dz b{font-weight:500;color:var(--t);font-size:1rem}.pn-dz input[type=file]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0}' +
'#pn-dzov{position:fixed;inset:0;z-index:300;background:rgba(30,25,20,.55);display:flex;align-items:center;justify-content:center;pointer-events:none}#pn-dzov[hidden]{display:none}#pn-dzov>div{background:var(--c);color:var(--t);border:2px dashed var(--a);border-radius:22px;padding:2.4rem 3rem;display:flex;flex-direction:column;align-items:center;gap:.7rem;font-size:1.1rem}';
CSS += '.fs-tools{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end;margin:.2rem 0 .2rem}.fs-tools .pn-orden{display:inline-flex;align-items:center;gap:.4rem}.fs-tools .pn-orden .pn-s{display:none}.fs-tools select{font-size:.82rem;padding:.35rem .6rem;max-width:11rem}.fs-tools .pn-btn{font-size:.82rem;padding:.42rem .9rem}.fs-tools .fs-new input{max-width:9rem;font-size:.82rem;padding:.4rem .7rem}' +
'.fs-h{margin:1.2rem 0 .7rem;flex-wrap:wrap}.fs-seg{margin-left:auto}.fs-seg button{padding:.28rem .8rem!important;font-size:.8rem!important}' +
'.fs .pn-tb{left:6px;bottom:6px!important;background:#2B2623!important;color:#fff!important;font-size:.6rem;font-weight:700;letter-spacing:.05em;padding:2px 7px}.fs figcaption{display:none}' +
'.fs .pn-ph img{aspect-ratio:2/3}.fs .pn-ph .pn-ck{bottom:auto;top:6px}.fs .pn-pb{bottom:6px}' +
'.fs .pn-grid.mx{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:12px}.fs-strip{gap:12px}.fs-strip .pn-ph{flex:0 0 94px;width:94px}.fs-add{flex:0 0 140px;aspect-ratio:auto;height:141px;width:140px}.fs-strip .fs-add{flex:0 0 140px}' +
'@media(max-width:640px){.fs-tools{justify-content:flex-start}.fs-seg{margin-left:0;width:100%;justify-content:space-between}.fs .pn-grid.mx{grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}}';
CSS += '.fs-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:0 12px;grid-auto-rows:0;grid-template-rows:auto;overflow:hidden;padding:0}.fs-strip .pn-ph{flex:none;width:auto}.fs-strip .fs-add,.fs-add{flex:none;width:100%;height:auto;aspect-ratio:2/3}@media(max-width:640px){.fs-strip{grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:0 8px}}';
CSS += '.pn main{min-width:0}.vs{margin-bottom:1.2rem;min-width:0;max-width:100%}.vs-tb,.vs-pv,.vs-tx{min-width:0}.vs-ctl,.vs-pv .pn-vb{max-width:100%}.vs-tb{background:var(--c);border:1px solid var(--l);border-radius:16px 16px 0 0;border-bottom:0;padding:.7rem 1.4rem;gap:.2rem 1.6rem}.vs-chip{background:none;border:0;padding:.4rem 0;color:var(--s);font:inherit;font-size:.9rem;cursor:pointer;text-align:left}.vs-chip small{display:inline;font-size:inherit;margin-right:.3rem;color:var(--s)}.vs-chip[hidden]{display:none}.vs-chip:hover{color:var(--t)}' +
'.vs-tx{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.6rem 1.2rem;background:var(--c);border:1px solid var(--l);border-top:0;padding:.2rem 1.4rem .9rem}.vs-tx[hidden]{display:none}.vs-tx input{width:100%}' +
'.vs-pv{border-radius:0 0 16px 16px;min-height:0;padding:1.6rem 1rem 1.4rem}.vs-ctl{width:min(34rem,100%);border-radius:99px;background:#1d1915}.vs-pv .pn-vb{width:min(34rem,100%)}.vs-pv #pn-vst{color:#c9bfb3;text-transform:none;letter-spacing:0;font-size:.82rem}.vs-pv #pn-vinfo{color:#a89f94;font-size:.78rem}.vs-act{display:flex;gap:.7rem;margin-top:.4rem}.vs-act .pn-btn{border-radius:99px;padding:.7rem 2rem}' +
'.np-dd li button.pn-opt{display:block;width:100%;max-width:none;border:0;border-radius:0;background:none;padding:.55rem 1rem;color:var(--s);flex:none}.np-dd li button.pn-opt:hover{color:var(--t);background:var(--p)}.np-dd li button.pn-opt.on{color:var(--t);font-weight:500;background:var(--p)}' +
'.np-dev.v canvas{height:min(50vh,560px)}.np-dev.h canvas{width:min(640px,78vw,92vh)}@media(min-width:1500px){.np-dev.v canvas{height:min(62vh,640px)}.np-dev.h canvas{width:min(760px,60vw)}}@media(max-width:640px){.vs-tb{padding:.6rem 1rem;display:grid;grid-template-columns:1fr 1fr;gap:.1rem .8rem}.vs-tb .np-dd>button,.vs-chip{font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.vs-tb .np-dd:nth-child(2n) ul{left:auto;right:0}.vs-tb .np-dd ul{left:0;min-width:11rem}.vs-chip{grid-column:auto}.np-dev.v canvas{height:min(52vh,460px)}.np-dev.h canvas{width:min(78vw,420px)}.vs-pv{padding:1.2rem .6rem}.vs-act{width:100%}.vs-act .pn-btn{flex:1}}';
CSS += '.pn dialog.vs-dlg{width:min(68rem,96vw);max-height:94vh;overflow:auto}.vs-dlg .vs{margin:0}.vs-dlg .vs-tb{border:0;border-radius:0;border-bottom:1px solid var(--l)}.vs-dlg .vs-pv{border-radius:0}.vs-dlg>.pn-card{margin:1rem 1.4rem}.vs-dlg .np-hd{position:sticky;top:0;background:var(--c);z-index:3;border-radius:20px 20px 0 0}.pn-vabre{max-width:30rem}';
CSS += '#pn-dlogo{width:min(32rem,94vw)}#pn-dlogo input[type=file]{width:100%;margin:.6rem 0;font:inherit;font-size:.85rem;color:var(--s)}#pn-dlogo input[type=file]::file-selector-button{background:var(--a);color:var(--f);border:0;border-radius:99px;padding:.55rem 1.3rem;margin-right:.8rem;font:inherit;cursor:pointer}';
CSS += '.fs-p{width:22px;height:22px;border-radius:50%;border:1px solid var(--l);background:none;color:var(--s);font-size:.68rem;cursor:pointer;padding:0;margin-left:-.2rem}.fs-p:hover{border-color:var(--s);color:var(--t)}.fs-p.on{background:#2f8f55;border-color:#2f8f55;color:#fff}.fs-d.off{background:#2B2623;border-color:#2B2623;color:#fff}.fs-ent.fs-cer{color:#8a8178;border-color:#8a8178}.fs-ent{font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:#2f8f55;border:1px solid #2f8f55;border-radius:99px;padding:.1rem .55rem}';
CSS += '.pn-ved{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,380px);gap:1.4rem;align-items:start;margin-bottom:1.2rem}' +
'.pn-vtabs{display:flex;gap:.3rem;border-bottom:1px solid var(--l);margin:.4rem 0 .9rem}.pn-vtabs button{background:none;border:0;border-bottom:2px solid transparent;color:var(--s);font:inherit;padding:.55rem .9rem;cursor:pointer;margin-bottom:-1px}.pn-vtabs button.on{color:var(--t);border-bottom-color:var(--a);font-weight:500}.pn-vpane[hidden]{display:none}.pn-vtam .pn-opt{flex:1 1 9rem}.pn-vtam .ar{display:block;border:2px solid currentColor;border-radius:3px;margin-bottom:.5rem;opacity:.7}.pn-vtam .ar.v{width:1.1rem;height:1.95rem}.pn-vtam .ar.h{width:2.2rem;height:1.25rem}.ar.s{width:1.6rem;height:1.6rem}.pn-vtam .ar.b{width:2.2rem;height:1.25rem;border-style:double;border-width:5px}.pn-vchips{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:1rem 0}.pn-vchip{background:var(--c);border:1px solid var(--l);border-radius:12px;padding:.9rem .6rem;color:var(--t);font:inherit;cursor:pointer;text-align:center;line-height:1.3}.pn-vchip small{display:block;color:var(--s);font-size:.74rem;margin-bottom:.15rem}.pn-vchip.pri{background:var(--a);color:var(--f);border-color:var(--a)}.pn-vchip.pri small{color:inherit;opacity:.8}.pn-vchip:disabled{opacity:.6;cursor:wait}' +
'.pn-vpl{background:#0c0a08;border-radius:14px;overflow:hidden}.pn-vpl .pn-vprev{border-radius:0;min-height:0}.pn-vpl canvas{max-height:62vh;width:auto;max-width:100%}.pn-vctl{display:flex;align-items:center;gap:.7rem;padding:.6rem .9rem;color:#eee;background:#161310}.pn-vctl button{background:none;border:0;color:#fff;font-size:1.05rem;cursor:pointer;width:2rem;height:2rem}.pn-vctl input{flex:1;min-width:0;accent-color:var(--a)}.pn-vctl span{font-size:.78rem;font-variant-numeric:tabular-nums;white-space:nowrap}' +
'.pn dialog.np{width:min(64rem,95vw);padding:0;border-radius:20px;overflow:visible}.np-hd{display:flex;align-items:center;gap:.8rem;padding:1.1rem 1.6rem;border-bottom:1px solid var(--l)}.np-hd h2{margin:0 auto 0 0;font-size:1.5rem;font-weight:400;font-family:Georgia,serif}.np-hd .pn-btn{border-radius:99px;padding:.55rem 1.5rem}' +
'.np-tb{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem 1.8rem;padding:.9rem 1.6rem;border-bottom:1px solid var(--l)}.np-tb input[type=text]{flex:1 1 14rem;min-width:10rem;border:0;border-bottom:1px solid var(--l);background:none;color:var(--t);font:inherit;font-size:1.05rem;padding:.4rem 0;border-radius:0}.np-tb input[type=text]:focus{outline:0;border-bottom-color:var(--t)}' +
'.np-dd{position:relative}.np-dd>button{display:flex;align-items:center;gap:.4rem;background:none;border:0;padding:.4rem 0;color:var(--s);font:inherit;font-size:.9rem;cursor:pointer}.np-dd>button b{font-weight:500;color:var(--t)}.np-dd>button svg{width:12px;height:12px;transition:transform .15s}.np-dd.open>button svg{transform:rotate(180deg)}' +
'.np-dd ul{position:absolute;left:-1rem;top:calc(100% + .3rem);z-index:5;min-width:12rem;margin:0;padding:.4rem 0;list-style:none;background:var(--c,#fff);border:1px solid var(--l);border-radius:12px;box-shadow:0 12px 32px rgba(43,38,35,.14)}.np-dd ul[hidden]{display:none}.np-dd li button{display:block;width:100%;text-align:left;background:none;border:0;padding:.55rem 1rem;color:var(--s);font:inherit;font-size:.9rem;cursor:pointer}.np-dd li button:hover{color:var(--t);background:var(--p)}.np-dd li button.on{color:var(--t);font-weight:500}' +
'.np-pv{background:#14110f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;padding:1.6rem;min-height:26rem;border-radius:0 0 20px 20px}.np-dev{position:relative;background:#0a0a0a;padding:11px;border-radius:38px;box-shadow:0 0 0 2px #3a3633,0 18px 50px rgba(0,0,0,.55)}.np-dev canvas{display:block;border-radius:28px;background:#000}' +
'.np-dev.v canvas{height:min(58vh,540px);width:auto}.np-dev.h canvas{width:min(600px,80vw);height:auto;border-radius:26px}.np-dev.s{border-radius:26px}.np-dev.s canvas{height:min(46vh,420px);width:auto;border-radius:16px}' +
'.np-dev.v:before{content:"";position:absolute;left:50%;top:19px;width:64px;height:8px;margin-left:-32px;border-radius:99px;background:#0a0a0a;z-index:2}.np-dev.h:before{content:"";position:absolute;left:19px;top:50%;height:64px;width:8px;margin-top:-32px;border-radius:99px;background:#0a0a0a;z-index:2}.np-dev.s:before{display:none}' +
'.np-pv p{margin:0;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#a89f94;min-height:1em;text-align:center}' +
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
function seguro(msg, txt){
  return new Promise(function(res){
    var d = document.createElement('dialog'); d.style.cssText = 'width:min(24rem,92vw);text-align:center';
    d.innerHTML = '<h2 style="font-size:1.4rem">¿Estás seguro?</h2><p class="pn-s" style="margin:.6rem 0 1.2rem"></p><div class="pn-row" style="justify-content:center"><button class="pn-btn" data-r="1"></button><button class="pn-btn sec" data-r="0">Cancelar</button></div>';
    d.querySelector('p').textContent = msg; d.querySelector('[data-r="1"]').textContent = txt || (/^¿(Eliminar|Quitar)/.test(msg) ? 'Sí, eliminar' : 'Sí, continuar');
    var fin = function(v){ if (fin.hecho) return; fin.hecho = true; try { d.close(); } catch (x) {} d.remove(); res(v); };
    d.addEventListener('click', function(e){ var b = e.target.closest('[data-r]'); if (b) fin(b.dataset.r === '1'); });
    d.addEventListener('cancel', function(){ fin(false); });
    d.addEventListener('close', function(){ fin(false); });
    (root.querySelector('.pn') || root).appendChild(d); d.showModal();
  });
}
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
  try { var gx = await db.from('galleries').select('id,title_font,scene_titles').is('deleted_at', null); if (!gx.error && Array.isArray(gx.data) && Array.isArray(g.data)) { var mx = {}; gx.data.forEach(function(r){ mx[r.id] = r; }); g.data.forEach(function(r){ if (mx[r.id]) { r.title_font = mx[r.id].title_font; r.scene_titles = mx[r.id].scene_titles; } }); } } catch (e) {}
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

var TABS = [['panel', 'Panel de control'], ['detalles', 'Detalles'], ['fotos', 'Fotos y escenas'], ['diseno', 'Diseño'], ['config', 'Configuración'], ['favoritas', 'Favoritas'], ['impresiones', 'Impresiones'], ['video', 'Video'], ['compartir', 'Compartir']];
var ESTILOS = [['clasico', 'Clásico', 'Fotos con su proporción original'], ['uniforme', 'Uniforme', 'Cuadrícula ordenada, todas del mismo tamaño'], ['amplio', 'Amplio', 'Fotos grandes, menos por fila']];
var PALETAS = [['auto', 'Automática (según el evento)', '#FAFAF8', '#B8946A', '#1A1A1A'], ['arena', 'Arena y carbón', '#FAFAF8', '#B8946A', '#1A1A1A'], ['marfil', 'Marfil cálido', '#F7F3EC', '#A67C52', '#1C1917'], ['blanco', 'Blanco galería', '#FFFFFF', '#1F1F1F', '#121212'], ['oliva', 'Oliva y arena', '#F6F5F0', '#6F7F5E', '#161A17'], ['vino', 'Vino y crema', '#FBF8F5', '#8C3B3B', '#1B1516'], ['azul', 'Azul noche', '#F6F7F9', '#3F5B8C', '#14171C']];
var TITULOS = { panel: 'Descripción general', detalles: 'Detalles', fotos: 'Fotos y escenas', diseno: 'Diseño', config: 'Configuración de la galería', favoritas: 'Favoritas de los clientes', impresiones: 'Fotos para imprimir', compartir: 'Compartir', video: 'Video de fotos' };
function ayudasOn(){ try { return localStorage.getItem('pn-ay') !== 'off'; } catch(e) { return true; } }
function marcaBase(){ return (ph && (ph.watermark_default || ph.studio_name)) || 'Estudio'; }
function temaGuardado(){ try { return localStorage.getItem('pn-tema') || 'auto'; } catch(e) { return 'auto'; } }
var PAL_PANEL = [['arena', 'Arena y carbón', 'Elegante y neutra, con dorado como acento'], ['marfil', 'Marfil cálido', 'Cálida y cercana'], ['blanco', 'Blanco galería', 'Sobria, casi sin color'], ['oliva', 'Oliva y arena', 'Natural y tranquila'], ['vino', 'Vino y crema', 'Elegante y cálida'], ['azul', 'Azul noche', 'Moderna y tecnológica']];
var PAL_PANEL_COL = {'arena': ['#FAFAF8', '#B8946A', '#1A1A1A'], 'marfil': ['#F7F3EC', '#A67C52', '#1C1917'], 'blanco': ['#FFFFFF', '#1F1F1F', '#121212'], 'oliva': ['#F6F5F0', '#6F7F5E', '#161A17'], 'vino': ['#FBF8F5', '#8C3B3B', '#1B1516'], 'azul': ['#F6F7F9', '#3F5B8C', '#14171C']};
function palPanel(){ var v = 'arena'; try { v = localStorage.getItem('pn-pal') || 'arena'; } catch(e) {} return PAL_PANEL.some(function(x){ return x[0] === v; }) ? v : 'arena'; }

// ---------- Diseños del panel (10 temas): cada uno cambia colores, letra, esquinas y estilo de botones ----------
var DIS = [
  ['suave', 'Suave tipo app', { f: '#FAFAF8', c: '#FFFFFF', t: '#2B2623', s: '#7D756D', l: '#E6E3DF', a: '#B8946A', p: '#EFEDE9', hf: '"Cormorant Garamond",Georgia,serif', hw: 500, h1: '2.6rem', hl: '0', ht: 'none', rc: '18px', rb: '999px', rp: '12px', ri: '12px', rs: '999px', rd: '18px', sh: '0 1px 3px rgba(0,0,0,.06)', bt: 'none', bl: '0', bs: 'inherit', tt: 'none', tl: '0', sb: '' }],
  ['editorial', 'Editorial crema', { f: '#F4F1EB', c: '#FBF9F5', t: '#2B1D14', s: '#7C6F63', l: '#D8D0C4', a: '#8B5E3C', p: '#E7E1D6', hf: '"Cormorant Garamond",Georgia,serif', hw: 500, h1: '2.8rem', hl: '0', ht: 'none', rc: '2px', rb: '2px', rp: '0', ri: '2px', rs: '2px', rd: '2px', sh: 'none', bt: 'uppercase', bl: '.14em', bs: '.78rem', tt: 'none', tl: '0', sb: '' }],
  ['moderno', 'Moderno blanco y negro', { f: '#F3F3F0', c: '#FFFFFF', t: '#1D1D1B', s: '#777770', l: '#D4D4CD', a: '#1D1D1B', p: '#E8E8E3', hf: 'Jost,system-ui,sans-serif', hw: 500, h1: '2.2rem', hl: '-.03em', ht: 'uppercase', rc: '0', rb: '0', rp: '0', ri: '0', rs: '0', rd: '0', sh: 'none', bt: 'uppercase', bl: '.1em', bs: '.78rem', tt: 'uppercase', tl: '.06em', sb: '' }],
  ['oscura', 'Galería oscura', { f: '#141414', c: '#232323', t: '#EDE8E0', s: '#948D83', l: '#333333', a: '#C9A66B', p: '#242424', hf: '"Cormorant Garamond",Georgia,serif', hw: 500, h1: '2.6rem', hl: '0', ht: 'none', rc: '3px', rb: '3px', rp: '2px', ri: '3px', rs: '3px', rd: '4px', sh: 'none', bt: 'uppercase', bl: '.12em', bs: '.78rem', tt: 'uppercase', tl: '.1em', sb: '', fija: 1 }],
  ['lienzo', 'Lienzo minimal', { f: '#FFFFFF', c: '#FFFFFF', t: '#222222', s: '#9A9A9A', l: '#EEEEEE', a: '#222222', p: '#F5F5F5', hf: 'Jost,system-ui,sans-serif', hw: 300, h1: '2.3rem', hl: '-.02em', ht: 'none', rc: '0', rb: '0', rp: '0', ri: '0', rs: '0', rd: '0', sh: 'none', bt: 'uppercase', bl: '.08em', bs: '.78rem', tt: 'none', tl: '0', sb: '', x: '.pn[data-d="lienzo"] .pn-card,.pn[data-d="lienzo"] .pn-cifras,.pn[data-d="lienzo"] .pn-franja{border-color:transparent;background:none}' }],
  ['lateral', 'Panel lateral', { f: '#FFFFFF', c: '#FFFFFF', t: '#2A2A2A', s: '#8A8A8A', l: '#E4E4E4', a: '#111111', p: '#EEEEEE', hf: 'Jost,system-ui,sans-serif', hw: 400, h1: '1.7rem', hl: '.16em', ht: 'uppercase', rc: '0', rb: '0', rp: '0', ri: '0', rs: '0', rd: '0', sh: 'none', bt: 'uppercase', bl: '.14em', bs: '.74rem', tt: 'uppercase', tl: '.12em', sb: '#F1F1F1' }],
  ['carriles', 'Acordeón con carriles', { f: '#F6F4F0', c: '#FFFFFF', t: '#262320', s: '#857E75', l: '#E2DDD5', a: '#6B8F71', p: '#EBE7E0', hf: '"Cormorant Garamond",Georgia,serif', hw: 500, h1: '2.5rem', hl: '0', ht: 'none', rc: '8px', rb: '8px', rp: '6px', ri: '8px', rs: '6px', rd: '10px', sh: 'none', bt: 'none', bl: '0', bs: 'inherit', tt: 'none', tl: '0', sb: '' }],
  ['tiempo', 'Línea de tiempo', { f: '#FBFAF7', c: '#FFFFFF', t: '#2A2622', s: '#8B8379', l: '#E4DFD6', a: '#B5651D', p: '#F0EBE2', hf: '"Cormorant Garamond",Georgia,serif', hw: 500, h1: '2.6rem', hl: '0', ht: 'none', rc: '12px', rb: '999px', rp: '8px', ri: '10px', rs: '999px', rd: '14px', sh: 'none', bt: 'none', bl: '0', bs: 'inherit', tt: 'none', tl: '0', sb: '' }],
  ['terracota', 'Terracota cálido', { f: '#F3E6DA', c: '#FBF3EA', t: '#3B2416', s: '#8D6F5A', l: '#DCC6B3', a: '#A8643C', p: '#E8D3C0', hf: '"Cormorant Garamond",Georgia,serif', hw: 500, h1: '2.8rem', hl: '0', ht: 'none', rc: '6px', rb: '999px', rp: '4px', ri: '6px', rs: '999px', rd: '8px', sh: 'none', bt: 'none', bl: '.04em', bs: 'inherit', tt: 'none', tl: '0', sb: '' }],
  ['tarjetas', 'Tarjetas con sombra', { f: '#EFEEEA', c: '#FFFFFF', t: '#222222', s: '#7A7A75', l: '#E6E5E0', a: '#222222', p: '#F1F0EC', hf: 'Jost,system-ui,sans-serif', hw: 500, h1: '2.1rem', hl: '-.02em', ht: 'none', rc: '16px', rb: '10px', rp: '8px', ri: '10px', rs: '8px', rd: '16px', sh: '0 2px 14px rgba(0,0,0,.07)', bt: 'none', bl: '0', bs: 'inherit', tt: 'none', tl: '0', sb: '' }]
];
function disenoGuardado(){ var v = 'suave'; try { v = localStorage.getItem('pn-dis') || 'suave'; } catch(e) {} return DIS.some(function(d){ return d[0] === v; }) ? v : 'suave'; }
function disenoNombre(){ var id = disenoGuardado(); return DIS.filter(function(d){ return d[0] === id; })[0][1]; }
function disCss(){
  var c = '.pn[data-d]{font-family:Jost,system-ui,sans-serif}' +
    '.pn[data-d] h1,.pn[data-d] h2,.pn[data-d] .marca,.pn[data-d] .pn-cifras b{font-family:var(--hf);font-weight:var(--hw);text-transform:var(--ht);letter-spacing:var(--hl)}.pn[data-d] h1{font-size:var(--h1)}.pn[data-d] h2{font-size:clamp(1.15rem,calc(var(--h1) * .58),1.6rem)}' +
    '.pn[data-d] .pn-btn{border-radius:var(--rb);text-transform:var(--bt);letter-spacing:var(--bl);font-size:var(--bs)}' +
    '.pn[data-d] .pn-card,.pn[data-d] .pn-cifras,.pn[data-d] .pn-franja{border-radius:var(--rc);box-shadow:var(--sh)}' +
    '.pn[data-d] .pn-tar .cv,.pn[data-d] .pn-ph img,.pn[data-d] .pn-pbtn img,.pn[data-d] .pn-portada{border-radius:var(--rp)}' +
    '.pn[data-d] input[type=text],.pn[data-d] input[type=date],.pn[data-d] input[type=number],.pn[data-d] input[type=time],.pn[data-d] input[type=tel],.pn[data-d] input[type=email],.pn[data-d] textarea,.pn[data-d] select{border-radius:var(--ri)}' +
    '.pn[data-d] .pn-pill,.pn[data-d] .pn-as-p li,.pn[data-d] .pn-tema button,.pn[data-d] .pn-seg,.pn[data-d] .pn-seg button,.pn[data-d] aside button{border-radius:var(--rs)}' +
    '.pn[data-d] dialog{border-radius:var(--rd)}.pn[data-d] .pn-tabs button,.pn[data-d] aside button{text-transform:var(--tt);letter-spacing:var(--tl)}.pn[data-d] aside{background:var(--sb,var(--c))}' +
    '.pn-dis{margin:.2rem 0 .5rem}.pn aside .pn-dis>button{width:100%;justify-content:space-between;padding:.4rem .7rem;font-size:.82rem}.pn-dis ul{top:auto!important;bottom:calc(100% + .3rem);left:0!important;right:0;min-width:0!important;max-height:60vh;overflow:auto}.pn aside .pn-dis li button{width:100%;font-size:.85rem;border-radius:8px}';
  DIS.forEach(function(d){ var o = d[2], v = ''; ['f', 'c', 't', 's', 'l', 'p'].forEach(function(k){ v += '--' + k + ':' + o[k] + ';'; }); v += '--a:' + o.a + ';--a0:' + o.a + ';';
    ['hf', 'hw', 'h1', 'hl', 'ht', 'rc', 'rb', 'rp', 'ri', 'rs', 'rd', 'sh', 'bt', 'bl', 'bs', 'tt', 'tl'].forEach(function(k){ v += '--' + k + ':' + o[k] + ';'; }); if (o.sb) v += '--sb:' + o.sb + ';';
    c += '.pn[data-d="' + d[0] + '"]{' + v + '}' + (o.x || ''); });
  c += '.pn[data-d][data-e=dark]{--f:#1A1A1A;--t:#EDEBE8;--s:#9A948D;--l:#333;--p:#252525;--c:#202020;--a:color-mix(in srgb,var(--a0) 62%,#fff);--sb:#202020}';
  DIS.filter(function(d){ return d[2].fija; }).forEach(function(d){ var o = d[2]; c += '.pn[data-d="' + d[0] + '"][data-e]{--f:' + o.f + ';--c:' + o.c + ';--t:' + o.t + ';--s:' + o.s + ';--l:' + o.l + ';--p:' + o.p + ';--a:' + o.a + ';--sb:' + o.c + '}'; });
  return c;
}
function disenoSelHtml(){
  var id = disenoGuardado();
  return '<div class="np-dd pn-dis" id="pn-dis"><button type="button" data-act="dis-dd"><span>Diseño: <b>' + disenoNombre() + '</b></span>' + NP_CH + '</button><ul hidden>' + DIS.map(function(d){ return '<li><button type="button" data-act="dis-set" data-k="' + d[0] + '"' + (d[0] === id ? ' class="on"' : '') + '>' + d[1] + '</button></li>'; }).join('') + '</ul></div>';
}
function aplicarTema(){
  var t = temaGuardado(), e = t === 'auto' ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
  var p = root && root.querySelector('.pn'); if (p) { p.dataset.e = e; p.dataset.pa = palPanel(); p.dataset.d = disenoGuardado(); p.dataset.ay = ayudasOn() ? 'on' : 'off'; }
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
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6M16 4.5a3.5 3.5 0 010 7M18.5 14c2 .8 3 2.700 3 6"/>', cotiz: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', ia: '<path d="M12 3l1.800 4.700L18.500 9.500 13.800 11.300 12 16l-1.800-4.700L5.500 9.500l4.700-1.800z"/><path d="M18 15l.800 2.200L21 18l-2.200.800L18 21l-.800-2.200L15 18l2.200-.800z"/>', grupos: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 19c0-3.500 2.500-5 6-5s6 1.500 6 5M15 14.200c3.500-.5 6 .800 6 4.800"/>', agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>', salir: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>', cuenta: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'
};
ICO.mas = '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>';
function ico(n){ return '<svg class="pn-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[n] || '') + '</svg>'; }
function logoImg(cls, n, dato){ return dato ? '<img class="' + cls + '" alt="" src="' + esc(dato) + '">' : '<img class="' + cls + '" alt="" data-n="' + n + '" data-i="0" src="imagenes/' + n + exts(n)[0] + '">'; }
function logo(){ var c = ph.logo_para_claro || ph.logo_para_oscuro, o = ph.logo_para_oscuro || ph.logo_para_claro; return '<div class="marca">' + logoImg('lg-l', 'logo-oscuro', c) + logoImg('lg-d', 'logo-claro', o) + '</div>'; }
function pintarLado(){
  var a = root.querySelector('aside'), g = vista === 'detalle' ? gal(galId) : null, h;
  if (g) {
    h = logo() + '<button data-act="atras" class="atras mo">' + ico('atras') + 'Galerías</button>' +
      '<button data-v="inicio" class="nd">' + ico('inicio') + '<span>Inicio</span></button><button data-v="galerias" class="nd on">' + ico('galerias') + '<span>Galerías de clientes</span></button><button data-v="clientes" class="nd">' + ico('clientes') + '<span>Clientes</span></button><button data-v="cotiz" class="nd">' + ico('cotiz') + '<span>Cotizaciones</span></button><button data-v="agenda" class="nd">' + ico('agenda') + '<span>Agenda</span></button><button data-v="grupos" class="nd">' + ico('grupos') + '<span>Grupos</span></button><button data-v="ia" class="nd">' + ico('ia') + '<span>IA</span></button>' +
      TABS.map(function(t){ return '<button data-act="tab" data-t="' + t[0] + '" class="ta' + (tab === t[0] ? ' on' : '') + '">' + ico(t[0]) + '<span>' + t[1] + '</span></button>'; }).join('');
  } else {
    h = logo() + '<button data-v="inicio"' + (vista === 'inicio' ? ' class="on"' : '') + '>' + ico('inicio') + '<span>Inicio</span></button><button data-v="galerias"' + (vista === 'galerias' || vista === 'asist' ? ' class="on"' : '') + '>' + ico('galerias') + '<span>Galerías de clientes</span></button><button data-v="clientes"' + (vista === 'clientes' ? ' class="on"' : '') + '>' + ico('clientes') + '<span>Clientes</span></button><button data-v="cotiz"' + (vista === 'cotiz' ? ' class="on"' : '') + '>' + ico('cotiz') + '<span>Cotizaciones</span></button><button data-v="agenda"' + (vista === 'agenda' ? ' class="on"' : '') + '>' + ico('agenda') + '<span>Agenda</span></button><button data-v="grupos"' + (vista === 'grupos' ? ' class="on"' : '') + '>' + ico('grupos') + '<span>Grupos de graduación</span></button><button data-v="ia"' + (vista === 'ia' ? ' class="on"' : '') + '>' + ico('ia') + '<span>Selección con IA</span></button>';
  }
  var tm = temaGuardado();
  h += '<div class="pie"><button data-v="cuenta"' + (vista === 'cuenta' ? ' class="on"' : '') + '>' + ico('cuenta') + '<span>Mi cuenta</span></button>' + disenoSelHtml() + '<div class="pn-tema" role="group" aria-label="Tema">' + [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']].map(function(x){ return '<button data-act="tema" data-t="' + x[0] + '"' + (tm === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div><button data-act="salir">' + ico('salir') + '<span>Cerrar sesión</span></button></div>';
  a.innerHTML = h;
  var pnEl = root.querySelector('.pn'), bn = root.querySelector('#pn-bn');
  if (pnEl) { pnEl.classList.toggle('con-bn', !!g); if (!bn) { pnEl.insertAdjacentHTML('beforeend', '<div id="pn-bn"></div>'); bn = root.querySelector('#pn-bn'); } }
  if (!g) masAb = false;
  if (bn) bn.innerHTML = g ? navHtml() : '';
}
function navGuardar(){ try { localStorage.setItem('pn-nav', JSON.stringify({ v: vista, g: galId, t: tab, p: typeof vidPest !== 'undefined' ? vidPest : 0 })); } catch (e) {} }
function navLeer(){ try { return JSON.parse(localStorage.getItem('pn-nav') || 'null'); } catch (e) { return null; } }
function pintar(){
  AS.show = false; navGuardar();
  if (!(vista === 'detalle' && tab === 'video')) vidLiberar();
  pintarLado(); aplicarTema(); setTimeout(marcarCargadas, 0);
  if (vista === 'cuenta') return pintarCuenta();
  if (vista === 'inicio') return pintarInicio();
  if (vista === 'galerias') return pintarLista();
  if (vista === 'clientes') return pintarClientes();
  if (vista === 'cotiz') return pintarCotiz();
  if (vista === 'agenda') return pintarAgenda();
  if (vista === 'grupos') return pintarGrupos();
  if (vista === 'ia') { asistReset(); vista = 'asist'; }
  if (vista === 'asist') return pintarAsist();
  pintarDetalle();
}

async function pintarInicio(){
  var ent = gals.filter(function(g){ return g.status === 'delivered'; }).length;
  var pend = gals.filter(function(g){ return g.status === 'selection_sent'; });
  var act = pend.length ? pend.map(function(g){ return '<p><button class="pn-btn sec" data-act="abrir" data-id="' + g.id + '">' + esc(g.title) + '</button> envió su selección</p>'; }).join('')
    : '<div class="pn-vacio">' + ilus('admin-al-dia') + '<div><b>Todo al día</b><p class="pn-s">No hay selecciones nuevas por revisar.</p></div></div>';
  $('#pn-main').innerHTML = '<h1>Hola, ' + esc(ph.studio_name) + '</h1><p class="pn-s ay">Un resumen de tu estudio. Desde aquí creas una galería nueva o revisas lo que necesita tu atención.</p><div class="pn-row"><input type="text" id="pn-q" placeholder="Buscar galerías"><button class="pn-btn" data-act="nueva">+ Crear galería</button></div>' +
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
  $('#pn-main').innerHTML = '<h1>Galerías de clientes</h1><p class="pn-s ay">Aquí están las galerías que entregas. Crea una, sube las fotos y comparte el enlace con tu cliente.</p><div class="pn-row"><input type="text" id="pn-q" placeholder="Buscar por nombre" value="' + esc(busca) + '"><select id="pn-fe"><option value="">Todos los estados</option>' + op + '</select></div>' +
    '<div class="pn-rej"><button class="pn-tar nuevo" data-act="nueva"><div class="cv">+</div><h3>Agregar galería</h3></button><button class="pn-tar nuevo" data-act="asist"><div class="cv">✦</div><h3>Nueva galería asistida por IA</h3></button>' + l.map(tarjeta).join('') + '</div>' +
    (gals.length ? '' : '<div class="pn-card pn-vacio" style="margin-top:1.4rem">' + ilus('admin-vacio') + '<div><b>Aún no hay galerías</b><p class="pn-s">Crea la primera con el botón de arriba.</p></div></div>');
  $('#pn-q').addEventListener('input', function(e){ busca = e.target.value; pintarLista(); var q = $('#pn-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); });
  $('#pn-fe').addEventListener('change', function(e){ fEst = e.target.value; pintarLista(); });
}

async function abrirDetalle(id, conservar){
  galId = id; vista = 'detalle'; if (!conservar) { vidLiberar(); vidIds = []; vidTit = null; vidSub = null; vidAcento = -1; tab = 'panel'; fEsc = ''; fTipo = ''; fMas = 48; fImp = false; modoSel = false; marcadas = new Set(); } cur = null; pintar();
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
  var spm = {}, esIds = ((es && es.escenas) || []).map(function(x){ return x.id; });
  if (esIds.length) { var spr = await db.from('scene_photos').select('scene_id,photo_id').in('scene_id', esIds).limit(5000); if (!spr.error) (spr.data || []).forEach(function(x){ spm[x.scene_id + ':' + x.photo_id] = 1; }); }
  cur = { sp: spm, fotos: fotos, favs: f.data || [], vistas: vRows ? vRows.length : (v.count || 0), vrows: vRows, tk: tk, cover: cvT, escenas: (es && es.escenas) || [], conFecha: conFecha, imp: (ip && Array.isArray(ip.picks)) ? ip.picks : [], impErr: ip && ip.ok === false ? (ip.detalle || ip.error || 'error') : '' };
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
    dt('Logotipo', ph.logo_para_claro || ph.logo_para_oscuro ? 'Personalizado' : 'Por defecto', '<p class="pn-s ay">Tu logotipo aparece en las galerías de tus clientes y en los videos.</p><div class="pn-row"><button class="pn-btn" data-act="logo-abrir" type="button">Cambiar logotipos</button></div>') +
    dt('Contacto', (ph.wa_phone || ph.contact_email) ? 'Configurado' : 'Sin configurar', '<p class="pn-s ay">Aparecen como botones en la galería de tus clientes y se usarán en las cotizaciones.</p><label for="pn-cu-wa">WhatsApp (con código de país)</label><input type="tel" id="pn-cu-wa" maxlength="20" placeholder="502 5555 5555" value="' + esc(ph.wa_phone || '') + '"><label for="pn-cu-ml">Correo de contacto</label><input type="email" id="pn-cu-ml" maxlength="80" value="' + esc(ph.contact_email || '') + '"><div class="pn-row"><button class="pn-btn" data-act="cuenta-guardar" type="button">Guardar</button></div>') +
    dt('Contraseña', '', '<label for="pn-cu-p1">Nueva contraseña (mínimo 8 caracteres)</label><input type="password" id="pn-cu-p1" autocomplete="new-password"><label for="pn-cu-p2">Repite la contraseña</label><input type="password" id="pn-cu-p2" autocomplete="new-password"><div class="pn-row"><button class="pn-btn" data-act="cuenta-clave" type="button">Cambiar contraseña</button></div>') +
    dt('Preferencias del panel', ayudasOn() ? 'Con ayudas' : 'Sin ayudas', '<label class="pn-chk"><input type="checkbox" id="pn-cu-ay"' + (ayudasOn() ? ' checked' : '') + '> Mostrar ayudas y explicaciones</label><p class="pn-s ay">Si ya conoces el panel puedes ocultarlas para ver menos texto.</p>') +
    '<dialog id="pn-dlogo"><h2>Logotipos</h2>' + '<p class="pn-s ay">Sube un PNG con fondo transparente. Necesitas dos versiones: una oscura (se ve sobre fondo claro) y una clara o dorada (se ve sobre fondo oscuro). Si subes solo una, se usa en los dos modos.</p><div class="pn-logos"><div><b>Para fondo claro</b>' + pv('claro', 'logo-oscuro', ph.logo_para_claro) + '<input type="file" id="pn-lg-c" accept="image/png,image/webp,image/jpeg"><div class="pn-row"><button class="pn-btn sec" data-act="logo-quitar" data-v="claro" type="button">Volver al logo por defecto</button></div></div>' +
      '<div><b>Para fondo oscuro</b>' + pv('oscuro', 'logo-claro', ph.logo_para_oscuro) + '<input type="file" id="pn-lg-o" accept="image/png,image/webp,image/jpeg"><div class="pn-row"><button class="pn-btn sec" data-act="logo-quitar" data-v="oscuro" type="button">Volver al logo por defecto</button></div></div></div>' + '<div class="pn-row"><button class="pn-btn" data-act="logo-cerrar" type="button">Listo</button></div></dialog>' +
    '<p class="pn-s" style="margin-top:1.4rem">Versión del panel: 12 nov 2026, 12:50</p></div>';
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

var vidCal = 'fhd', vidIds = [], vidForm = 'v', vidSeg = 2.5, vidPart = true, vidCache = {}, vidTok = 0, vidBusy = false, vidCancel = false;
function cargarSlideshow(){
  if (window.Slideshow) return Promise.resolve();
  return new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = 'slideshow.js?v=27'; sc.onload = ok; sc.onerror = function(){ no(new Error('No se encontró slideshow.js en GitHub. Súbelo junto a panel.js.')); }; document.head.appendChild(sc); });
}
function vidEstado(t){ var e = $('#pn-vst'); if (e) e.textContent = t || ''; }
function vidBarra(x){ var b = $('#pn-vbar'); if (b) b.style.width = Math.round(clampN(x) * 100) + '%'; }
function clampN(x){ return Math.max(0, Math.min(1, x)); }
function vidStop(){ vidPlay = false; cancelAnimationFrame(vidRaf); vidCtl(); }
var vidEdCerrado = false;
function vidLiberar(){ if (vidBusy) return; vidStop(); vidLoadTok++; vidEsc = null; vidLogo = undefined; Object.keys(vidCache).forEach(function(k){ try { vidCache[k].bmp.close(); } catch(e) {} }); vidCache = {}; }
var VID_CONTACTO = { usuario: '@alexandergr32', gracias: '', lema: 'Fotografía y Video', contactos: [['Instagram', '@alexander_ge_erre'], ['WhatsApp', '+502 4465-8195'], ['Facebook', '@alexandergr32']] }, vidPest = 0, vidEstilo = 'papel', vidTit = null, vidSub = null, vidAcento = -1, vidMarca = true, vidEA = '', vidEB = '', vidLogo, vidTrans = 'variadas', vidTransP = 'variadas', vidSem = Math.floor(Math.random() * 4e9);
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
var VDIM = { v: [1080, 1920, 'vertical'], h: [1920, 1080, 'horizontal'], s: [1080, 1080, 'cuadrado'], f: [1080, 1350, '4x5'] };
function vidSubDef(g){ var y = String(g.event_date || g.created_at || '').slice(0, 4); return [g.gallery_type, y].filter(Boolean).join(' · '); }
function vidPalAuto(g){ var pa = PAL_VIEJA[g.palette] || g.palette; return PAL_PANEL_COL[pa] ? pa : (PAL_TIPO[g.gallery_type] || 'arena'); }
function vidPalNom(k){ for (var i = 0; i < PAL_PANEL.length; i++) if (PAL_PANEL[i][0] === k) return PAL_PANEL[i][1]; return ''; }
function vidOp(){ var g = gal(galId) || {}; return { semilla: vidSem, particulas: vidPart, estilo: vidEstilo, transicion: vidEstilo === 'pantalla' ? vidTrans : vidTransP, intro: vidMarca, logo: vidLogo || null, cierre: vidMarca, lema: vidMarca ? VID_CONTACTO.lema : '', usuario: vidMarca ? VID_CONTACTO.usuario : '', gracias: VID_CONTACTO.gracias, contactos: vidMarca ? VID_CONTACTO.contactos : [], nombre: (ph && ph.studio_name) || '', acento: PAL_PANEL_COL[vidAcento < 0 ? vidPalAuto(g) : PAL_PANEL[vidAcento][0]][1], titulo: vidTit !== null ? vidTit : (g.title || ''), subtitulo: vidSub !== null ? vidSub : vidSubDef(g), etqA: vidEA, etqB: vidEB }; }
var VFMT = { v: 'Vertical 9:16', h: 'Horizontal 16:9', s: 'Cuadrado 1:1', f: 'Vertical 4:5', ambos: 'Los tres' }, VRIT = { 3.5: 'Lento', 2.5: 'Normal', 1.5: 'Rápido' };
function mmss(x){ x = Math.max(0, Math.round(x)); return ('0' + Math.floor(x / 60)).slice(-2) + ':' + ('0' + (x % 60)).slice(-2); }
function vdDD(k, rot, ulId, items){
  return '<div class="np-dd" data-k="' + k + '"><button type="button" data-act="vd-dd">' + rot + ': <b id="vd-' + k + '"></b>' + NP_CH + '</button><ul hidden id="' + ulId + '">' + items.map(function(o){ return '<li><button type="button" class="pn-opt" data-act="' + o[0] + '" data-v="' + o[1] + '">' + o[2] + '</button></li>'; }).join('') + '</ul></div>';
}
function vdCerrar(){ root.querySelectorAll('.np-dd').forEach(function(x){ x.classList.remove('open'); var u = x.querySelector('ul'); if (u) u.hidden = true; }); }
function vdLab(){
  var t = function(id, v){ var e = $(id); if (e) e.textContent = v; };
  var fm = { v: '9:16 vertical', h: '16:9 horizontal', s: '1:1 cuadrado', f: '4:5 vertical', ambos: 'Los tres formatos' };
  t('#vd-fm', fm[vidForm] || ''); t('#vd-es', (NP_ES.filter(function(o){ return o[0] === vidEstilo; })[0] || [0, ''])[1]); t('#vd-ma', vidMarca ? 'Con inicio y cierre' : 'Sin inicio ni cierre');
  t('#vd-ri', VRIT[vidSeg] || 'Normal'); root.querySelectorAll('#pn-vr button').forEach(function(b){ b.classList.toggle('on', +b.dataset.v === vidSeg); }); var rt = $('#vs-rit'); if (rt) rt.hidden = vidEstilo === 'postales' || vidEstilo === 'carriles';
  var dv = $('#vs-dev'); if (dv) dv.className = 'np-dev ' + (vidForm === 'ambos' ? 'h' : vidForm === 'f' ? 'f' : vidForm);
  var dm = VDIM[vidForm] || VDIM.h, kq = vidCal === '4k' ? 2 : 1; t('#vs-res', dm[0] * kq + ' × ' + dm[1] * kq + ' px');
  root.querySelectorAll('#pn-vcal button').forEach(function(b){ b.classList.toggle('on', b.dataset.v === vidCal); });
}
function vdSide(){
  var F = [['h', '16:9', 'ar h'], ['v', '9:16', 'ar v'], ['s', '1:1', 'ar s'], ['f', '4:5', 'ar f']];
  return '<div class="vs-side"><div class="vs-g"><span class="vs-l">Calidad</span><div class="vs-seg" id="pn-vcal"><button type="button" data-act="vid-cal" data-v="fhd">Full HD</button><button type="button" data-act="vid-cal" data-v="4k">4K</button></div><small id="vs-res"></small></div>' +
    '<div class="vs-g"><span class="vs-l">Formato</span><div class="vs-fm" id="pn-vf">' + F.map(function(o){ return '<button type="button" class="pn-opt" data-act="vid-fmt" data-v="' + o[0] + '"><i class="' + o[2] + '"></i><span>' + o[1] + '</span></button>'; }).join('') + '</div></div></div>';
}
function vidHtml(g, sel, fin){
  var todas = fin.concat(sel);
  var thumb = function(x){ return '<figure class="pn-ph vsel" data-act="vid-foto" data-id="' + x.id + '"><span class="pn-vn"></span><img loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"><figcaption>' + esc(x.filename) + (x.photo_type === 'selection' ? ' · sel.' : '') + '</figcaption></figure>'; };
  var ES = NP_ES.map(function(o){ return ['vid-estilo', o[0], o[1]]; }), MA = [['vid-marca', 'si', 'Con inicio y cierre'], ['vid-marca', 'no', 'Sin inicio ni cierre']], RI = [['vid-ritmo-set', '3.5', 'Lento'], ['vid-ritmo-set', '2.5', 'Normal'], ['vid-ritmo-set', '1.5', 'Rápido']];
  var FMB = [['v', '9:16', 'ar v'], ['h', '16:9', 'ar h'], ['s', '1:1', 'ar s'], ['f', '4:5', 'ar f']];
  return '<div class="vs"><div class="np-tb vs-tb"><input type="text" id="pn-vtt" maxlength="60" placeholder="Nombre de la presentación" aria-label="Nombre">' + vdDD('es', 'Estilo', 'pn-ve', ES) + vdDD('ma', 'Marca', 'pn-vm', MA) + '<span id="vs-rit">' + vdDD('ri', 'Ritmo', 'pn-vr', RI) + '</span>' +
    '<button class="vs-chip" type="button" data-act="vid-trans" id="pn-ct"></button><button class="vs-chip" type="button" data-act="vid-part" id="pn-cp"></button><button class="vs-chip" type="button" data-act="vid-acento" id="pn-ca"></button></div>' +
    '<div id="pn-vtx" class="vs-tx" hidden><div><label class="pn-s" for="pn-vts" id="pn-vsl">Subtítulo (tipo de evento y año)</label><input type="text" id="pn-vts" maxlength="60"></div><div id="pn-vte" hidden><label class="pn-s" for="pn-vea">Etiqueta foto izquierda/superior (opcional)</label><input type="text" id="pn-vea" maxlength="16" placeholder="Ej.: ANTES"><label class="pn-s" for="pn-veb" style="display:block;margin-top:.6rem">Etiqueta foto derecha/inferior (opcional)</label><input type="text" id="pn-veb" maxlength="16" placeholder="Ej.: AHORA"></div></div>' +
    '<div class="np-pv vs-pv"><div class="vs-pcol"><div class="np-dev v" id="vs-dev"><canvas id="pn-vcv" width="360" height="640"></canvas></div><div class="pn-vctl vs-ctl"><button type="button" data-act="vid-play" id="pn-vplay" aria-label="Reproducir">▶</button><input type="range" id="pn-vseek" min="0" max="1000" value="0" aria-label="Posición"><span id="pn-vtm">00:00 / 00:00</span></div>' +
    '<p class="pn-s" id="pn-vinfo" style="margin:0"></p><p id="pn-vst"></p><div class="pn-vb"><i id="pn-vbar"></i></div>' +
    '<div class="vs-bar"><div class="vs-pill" id="pn-vf">' + FMB.map(function(o){ return '<button type="button" class="pn-opt" data-act="vid-fmt" data-v="' + o[0] + '"><i class="' + o[2] + '"></i>' + o[1] + '</button>'; }).join('') + '</div>' +
    '<div class="vs-pill" id="pn-vcal"><button type="button" data-act="vid-cal" data-v="fhd">Full HD</button><button type="button" data-act="vid-cal" data-v="4k">4K</button></div>' +
    '<button class="pn-btn" type="button" data-act="vid-gen" id="pn-vgen">Generar y descargar MP4</button><button class="pn-btn sec" data-act="vid-cancel" type="button" id="pn-vcan" hidden>Cancelar</button></div><small class="vs-res" id="vs-res"></small></div></div></div>' +
    '<div class="pn-card"><h2>Diapositivas</h2><p class="pn-s ay">Arrastra una foto para cambiar su lugar. Toca la × para quitarla.</p><div class="pn-vtira" id="pn-vtira"></div></div>' +
    '<dialog id="pn-dvp" style="width:min(54rem,94vw)"><h2>Agregar fotos</h2><p class="pn-s">Toca las fotos para agregarlas o quitarlas. Se suman al final, en el orden en que las toques.</p>' +
    '<div class="pn-row"><button class="pn-btn sec" data-act="vid-sel" data-v="fin" type="button"' + (fin.length ? '' : ' disabled') + '>Todas las finales (' + fin.length + ')</button><button class="pn-btn sec" data-act="vid-sel" data-v="sel" type="button"' + (sel.length ? '' : ' disabled') + '>Todas las de selección (' + sel.length + ')</button><button class="pn-btn sec" data-act="vid-sel" data-v="ninguna" type="button">Quitar todas</button></div>' +
    '<div class="pn-grid sm" id="pn-vg" style="max-height:52vh;overflow:auto;margin-top:.8rem">' + (todas.length ? todas.map(thumb).join('') : '<p class="pn-s">Esta galería aún no tiene fotos.</p>') + '</div><p class="pn-s" id="pn-vc"></p><div class="pn-row"><button class="pn-btn" data-act="vid-cerrar" type="button">Listo</button></div></dialog>';
}

var npSem = 7, npSeg = 2.5, npI = 0, npEstilo = 'carriles', npForm = 'h', npMarca = true, npFotos = null, npEsc = null, npT = 0, npRaf = 0, npTok = 0, npDeb = 0;
var NP_ES = [['papel', 'Álbum de luz'], ['pantalla', 'Marea'], ['carriles', 'Tres bandas'], ['postales', 'Postales'], ['prisma', 'Prisma'], ['estudio', 'Estudio']], NP_FM = [['h', '16:9 horizontal'], ['v', '9:16 vertical'], ['s', '1:1 cuadrado']];
var NP_CH = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 4l4 4 4-4"/></svg>', NP_RI = [[3.5, 'Lento'], [2.5, 'Normal'], [1.5, 'Rápido']], NP_IN = [[true, 'Con inicio y cierre'], [false, 'Sin inicio ni cierre']];
function npDD(k, rot, lista){
  return '<div class="np-dd" data-k="' + k + '"><button type="button" data-act="np-dd" data-k="' + k + '">' + rot + ': <b id="np-v-' + k + '"></b>' + NP_CH + '</button><ul hidden>' + lista.map(function(o){ return '<li><button type="button" data-act="np-set" data-k="' + k + '" data-v="' + o[0] + '">' + o[1] + '</button></li>'; }).join('') + '</ul></div>';
}
function npHtml(){
  return '<dialog id="pn-dnp" class="np"><div class="np-hd"><h2>Nueva presentación</h2><button class="pn-btn sec" type="button" data-act="np-cerrar">Cancelar</button><button class="pn-btn" type="button" data-act="np-cont">Continuar</button></div>' +
    '<div class="np-tb"><input type="text" id="np-n" maxlength="60" placeholder="Nombre de la presentación" aria-label="Nombre">' + npDD('fm', 'Formato', NP_FM) + npDD('es', 'Estilo', NP_ES) + npDD('ma', 'Marca', NP_IN) + '<span id="np-rit">' + npDD('ri', 'Ritmo', NP_RI) + '</span></div>' +
    '<div class="np-pv"><div class="np-dev h" id="np-dev"><canvas id="np-cv" width="640" height="360"></canvas></div><p id="np-st"></p></div></dialog>';
}
function npMarcar(){
  var d = $('#pn-dnp'); if (!d) return;
  function put(k, lista, val){ var o = lista.filter(function(x){ return String(x[0]) === String(val); })[0]; var e = $('#np-v-' + k); if (e) e.textContent = o ? o[1] : ''; d.querySelectorAll('[data-act=np-set][data-k=' + k + ']').forEach(function(b){ b.classList.toggle('on', String(b.dataset.v) === String(val)); }); }
  put('fm', NP_FM, npForm); put('es', NP_ES, npEstilo); put('ma', NP_IN, npMarca); put('ri', NP_RI, npSeg);
  var r = $('#np-rit'); if (r) r.hidden = npEstilo === 'postales' || npEstilo === 'carriles';
  var dv = $('#np-dev'); if (dv) dv.className = 'np-dev ' + npForm;
}
function npCerrarMenus(){ var d = $('#pn-dnp'); if (!d) return; d.querySelectorAll('.np-dd').forEach(function(x){ x.classList.remove('open'); x.querySelector('ul').hidden = true; }); }
function npAbrir(){
  var d = $('#pn-dnp'); if (!d) return; var g = gal(galId) || {};
  $('#np-n').value = vidTit !== null ? vidTit : (g.title || '');
  $('#np-n').oninput = function(){ clearTimeout(npDeb); npDeb = setTimeout(npPrep, 400); };
  npEstilo = vidEstilo; npForm = vidForm === 'ambos' ? 'h' : vidForm; npMarca = vidMarca; npSeg = vidSeg; npSem = Math.floor(Math.random() * 4e9);
  d.onclick = function(e){ if (!e.target.closest('.np-dd')) npCerrarMenus(); };
  d.onclose = function(){ cancelAnimationFrame(npRaf); npTok++; };
  d.showModal(); npMarcar(); npPrep();
}
async function npPrep(){
  var cv = $('#np-cv'); if (!cv) return; var mi = ++npTok; cancelAnimationFrame(npRaf);
  try {
    await cargarSlideshow();
    if (!npFotos) {
      var ls = [];
      for (var i = 1; i <= 6; i++) { $('#np-st').textContent = 'Cargando fotos de muestra… ' + i + ' de 6'; ls.push(await window.Slideshow.cargarFoto('muestras/muestra' + i + '.jpg')); if (mi !== npTok) return; }
      npFotos = ls;
    }
    if (mi !== npTok) return;
    if (npMarca && vidLogo === undefined) { try { vidLogo = await cargarLogoVideo(); } catch (e) { vidLogo = null; } if (mi !== npTok) return; }
    var dm = VDIM[npForm] || VDIM.h, sc = 640 / Math.max(dm[0], dm[1]), W = Math.round(dm[0] * sc), H = Math.round(dm[1] * sc), g = gal(galId) || {};
    cv.width = W; cv.height = H;
    npEsc = window.Slideshow.crearEscena(npFotos, W, H, npSeg, { semilla: npSem, particulas: true, estilo: npEstilo, transicion: 'variadas', intro: npMarca, logo: (npMarca && vidLogo) || null, cierre: npMarca, lema: npMarca ? VID_CONTACTO.lema : '', usuario: npMarca ? VID_CONTACTO.usuario : '', gracias: VID_CONTACTO.gracias, contactos: npMarca ? VID_CONTACTO.contactos : [], nombre: (ph && ph.studio_name) || '', acento: PAL_PANEL_COL[vidPalAuto(g)][1], titulo: $('#np-n').value, subtitulo: vidSubDef(g) || ('Evento · ' + new Date().getFullYear()), etqA: '', etqB: '' });
    npI = npMarca ? window.Slideshow.duracionTotal(npFotos.length, npSeg, npEstilo, true) - window.Slideshow.duracionTotal(npFotos.length, npSeg, npEstilo, false) : 0;
    $('#np-st').textContent = 'Vista previa'; npT = 0; npLoop();
  } catch (e) { if (mi === npTok) $('#np-st').textContent = 'No se pudo cargar la vista previa. ¿Subiste la carpeta «muestras» a GitHub?'; }
}
function npLoop(){
  cancelAnimationFrame(npRaf); var last = performance.now();
  (function f(now){
    var d = $('#pn-dnp'), cv = $('#np-cv'); if (!d || !d.open || !npEsc || !cv) return;
    npT += (now - last) / 1000; last = now; if (npT >= npEsc.duracion) npT = npI;
    try { npEsc.dibujar(cv.getContext('2d'), Math.min(npT, npEsc.duracion - 0.001)); } catch (e) {}
    npRaf = requestAnimationFrame(f);
  })(last);
}
function vidPestana(){ root.querySelectorAll('#pn-vtabs button').forEach(function(b){ b.classList.toggle('on', +b.dataset.v === vidPest); b.setAttribute('aria-selected', +b.dataset.v === vidPest); }); root.querySelectorAll('.pn-vpane').forEach(function(d){ d.hidden = +d.dataset.p !== vidPest; }); }
function vidRefrescar(){ vidPestana(); vdLab(); root.querySelectorAll('#pn-vf .pn-opt').forEach(function(o){ o.classList.toggle('on', o.dataset.v === vidForm); });
  var n = vidIds.length;
  root.querySelectorAll('#pn-vg .pn-ph').forEach(function(f){ var i = vidIds.indexOf(f.dataset.id); f.classList.toggle('on', i >= 0); var b = f.querySelector('.pn-vn'); if (b) b.textContent = i >= 0 ? i + 1 : ''; });
  var c = $('#pn-vc'); if (c) c.textContent = n ? n + (n === 1 ? ' foto elegida' : ' fotos elegidas') : 'Aún no has elegido fotos.';
  var tr = $('#pn-vtira');
  if (tr) tr.innerHTML = '<button class="pn-vadd" data-act="vid-agregar" type="button"><b>+</b><span>Agregar fotos</span></button>' + vidIds.map(function(id, i){ return '<div class="pn-vt" draggable="true" data-i="' + i + '"><img draggable="false" alt="" src="' + (cur.tk[id] ? esc(src(cur.tk[id])) : '') + '"><i>' + (i + 1) + '</i>' + (vidEstilo === 'prisma' ? '<em class="pn-vl' + (i === n - 1 && n % 2 ? ' no' : '') + '">Par ' + (Math.floor(i / 2) + 1) + '</em>' : '') + '<button type="button" data-act="vid-quitar" data-i="' + i + '" aria-label="Quitar">×</button></div>'; }).join('');
  var inf = $('#pn-vinfo'); if (inf) inf.textContent = n ? (vidEstilo === 'prisma' ? Math.floor(n / 2) + (Math.floor(n / 2) === 1 ? ' par' : ' pares') + (n % 2 ? ' (la última foto sobra: falta su pareja)' : '') : n + (n === 1 ? ' diapositiva' : ' diapositivas')) + ' · ' + mmss(window.Slideshow ? window.Slideshow.duracionTotal(n, vidSeg, vidEstilo, vidMarca) : n * vidSeg) + ' de duración' : 'Aún no hay fotos. Toca «Agregar fotos» en la tira de abajo.';
  var chip = function(id, t, v){ var e = $(id); if (e) e.innerHTML = '<small>' + t + '</small>' + v; };
  root.querySelectorAll('#pn-ve .pn-opt').forEach(function(o){ o.classList.toggle('on', o.dataset.v === vidEstilo); }); root.querySelectorAll('#pn-vm .pn-opt').forEach(function(o){ o.classList.toggle('on', (o.dataset.v === 'si') === vidMarca); }); chip('#pn-cr', 'Ritmo', VRIT[vidSeg] || 'Normal'); chip('#pn-cp', 'Partículas', vidPart ? 'Sí' : 'No');
  var cpp = $('#pn-cp'); if (cpp) cpp.hidden = vidEstilo !== 'papel'; var cta = $('#pn-ct'); if (cta) cta.hidden = vidEstilo === 'prisma' || vidEstilo === 'carriles' || vidEstilo === 'postales' || vidEstilo === 'estudio'; var cac = $('#pn-ca'); if (cac) { cac.hidden = !(vidEstilo === 'prisma' || vidEstilo === 'carriles' || vidEstilo === 'postales'); cac.innerHTML = '<small>Color del título</small>' + (vidAcento < 0 ? 'Automático · ' + vidPalNom(vidPalAuto(gal(galId) || {})) : PAL_PANEL[vidAcento][1]); }
  chip('#pn-ct', 'Transiciones', vidEstilo === 'pantalla' ? { variadas: 'Variadas', desliza: 'Deslizar de lado', disuelve: 'Disolver' }[vidTrans] : { variadas: 'Variadas (todas las direcciones)', der: 'Hacia la derecha', izq: 'Hacia la izquierda', arriba: 'Hacia arriba', abajo: 'Hacia abajo' }[vidTransP]);
  var g0 = gal(galId) || {}, o0 = vidOp(); if ($('#pn-vtt') && document.activeElement !== $('#pn-vtt')) $('#pn-vtt').value = o0.titulo; var tx = $('#pn-vtx'); if (tx) { tx.hidden = vidEstilo === 'papel'; if ($('#pn-vts') && document.activeElement !== $('#pn-vts')) $('#pn-vts').value = o0.subtitulo; var te = $('#pn-vte'); if (te) { te.hidden = vidEstilo !== 'prisma'; if ($('#pn-vea') && document.activeElement !== $('#pn-vea')) $('#pn-vea').value = vidEA; if ($('#pn-veb') && document.activeElement !== $('#pn-veb')) $('#pn-veb').value = vidEB; } }
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
  if (ids.length < 2) {
    try {
      await cargarSlideshow();
      if (!npFotos) { var ls = []; for (var q = 1; q <= 6; q++) ls.push(await window.Slideshow.cargarFoto('muestras/muestra' + q + '.jpg')); npFotos = ls; }
      if (mi !== vidLoadTok) return;
      if (vidMarca && vidLogo === undefined) { try { vidLogo = await cargarLogoVideo(); } catch (e) { vidLogo = null; } }
      var dm0 = VDIM[vidForm] || VDIM.v, sc0 = 640 / Math.max(dm0[0], dm0[1]), cv0 = $('#pn-vcv'); if (!cv0) return;
      cv0.width = Math.round(dm0[0] * sc0); cv0.height = Math.round(dm0[1] * sc0);
      vidEsc = window.Slideshow.crearEscena(npFotos, cv0.width, cv0.height, vidSeg, vidOp()); vidT = 0; vidDibuja(); vidCtl();
      vidEstado('Vista de muestra · agrega fotos para ver las tuyas.'); if (!vidPlay) vidPlayToggle();
    } catch (e) { vidEsc = null; vidT = 0; vidDibuja(); vidCtl(); vidEstado(ids.length ? 'Agrega al menos una foto más.' : ''); }
    return;
  }
  try {
    await cargarSlideshow(); if (vidMarca && vidLogo === undefined) vidLogo = await cargarLogoVideo();
    var fotos = await vidCargar(ids, function(k, n){ vidEstado('Preparando vista previa… foto ' + (k + 1) + ' de ' + n); vidBarra((k + 1) / n); }, function(){ return mi !== vidLoadTok; });
    if (mi !== vidLoadTok) return;
    vidEstado('Preparando el detector de rostros… (puede tardar unos segundos)');
    await window.Slideshow.detectarCaras(fotos, function(k, n){ vidEstado('Detectando rostros… foto ' + (k + 1) + ' de ' + n); vidBarra((k + 1) / n); }, function(){ return mi !== vidLoadTok; });
    if (mi !== vidLoadTok) return;
    var dm = VDIM[vidForm] || VDIM.v, sc = 640 / Math.max(dm[0], dm[1]), W = Math.round(dm[0] * sc), H = Math.round(dm[1] * sc);
    cv.width = W; cv.height = H;
    vidEsc = window.Slideshow.crearEscena(fotos, W, H, vidSeg, vidOp());
    vidT = Math.min(vidT, vidEsc.duracion - 0.01); vidBarra(0); vidEstado(''); vidDibuja(); vidCtl(); if (!vidPlay) vidPlayToggle();
  } catch(e) { if (e && e.message === 'cancelado') return; vidBarra(0); vidEstado(e && e.message ? e.message : 'No se pudo preparar la vista previa.'); }
}
function vidPlayToggle(){
  if (vidPlay) return vidStop();
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
    await window.Slideshow.detectarCaras(fotos, function(k, n){ vidEstado('Detectando rostros… foto ' + (k + 1) + ' de ' + n); vidBarra(0.25 + k / Math.max(1, n) * 0.05); }, function(){ return vidCancel; });
    var fmts = vidForm === 'ambos' ? ['v', 'h', 's'] : [vidForm];
    for (var q = 0; q < fmts.length; q++) {
      var dm2 = VDIM[fmts[q]] || VDIM.v, kq = vidCal === '4k' ? 2 : 1, W = dm2[0] * kq, H = dm2[1] * kq, esc2 = window.Slideshow.crearEscena(fotos, W, H, vidSeg, vidOp());
      vidEstado('Creando el video ' + dm2[2] + '… no cierres esta pestaña.');
      var blob = await window.Slideshow.exportar(esc2, { fps: 30, bitrate: kq === 2 ? 28e6 : 8e6, codecs: kq === 2 ? ['avc1.640033', 'avc1.640034', 'avc1.4D0033'] : undefined, cancelado: function(){ return vidCancel; }, progreso: function(x){ vidBarra(0.25 + 0.75 * (q + x) / fmts.length); vidEstado('Creando el video ' + dm2[2] + '… ' + Math.round(x * 100) + '%'); } });
      var u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'slideshow-' + slug(g ? g.title : 'galeria') + '-' + (vidEstilo === 'pantalla' ? 'pantalla-' : vidEstilo === 'prisma' ? 'prisma-' : vidEstilo === 'carriles' ? 'bandas-' : vidEstilo === 'postales' ? 'postales-' : vidEstilo === 'estudio' ? 'estudio-' : '') + dm2[2] + (kq === 2 ? '-4k' : '') + (vidMarca ? '' : '-sin-logo') + '.mp4'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 60000);
    }
    vidSem = Math.floor(Math.random() * 4e9); vidBarra(1); fin = 'Listo. El video se descargó en tu computadora.';
  } catch(e) { vidBarra(0); fin = e && e.message === 'cancelado' ? 'Cancelado.' : 'No se pudo crear el video: ' + (e && e.message ? e.message : 'error') + (vidCal === '4k' ? ' Si tu equipo no soporta 4K, elige Full HD.' : ''); }
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
    var TIPOS = ['Boda', 'Clausura', 'Graduación', 'Quinceañera', 'Baby shower', 'Cumpleaños', 'Fiesta infantil', 'Sesión familiar', 'Sesión de retrato', 'Evento corporativo', 'Revelación de género', 'Otro'];
    cuerpo = '<div class="pn-card"><label class="pn-s">Nombre de la galería</label><input type="text" id="pn-dt" value="' + esc(g.title) + '"><label class="pn-s" style="display:block;margin-top:.9rem">Fecha del evento</label><input type="date" id="pn-dd" value="' + esc(g.event_date || '') + '">' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Tipo de galería</label><select id="pn-dtp"><option value="">Sin tipo</option>' + TIPOS.map(function(t){ return '<option' + (g.gallery_type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Ubicación</label><input type="text" id="pn-dub" maxlength="80" value="' + esc(g.location || '') + '">' +
      '<label class="pn-s" style="display:block;margin-top:.9rem">Descripción (la ve el cliente bajo el título)</label><textarea id="pn-dde" rows="3" maxlength="300" style="width:100%">' + esc(g.description || '') + '</textarea>' +
      '<div class="pn-row"><button class="pn-btn" data-act="guardar-detalles">Guardar</button></div></div>';
  } else if (tab === 'fotos') {
    cuerpo = '<dialog id="pn-dsub"><h2>Subir fotos</h2><div class="pn-rc"><label class="pn-rcl"><input type="radio" name="pn-dest" value="selection" checked><span class="d"></span><span><b>Selección</b><small>Se reducen según la calidad de Configuración</small></span></label><label class="pn-rcl"><input type="radio" name="pn-dest" value="final"><span class="d"></span><span><b>Finales</b><small>Originales, hasta 45 MB</small></span></label></div>' +
      (cur.escenas && cur.escenas.length ? '<div class="pn-marcaui"><label class="pn-s" for="pn-esc">Escena de destino</label><select id="pn-esc"><option value="">Sin escena</option>' + cur.escenas.map(function(e){ return '<option value="' + e.id + '"' + (fEsc === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('') + '</select></div>' : '') + '<p class="pn-s pn-marcaui" id="pn-mbox">De cada foto se guardan dos versiones: limpia y con marca de agua. En Configuración eliges cuál ve tu cliente.</p>' +
      '<label class="pn-dz" id="pn-dz"><input type="file" id="pn-file" accept="image/jpeg,image/png,image/webp,image/tiff" multiple><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4"/></svg><b id="pn-dzt">Arrastra tus fotos aquí</b><span class="pn-s" id="pn-dzs">o toca para elegirlas desde tu equipo</span></label>' +
      '<div class="pn-row"><button class="pn-btn" data-act="subir" id="pn-go" disabled>Subir</button><button class="pn-btn sec" data-act="cerrar-subir" type="button">Cancelar</button></div><ul id="pn-prog"></ul></dialog>' +
      fotosVista(g, sel, fin);
  } else if (tab === 'diseno') {
    cuerpo = dsHtml(g, sel);
  } else if (tab === 'config') {
    wmSw = g.selection_watermark === false ? '0' : '1';
    cuerpo = '<div class="pn-card"><h2>Marca de agua</h2><p class="pn-s">Texto que se graba en las fotos de selección que subas a partir de ahora. Las que ya subiste tienen la marca grabada; para cambiarla hay que subirlas de nuevo.</p><input type="text" id="pn-wt" maxlength="40" value="' + esc(g.watermark_text || marcaBase()) + '">' +
      '<div class="np-tb wm-tb">' + wmDD('sw', 'Marca en selección', WM_ON) + wmDD('tam', 'Tamaño', WM_TAM) + wmDD('op', 'Opacidad', WM_OP) + '</div><div class="wm-pv"><canvas id="pn-wp" width="360" height="240"></canvas><p class="pn-s">Así se verá en una foto. Se guarda en este computador y aplica a todas tus galerías.</p></div></div>' +
      '<div class="pn-card"><h2>Calidad de las fotos de selección</h2><p class="pn-s">Tamaño con el que tu cliente ve las fotos que subas a partir de ahora. Más calidad se ve mejor pero pesa más.</p><select id="pn-vq"><option value="baja"' + (g.view_quality === 'baja' ? ' selected' : '') + '>Baja (ligera, 1000 px)</option><option value="media"' + (!g.view_quality || g.view_quality === 'media' ? ' selected' : '') + '>Media (1600 px)</option><option value="alta"' + (g.view_quality === 'alta' ? ' selected' : '') + '>Alta (2400 px)</option></select></div>' +
      '<div class="pn-card"><h2>Fotos finales y pago</h2><p class="pn-s">Controla si tu cliente ve y descarga las finales sin marca de agua. Mientras estén bloqueadas, las ve con marca de agua y no puede descargarlas.</p><select id="pn-fl"><option value="0"' + (g.finals_locked ? '' : ' selected') + '>Liberadas: sin marca de agua y con descarga</option><option value="1"' + (g.finals_locked ? ' selected' : '') + '>Bloqueadas: con marca de agua, sin descarga (hasta recibir el pago)</option></select><p class="pn-s">Las finales que subas desde ahora guardan una vista con marca de agua. Las que ya subiste antes deben subirse de nuevo para poder bloquearse.</p></div>' +
      '<div class="pn-card"><h2>Caducidad</h2><p class="pn-s">Después de esta fecha el cliente ya no podrá abrir la galería. Déjala vacía para que no caduque.</p><input type="date" id="pn-ex" value="' + esc(fechaCad(g)) + '"></div>' +
      '<div class="pn-row"><button class="pn-btn" data-act="guardar-config">Guardar cambios</button></div>' +
      '<div class="pn-card"><h2>Eliminar galería</h2><p class="pn-s">Se borran la galería y todas sus fotos. No se puede deshacer.</p><button class="pn-btn rojo" data-act="eliminar-galeria">Eliminar galería</button></div>';
  } else if (tab === 'video') {
    cuerpo = '<div class="pn-card pn-vabre"><h2>Video</h2><p class="pn-s">Crea un video con las fotos de esta galería.</p><button class="pn-btn" type="button" data-act="vid-abrir-ed">Abrir editor de video</button></div>' +
      '<dialog id="pn-dvid" class="np vs-dlg"><div class="np-hd"><h2>Presentación de video</h2><button class="pn-btn sec" type="button" data-act="vid-cerrar-ed">Cerrar</button></div>' + vidHtml(g, sel, fin) + '</dialog>';
  } else if (tab === 'favoritas') {
    var nombre = {}; cur.fotos.forEach(function(x){ nombre[x.id] = x.filename; });
    var por = {}; cur.favs.forEach(function(x){ (por[x.visitor_token] = por[x.visitor_token] || []).push(x.photo_id); });
    var vis = Object.keys(por), escNom = {}, escDe = {}, usadosF = {};
    (cur.escenas || []).forEach(function(e){ escNom[e.id] = e.name; }); cur.fotos.forEach(function(x){ escDe[x.id] = x.scene_id || ''; });
    var favTit = function(ids, i){
      if (!(cur.escenas || []).length) return 'Invitado ' + (i + 1);
      var cnt = {}; ids.forEach(function(id){ var sc = escDe[id] || ''; cnt[sc] = (cnt[sc] || 0) + 1; });
      var nm = Object.keys(cnt).sort(function(a, b){ return cnt[b] - cnt[a]; }).map(function(sc){ return sc ? (escNom[sc] || 'Escena') : 'Sin escena'; });
      var t = nm.length === 1 ? nm[0] : nm.slice(0, 2).join(' + ') + (nm.length > 2 ? ' +' + (nm.length - 2) : '');
      usadosF[t] = (usadosF[t] || 0) + 1; return usadosF[t] > 1 ? t + ' (' + usadosF[t] + ')' : t;
    };
    cuerpo = vis.length ? vis.map(function(k, i){
      var ids = por[k].sort(function(a, b){ return String(nombre[a]).localeCompare(String(nombre[b])); });
      var nom = ids.map(function(id){ return nombre[id] || '?'; }).join(', ');
      var cuerpoF = favVer === 'det' ? '<ol class="fv-lista">' + ids.map(function(id){ return '<li>' + esc(nombre[id] || '?') + '</li>'; }).join('') + '</ol>'
        : '<div class="pn-grid fv-' + favVer + '">' + ids.map(function(id){
          return '<figure class="pn-ph"><img loading="lazy" alt="" title="' + esc(nombre[id] || '?') + '" src="' + (cur.tk[id] ? esc(src(cur.tk[id])) : '') + '"><figcaption>' + esc(nombre[id] || '?') + '</figcaption></figure>';
        }).join('') + '</div>';
      return '<div class="pn-card"><h2>' + esc(favTit(ids, i)) + ' · ' + ids.length + (ids.length === 1 ? ' foto' : ' fotos') + '</h2>' + cuerpoF + '<div class="pn-row"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(nom) + '">Copiar nombres</button></div></div>';
    }).reduce(function(a, b){ return a + b; }, favBarra())
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
    var fila = function(et, v, cod){ return '<p class="pn-s">' + et + '</p><div class="pn-copia"><input type="text" readonly value="' + esc(v) + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(v) + '">Copiar</button><button class="pn-btn sec" data-act="qr" data-t="' + esc(v) + '" data-n="' + esc(g.title) + '">QR</button><button class="pn-btn sec" data-act="wa" data-t="' + esc(msgCliente(v, cod)) + '">WhatsApp</button></div>'; };
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
  if (cur && tab === 'video') { vidIniciar(); var dv = $('#pn-dvid'); if (dv && !dv.open && !vidEdCerrado) { try { dv.showModal(); } catch (e) {} } }
  if (cur && tab === 'config') { wmLab(); var wti = $('#pn-wt'); if (wti) wti.oninput = wmLab; }
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
var WM_OP = [['22', 'Baja'], ['35', 'Media'], ['52', 'Alta']], WM_TAM = [['s', 'Pequeña'], ['m', 'Mediana'], ['l', 'Grande']], WM_ON = [['1', 'Activada'], ['0', 'Desactivada']], wmSw = '1';
function wmCfg(){ var o = { op: 35, tam: 's' }; try { var j = JSON.parse(localStorage.getItem('pn-wm') || '{}'); if (+j.op) o.op = +j.op; if (j.tam === 'm' || j.tam === 'l' || j.tam === 's') o.tam = j.tam; } catch (e) {} return o; }
function wmGuardar(o){ try { localStorage.setItem('pn-wm', JSON.stringify(o)); } catch (e) {} }
function wmDD(k, rot, lista){ return '<div class="np-dd" data-k="' + k + '"><button type="button" data-act="vd-dd">' + rot + ': <b id="wd-' + k + '"></b>' + NP_CH + '</button><ul hidden>' + lista.map(function(o){ return '<li><button type="button" data-act="wm-set" data-k="' + k + '" data-v="' + o[0] + '">' + o[1] + '</button></li>'; }).join('') + '</ul></div>'; }
function wmLab(){
  var c = wmCfg(), t = function(id, lista, v){ var o = lista.filter(function(x){ return String(x[0]) === String(v); })[0], e = $(id); if (e) e.textContent = o ? o[1] : ''; };
  t('#wd-sw', WM_ON, wmSw); t('#wd-op', WM_OP, c.op); t('#wd-tam', WM_TAM, c.tam);
  root.querySelectorAll('[data-act=wm-set]').forEach(function(b){ var v = b.dataset.k === 'sw' ? wmSw : b.dataset.k === 'op' ? String(c.op) : c.tam; b.classList.toggle('on', b.dataset.v === v); });
  var cv = $('#pn-wp'); if (!cv) return;
  var tk = ++wmTok, tx = ($('#pn-wt') && $('#pn-wt').value.trim()) || marcaBase();
  var im = new Image(); im.onload = function(){ if (tk !== wmTok) return; var w = 360, h = Math.round(w * im.height / im.width); cv.width = w; cv.height = h; var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, w, h); if (wmSw !== '0') marcar(cx, w, h, { text: tx, opacity: c.op, size: c.tam }); };
  im.src = 'muestras/muestra3.jpg';
}
var wmTok = 0;
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
  var wc = wmCfg(); return { text: (g && g.watermark_text) || marcaBase(), opacity: wc.op, size: wc.tam };
}
function mostrarMarca(){
  var box = $('#pn-mbox'); if (!box) return;
  var fin = root.querySelector('input[name=pn-dest]:checked').value === 'final';
  box.hidden = fin;
}
var ERR = { muy_grande: 'pesa más de 45 MB', formato: 'formato no permitido (usa JPG, PNG, WEBP o TIFF)', sin_sesion: 'tu sesión caducó, vuelve a entrar', registro: 'no se pudo registrar', galeria: 'galería no encontrada' };

// ---------- Cola de subida en segundo plano ----------
var cola = { trabajos: [], activos: 0, total: 0, hechas: 0, fallos: [], gids: {} };
function subiendo(){ return cola.activos > 0 || cola.trabajos.length > 0 || !!(AS && AS.creando); }
window.addEventListener('beforeunload', function(e){ if (subiendo()) { e.preventDefault(); e.returnValue = ''; } });
function pintarCola(){
  var el = document.getElementById('pn-up'); if (!el) return;
  if (!cola.total) { el.hidden = true; return; }
  el.hidden = false;
  var fin = !subiendo(), pct = Math.round(cola.hechas / cola.total * 100);
  el.innerHTML = '<div class="pn-up-t"><b>' + (fin ? 'Subida terminada' : (cola.titulo || 'Subiendo fotos…')) + '</b><span>' + cola.hechas + ' de ' + cola.total + '</span></div>' +
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
        var wc2 = wmCfg(), pv = await reducir(f, { text: t.texto || marcaBase(), opacity: wc2.op, size: wc2.tam }, t.tipo === 'selection' ? t.cal : 'media');
        var rp = await fetch(W + '/api/upload-preview?photo=' + d.photo.id, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'image/jpeg' }, body: pv.blob });
        var dp = await rp.json().catch(function(){ return {}; }); okp = !!dp.ok;
      } catch (e) {}
    }
    if (!okp && t.tipo === 'selection') { try { await api('/api/admin/delete-photos', { photos: [d.photo.id] }); } catch (e) {} throw new Error('no se pudo guardar la versión con marca de agua, vuelve a subirla'); }
  }
  return d.photo ? d.photo.id : null;
}
async function correrCola(){
  while (cola.trabajos.length) {
    var t = cola.trabajos.shift(); cola.activos++; pintarCola();
    try { await subirUna(t); cola.gids[t.gid] = 1; }
    catch (e) { cola.fallos.push(t.file.name + ': ' + (e.message || 'error')); }
    cola.activos--; cola.hechas++; pintarCola();
  }
}
var DZ_OK = /\.(jpe?g|png|webp|tiff?)$/i;
function dzActualizar(){
  var f = $('#pn-file'), t = $('#pn-dzt'), sb = $('#pn-dzs'), go = $('#pn-go'), z = $('#pn-dz'); if (!f || !t) return;
  var n = f.files ? f.files.length : 0, mb = 0; for (var i = 0; i < n; i++) mb += f.files[i].size;
  t.textContent = n ? (n + (n === 1 ? ' foto lista para subir' : ' fotos listas para subir')) : 'Arrastra tus fotos aquí';
  sb.textContent = n ? (mb / 1048576 < 1 ? '< 1 MB' : Math.round(mb / 1048576) + ' MB') + ' · toca o arrastra más para cambiar la selección' : 'o toca para elegirlas desde tu equipo';
  if (go) go.disabled = !n; if (z) z.classList.toggle('lleno', !!n);
}
function dzPoner(lista){
  var f = $('#pn-file'); if (!f) return;
  var arr = Array.from(lista || []), ok = arr.filter(function(x){ return /^image\/(jpeg|png|webp|tiff)$/.test(x.type) || DZ_OK.test(x.name); });
  var dt = new DataTransfer(); ok.forEach(function(x){ dt.items.add(x); }); f.files = dt.files; dzActualizar();
  if (arr.length > ok.length) aviso((arr.length - ok.length) + (arr.length - ok.length === 1 ? ' archivo no es una foto válida y se omitió.' : ' archivos no son fotos válidas y se omitieron.'));
}
function dzTieneArchivos(e){ var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; }
var dzIniciado = false;
function dzIniciar(){
  if (dzIniciado) return; dzIniciado = true;
  root.addEventListener('change', function(e){ if (e.target && e.target.id === 'pn-file') dzActualizar(); });
  root.addEventListener('dragover', function(e){ var z = e.target.closest && e.target.closest('#pn-dz'); if (z && dzTieneArchivos(e)) { e.preventDefault(); z.classList.add('sobre'); } });
  root.addEventListener('dragleave', function(e){ var z = e.target.closest && e.target.closest('#pn-dz'); if (z) z.classList.remove('sobre'); });
  root.addEventListener('drop', function(e){ var z = e.target.closest && e.target.closest('#pn-dz'); if (!z || !dzTieneArchivos(e)) return; e.preventDefault(); z.classList.remove('sobre'); dzPoner(e.dataTransfer.files); });
  var ov = function(){ return $('#pn-dzov'); }, enFotos = function(){ return vista === 'detalle' && tab === 'fotos' && cur && !($('#pn-dsub') && $('#pn-dsub').open); };
  window.addEventListener('dragenter', function(e){ if (dzTieneArchivos(e) && enFotos() && ov()) ov().hidden = false; });
  window.addEventListener('dragover', function(e){ if (dzTieneArchivos(e) && enFotos()) e.preventDefault(); });
  window.addEventListener('dragleave', function(e){ if (!e.relatedTarget && ov()) ov().hidden = true; });
  window.addEventListener('drop', function(e){
    if (!dzTieneArchivos(e)) return; if (ov()) ov().hidden = true;
    if (!enFotos()) return; e.preventDefault();
    var fl = e.dataTransfer.files, d = $('#pn-dsub'); if (!d) return;
    var selE = $('#pn-esc'); if (selE) selE.value = fEsc && fEsc !== '_none' && fEsc !== '_ninguna' ? fEsc : '';
    d.showModal(); dzPoner(fl);
  });
}
async function subirTodo(){
  var files = Array.from($('#pn-file').files); if (!files.length) return;
  var tipo = root.querySelector('input[name=pn-dest]:checked').value, g0 = gal(galId);
  var base = { tipo: tipo, marca: null, gid: galId, cal: (g0 && g0.view_quality) || 'media', texto: g0 && g0.watermark_text, esc: $('#pn-esc') && $('#pn-esc').value ? $('#pn-esc').value : '' };
  if (!subiendo()) { cola.total = 0; cola.hechas = 0; cola.fallos = []; cola.gids = {}; }
  files.forEach(function(f){ cola.trabajos.push(Object.assign({ file: f }, base)); }); cola.total += files.length;
  $('#pn-file').value = ''; dzActualizar(); try { $('#pn-dsub').close(); } catch (e) {} pintarCola();
  aviso('Subiendo ' + files.length + (files.length === 1 ? ' foto' : ' fotos') + ' en segundo plano. Puedes seguir trabajando.');
  var corriendo = cola.activos;
  var hilos = Math.max(0, 3 - corriendo); var ps = [];
  for (var k = 0; k < hilos; k++) ps.push(correrCola());
  await Promise.all(ps);
  if (!subiendo()) { aviso(cola.fallos.length ? 'Subida terminada con ' + cola.fallos.length + ' error(es).' : 'Subida terminada.'); if (vista === 'detalle' && cola.gids[galId]) await abrirDetalle(galId, true); }
}

function escenasCard(g, sel, fin){
  var es = cur.escenas || [], todas = sel.concat(fin);
  var cuenta = function(id){ return todas.filter(function(x){ return x.scene_id === id || spTiene(id, x.id); }).length; };
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
  return '<div class="pn-card"><h2>Enlaces para invitados</h2><p class="pn-s">Saca el enlace de toda la galería o de una sola escena, por ejemplo para tu familia.</p><div class="pn-row"><button class="pn-btn" data-act="enl-abrir" type="button">Obtener enlace</button></div></div>';
}
var FAV_VER = [['muy', 'Muy grandes'], ['gra', 'Grandes'], ['peq', 'Pequeñas'], ['det', 'Detalles (solo nombres)']];
var favVer = (function(){ var v = 'muy'; try { v = localStorage.getItem('pn-favver') || 'muy'; } catch (e) {} return FAV_VER.some(function(x){ return x[0] === v; }) ? v : 'muy'; })(), favMenu = false;
function favBarra(){
  var act = FAV_VER.filter(function(x){ return x[0] === favVer; })[0];
  return '<div class="fv-tb"><div class="fv-wr"><button type="button" class="pn-btn sec" data-act="fav-menu" aria-haspopup="true" aria-expanded="' + favMenu + '">Ver: ' + act[1] + ' ▾</button>' +
    (favMenu ? '<div class="fv-mn" role="menu">' + FAV_VER.map(function(x){ return '<button type="button" role="menuitemradio" aria-checked="' + (x[0] === favVer) + '" data-act="fav-ver" data-k="' + x[0] + '" class="' + (x[0] === favVer ? 'on' : '') + '"><i>' + (x[0] === favVer ? '●' : '') + '</i>' + x[1] + '</button>'; }).join('') + '</div>' : '') + '</div></div>';
}
var enlPaso = 'lista', enlEsc = null;
function nFotosEsc(id){ return cur.fotos.filter(function(x){ return x.scene_id === id || spTiene(id, x.id); }).length; }
function enlHtml(){
  var g = gal(galId), es = cur.escenas || [];
  var cab = '<header class="en-h">' + (enlPaso === 'link' && es.length ? '<button type="button" class="en-b" data-act="enl-atras" aria-label="Volver">‹</button>' : '<span class="en-b"></span>') + '<b>Enlace para invitados</b><button type="button" class="en-b" data-act="enl-cerrar" aria-label="Cerrar">✕</button></header>';
  if (enlPaso === 'lista') {
    return cab + '<div class="en-c"><p class="pn-s">Elige qué quieres compartir.</p><div class="en-ls"><button type="button" data-act="enl-ver" data-id=""><b>Toda la galería</b><span>' + cur.fotos.length + ' archivos</span></button>' + es.map(function(e){ return '<button type="button" data-act="enl-ver" data-id="' + e.id + '"><b>' + esc(e.name) + '</b><span>' + nFotosEsc(e.id) + ' fotos</span></button>'; }).join('') + '</div></div>';
  }
  var e = enlEsc ? es.filter(function(x){ return x.id === enlEsc; })[0] : null;
  var url = e ? BASES + e.link_token : BASEG + g.link_token, cd = e ? e.access_mode === 'codigo' : g.access_mode !== 'abierto', cod = e ? e.access_code : g.access_code;
  var h = cab + '<div class="en-c"><p class="pn-s" style="margin:0 0 .5rem">' + (e ? esc(e.name) : 'Toda la galería') + '</p><div class="pn-copia"><input type="text" readonly value="' + esc(url) + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(url) + '" type="button">Copiar</button></div>' +
    '<div class="pn-row" style="margin-top:.6rem"><button class="pn-btn sec" data-act="qr" data-t="' + esc(url) + '" data-n="' + esc(e ? e.name : g.title) + '" type="button">QR</button><button class="pn-btn sec" data-act="wa" data-t="' + esc(msgCliente(url, cd ? cod : '')) + '" type="button">WhatsApp</button></div>' +
    (cd ? '<p class="pn-s" style="margin:1rem 0 .3rem">Código de acceso</p><div class="pn-copia"><input type="text" readonly value="' + esc(cod || '') + '"><button class="pn-btn sec" data-act="copiar" data-t="' + esc(cod || '') + '" type="button">Copiar</button></div>' : '<p class="pn-s" style="margin-top:1rem">Este enlace entra sin clave.</p>');
  if (e) {
    h += '<details class="en-aj"><summary>Ajustes de este enlace</summary><div class="pn-row"><select data-escmodo="' + e.id + '"><option value="abierto"' + (e.access_mode === 'abierto' ? ' selected' : '') + '>Sin clave</option><option value="codigo"' + (e.access_mode === 'codigo' ? ' selected' : '') + '>Con código</option></select>' +
      (e.access_mode === 'codigo' ? '<input type="text" id="pn-sc-' + e.id + '" maxlength="40" value="' + esc(e.access_code || '') + '"><button class="pn-btn sec" data-act="esc-codigo" data-id="' + e.id + '" type="button">Guardar código</button>' : '') + '</div>' +
      '<div class="pn-row"><label class="pn-s" for="pn-wm-' + e.id + '">Marca de agua en esta escena</label><select id="pn-wm-' + e.id + '" data-escwm="' + e.id + '"><option value="0"' + (e.no_watermark ? '' : ' selected') + '>Como en Configuración</option><option value="1"' + (e.no_watermark ? ' selected' : '') + '>Sin marca de agua (para familia o amigos)</option></select></div>' +
      '<label class="pn-s"><input type="checkbox" data-eschid="' + e.id + '"' + (e.hidden ? ' checked' : '') + '> Solo con su enlace (no aparece en la galería principal)</label></details>';
  }
  return h + '</div>';
}
function enlRefrescar(){ var d = $('#pn-denl'); if (d && d.open && cur) d.innerHTML = enlHtml(); }
var MAS = [['favoritas', 'Favoritas', 'Contenido'], ['impresiones', 'Impresiones', 'Contenido'], ['video', 'Video', 'Contenido'], ['detalles', 'Detalles', 'Ajustes'], ['config', 'Configuración', 'Ajustes']], masAb = false;
function navHtml(){
  var enMas = MAS.some(function(m){ return m[0] === tab; });
  var b = function(t, ic, lab){ return '<button type="button" data-act="tab" data-t="' + t + '"' + (tab === t ? ' class="on"' : '') + '>' + ico(ic) + '<span>' + lab + '</span></button>'; };
  var hoja = masAb ? '<div class="pn-mas-dim" data-act="mas-cerrar"></div><div class="pn-mas">' + ['Contenido', 'Ajustes'].map(function(gr){ return '<h4>' + gr + '</h4>' + MAS.filter(function(m){ return m[2] === gr; }).map(function(m){ return '<button type="button" data-act="tab" data-t="' + m[0] + '"' + (tab === m[0] ? ' class="on"' : '') + '>' + ico(m[0]) + '<span>' + m[1] + '</span></button>'; }).join(''); }).join('') + '</div>' : '';
  return hoja + '<nav class="pn-bn" aria-label="Secciones">' + b('panel', 'inicio', 'Resumen') + b('fotos', 'fotos', 'Fotos') + b('diseno', 'diseno', 'Diseño') + b('compartir', 'compartir', 'Compartir') + '<button type="button" data-act="mas-abrir"' + (enMas || masAb ? ' class="on"' : '') + '>' + ico('mas') + '<span>Más</span></button></nav>';
}
var EXP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
var ORDENES = [['nombre', 'Nombre del archivo'], ['nombre-inv', 'Nombre del archivo (inverso)'], ['carga', 'Tiempo de carga (primero las más antiguas)'], ['carga-inv', 'Tiempo de carga (primero las más recientes)'], ['azar', 'Aleatorio']];
function impCuenta(){ var m = {}; (cur && Array.isArray(cur.imp) ? cur.imp : []).forEach(function(x){ m[x.photo_id] = (m[x.photo_id] || 0) + 1; }); return m; }
function spTiene(sid, pid){ return !!(cur && cur.sp && cur.sp[sid + ':' + pid]); }
function filtrarEsc(l){ var ic = fImp ? impCuenta() : null; return l.filter(function(x){ return (!fEsc || fEsc === '_ninguna' || (fEsc === '_none' ? !x.scene_id : (x.scene_id === fEsc || spTiene(fEsc, x.id)))) && (!ic || ic[x.id]); }); }
var fTipo = '', fMas = 48, fTipoE = {};
function figFoto(x, g, ic){
  var tipo = x.photo_type, esPort = g.cover_photo_id === x.id;
  return '<figure class="pn-ph' + (esPort ? ' cv' : '') + (marcadas.has(x.id) ? ' mk' : '') + (ic[x.id] ? ' pimp' : '') + '">' + (ic[x.id] ? '<span class="pn-pb" title="Marcada para imprimir">' + ico('impresiones') + (ic[x.id] > 1 ? '<i>' + ic[x.id] + '</i>' : '') + '</span>' : '') + '<span class="pn-ck' + (modoSel ? '' : ' off') + '" data-act="marcar" data-id="' + x.id + '">' + (marcadas.has(x.id) ? '✓' : '') + '</span>' +
    '<span class="pn-tb' + (tipo === 'final' ? ' f' : '') + '">' + (tipo === 'final' ? 'FINAL' : 'SEL') + '</span>' +
    '<img data-act="' + (modoSel ? 'marcar' : 'ver') + '" data-id="' + x.id + '" loading="lazy" alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '">' +
    '<figcaption>' + esc(x.filename) + (esPort ? ' · Portada' : '') + (tipo === 'final' ? ' · ' + mb(x.file_size || 0) : '') + '</figcaption>' +
    '<button class="pn-ex" data-act="ver" data-id="' + x.id + '" type="button" aria-label="Ampliar" title="Ampliar">' + EXP + '</button></figure>';
}
function listaVisible(){ return filtrarEsc(cur.fotos.filter(function(x){ return !fTipo || x.photo_type === fTipo; })); }
var fEscSub = '';
function escEnt(id){ var e = (cur.escenas || []).filter(function(x){ return x.id === id; })[0]; return !!(e && e.delivered); }
function escCov(id){ var e = (cur.escenas || []).filter(function(x){ return x.id === id; })[0]; return !!(e && e.cover_key); }
function escCer(id){ var e = (cur.escenas || []).filter(function(x){ return x.id === id; })[0]; return !!(e && e.closed); }
function escPag(id){ var e = (cur.escenas || []).filter(function(x){ return x.id === id; })[0]; return !!(e && e.paid); }
function fotosVista(g, sel, fin){
  var es = cur.escenas || [], todas = cur.fotos, ic = impCuenta(), nImp = Object.keys(ic).length;
  var delaEsc = function(id){ return todas.filter(function(x){ return !id ? true : id === '_none' ? !x.scene_id : (x.scene_id === id || spTiene(id, x.id)); }); };
  var visibles = function(id){ var ft = fTipoE[id] || ''; return delaEsc(id).filter(function(x){ return (!ft || x.photo_type === ft) && (!fImp || ic[x.id]); }); };
  var nS = sel.length, nF = fin.length;
  var lv = listaVisible();
  var ord = lv.length > 1 ? '<span class="pn-orden"><label class="pn-s">Clasificar</label><select data-ord="' + (fTipo || 'todas') + '"><option value="">Elegir orden…</option>' + ORDENES.filter(function(o){ return cur.conFecha || o[0].indexOf('carga') < 0; }).map(function(o){ return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></span>' : '';
  var tipoSub = fTipo === 'final' ? 'final' : 'selection';
  var hayF = filtrarEsc(sel).length + filtrarEsc(fin).length > 0;
  var top = '<div class="fs-tools"><div class="pn-ncarp fs-new"><input type="text" id="pn-nesc" maxlength="80" placeholder="Nueva escena"><button class="pn-btn sec" data-act="esc-crear" type="button" aria-label="Agregar escena">+</button></div>' + ord +
    (hayF && !modoSel ? '<button class="pn-btn sec" data-act="modo-sel" type="button">Seleccionar varias</button>' : '') +
    '<button class="pn-btn" data-act="abrir-subir" data-tipo="' + tipoSub + '" data-esc="' + (fEsc && fEsc !== '_none' && fEsc !== '_ninguna' ? fEsc : '') + '" type="button">+ Subir fotos</button></div>' +
    (nImp || fImp ? '<div class="pn-fh"><button class="pn-btn ' + (fImp ? '' : 'sec') + '" data-act="filtro-imp" type="button">' + ico('impresiones') + ' Para imprimir (' + nImp + ')' + (fImp ? ' ✕' : '') + '</button></div>' : '');
  var secs = es.map(function(e){ return { id: e.id, name: e.name, real: true }; });
  if (es.length && delaEsc('_none').length) secs.push({ id: '_none', name: 'Sin escena', real: false });
  if (!es.length) secs = [{ id: '', name: 'Todas las fotos', real: false }];
  var unica = !es.length;
  var cuerpo = secs.map(function(sc){
    var abierta = unica || fEsc === sc.id, lst = visibles(sc.id), total = delaEsc(sc.id).length;
    var menu = '<div class="np-dd r"><button type="button" class="fs-dots" data-act="vd-dd" aria-label="Más opciones">•••</button><ul hidden><li><button type="button" data-act="abrir-subir" data-tipo="selection" data-esc="' + (sc.real ? sc.id : '') + '">Subir fotos aquí</button></li>' + (sc.real ? '<li><button type="button" data-act="esc-entrega" data-id="' + sc.id + '">' + (escEnt(sc.id) ? 'Quitar entrega' : 'Marcar como entregada') + '</button></li><li><button type="button" data-act="esc-renombrar" data-id="' + sc.id + '">Renombrar</button></li><li><button type="button" data-act="esc-portada" data-id="' + sc.id + '">' + (escCov(sc.id) ? 'Cambiar portada de la escena' : 'Poner portada a la escena') + '</button></li>' + (escCov(sc.id) ? '<li><button type="button" data-act="esc-portada-quitar" data-id="' + sc.id + '">Quitar portada de la escena</button></li>' : '') + '<li><button type="button" data-act="esc-borrar" data-id="' + sc.id + '">Eliminar escena</button></li>' : '') + '</ul></div>';
    var head = '<div class="fs-h"><h2>' + esc(sc.name) + '</h2>' + (sc.real ? '<button type="button" class="fs-t" data-act="esc-renombrar" data-id="' + sc.id + '" title="Renombrar" aria-label="Renombrar">R</button><button type="button" class="fs-p' + (escPag(sc.id) ? ' on' : '') + '" data-act="esc-pago" data-id="' + sc.id + '" title="' + (escPag(sc.id) ? 'Pagada: sus finales se ven sin marca de agua. Toca para quitar' : 'Marcar como pagada') + '" aria-pressed="' + escPag(sc.id) + '" aria-label="Pagada">P</button>' : '') + (sc.real ? '<button type="button" class="fs-p fs-d' + (escCer(sc.id) ? ' off' : ' on') + '" data-act="esc-ojo" data-id="' + sc.id + '" title="' + (escCer(sc.id) ? 'Galería cerrada: tu cliente verá un aviso para contactarte. Toca para abrirla' : 'Galería abierta: tu cliente puede ver sus fotos. Toca para cerrarla') + '" aria-pressed="' + !escCer(sc.id) + '" aria-label="' + (escCer(sc.id) ? 'Galería cerrada' : 'Galería abierta') + '">' + (escCer(sc.id) ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4.2-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>' : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>') + '</button>' : '') + (sc.real && escEnt(sc.id) ? '<span class="fs-ent">Entregada</span>' : '') + (sc.real && escCer(sc.id) ? '<span class="fs-ent fs-cer">Cerrada</span>' : '') + '<span class="fs-n">' + total + (total === 1 ? ' foto' : ' fotos') + '</span>' + menu + '<div class="pn-seg fs-seg" role="group" aria-label="Tipo de foto">' + [['', 'Todas'], ['selection', 'Selección'], ['final', 'Finales']].map(function(t){ return '<button type="button" data-act="ftipo" data-esc="' + sc.id + '" data-v="' + t[0] + '" class="' + ((fTipoE[sc.id] || '') === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div>';
    var add = '<button class="fs-add" data-act="abrir-subir" data-tipo="' + tipoSub + '" data-esc="' + (sc.real ? sc.id : '') + '" type="button"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg><span>Fotos y videos</span></button>';
    var body;
    if (abierta) {
      var mostrar = modoSel ? lst : lst.slice(0, fMas);
      body = '<div class="pn-grid mx">' + (unica ? add : '') + mostrar.map(function(x){ return figFoto(x, g, ic); }).join('') + '</div>' + (!modoSel && lst.length > fMas ? '<p class="pn-s" style="text-align:center;margin-top:1rem"><button class="pn-vt" style="display:inline;width:auto;margin:0;text-decoration:underline" data-act="mas-fotos" type="button">Mostrar más (' + (lst.length - fMas) + ')</button></p>' : '');
    } else {
      body = '<div class="fs-strip">' + add + lst.slice(0, 40).map(function(x){ return figFoto(x, g, ic); }).join('') + '</div>';
    }
    var mas = unica ? '' : '<button class="fs-more" type="button" data-act="fs-abrir" data-id="' + (abierta ? '' : sc.id) + '">' + (abierta ? 'Ver menos ⌃' : (lst.length ? 'Ver todas ⌄' : '')) + '</button>';
    return '<section class="fs-sc' + (abierta && !unica ? ' open' : '') + '">' + head + body + mas + '</section>';
  }).join('');
  return '<div class="fs">' + top + (modoSel ? barraSel(sel, fin) : '') + cuerpo + '</div>';
}
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
  var lista = cur.fotos.filter(function(x){ return tipo === 'todas' || x.photo_type === tipo; });
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
var pendPortada = null;
// Vista previa del enlace (WhatsApp): versión pequeña 1200x630 de la portada
function ogBlob(file){
  return createImageBitmap(file).then(function(b){
    var c = document.createElement('canvas'); c.width = 1200; c.height = 630; var x = c.getContext('2d');
    var k = Math.max(1200 / b.width, 630 / b.height), w = b.width * k, h = b.height * k;
    x.drawImage(b, (1200 - w) / 2, Math.min(0, Math.max(630 - h, (630 - h) * 0.35)), w, h);
    return new Promise(function(r){ c.toBlob(function(bl){ r(bl); }, 'image/jpeg', 0.8); });
  });
}
async function subirOg(file, sceneId){
  try {
    var bl = await ogBlob(file), ss = (await db.auth.getSession()).data.session;
    await fetch(W + '/api/admin/cover-upload?gallery=' + galId + '&og=1' + (sceneId ? '&scene=' + sceneId : ''), { method: 'POST', headers: { Authorization: 'Bearer ' + ss.access_token, 'Content-Type': 'image/jpeg' }, body: bl });
  } catch (e) {}
}
var escPortadaId = '';
async function portadaEscenaArchivo(pf){
  var ee = (cur.escenas || []).filter(function(x){ return x.id === escPortadaId; })[0]; if (!pf || !ee) return;
  aviso('Subiendo la portada de la escena…');
  try {
    var rp = await reducir(pf, null, 'alta'), ss = (await db.auth.getSession()).data.session;
    var rs = await fetch(W + '/api/admin/cover-upload?gallery=' + galId + '&scene=' + ee.id, { method: 'POST', headers: { Authorization: 'Bearer ' + ss.access_token, 'Content-Type': 'image/jpeg' }, body: rp.blob });
    var dd = await rs.json().catch(function(){ return {}; }); if (!dd.ok) throw new Error('¿ya ejecutaste etapa20.sql y actualizaste el Worker?');
    ee.cover_key = 'x'; await subirOg(pf, ee.id); aviso('Portada de la escena actualizada');
  } catch (e) { aviso('No se pudo subir la portada: ' + (e.message || 'error')); }
  pintar();
}
async function portadaDesdeArchivo(pf){
  var g = gal(galId); if (!pf || !g) return;
  aviso('Subiendo la portada…');
  try {
    var rp = await reducir(pf, null, 'alta'), ss = (await db.auth.getSession()).data.session;
    var rs = await fetch(W + '/api/admin/cover-upload?gallery=' + galId, { method: 'POST', headers: { Authorization: 'Bearer ' + ss.access_token, 'Content-Type': 'image/jpeg' }, body: rp.blob });
    var dd = await rs.json().catch(function(){ return {}; }); if (!dd.ok) throw new Error('no se pudo subir');
    g.cover_key = 'x'; if (cur) cur.cover = dd.t; await subirOg(pf);
    if (pendPortada) { var u = await db.from('galleries').update({ cover_photo_id: pendPortada }).eq('id', galId); if (!u.error) g.cover_photo_id = pendPortada; }
    aviso('Portada actualizada, sin marca de agua');
  } catch (e) { aviso('No se pudo subir la portada: ' + (e.message || 'error')); }
  pendPortada = null; pintar();
}
var MSG_DEF = 'Hola, le comparto su link personal para que pueda ver las fotografías de su sesión:\n\n{enlace}\n\n📸 ¿Cómo elegir sus fotos?\n\n1. Marque con un corazón ❤️ las fotos que más le gusten, a mí me aparecerá automáticamente su selección.\n\n2. El paquete incluye {fotos} fotografías, pero si quiere agregar algunas extras, con gusto se las agregamos con costo adicional.\n\n3. Estas fotografías son una muestra para elegir, en cuanto termine su selección, haremos el revelado y edición final de sus fotografías y las subiremos a este mismo link para que las descargue en máxima calidad.';
function msgPlantilla(){ try { return localStorage.getItem('pn-msg') || MSG_DEF; } catch (e) { return MSG_DEF; } }
function msgFotos(){ try { return localStorage.getItem('pn-msg-n-' + galId) || '14'; } catch (e) { return '14'; } }
function msgCliente(url, cod){ return 'Hola, le comparto su enlace personal para ver las fotografías de su sesión:\n\n' + url + (cod ? '\n\nCódigo de acceso: ' + cod : ''); }
var BASES = 'https://galerias-api.alexandergeerre.workers.dev/s/', fEsc = '', fImp = false, modoSel = false, marcadas = new Set();
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
  vl = tab === 'fotos' ? listaVisible() : cur.fotos.filter(function(x){ return x.photo_type === f.photo_type; });
  if (vl.indexOf(f) < 0) vl = cur.fotos.filter(function(x){ return x.photo_type === f.photo_type; });
  vix = vl.indexOf(f); $('#pn-dver').showModal(); mostrarVer();
}
function pasarVer(d){ if (!vl.length) return; vix = (vix + d + vl.length) % vl.length; mostrarVer(); }

var dsDisp = 'pc', dsModo = 'auto';
var LETRAS = [['elegante', 'Elegante', '"Cormorant Garamond",Georgia,serif', 'normal', 'none', '.02em'], ['moderna', 'Moderna', 'Jost,system-ui,sans-serif', 'normal', 'uppercase', '.12em'], ['romantica', 'Romántica', '"Cormorant Garamond",Georgia,serif', 'italic', 'none', '.02em']];
var TITESC = [['centrados', 'Centrados'], ['izquierda', 'A la izquierda'], ['ocultos', 'Ocultos']];
function dsPalId(g){ var pa = PAL_VIEJA[g.palette] || g.palette || 'auto'; return pa; }
function dsCol(g, osc){ var pa = dsPalId(g); if (pa === 'auto' || !PAL_PANEL_COL[pa]) pa = PAL_TIPO[g.gallery_type] || 'arena'; var c = PAL_PANEL_COL[pa] || PAL_PANEL_COL.arena; return osc ? { f: c[2], t: '#EDEBE8', s: '#9A948D', l: '#3a3a3a', a: c[1] } : { f: c[0], t: '#2B2623', s: '#8A837C', l: '#E6E3DF', a: c[1] }; }
function dsIcono(k){
  var r = function(x, y, w, h){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="currentColor" opacity=".35"/>'; };
  var cont = k === 'uniforme' ? r(1, 1, 16, 16) + r(19, 1, 16, 16) + r(37, 1, 16, 16) + r(1, 19, 16, 16) + r(19, 19, 16, 16) + r(37, 19, 16, 16) : k === 'amplio' ? r(1, 1, 24, 36) + r(28, 1, 24, 36) : r(1, 1, 16, 24) + r(19, 1, 16, 16) + r(37, 1, 16, 30) + r(19, 19, 16, 18);
  return '<svg width="54" height="38" viewBox="0 0 54 38" aria-hidden="true">' + cont + '</svg>';
}
function dsPreview(g, sel){
  var osc = dsModo === 'oscuro' || (dsModo === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var c = dsCol(g, osc), L = LETRAS.filter(function(l){ return l[0] === (g.title_font || 'elegante'); })[0] || LETRAS[0];
  var cvId = g.cover_photo_id || (sel[0] && sel[0].id), cv = cvId && cur.tk[cvId], cvSrc = cur.cover ? src(cur.cover) : (cv ? src(cv) : '');
  var tel = dsDisp === 'tel', fotos = sel.slice(0, tel ? 8 : 12), es = cur.escenas || [], ts = g.scene_titles || 'centrados';
  var nomEsc = es.length ? es[0].name : 'Ceremonia', estilo = g.grid_style || 'clasico';
  var st = '--pf:' + c.f + ';--pt:' + c.t + ';--ps:' + c.s + ';--pl:' + c.l + ';--pa:' + c.a + ';--pff:' + L[2] + ';--pfs:' + L[3] + ';--ptt:' + L[4] + ';--pls:' + L[5];
  var fecha = g.event_date ? new Date(g.event_date + 'T12:00:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  var ims = fotos.length ? fotos.map(function(x){ return '<figure><img alt="" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"></figure>'; }).join('') : [1, 2, 3, 4, 5, 6].map(function(){ return '<figure class="vc"></figure>'; }).join('');
  var gal0 = '<div class="ds-mg" style="' + st + '"><div class="ds-cv">' + (cvSrc ? '<img alt="" src="' + esc(cvSrc) + '">' : '') + '<div><h2>' + esc(g.title) + '</h2><span>' + esc(fecha) + '</span></div></div>' +
    '<div class="ds-nv"><b>Todas</b><span>Mis favoritas</span><span class="r">' + esc(ph.studio_name || '') + '</span></div>' +
    (ts === 'ocultos' ? '' : '<h3 class="ds-et ' + ts + '">' + esc(nomEsc) + '</h3>') +
    '<div class="ds-gr ' + estilo + '">' + ims + '</div></div>';
  return '<div class="ds-pvbox ' + (tel ? 'tel' : '') + '">' + (tel ? '<div class="ds-ph">' + gal0 + '</div>' : gal0) + '</div>';
}
function dsHtml(g, sel){
  var cvId = g.cover_photo_id || (sel[0] && sel[0].id), cv = cvId && cur.tk[cvId], cvSrc = cur.cover ? src(cur.cover) : (cv ? src(cv) : '');
  var pa = dsPalId(g), cur_ = (g.grid_style || 'clasico'), tf = g.title_font || 'elegante', ts = g.scene_titles || 'centrados';
  var pn = (PALETAS.filter(function(c){ return c[0] === pa; })[0] || PALETAS[0])[1];
  var auto = (PALETAS.filter(function(c){ return c[0] === (PAL_TIPO[g.gallery_type] || 'arena'); })[0] || [])[1] || '';
  var btn = function(campo, v, cls, inner){ return '<button type="button" class="ds-cd' + cls + '" data-act="ds-set" data-c="' + campo + '" data-k="' + v + '">' + inner + '</button>'; };
  var pill = function(act, lista, act_){ return '<div class="pn-seg" role="group">' + lista.map(function(t){ return '<button type="button" data-act="' + act + '" data-k="' + t[0] + '" class="' + (act_ === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>'; };
  var dots = '<div class="ds-dots"><button type="button" class="ds-dot au' + (pa === 'auto' ? ' on' : '') + '" data-act="ds-set" data-c="palette" data-k="auto" title="Automática (según el evento)">A</button>' +
    PALETAS.filter(function(c){ return c[0] !== 'auto'; }).map(function(c){ return '<button type="button" class="ds-dot' + (pa === c[0] ? ' on' : '') + '" data-act="ds-set" data-c="palette" data-k="' + c[0] + '" title="' + esc(c[1]) + '" aria-label="' + esc(c[1]) + '" style="background:conic-gradient(' + c[2] + ' 0 33%,' + c[3] + ' 0 66%,' + c[4] + ' 0)"></button>'; }).join('') + '</div>';
  var izq = '<div class="ds-l">' +
    '<section class="ds-sec"><h3>Portada</h3><div class="ds-por"><div class="ds-th">' + (cvSrc ? '<img alt="" src="' + esc(cvSrc) + '">' : '') + '</div><div><p class="pn-s" style="margin:0 0 .5rem">La foto que ve tu cliente al abrir el enlace. Sin marca de agua.</p><div class="ds-bt"><button class="pn-btn sec" data-act="elegir-portada" type="button"' + (sel.length ? '' : ' disabled') + '>Elegir foto</button><button class="pn-btn sec" data-act="portada-subir" type="button">Subir otra</button></div>' + (g.cover_key ? '<button class="pn-vt" style="display:inline;width:auto;margin:.4rem 0 0;font-size:.78rem;text-decoration:underline" data-act="quitar-portada" type="button">Quitar portada subida</button>' : '') + '</div></div></section>' +
    '<section class="ds-sec"><h3>Estilo de fotos</h3><div class="ds-cds">' + ESTILOS.map(function(e){ return btn('grid_style', e[0], cur_ === e[0] ? ' on' : '', dsIcono(e[0]) + '<span>' + e[1] + '</span>'); }).join('') + '</div><p class="pn-s ds-h">' + esc((ESTILOS.filter(function(e){ return e[0] === cur_; })[0] || [])[2] || '') + '</p></section>' +
    '<section class="ds-sec"><h3>Colores <i>' + (pa === 'auto' ? 'Automática: ' + esc(auto) : esc(pn)) + '</i></h3>' + dots + '<p class="pn-s ds-h">Se adaptan solos al modo claro u oscuro del dispositivo de tu cliente.</p></section>' +
    '<section class="ds-sec"><h3>Letra de los títulos</h3><div class="ds-cds">' + LETRAS.map(function(l){ return btn('title_font', l[0], tf === l[0] ? ' on' : '', '<b class="ds-aa" style="font-family:' + l[2].replace(/"/g, "'") + ';font-style:' + l[3] + '">Aa</b><span>' + l[1] + '</span>'); }).join('') + '</div></section>' +
    '<section class="ds-sec"><h3>Títulos de escena</h3><div class="pn-seg" role="group">' + TITESC.map(function(t){ return '<button type="button" data-act="ds-set" data-c="scene_titles" data-k="' + t[0] + '" class="' + (ts === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></section></div>';
  var der = '<div class="ds-r"><div class="ds-tb"><div class="pn-seg"><button type="button" data-act="ds-disp" data-k="pc" class="' + (dsDisp === 'pc' ? 'on' : '') + '">PC</button><button type="button" data-act="ds-disp" data-k="tel" class="' + (dsDisp === 'tel' ? 'on' : '') + '">Teléfono</button></div>' +
    '<div class="pn-seg"><button type="button" data-act="ds-modo" data-k="auto" class="' + (dsModo === 'auto' ? 'on' : '') + '">Auto</button><button type="button" data-act="ds-modo" data-k="claro" class="' + (dsModo === 'claro' ? 'on' : '') + '">Claro</button><button type="button" data-act="ds-modo" data-k="oscuro" class="' + (dsModo === 'oscuro' ? 'on' : '') + '">Oscuro</button></div></div>' +
    dsPreview(g, sel) + '<p class="pn-s" style="text-align:center;margin:.7rem 0 0">Los cambios se ven al instante y se guardan solos.</p></div>';
  return '<div class="ds" id="ds">' + izq + der + '</div>';
}
function dsRefrescar(){ var d = $('#ds'), g = gal(galId); if (!d || !g || !cur) return; var sl = cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }); var tmp = document.createElement('div'); tmp.innerHTML = dsHtml(g, sl); d.replaceWith(tmp.firstChild); }
async function dsSet(campo, v){
  var g = gal(galId); if (!g || g[campo] === v) return;
  var prev = g[campo]; g[campo] = v; dsRefrescar();
  var o = {}; o[campo] = v; var r = await db.from('galleries').update(o).eq('id', galId);
  if (r.error) { g[campo] = prev; dsRefrescar(); return aviso(/title_font|scene_titles/.test(r.error.message || '') ? 'Falta ejecutar etapa16.sql en Supabase (ver instrucciones).' : r.error.message); }
  aviso('Guardado');
}
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
  if (a === 'logo-abrir') return $('#pn-dlogo').showModal();
  if (a === 'logo-cerrar') return $('#pn-dlogo').close();
  if (a === 'logo-quitar') { var col = el.dataset.v === 'claro' ? 'logo_para_claro' : 'logo_para_oscuro', cam = {}; cam[col] = null; var rq = await db.from('photographers').update(cam).eq('id', ph.id).select('id'); if (rq.error || !rq.data || !rq.data.length) return aviso(errCuenta(rq.error)); ph[col] = null; aviso('Se volvió al logo por defecto'); pintarLado(); return pintarCuenta(); }
  if (a === 'vid-foto') { var vi2 = vidIds.indexOf(id); if (vi2 >= 0) vidIds.splice(vi2, 1); else vidIds.push(id); vidStop(); return vidRefrescar(); }
  if (a === 'vid-sel') {
    var v0 = el.dataset.v, fl = cur.fotos;
    if (v0 === 'fin') vidIds = fl.filter(function(x){ return x.photo_type === 'final'; }).map(function(x){ return x.id; });
    else if (v0 === 'sel') vidIds = fl.filter(function(x){ return x.photo_type === 'selection'; }).map(function(x){ return x.id; });
    else vidIds = [];
    vidStop(); vidT = 0; return vidRefrescar();
  }
  if (a === 'vd-dd') { var vd = el.closest('.np-dd'), vab = vd.classList.contains('open'); vdCerrar(); if (!vab) { vd.classList.add('open'); vd.querySelector('ul').hidden = false; } return; }
  vdCerrar();
  if (a === 'np-abrir') return npAbrir();
  if (a === 'np-cerrar') return $('#pn-dnp').close();
  if (a === 'np-dd') { var dd = el.closest('.np-dd'), ab = dd.classList.contains('open'); npCerrarMenus(); if (!ab) { dd.classList.add('open'); dd.querySelector('ul').hidden = false; } return; }
  if (a === 'np-set') { var kk = el.dataset.k, vv = el.dataset.v; if (kk === 'fm') npForm = vv; else if (kk === 'es') npEstilo = vv; else if (kk === 'ma') npMarca = vv === 'true'; else if (kk === 'ri') npSeg = +vv; npCerrarMenus(); npMarcar(); return npPrep(); }
  if (a === 'np-cont') { vidEstilo = npEstilo; vidForm = npForm; vidMarca = npMarca; vidSeg = npSeg; var nn = $('#np-n').value.trim(); vidTit = nn || null; vidPest = 0; vidStop(); vidT = 0; $('#pn-dnp').close(); return vidRefrescar(); }
  if (a === 'vid-agregar') return $('#pn-dvp').showModal();
  if (a === 'vid-cerrar') return $('#pn-dvp').close();
  if (a === 'vid-abrir-ed') { vidEdCerrado = false; var dv2 = $('#pn-dvid'); if (dv2 && !dv2.open) dv2.showModal(); return; }
  if (a === 'vid-cerrar-ed') { if (vidBusy) return aviso('Espera a que termine el video o cancélalo.'); vidEdCerrado = true; vidStop(); var dv3 = $('#pn-dvid'); if (dv3) dv3.close(); return; }
  if (a === 'vid-quitar') { vidIds.splice(+el.dataset.i, 1); vidStop(); return vidRefrescar(); }
  if (a === 'vid-estilo') { vidEstilo = el.dataset.v === 'pantalla' ? 'pantalla' : el.dataset.v === 'prisma' ? 'prisma' : el.dataset.v === 'carriles' ? 'carriles' : el.dataset.v === 'postales' ? 'postales' : el.dataset.v === 'estudio' ? 'estudio' : 'papel'; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-acento') { vidAcento = vidAcento + 1 >= PAL_PANEL.length ? -1 : vidAcento + 1; vidStop(); return vidRefrescar(); }
  if (a === 'vid-trans') { if (vidEstilo === 'pantalla') vidTrans = { variadas: 'desliza', desliza: 'disuelve', disuelve: 'variadas' }[vidTrans]; else vidTransP = { variadas: 'der', der: 'izq', izq: 'arriba', arriba: 'abajo', abajo: 'variadas' }[vidTransP]; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-marca') { vidMarca = el.dataset.v !== 'no'; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-pest') { vidPest = +el.dataset.v || 0; return vidPestana(); }
  if (a === 'vid-cal') { vidCal = el.dataset.v === '4k' ? '4k' : 'fhd'; return vidRefrescar(); }
  if (a === 'vid-fmt') { vidForm = VFMT[el.dataset.v] ? el.dataset.v : 'v'; vidStop(); return vidRefrescar(); }
  if (a === 'vid-ritmo-set') { vidSeg = +el.dataset.v || 2.5; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-ritmo') { vidSeg = vidSeg === 2.5 ? 1.5 : vidSeg === 1.5 ? 3.5 : 2.5; vidStop(); vidT = 0; return vidRefrescar(); }
  if (a === 'vid-part') { vidPart = !vidPart; vidStop(); return vidRefrescar(); }
  if (a === 'vid-play') return vidPlayToggle();
  if (a === 'vid-gen') return vidGenerar();
  if (a === 'vid-cancel') { vidCancel = true; return vidEstado('Cancelando…'); }
  if (a === 'abrir') return abrirDetalle(id);
  if (a === 'atras') { await cargarGalerias(); vista = 'galerias'; return pintar(); }
  if (a === 'tab') { tab = el.dataset.t; if (tab === 'video') vidEdCerrado = false; masAb = false; favMenu = false; return pintar(); }
  if (a === 'fav-menu') { favMenu = !favMenu; return pintar(); }
  if (a === 'fav-ver') { favVer = el.dataset.k; favMenu = false; try { localStorage.setItem('pn-favver', favVer); } catch (e) {} return pintar(); }
  if (a === 'mas-abrir' || a === 'mas-cerrar') { masAb = a === 'mas-abrir' ? !masAb : false; var bn2 = $('#pn-bn'); if (bn2) bn2.innerHTML = navHtml(); return; }
  if (a === 'enl-abrir') { enlEsc = null; enlPaso = (cur.escenas || []).length ? 'lista' : 'link'; $('#pn-denl').innerHTML = enlHtml(); return $('#pn-denl').showModal(); }
  if (a === 'enl-ver') { enlEsc = el.dataset.id || null; enlPaso = 'link'; return enlRefrescar(); }
  if (a === 'enl-atras') { enlPaso = 'lista'; return enlRefrescar(); }
  if (a === 'enl-cerrar') return $('#pn-denl').close();
  if (a === 'msg-guardar') { var mt = $('#pn-msg-t').value, mn2 = parseInt($('#pn-msg-n').value, 10) || 14; if (mt.indexOf('{enlace}') < 0) return aviso('El mensaje debe incluir {enlace} para que se ponga el enlace.'); try { localStorage.setItem('pn-msg', mt); localStorage.setItem('pn-msg-n-' + galId, String(mn2)); } catch (e) {} aviso('Mensaje guardado'); return pintar(); }
  if (a === 'msg-restaurar') { try { localStorage.removeItem('pn-msg'); } catch (e) {} aviso('Mensaje original restaurado'); return pintar(); }
  if (a === 'msg-copiar') { var gg2 = gal(galId); if (!gg2) return; var mt2 = $('#pn-msg-t').value, mn3 = parseInt($('#pn-msg-n').value, 10) || 14; copiar(mt2.replace(/\{fotos\}/g, mn3).replace(/\{enlace\}/g, BASEG + gg2.link_token + (gg2.access_mode === 'abierto' ? '' : '\nCódigo de acceso: ' + gg2.access_code))); el.textContent = 'Copiado'; return; }
  if (a === 'copiar') { copiar(el.dataset.t); el.textContent = 'Copiado'; return; }
  if (a === 'nueva') return $('#pn-dnueva').showModal();
  if (a === 'asist') { asistReset(); vista = 'asist'; if (AS.activo) AS.paso = 2; return pintar(); }
  if (a === 'as-cont') { var bm = AS.borr && AS.borr.meta; if (!bm) return; AS.tipo = bm.tipo || 'Clausura'; AS.nombre = bm.nombre || ''; AS.fecha = bm.fecha || ''; AS.restaurar = true; AS.paso = 2; return pintarAsist(); }
  if (a === 'as-desc') { await idbDel('as-draft'); await idbDel('as-meta'); AS.borr = null; return pintarAsist(); }
  if (a === 'as-sig') return asistSig();
  if (a === 'as-atras') { if (AS.creando) return; AS.paso = 1; return pintarAsist(); }
  if (a === 'as-crear') return asistCrear();
  if (a === 'as-cancel') { if (AS.creando) return aviso('Espera a que termine la subida.'); if (AS.activo && !await seguro('Se cierra el asistente. El avance (rostros y nombres) queda guardado en este navegador para continuar después. ¿Cerrar?', 'Sí, cerrar')) return; asistCerrar(); vista = 'galerias'; return pintar(); }
  if (a === 'subir') return subirTodo();
  if (a === 'entregar') { if (await seguro('¿Marcar como entregada? El cliente podrá descargar las finales.')) cambiar({ status: 'delivered', selection_enabled: false, downloads_enabled: true }, 'Galería entregada'); return; }
  if (a === 'reabrir') return cambiar({ status: 'selection', selection_enabled: true, downloads_enabled: false }, 'Selección reabierta');
  if (a === 'salir') return window.cerrarSesion();
  if (a === 'pal-panel') { try { localStorage.setItem('pn-pal', el.dataset.v); } catch(e) {} aplicarTema(); return pintar(); }
  if (a === 'dis-dd') { var du = el.parentNode.querySelector('ul'); if (du) du.hidden = !du.hidden; return; }
  if (a === 'dis-set') { try { localStorage.setItem('pn-dis', el.dataset.k); } catch(e) {} aplicarTema(); return pintar(); }
  if (a === 'tema') { try { localStorage.setItem('pn-tema', el.dataset.t); } catch(e) {} return pintar(); }
  if (a === 'bloqueo') return cambiar({ finals_locked: !g.finals_locked }, g.finals_locked ? 'Fotos liberadas: el cliente ya las ve sin marca de agua' : 'Finales bloqueadas con marca de agua');
  if (a === 'ver') return abrirVer(el.dataset.id);
  if (a === 'cerrar-cola') { cola.total = 0; cola.hechas = 0; cola.fallos = []; cola.titulo = ''; return pintarCola(); }
  if (a === 'abrir-subir') { var esD = el.dataset.esc || ''; var selE = $('#pn-esc'); if (selE) selE.value = esD; }
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
    if (!await seguro('¿Eliminar ' + ids.length + (ids.length === 1 ? ' foto' : ' fotos') + '? No se puede deshacer.')) return;
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
  if (a === 'esc-entrega' || a === 'esc-pago' || a === 'esc-ojo') {
    var ee2 = cur.escenas.filter(function(x){ return x.id === id; })[0]; if (!ee2) return;
    var campo2 = a === 'esc-pago' ? 'paid' : a === 'esc-ojo' ? 'closed' : 'delivered', nuevo2 = !ee2[campo2], cb = { gallery: galId, action: 'update', id: id }; cb[campo2] = nuevo2;
    var ru2 = await api('/api/admin/scene', cb); if (!ru2.ok) return aviso('No se pudo cambiar. ¿Ya ejecutaste etapa17.sql y etapa19.sql y actualizaste el Worker?');
    ee2[campo2] = nuevo2;
    aviso(a === 'esc-ojo' ? (nuevo2 ? 'Galería cerrada: tu cliente verá un aviso para contactarte' : 'Galería abierta: tu cliente ya puede ver sus fotos') : a === 'esc-pago' ? (nuevo2 ? 'Marcada como pagada: en su enlace verá sus fotos sin marca de agua y podrá descargarlas' : 'Pago quitado: en su enlace las verá con marca de agua') : (nuevo2 ? 'Escena entregada: solo su enlace la muestra con las fotos finales' : 'Entrega quitada de la escena'));
    return pintar();
  }
  if (a === 'esc-portada') { escPortadaId = id; var pfe = $('#pn-pfesc'); if (!pfe) return aviso('No se pudo abrir el selector de archivos.'); pfe.value = ''; aviso('Elige la foto que será la portada de esta escena.'); return pfe.click(); }
  if (a === 'esc-portada-quitar') {
    var ee3 = cur.escenas.filter(function(x){ return x.id === id; })[0]; if (!ee3) return;
    var rq3 = await api('/api/admin/cover-clear', { gallery: galId, scene: id }); if (!rq3.ok) return aviso('No se pudo quitar la portada.');
    ee3.cover_key = null; aviso('Portada de la escena quitada: usará la de la galería'); return pintar();
  }
  if (a === 'esc-renombrar') {
    var ee = cur.escenas.filter(function(x){ return x.id === id; })[0]; var nm = prompt('Nuevo nombre de la escena:', ee ? ee.name : ''); if (!nm || !nm.trim()) return;
    var ru = await api('/api/admin/scene', { gallery: galId, action: 'update', id: id, name: nm.trim() }); if (!ru.ok) return aviso('No se pudo renombrar.');
    ee.name = nm.trim().slice(0, 80); return pintar();
  }
  if (a === 'esc-borrar') {
    if (!await seguro('¿Eliminar esta escena? Sus fotos no se borran: quedan sin escena.')) return;
    var rd = await api('/api/admin/scene', { gallery: galId, action: 'delete', id: id }); if (!rd.ok) return aviso('No se pudo eliminar.');
    cur.fotos.forEach(function(x){ if (x.scene_id === id) x.scene_id = null; }); cur.escenas = cur.escenas.filter(function(x){ return x.id !== id; }); if (fEsc === id) fEsc = ''; return pintar();
  }
  if (a === 'esc-codigo') {
    var cd = $('#pn-sc-' + id).value.trim().toUpperCase(); if (!/^[A-Z0-9-]{4,40}$/.test(cd)) return aviso('El código debe tener de 4 a 40 letras, números o guiones.');
    var rk = await api('/api/admin/scene', { gallery: galId, action: 'update', id: id, access_code: cd }); if (!rk.ok) return aviso('No se pudo guardar el código.');
    cur.escenas.filter(function(x){ return x.id === id; })[0].access_code = cd; enlRefrescar(); return aviso('Código guardado');
  }
  if (a === 'fs-abrir') { fEsc = el.dataset.id || '_ninguna'; marcadas = new Set(); fMas = 48; return pintar(); }
  if (a === 'carp') { fEsc = el.dataset.id || ''; marcadas = new Set(); fMas = 48; return pintar(); }
  if (a === 'ftipo') { fTipoE[el.dataset.esc || ''] = el.dataset.v || ''; fMas = 48; return pintar(); }
  if (a === 'mas-fotos') { fMas += 48; return pintar(); }
  if (a === 'vertodo') { abiertas[el.dataset.tipo] = !abiertas[el.dataset.tipo]; return pintar(); }
  if (a === 'modo') return cambiar({ access_mode: el.dataset.v }, el.dataset.v === 'abierto' ? 'Ahora el enlace entra sin clave' : 'Ahora el enlace pide código');
  if (a === 'guardar-codigo') {
    var nc = $('#pn-cod').value.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,40}$/.test(nc)) return aviso('El código debe tener de 4 a 40 letras, números o guiones, sin espacios.');
    if (gals.some(function(x){ return x.id !== g.id && String(x.access_code).toUpperCase() === nc; })) return aviso('Ese código ya lo usa otra galería. Elige otro.');
    return cambiar({ access_code: nc }, 'Código guardado');
  }
  if (a === 'ds-set') return dsSet(el.dataset.c, el.dataset.k);
  if (a === 'ds-disp') { dsDisp = el.dataset.k; return dsRefrescar(); }
  if (a === 'ds-modo') { dsModo = el.dataset.k; return dsRefrescar(); }
  if (a === 'portada-subir') { pendPortada = null; var pfo2 = $('#pn-pfo'); if (!pfo2) return aviso('No se pudo abrir el selector de archivos.'); pfo2.value = ''; return pfo2.click(); }
  if (a === 'estilo') return cambiar({ grid_style: el.dataset.v }, 'Estilo guardado');
  if (a === 'paleta') return cambiar({ palette: el.dataset.v }, 'Paleta guardada');
  if (a === 'guardar-detalles') {
    var t1 = $('#pn-dt').value.trim(); if (!t1) return aviso('Escribe un nombre para la galería.');
    return cambiar({ title: t1, event_date: $('#pn-dd').value || null, gallery_type: $('#pn-dtp').value || null, location: $('#pn-dub').value.trim() || null, description: $('#pn-dde').value.trim() || null }, 'Detalles guardados');
  }
  if (a === 'wm-set') { var wk = el.dataset.k, wv = el.dataset.v, wc3 = wmCfg(); if (wk === 'sw') wmSw = wv; else if (wk === 'op') wc3.op = +wv; else wc3.tam = wv; wmGuardar(wc3); vdCerrar(); return wmLab(); }
  if (a === 'guardar-config') {
    var tx = $('#pn-wt').value.trim(); if (!tx) return aviso('Escribe el texto de la marca.');
    var ex = $('#pn-ex').value;
    return cambiar({ watermark_text: tx, expires_at: ex ? ex + 'T23:59:59-06:00' : null, view_quality: $('#pn-vq').value, finals_locked: $('#pn-fl').value === '1', selection_watermark: wmSw !== '0' }, 'Configuración guardada');
  }
  if (a === 'elegir-portada') {
    var s0 = cur ? cur.fotos.filter(function(x){ return x.photo_type === 'selection'; }) : [];
    $('#pn-gport').innerHTML = s0.map(function(x){ return '<button class="pn-pbtn" data-act="portada" data-id="' + x.id + '"><img loading="lazy" alt="' + esc(x.filename) + '" src="' + (cur.tk[x.id] ? esc(src(cur.tk[x.id])) : '') + '"></button>'; }).join('');
    return $('#pn-dport').showModal();
  }
  if (a === 'cerrar-portada') return $('#pn-dport').close();
  if (a === 'subir-portada') {
    var pf = $('#pn-pf').files[0]; if (!pf) return aviso('Elige primero una imagen.');
    var wc4 = wmCfg(), pmarca = $('#pn-pm').value === 'si' ? { text: (g && g.watermark_text) || marcaBase(), opacity: wc4.op, size: wc4.tam } : null;
    var pgo = $('#pn-pg'); pgo.disabled = true; pgo.textContent = 'Subiendo…';
    try {
      var rp = await reducir(pf, pmarca, 'alta'); var ss = (await db.auth.getSession()).data.session;
      var rs = await fetch(W + '/api/admin/cover-upload?gallery=' + galId, { method: 'POST', headers: { Authorization: 'Bearer ' + ss.access_token, 'Content-Type': 'image/jpeg' }, body: rp.blob });
      var dd = await rs.json().catch(function(){ return {}; });
      if (!dd.ok) throw new Error('no se pudo subir');
      g.cover_key = 'x'; if (cur) cur.cover = dd.t; await subirOg(pf); aviso('Portada actualizada');
    } catch (e) { aviso('No se pudo subir la portada: ' + (e.message || 'error')); }
    return pintar();
  }
  if (a === 'quitar-portada') {
    var rq = await api('/api/admin/cover-clear', { gallery: galId }); if (!rq.ok) return aviso('No se pudo quitar.');
    g.cover_key = null; if (cur) cur.cover = null; aviso('Portada subida eliminada'); return pintar();
  }
  if (a === 'portada') {
    pendPortada = id; try { $('#pn-dport').close(); $('#pn-dver').close(); } catch (e) {}
    var pfo = $('#pn-pfo'); if (!pfo) return aviso('No se pudo abrir el selector de archivos.');
    pfo.value = ''; aviso('Ahora elige el archivo original de esa foto en tu computadora. Así la portada sale sin marca de agua.'); pfo.click(); return;
  }
  if (a === 'borrar-foto') {
    if (!await seguro('¿Eliminar esta foto? No se puede deshacer.')) return;
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
var neg = { ok: true, clientes: [], cots: [], evs: [], mes: new Date(), cargado: false, cotEd: null, cliEd: null, evEd: null, cotImg: null, cotDis: 1, qMan: { imp: false, tot: false } };
var COT_ST = { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' };
var EV_K = { sesion: 'Sesión', evento: 'Evento', entrega: 'Entrega', otro: 'Otro' };
var TIPOS_EV = ['Boda', 'Clausura', 'Graduación', 'Quinceañera', 'Baby shower', 'Cumpleaños', 'Fiesta infantil', 'Sesión familiar', 'Sesión de retrato', 'Evento corporativo', 'Revelación de género', 'Otro'];
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
  $('#pn-main').innerHTML = '<h1>Clientes</h1><p class="pn-s ay">Tu lista de clientes con su contacto e historial. Agrégalos aquí, cotízales o escríbeles por WhatsApp.</p><div class="pn-row"><input type="text" id="pn-nq" placeholder="Buscar por nombre o teléfono" value="' + esc(busca) + '"><button class="pn-btn" data-act="n-cli-nuevo">+ Nuevo cliente</button></div>' +
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
    return '<tr><td><b>N.º ' + String(c.num).padStart(4, '0') + '</b><br><span class="pn-s">' + esc(fFmt(c.created_at, { day: 'numeric', month: 'short' })) + '</span></td><td><b>' + esc(c.client_name) + '</b><br><span class="pn-s">' + esc([c.event_type, c.event_date ? fFmt(c.event_date) : ''].filter(Boolean).join(' · ')) + '</span></td><td>' + c.digital_count + ' digitales' + (c.print_count ? ' · ' + c.print_count + ' impresas' : '') + '</td><td><b>' + qFmt(c.total) + '</b></td><td><span class="pn-pill">' + esc(COT_ST[c.status] || c.status) + '</span>' + (c.status === 'accepted' && c.event_date ? '<br><b class="pn-cta">' + cuenta(c.event_date) + '</b>' : '') + '</td><td class="pn-ac"><button class="pn-btn sec" data-act="n-cot-ver" data-id="' + c.id + '">Abrir</button></td></tr>';
  }).join('');
  var hoyD = new Date(); hoyD.setHours(0, 0, 0, 0);
  var acep = neg.cots.filter(function(c){ return c.status === 'accepted' && c.event_date && new Date(c.event_date + 'T12:00:00') >= hoyD; }).sort(function(a, b){ return a.event_date < b.event_date ? -1 : 1; });
  var cacep = acep.length ? '<div class="pn-card pn-cacep"><h3>Eventos de cotizaciones aceptadas</h3>' + acep.map(function(c){ return '<p><span><b>' + esc(c.client_name) + '</b> · ' + esc(c.event_type || '') + '<br><span class="pn-s">' + esc(fFmt(c.event_date, { weekday: 'long', day: 'numeric', month: 'long' })) + (c.location ? ' · ' + esc(c.location) : '') + '</span></span><b class="pn-cta">' + cuenta(c.event_date) + '</b></p>'; }).join('') + '</div>' : '';
  $('#pn-main').innerHTML = '<h1>Cotizaciones</h1><p class="pn-s ay">Crea una cotización con el precio calculado automáticamente y envíala por WhatsApp. Cuando el cliente acepte, márcala como aceptada y el evento pasa solo a tu agenda.</p><div class="pn-row"><button class="pn-btn" data-act="n-cot-nueva">+ Nueva cotización</button></div>' + (neg.ok ? cacep : '') +
    (!neg.ok ? negFalta() : '<div class="pn-cifras"><div><b>' + neg.cots.length + '</b><span class="pn-s">Cotizaciones</span></div><div><b>' + qFmt(sum.sent) + '</b><span class="pn-s">Enviadas, por responder</span></div><div><b>' + qFmt(sum.accepted) + '</b><span class="pn-s">Aceptadas</span></div></div>' +
    (neg.cots.length ? '<div class="pn-card" style="padding:0;overflow:auto;margin-top:1rem"><table class="pn-tb"><tr><th>N.º</th><th>Cliente</th><th>Incluye</th><th>Total</th><th>Estado</th><th></th></tr>' + filas + '</table></div>' : '<div class="pn-card" style="margin-top:1rem"><p class="pn-s">Todavía no hay cotizaciones. Crea la primera y obtén una imagen lista para enviar por WhatsApp.</p></div>')) + (neg.ok ? prHtml() : '');
}
/* ---------- Precios (motor de cotización) ---------- */
var PRECIOS0 = {
  pq: { min: 350, ronda: 10, impQ: 5, bandas: [[19, 32], [29, 14], [49, 12], [74, 10], [100, 8], [200, 6], [100000, 5]], imp: [[10, 6], [15, 7], [20, 9], [30, 12], [40, 15], [50, 20], [60, 25], [75, 32], [90, 40], [100, 50], [125, 62], [150, 75], [200, 100], [300, 150]] },
  imp: [
    { n: '4x6', cli: 7, marco: 0, costo: 5 }, { n: '5x7', cli: 14, marco: 0, costo: 9 }, { n: '6x8', cli: 25, marco: 50, costo: 15 },
    { n: '8x10', cli: 45, marco: 75, costo: 30 }, { n: '8x12', cli: 50, marco: 90, costo: 35 }, { n: '11x14', cli: 90, marco: 140, costo: 70 }, { n: '12x16', cli: 120, marco: 200, costo: 90 }
  ],
  video: { completo: { solo: 1500, comb: [[0, 1450], [20, 1400], [50, 1350], [100, 1250], [150, 1200]] }, resumen: { solo: 1000, comb: [[0, 950], [20, 920], [50, 880], [100, 830], [150, 800]] } }
};
function precios(){ var p = ph.pricing; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } } return (p && p.pq && p.pq.bandas && p.imp && p.video && p.video.completo && Array.isArray(p.video.completo.comb)) ? p : PRECIOS0; }
function pqIncluidas(N, cfg){ var t = (cfg || precios()).pq.imp, v = t[0][1], i; for (i = 0; i < t.length; i++) if (N >= t[i][0]) v = t[i][1]; return v; }
function pqPrecio(N, P, video, cfg){
  cfg = cfg || precios(); var q = cfg.pq, inc = pqIncluidas(N, cfg), foto, D = 0, prev = 0;
  if (N > 0) { q.bandas.forEach(function(b){ if (N > prev) D += (Math.min(N, b[0]) - prev) * b[1]; prev = b[0]; }); foto = Math.max(q.min, Math.round((D + inc * q.impQ) / q.ronda) * q.ronda) + Math.max(0, P - inc) * cfg.imp[0].cli; }
  else foto = P * cfg.imp[0].cli;
  var v = cfg.video[video], vid = 0; if (v) { if (N > 0) { vid = v.comb[0][1]; v.comb.forEach(function(t){ if (N >= t[0]) vid = t[1]; }); } else vid = v.solo; }
  return { foto: Math.round(foto), vid: vid, inc: inc, total: Math.round(foto) + vid };
}
var VID_N = { resumen: 'Video resumen', completo: 'Video completo' };
function cotDesc(){ return Math.min(90, Math.max(0, parseInt($('#n-qds').value, 10) || 0)); }
function cotSug(){ var N = parseInt($('#n-qdg').value, 10) || 0, P = parseInt($('#n-qim').value, 10) || 0, d = cotDesc(), r = pqPrecio(N, P, $('#n-qvi').value); return { r: r, d: d, fin: d ? Math.round(r.total * (1 - d / 100) / 5) * 5 : r.total }; }
function cotRecalc(src){
  var N = parseInt($('#n-qdg').value, 10) || 0; if (src === 'dg' && !neg.qMan.imp) $('#n-qim').value = N ? pqIncluidas(N) : 0;
  var P = parseInt($('#n-qim').value, 10) || 0, vi = $('#n-qvi').value, g = cotSug(), r = g.r;
  if (!neg.qMan.tot) $('#n-qto').value = g.fin || '';
  var tot = parseFloat($('#n-qto').value) || 0, man = neg.qMan.tot && tot !== g.fin;
  $('#n-qde').innerHTML = (man ? 'Precio sugerido: <b>' + qFmt(g.fin) + '</b> (tú escribiste otro total) <button type="button" class="pn-btn sec" data-act="n-usar-sug">Usar el sugerido</button><br>' : '') + 'Fotos ' + qFmt(r.foto) + (r.vid ? ' + ' + VID_N[vi].toLowerCase() + ' ' + qFmt(r.vid) : '') + (g.d ? ' · descuento ' + g.d + '% (redondeado a múltiplos de Q5)' : '') + ' · con ' + N + ' digitales se incluyen ' + r.inc + ' impresas 4x6.';
  var cfg = precios(), costo = P * cfg.imp[0].costo, gan = tot - costo;
  $('#n-qgn').innerHTML = '<b>Ganancia neta: ' + qFmt(gan) + '</b><br><span class="pn-s">Total ' + qFmt(tot) + ' − costo de impresión ' + qFmt(costo) + ' (' + P + ' impresas a Q' + cfg.imp[0].costo + '). No cuenta USB ni tu tiempo. Solo la ves tú.</span>';
}
function cotAbrir(id, clienteId){
  var c = id ? neg.cots.filter(function(x){ return x.id === id; })[0] : null; neg.cotEd = id || null; var cl = clienteId ? cliPorId(clienteId) : null;
  neg.qMan = { imp: !!c, tot: !!c };
  $('#n-qcl').innerHTML = '<option value="">— Cliente nuevo o sin ficha —</option>' + neg.clientes.map(function(x){ return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
  $('#n-qcl').value = c ? (c.client_id || '') : (cl ? cl.id : '');
  $('#n-qnm').value = c ? c.client_name : (cl ? cl.name : '');
  $('#n-qtp').innerHTML = TIPOS_EV.map(function(t){ return '<option>' + t + '</option>'; }).join(''); $('#n-qtp').value = c && c.event_type ? c.event_type : 'Boda';
  $('#n-qfe').value = c ? (c.event_date || '') : ''; $('#n-qlu').value = c ? (c.location || '') : '';
  $('#n-qdg').value = c ? c.digital_count : 100; $('#n-qim').value = c ? c.print_count : 50; $('#n-qto').value = c ? c.total : ''; $('#n-qva').value = c ? c.valid_days : 7;
  $('#n-qvi').value = c && c.video ? c.video : 'ninguno'; $('#n-qds').value = c && c.discount_pct ? c.discount_pct : 0;
  if (c) { var g0 = cotSug(); neg.qMan.tot = !(c.total > 0) ? false : (c.total !== g0.fin); }
  $('#n-qdel').hidden = !c; if (!c) cotRecalc('dg'); else cotRecalc(); $('#n-dcot').showModal();
}
function cotDisEv(){ return 4; }
async function cotGuardar(e){
  e.preventDefault();
  var d = { client_id: $('#n-qcl').value || null, client_name: $('#n-qnm').value.trim(), event_type: $('#n-qtp').value, event_date: $('#n-qfe').value || null, location: $('#n-qlu').value.trim() || null,
    digital_count: parseInt($('#n-qdg').value, 10) || 0, print_count: parseInt($('#n-qim').value, 10) || 0, total: parseFloat($('#n-qto').value) || 0, valid_days: parseInt($('#n-qva').value, 10) || 7, video: $('#n-qvi').value, discount_pct: cotDesc() };
  d.subtotal = d.discount_pct ? pqPrecio(d.digital_count, d.print_count, d.video).total : null;
  if (!d.client_name) return aviso('Escribe el nombre del cliente.');
  if (!neg.cotEd) d.design = cotDisEv(d.event_type);
  var r = neg.cotEd ? await db.from('quotes').update(d).eq('id', neg.cotEd).select('id').single() : await db.from('quotes').insert(Object.assign({ photographer_id: ph.id }, d)).select('id').single();
  if (r.error) return aviso(/video|discount|subtotal/i.test(r.error.message) ? 'Falta ejecutar etapa11.sql y etapa12.sql en Supabase (ver instrucciones).' : r.error.message);
  $('#n-dcot').close(); await negCargar(true); aviso('Cotización guardada'); vista = 'cotiz'; pintar(); cotVer(r.data.id);
}
function cotTexto(c){
  var n = ph.studio_name || 'Alexander Ge Erre';
  return 'Hola ' + c.client_name + ' 👋 Te comparto tu cotización de ' + n + '.\n\n' + (c.event_type ? c.event_type + (c.event_date ? ' · ' + fFmt(c.event_date) : '') + '\n' : '') + (c.location ? c.location + '\n' : '') +
    '📸 ' + c.digital_count + ' fotografías digitales\n' + (c.print_count ? '🖼️ ' + c.print_count + ' fotografías impresas\n' : '') + (c.video && VID_N[c.video] ? '🎬 ' + VID_N[c.video] + '\n' : '') + '💾 Entrega en memoria USB\n\n' + (c.discount_pct > 0 && c.subtotal > c.total ? 'Precio regular: ' + qFmt(c.subtotal) + '\n🎁 Descuento: ' + c.discount_pct + '%\n' : '') + '💰 Total: ' + qFmt(c.total) + '\nVálida por ' + c.valid_days + ' días.\n\n¿Te la reservo?';
}
/* Mis precios (edición) */
function prHtml(){
  var c = precios(), N = function(path, v, st){ return '<input type="number" step="any" min="0" data-pp="' + path + '" value="' + v + '" style="width:' + (st || '5.5rem') + '">'; };
  var h = '<details class="pn-card" style="margin-top:1rem"><summary style="cursor:pointer;font-weight:500">Mis precios (solo los ves tú)</summary><p class="pn-s">Con estos valores se calcula solo el total de cada cotización. Cámbialos cuando ajustes tus precios.</p>' +
    '<h3>Fotografías digitales</h3><p class="pn-s">Precio por foto en cada tramo. Los primeros 19 se cobran igual; desde la foto 20 empieza la mejora. Precio mínimo del paquete: Q ' + N('pq.min', c.pq.min, '4.5rem') + ' · redondear a múltiplos de Q ' + N('pq.ronda', c.pq.ronda, '3.5rem') + ' · cada impresa incluida se suma a Q ' + N('pq.impQ', c.pq.impQ, '3.5rem') + '</p><div style="overflow:auto"><table class="pn-tb"><tr><th>Hasta la foto n.º</th><th>Q por foto</th></tr>' +
    c.pq.bandas.map(function(b, i){ return '<tr><td>' + (i === c.pq.bandas.length - 1 ? 'en adelante' : N('pq.bandas.' + i + '.0', b[0], '5rem')) + '</td><td>' + N('pq.bandas.' + i + '.1', b[1], '5rem') + '</td></tr>'; }).join('') + '</table></div>' +
    '<h3>Impresas incluidas según digitales</h3><div style="overflow:auto"><table class="pn-tb"><tr><th>Desde (digitales)</th><th>Impresas 4x6 incluidas</th></tr>' +
    c.pq.imp.map(function(b, i){ return '<tr><td>' + N('pq.imp.' + i + '.0', b[0], '5rem') + '</td><td>' + N('pq.imp.' + i + '.1', b[1], '5rem') + '</td></tr>'; }).join('') + '</table></div>' +
    '<h3>Impresiones</h3><div style="overflow:auto"><table class="pn-tb"><tr><th>Tamaño</th><th>Precio cliente</th><th>Con marco</th><th>Tu costo</th></tr>' +
    c.imp.map(function(m, i){ return '<tr><td>' + esc(m.n) + '</td><td>' + N('imp.' + i + '.cli', m.cli, '4.5rem') + '</td><td>' + N('imp.' + i + '.marco', m.marco, '4.5rem') + '</td><td>' + N('imp.' + i + '.costo', m.costo, '4.5rem') + '</td></tr>'; }).join('') + '</table></div>' +
    '<h3>Video</h3><p class="pn-s">Solo el video (sin fotos): completo Q ' + N('video.completo.solo', c.video.completo.solo) + ' · resumen Q ' + N('video.resumen.solo', c.video.resumen.solo) + '. Con fotos el precio baja según la cantidad de digitales:</p><div style="overflow:auto"><table class="pn-tb"><tr><th>Desde (digitales)</th><th>Video completo</th><th>Video resumen</th></tr>' +
    c.video.completo.comb.map(function(t, i){ return '<tr><td>' + N('video.completo.comb.' + i + '.0', t[0], '4.5rem') + '</td><td>' + N('video.completo.comb.' + i + '.1', t[1], '5rem') + '</td><td>' + N('video.resumen.comb.' + i + '.1', c.video.resumen.comb[i][1], '5rem') + '</td></tr>'; }).join('') + '</table></div>' +
    '<div class="pn-row"><button class="pn-btn" data-act="n-pr-save">Guardar precios</button><button class="pn-btn sec" data-act="n-pr-reset">Volver a los precios iniciales</button></div></details>';
  return h;
}
async function prGuardar(reset){
  var cfg = reset ? JSON.parse(JSON.stringify(PRECIOS0)) : JSON.parse(JSON.stringify(precios()));
  if (!reset) root.querySelectorAll('[data-pp]').forEach(function(i){ var p = i.dataset.pp.split('.'), o = cfg, k; for (k = 0; k < p.length - 1; k++) o = o[p[k]]; o[p[p.length - 1]] = parseFloat(i.value) || 0; });
  var r = await db.from('photographers').update({ pricing: cfg }).eq('id', ph.id).select('id');
  if (r.error) return aviso(/pricing/i.test(r.error.message) ? 'Falta ejecutar etapa11.sql en Supabase (ver instrucciones).' : r.error.message);
  ph.pricing = cfg; aviso(reset ? 'Precios iniciales restaurados' : 'Precios guardados'); pintarCotiz();
}
function cotVer(id){
  var c = neg.cots.filter(function(x){ return x.id === id; })[0]; if (!c) return; neg.cotImg = c; neg.cotDis = disNorm(c.design);
  $('#n-vti').textContent = 'Cotización N.º ' + String(c.num).padStart(4, '0') + ' · ' + c.client_name;
  $('#n-vst').value = c.status; cotDibujar(); $('#n-dver').showModal();
}
/* ---------- Diseños de cotización ---------- */
var ESTILOS_COT = { 1: 'Clásica', 4: 'Elegante', 2: 'Editorial', 3: 'Oscura' };
var EMB_T = {
  boda: { n: 'Boda', ac: '#B8946A', cl: '#FBF7F0', dk: '#16110d', dac: '#C9A67A', el: { bg: '#FBF7F0', tx: '#2b2623', mu: '#8b8174', ac: '#B8946A', o: 'boda' } },
  grad: { n: 'Graduación', ac: '#B88A2E', cl: '#F4F1EA', dk: '#0b0f16', dac: '#D9B26B', el: { bg: '#0f2238', tx: '#F4F1EA', mu: '#9fb0c4', ac: '#D9B26B', dark: 1, o: 'grad' } },
  quince: { n: 'Quinceañera', ac: '#B9705F', cl: '#FBF1EE', dk: '#1c0a10', dac: '#E8BFA4', el: { bg: '#45131f', tx: '#FBEFEA', mu: '#d3aaa5', ac: '#E8BFA4', dark: 1, o: 'quince' } },
  baby: { n: 'Baby shower', ac: '#7F9060', cl: '#F4F3E8', dk: '#171c13', dac: '#A9BC86', el: { bg: '#F2F1E6', tx: '#2f3526', mu: '#7b8468', ac: '#7F9060', o: 'baby' } },
  cumple: { n: 'Cumpleaños', ac: '#D9772A', cl: '#FFF7EA', dk: '#221610', dac: '#F0A15A', el: { bg: '#FFF5E6', tx: '#3a2a1c', mu: '#8d7760', ac: '#D9772A', o: 'fiesta' } },
  fiesta: { n: 'Fiesta infantil', ac: '#3F86D1', cl: '#EEF5FC', dk: '#0d1726', dac: '#6FA9E6', el: { bg: '#EAF3FB', tx: '#1d3350', mu: '#5f7894', ac: '#3F86D1', o: 'globos' } },
  familiar: { n: 'Sesión familiar', ac: '#A56A47', cl: '#F6EEE3', dk: '#1d130d', dac: '#CF9A78', el: { bg: '#F1E6D7', tx: '#3a2a20', mu: '#8a7461', ac: '#A56A47', o: 'arcos' } },
  retrato: { n: 'Sesión de retrato', ac: '#222222', cl: '#F5F5F3', dk: '#0b0b0b', dac: '#D9D4CB', el: { bg: '#FFFFFF', tx: '#111111', mu: '#777777', ac: '#111111', o: 'marco' } },
  corp: { n: 'Evento corporativo', ac: '#2E8F9B', cl: '#EEF5F6', dk: '#07161b', dac: '#4FB3BF', el: { bg: '#0E2A33', tx: '#EAF4F5', mu: '#8fb0b6', ac: '#4FB3BF', dark: 1, o: 'geo' } },
  revela: { n: 'Revelación de género', ac: '#C0788C', cl: '#FBF5F5', dk: '#1c1418', dac: '#E39AB0', el: { bg: '#FBF5F5', tx: '#3a2b30', mu: '#9a8388', ac: '#C0788C', o: 'revela' } },
  otro: { n: 'Otro', ac: '#B8946A', cl: '#F6EFE3', dk: '#14110e', dac: '#B8946A', el: { bg: '#F6EFE3', tx: '#1c1a17', mu: '#7b7366', ac: '#B8946A' } }
};
function tipoClave(t){ t = String(t || ''); return t === 'Boda' ? 'boda' : t === 'Graduación' ? 'grad' : t === 'Quinceañera' ? 'quince' : t === 'Baby shower' ? 'baby' : t === 'Cumpleaños' ? 'cumple' : t === 'Fiesta infantil' ? 'fiesta' : t === 'Sesión familiar' ? 'familiar' : t === 'Sesión de retrato' ? 'retrato' : t === 'Evento corporativo' ? 'corp' : /^Revelaci/.test(t) ? 'revela' : 'otro'; }
function disNorm(d){ d = +d || 0; return d >= 1 && d <= 3 ? d : 4; }
function tema(dis, tipo){
  var k = tipoClave(tipo), E = EMB_T[k], d = disNorm(dis), T;
  if (d === 1) T = { bg: E.cl, tx: '#26211d', mu: '#7b7366', ac: E.ac, mc: 1 };
  else if (d === 2) T = { bg: '#FFFFFF', tx: '#1c1a17', mu: '#7b7366', ac: E.ac, lay: 'e' };
  else if (d === 3) T = { bg: E.dk, tx: '#F2EFEA', mu: '#a99f8f', ac: E.dac, dark: 1, mc: 3 };
  else T = Object.assign({}, E.el);
  T.k = k; T.d = d; return T;
}
/* Emblema de cada tipo de evento: se dibuja en un cuadro de 200x200 centrado en (cx, cy) */
function emblema(x, k, cx, cy, s, col, lw, alpha){
  x.save(); x.globalAlpha = alpha == null ? 1 : alpha; x.translate(cx, cy); x.scale(s / 100, s / 100); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = lw; x.lineJoin = 'round'; x.lineCap = 'round';
  var A = function(px, py, rx, ry){ x.beginPath(); x.ellipse(px, py, rx, ry == null ? rx : ry, 0, 0, 7); x.stroke(); }, L = function(a, b, c, d){ x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
  if (k === 'boda') { A(-30, 12, 54); A(30, 12, 54); x.beginPath(); x.moveTo(30, -66); x.lineTo(42, -52); x.lineTo(30, -38); x.lineTo(18, -52); x.closePath(); x.stroke(); }
  else if (k === 'grad') { x.beginPath(); x.moveTo(0, -55); x.lineTo(96, -18); x.lineTo(0, 19); x.lineTo(-96, -18); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(-58, 0); x.lineTo(-58, 42); x.quadraticCurveTo(0, 76, 58, 42); x.lineTo(58, 0); x.stroke(); L(96, -18, 96, 40); A(96, 50, 7); }
  else if (k === 'quince') { x.beginPath(); x.moveTo(-80, 46); x.lineTo(-92, -30); x.lineTo(-46, 8); x.lineTo(0, -58); x.lineTo(46, 8); x.lineTo(92, -30); x.lineTo(80, 46); x.closePath(); x.stroke(); L(-80, 66, 80, 66); A(-92, -34, 7); A(0, -64, 8); A(92, -34, 7); }
  else if (k === 'baby') { x.beginPath(); x.moveTo(-14, -90); x.quadraticCurveTo(0, -106, 14, -90); x.lineTo(14, -74); x.lineTo(-14, -74); x.closePath(); x.stroke(); x.beginPath(); x.rect(-32, -74, 64, 14); x.stroke(); x.beginPath(); x.moveTo(-34, -46); x.quadraticCurveTo(-34, -60, -20, -60); x.lineTo(20, -60); x.quadraticCurveTo(34, -60, 34, -46); x.lineTo(34, 78); x.quadraticCurveTo(34, 94, 18, 94); x.lineTo(-18, 94); x.quadraticCurveTo(-34, 94, -34, 78); x.closePath(); x.stroke(); L(14, -20, 34, -20); L(14, 6, 34, 6); L(14, 32, 34, 32); }
  else if (k === 'cumple') { x.beginPath(); x.rect(-76, 14, 152, 56); x.stroke(); x.beginPath(); x.rect(-54, -22, 108, 36); x.stroke(); x.beginPath(); x.moveTo(-76, 34); x.quadraticCurveTo(-57, 50, -38, 34); x.quadraticCurveTo(-19, 18, 0, 34); x.quadraticCurveTo(19, 50, 38, 34); x.quadraticCurveTo(57, 18, 76, 34); x.stroke(); [-28, 0, 28].forEach(function(p){ L(p, -22, p, -52); x.beginPath(); x.ellipse(p, -64, 6, 11, 0, 0, 7); x.fill(); }); L(-96, 70, 96, 70); }
  else if (k === 'fiesta') { [[-54, -34, 33, 42], [0, -54, 33, 42], [54, -34, 33, 42]].forEach(function(b){ A(b[0], b[1], b[2], b[3]); x.beginPath(); x.moveTo(b[0], b[1] + b[3]); x.quadraticCurveTo(b[0] * .4 + 10, 70, 0, 94); x.stroke(); }); }
  else if (k === 'familiar') { x.beginPath(); x.moveTo(0, 78); x.bezierCurveTo(-118, -2, -64, -88, 0, -34); x.bezierCurveTo(64, -88, 118, -2, 0, 78); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(-32, 10); x.lineTo(0, -16); x.lineTo(32, 10); x.stroke(); x.beginPath(); x.rect(-23, 10, 46, 32); x.stroke(); }
  else if (k === 'retrato') { x.beginPath(); x.rect(-92, -42, 184, 118); x.stroke(); x.beginPath(); x.moveTo(-36, -42); x.lineTo(-26, -64); x.lineTo(26, -64); x.lineTo(36, -42); x.stroke(); A(0, 18, 40); A(0, 18, 22); A(66, -20, 4); }
  else if (k === 'corp') { x.beginPath(); x.rect(-76, -8, 42, 88); x.stroke(); x.beginPath(); x.rect(-22, -62, 46, 142); x.stroke(); x.beginPath(); x.rect(34, -30, 42, 110); x.stroke(); L(-100, 80, 100, 80); [-40, -20].forEach(function(yy){ L(-10, yy, 12, yy); }); [0, 24, 48].forEach(function(yy){ L(-10, yy, 12, yy); }); L(-64, 20, -44, 20); L(-64, 46, -44, 46); L(46, 0, 64, 0); L(46, 26, 64, 26); L(46, 52, 64, 52); }
  else if (k === 'revela') { x.strokeStyle = '#D9779A'; A(-46, -22, 32); L(-46, 10, -46, 66); L(-68, 40, -24, 40); x.strokeStyle = '#4F93D6'; A(46, 12, 32); L(69, -11, 96, -38); L(96, -38, 72, -38); L(96, -38, 96, -14); }
  else { A(0, 0, 84); x.beginPath(); for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; x.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); } x.closePath(); x.stroke(); for (var j = 0; j < 6; j++) { var b = j * Math.PI / 3; L(Math.cos(b) * 34, Math.sin(b) * 34, Math.cos(b + 1.05) * 84, Math.sin(b + 1.05) * 84); } }
  x.restore();
}
var WA_NUM = '+502 4465-8195';
function waNumero(){ var p = String(ph.wa_phone || '').replace(/\D/g, ''); return /^502\d{8}$/.test(p) ? '+502 ' + p.slice(3, 7) + '-' + p.slice(7) : WA_NUM; }
function cotImgCarga(lista){ return new Promise(function(ok){ var i = 0; (function sig(){ if (i >= lista.length) return ok(null); var im = new Image(); im.onload = function(){ ok(im); }; im.onerror = function(){ i++; sig(); }; if (/^https?:/.test(lista[i])) im.crossOrigin = 'anonymous'; im.src = lista[i]; })(); }); }
function cotLogos(){
  if (neg.logos) return neg.logos;
  var L = function(dato, n){ var l = []; if (dato) l.push(dato); LOGO_EXTS.forEach(function(e){ l.push('imagenes/' + n + e); }); return l; };
  neg.logos = Promise.all([cotImgCarga(L(ph.logo_para_claro, 'logo-oscuro')), cotImgCarga(L(ph.logo_para_oscuro, 'logo-claro'))]).then(function(a){ return { claro: a[0], oscuro: a[1] }; });
  return neg.logos;
}
function cotDibujar(){
  var cv = $('#n-vcv'), c = neg.cotImg; if (!cv || !c) return;
  cotLienzo(cv, c, neg.cotDis);
  var ids = [1, 4, 2, 3];
  $('#n-dbt').innerHTML = ids.map(function(i){ return '<button class="pn-btn sec" data-act="n-cot-dis" data-d="' + i + '">' + esc(ESTILOS_COT[i]) + '</button>'; }).join('');
  root.querySelectorAll('[data-act=n-cot-dis]').forEach(function(b){ b.classList.toggle('on', +b.dataset.d === neg.cotDis); });
  var f = document.fonts ? Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'), document.fonts.load('italic 500 40px "Cormorant Garamond"'), document.fonts.load('300 30px Jost')]).catch(function(){}) : Promise.resolve();
  Promise.all([f, cotLogos()]).then(function(r){ neg.logosR = r[1]; var d = $('#n-dver'); if (d && d.open && neg.cotImg) cotLienzo($('#n-vcv'), neg.cotImg, neg.cotDis); });
}
function cotLienzo(cv, c, dis){
  var W = 1080, H = 1350; cv.width = W; cv.height = H; var x = cv.getContext('2d'), T = tema(dis, c.event_type);
  var SER = '"Cormorant Garamond", Georgia, serif', SAN = 'Jost, Inter, Arial, sans-serif', tx = T.tx, mu = T.mu, ac = T.ac;
  x.fillStyle = T.bg; x.fillRect(0, 0, W, H);
  function t(s, px, py, font, col, al, sp){ x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; try { x.letterSpacing = (sp || 0) + 'px'; } catch (e) {} x.fillText(s, px, py); try { x.letterSpacing = '0px'; } catch (e) {} }
  function fit(s, px, py, size, col, al, maxw, fam){ var f = size; x.font = '500 ' + f + 'px ' + fam; while (x.measureText(s).width > maxw && f > 28) { f -= 2; x.font = '500 ' + f + 'px ' + fam; } t(s, px, py, '500 ' + f + 'px ' + fam, col, al); }
  function rr(px, py, w, h, r){ x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
  function seed(n){ var s = n; return function(){ s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function sprig(cx, cy, len, ang, col){ x.save(); x.translate(cx, cy); x.rotate(ang); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * .5, -len * .06, len, 0); x.stroke();
    for (var i = 1; i <= 6; i++) { var px = len * i / 7, s = (i % 2 ? 1 : -1); x.save(); x.translate(px, 0); x.rotate(s * 0.9); x.beginPath(); x.ellipse(0, -s * 14, 7, 20, 0, 0, 7); x.globalAlpha = .75; x.fill(); x.restore(); } x.restore(); }
  function marco(ins, col, lw){ x.strokeStyle = col; x.lineWidth = lw; x.strokeRect(ins, ins, W - 2 * ins, H - 2 * ins); }
  function estrella(cx, cy, r, col){ x.fillStyle = col; x.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .42 : r; x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } x.closePath(); x.fill(); }
  function nube(cx, cy, s, col){ x.fillStyle = col; x.beginPath(); x.arc(cx, cy, 34 * s, 0, 7); x.arc(cx + 42 * s, cy - 18 * s, 44 * s, 0, 7); x.arc(cx + 92 * s, cy, 36 * s, 0, 7); x.rect(cx, cy, 92 * s, 34 * s); x.fill(); }
  function globo(cx, cy, col){ x.strokeStyle = tx; x.globalAlpha = .35; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy + 62); x.quadraticCurveTo(cx - 16, cy + 120, cx + 6, cy + 170); x.stroke(); x.globalAlpha = 1; x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, 48, 60, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(cx - 16, cy - 20, 9, 16, .5, 0, 7); x.fill(); x.fillStyle = col; x.beginPath(); x.moveTo(cx, cy + 58); x.lineTo(cx - 9, cy + 74); x.lineTo(cx + 9, cy + 74); x.fill(); }
  /* fondo / adornos */
  var o = T.o;
  if (T.mc === 1) { marco(40, ac, 2); marco(54, ac, 1); } else if (T.mc === 3) { marco(40, ac, 1.5); }
  if (o === 'boda') { marco(40, ac, 2); marco(54, ac, 1); sprig(80, 110, 150, 0.7, ac); sprig(W - 80, 110, 150, Math.PI - 0.7, ac); sprig(80, H - 200, 150, -0.7, ac); sprig(W - 80, H - 200, 150, Math.PI + 0.7, ac); }
  else if (o === 'grad') { marco(40, ac, 2); marco(54, ac, 1);  }
  else if (o === 'quince') { rr(40, 40, W - 80, H - 80, 36); x.strokeStyle = ac; x.lineWidth = 2; x.stroke(); rr(56, 56, W - 112, H - 112, 24); x.lineWidth = 1; x.stroke(); var rq = seed(7), qi; for (qi = 0; qi < 26; qi++) { var sx = rq() * W, sy = rq() * H; if (sx > 190 && sx < W - 190) continue; estrella(sx, sy, 8 + rq() * 12, ac); } }
  else if (o === 'baby') { x.save(); x.globalAlpha = .28; x.fillStyle = ac; x.beginPath(); x.arc(W - 210, 170, 90, 0, 7); x.fill(); x.fillStyle = T.bg; x.beginPath(); x.arc(W - 170, 150, 80, 0, 7); x.fill(); x.restore(); var rb = seed(11), bi; for (bi = 0; bi < 12; bi++) { var bx = 60 + rb() * (W - 120), by = 60 + rb() * 330; if (bx > 330 && bx < 760 && by > 130) continue; estrella(bx, by, 9 + rb() * 9, ac); }
    x.globalAlpha = .22; nube(60, H - 80, 1.4, ac); nube(W - 290, H - 50, 1.6, ac); x.globalAlpha = 1; marco(44, ac, 2); }
  else if (o === 'fiesta') { var rf = seed(5), cols = [ac, '#E6B84A', '#D96C7A', '#5BA9C9', '#8CB36A'], fi; for (fi = 0; fi < 90; fi++) { var fx = rf() * W, fy = rf() * H; if (fx > 150 && fx < W - 150 && fy > 150 && fy < H - 150) continue; x.save(); x.translate(fx, fy); x.rotate(rf() * 6); x.fillStyle = cols[fi % 5]; if (fi % 3) x.fillRect(-9, -4, 18, 8); else { x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); } x.restore(); } }
  else if (o === 'globos') { globo(75, 430, '#3F86D1'); globo(130, 520, '#F2A93B'); globo(62, 590, '#E86A7A'); globo(W - 110, 1000, '#5BB8A8'); globo(W - 175, 1090, '#3F86D1'); globo(W - 80, 1140, '#F2A93B'); }
  else if (o === 'arcos') { x.strokeStyle = ac; x.lineWidth = 3; [560, 470, 380].forEach(function(r, i){ x.globalAlpha = .28 - i * .06; x.beginPath(); x.arc(W / 2, H + 40, r, Math.PI, 0); x.stroke(); }); x.globalAlpha = .07; x.fillStyle = ac; x.beginPath(); x.arc(W / 2, H + 40, 380, Math.PI, 0); x.fill(); x.globalAlpha = 1; }
  else if (o === 'marco') { marco(44, tx, 2); x.fillStyle = tx; x.fillRect(W / 2 - 30, 44 - 2, 60, 6); x.fillRect(W / 2 - 30, H - 48, 60, 6); }
  else if (o === 'geo') { x.save(); x.strokeStyle = ac; x.globalAlpha = .22; x.lineWidth = 2; var gi; for (gi = 0; gi < 9; gi++) { x.beginPath(); x.moveTo(W - 40 - gi * 34, 40); x.lineTo(W - 40, 40 + gi * 34); x.stroke(); x.beginPath(); x.moveTo(40 + gi * 34, H - 40); x.lineTo(40, H - 40 - gi * 34); x.stroke(); } x.restore(); x.fillStyle = ac; x.fillRect(80, 100, 6, 70); }
  else if (o === 'revela') { x.save(); x.globalAlpha = .3; x.fillStyle = '#E7A9BC'; x.beginPath(); x.arc(0, 0, 270, 0, 7); x.fill(); x.fillStyle = '#9DC1E3'; x.beginPath(); x.arc(W, H, 290, 0, 7); x.fill(); x.restore(); }
  emblema(x, T.k, W / 2, 790, 340, ac, 3.6, T.dark ? .2 : .17);
  /* logo + WhatsApp */
  var LG = neg.logosR ? (T.dark ? neg.logosR.oscuro : neg.logosR.claro) : null, estudio = ph.studio_name || 'Alexander Ge Erre';
  function logo(cx, top, maxW, maxH, al){ if (!LG) { t(estudio, al === 'left' ? cx : cx, top + maxH * .7, '500 ' + Math.round(maxH * .55) + 'px ' + SER, tx, al || 'center'); return; } var s = Math.min(maxW / LG.naturalWidth, maxH / LG.naturalHeight), w = LG.naturalWidth * s, h = LG.naturalHeight * s; x.drawImage(LG, al === 'left' ? cx : cx - w / 2, top + (maxH - h) / 2, w, h); }
  function icWa(gx, cy, r, col){
    var P = function(d){ var a = d * Math.PI / 180; return [gx + Math.cos(a) * r, cy + Math.sin(a) * r]; }, a1 = P(150), a2 = P(104);
    x.save(); x.strokeStyle = col; x.lineWidth = 3.6; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); x.moveTo(a1[0], a1[1]); x.lineTo(gx - r * 1.12, cy + r * 1.22); x.lineTo(a2[0], a2[1]); x.arc(gx, cy, r, 104 * Math.PI / 180, 150 * Math.PI / 180 + 2 * Math.PI, false); x.closePath(); x.stroke(); x.restore();
    x.save(); x.translate(gx - r * .62, cy - r * .62); x.scale(r / 19, r / 19); x.fillStyle = col; x.fill(new Path2D('M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z')); x.restore(); }
  function icFb(gx, cy, r, col){ x.save(); x.strokeStyle = col; x.lineWidth = 3.2; x.beginPath(); x.arc(gx, cy, r, 0, 7); x.stroke(); x.restore(); t('f', gx + r * .12, cy + r * .78, '600 ' + Math.round(r * 2.05) + 'px ' + SAN, col, 'center'); }
  function icIg(gx, cy, r, col){ x.save(); x.strokeStyle = col; x.lineWidth = 3.2; rr(gx - r, cy - r, r * 2, r * 2, r * .62); x.stroke(); x.beginPath(); x.arc(gx, cy, r * .46, 0, 7); x.stroke(); x.fillStyle = col; x.beginPath(); x.arc(gx + r * .56, cy - r * .56, 2.6, 0, 7); x.fill(); x.restore(); }
  function contacto(left, cy, col, al){
    var num = waNumero(), fs = 34, rw = 26, ri = 20, nom = (ph.studio_name || 'Alexander Ge Erre'), gap = 56, w1, w2, tot;
    for (; fs >= 24; fs -= 2) { x.font = '400 ' + fs + 'px ' + SAN; try { x.letterSpacing = '1.5px'; } catch (e) {} w1 = x.measureText(num).width; w2 = x.measureText(nom).width; try { x.letterSpacing = '0px'; } catch (e) {}
      tot = rw * 2 + 16 + w1 + gap + (ri * 4 + 12 + 16 + w2); if (tot <= (al === 'left' ? W - 160 : W - 200)) break; }
    var x0 = al === 'left' ? left : (W - tot) / 2, gx = x0 + rw;
    icWa(gx, cy, rw, col); t(num, x0 + rw * 2 + 16, cy + fs * .35, '400 ' + fs + 'px ' + SAN, tx, 'left', 1.5);
    var sx = x0 + rw * 2 + 16 + w1 + gap; icFb(sx + ri, cy, ri, col); icIg(sx + ri * 3 + 12, cy, ri * .9, col); t(nom, sx + ri * 4 + 12 + 16, cy + fs * .35, '400 ' + fs + 'px ' + SAN, tx, 'left', 1.5);
  }
  var fecha = c.event_date ? fFmt(c.event_date) : '', linea = [c.event_type, fecha].filter(Boolean).join(' · '), vid = c.video && VID_N[c.video] ? VID_N[c.video] : '';
  var pie = 'Válida por ' + c.valid_days + ' días  ·  Entrega en memoria USB', nota = 'Nos ajustamos a tu presupuesto';
  function chipVideo(cx, cy, al){ x.font = '400 32px ' + SAN; var w = x.measureText(vid).width + 96, x0 = al === 'left' ? cx : cx - w / 2; x.strokeStyle = ac; x.lineWidth = 2; rr(x0, cy - 30, w, 60, 30); x.stroke(); x.fillStyle = ac; x.beginPath(); x.moveTo(x0 + 28, cy - 11); x.lineTo(x0 + 28, cy + 11); x.lineTo(x0 + 46, cy); x.closePath(); x.fill(); t(vid, x0 + 62, cy + 11, '400 32px ' + SAN, tx, 'left'); }
  if (T.lay === 'e') {
    x.fillStyle = tx; x.fillRect(80, 190, W - 160, 2); logo(80, 60, 330, 100, 'left'); t('Cotización N.º ' + String(c.num).padStart(4, '0'), W - 80, 140, '400 26px ' + SAN, mu, 'right', 2);
    t('Tu cotización', 80, 310, '400 34px ' + SAN, ac, 'left', 6); fit('Preparada para ' + c.client_name, 80, 410, 76, tx, 'left', W - 160, SER);
    t(linea, 80, 475, '300 34px ' + SAN, mu, 'left'); if (c.location) t(c.location, 80, 522, '300 34px ' + SAN, mu, 'left');
    x.fillRect(80, 580, W - 160, 2);
    t(String(c.digital_count), 80, 790, '500 160px ' + SER, tx, 'left'); t('fotografías digitales', 80, 895, '300 34px ' + SAN, mu, 'left');
    if (c.print_count) { t(String(c.print_count), 600, 790, '500 160px ' + SER, tx, 'left'); t('fotografías impresas', 600, 895, '300 34px ' + SAN, mu, 'left'); }
    if (vid) chipVideo(80, 965, 'left');
    x.fillRect(80, 1020, W - 160, 2); t('TOTAL', 80, 1110, '400 34px ' + SAN, mu, 'left', 8); t(qFmt(c.total), W - 80, 1122, '500 108px ' + SER, ac, 'right');
    if (c.discount_pct > 0 && c.subtotal > c.total) t('Precio regular ' + qFmt(c.subtotal) + '  ·  Descuento ' + c.discount_pct + '%', 80, 1156, '300 27px ' + SAN, mu, 'left');
    t(nota, 80, 1198, 'italic 500 38px ' + SER, ac, 'left'); t(pie, 80, 1240, '300 26px ' + SAN, mu, 'left'); contacto(80, 1300, ac, 'left');
  } else {
    logo(W / 2, 70, 420, 150, 'center'); t('FOTOGRAFÍA Y VIDEOGRAFÍA PROFESIONAL', W / 2, 260, '400 22px ' + SAN, mu, 'center', 6);
    if (T.d === 4) emblema(x, T.k, W / 2, 310, 36, ac, 4.6, .95); else { x.fillStyle = ac; x.fillRect(W / 2 - 40, 300, 80, 3); }
    t('Cotización para', W / 2, 372, '300 34px ' + SAN, mu, 'center', 2); fit(c.client_name, W / 2, 460, 92, tx, 'center', W - 200, SER);
    t(linea, W / 2, 528, '300 34px ' + SAN, mu, 'center'); if (c.location) t(c.location, W / 2, 573, '300 34px ' + SAN, mu, 'center');
    var cw = 210, dx = c.print_count ? W / 2 - cw : W / 2, ix = W / 2 + cw;
    t(String(c.digital_count), dx, 735, '500 150px ' + SER, tx, 'center'); t('digitales', dx, 832, '300 34px ' + SAN, mu, 'center');
    if (c.print_count) { t(String(c.print_count), ix, 735, '500 150px ' + SER, tx, 'center'); t('impresas', ix, 832, '300 34px ' + SAN, mu, 'center'); }
    if (vid) chipVideo(W / 2, 904, 'center');
    t('T O T A L', W / 2, 985, '400 26px ' + SAN, mu, 'center', 4); t(qFmt(c.total), W / 2, 1072, '500 104px ' + SER, ac, 'center');
    if (c.discount_pct > 0 && c.subtotal > c.total) t('Precio regular ' + qFmt(c.subtotal) + '   ·   Descuento ' + c.discount_pct + '%', W / 2, 1134, '300 27px ' + SAN, mu, 'center');
    t(nota, W / 2, 1172, 'italic 500 38px ' + SER, ac, 'center'); t(pie, W / 2, 1210, '300 26px ' + SAN, mu, 'center'); contacto(0, 1256, ac, 'center');
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
  if (a === 'n-cot-del') { if (!await seguro('¿Eliminar esta cotización?')) return; var r = await db.from('quotes').delete().eq('id', c.id); if (r.error) return aviso(r.error.message); $('#n-dver').close(); await negCargar(true); pintar(); return aviso('Cotización eliminada'); }
}

/* ---------- Agenda ---------- */
function pad(n){ return String(n).padStart(2, '0'); }
function dKey(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

async function cotAAgenda(c, avisar){
  if (!c.event_date) { if (avisar) aviso('Aceptada. Pon la fecha del evento en la cotización para agendarlo.'); return; }
  var titulo = (c.event_type || 'Evento') + ' · ' + c.client_name, dia = c.event_date;
  var ya = neg.evs.filter(function(e){ return e.title === titulo && dKey(new Date(e.starts_at)) === dia; })[0], r;
  if (ya) { if (ya.confirmed) return; r = await db.from('events').update({ confirmed: true }).eq('id', ya.id); }
  else r = await db.from('events').insert({ photographer_id: ph.id, title: titulo, kind: 'evento', client_id: c.client_id || null, starts_at: new Date(dia + 'T09:00:00').toISOString(), location: c.location || null, notes: 'Cotización N.º ' + String(c.num).padStart(4, '0'), confirmed: true });
  if (r.error) return aviso(/confirmed/i.test(r.error.message) ? 'Falta ejecutar etapa12.sql en Supabase (ver instrucciones).' : r.error.message);
  await negCargar(true); if (avisar) aviso(ya ? 'Evento confirmado en tu agenda' : 'Evento agregado a tu agenda como confirmado');
}
function cuenta(iso){ var h = new Date(); h.setHours(0, 0, 0, 0); var f = new Date(typeof iso === 'string' && iso.length === 10 ? iso + 'T12:00:00' : iso); f.setHours(0, 0, 0, 0); var n = Math.round((f - h) / 86400000); if (n === 0) return 'Es hoy'; if (n === 1) return 'Es mañana'; if (n > 1) return 'Faltan ' + n + ' días'; return n === -1 ? 'Fue ayer' : 'Hace ' + (-n) + ' días'; }
async function pintarAgenda(){
  $('#pn-main').innerHTML = '<h1>Agenda</h1><p class="pn-s">Cargando…</p>'; await negCargar();
  var m = neg.mes, y = m.getFullYear(), mo = m.getMonth(), prim = new Date(y, mo, 1), off = (prim.getDay() + 6) % 7, dias = new Date(y, mo + 1, 0).getDate(), hoy = dKey(new Date());
  var porDia = {}; neg.evs.forEach(function(e){ var k = dKey(new Date(e.starts_at)); (porDia[k] = porDia[k] || []).push(e); });
  var cel = ''; for (var i = 0; i < off; i++) cel += '<div class="dy vac"></div>';
  for (var d = 1; d <= dias; d++) { var k = y + '-' + pad(mo + 1) + '-' + pad(d); cel += '<div class="dy' + (k === hoy ? ' hoy' : '') + '"><span>' + d + '</span>' + (porDia[k] || []).map(function(e){ return '<button data-act="n-ev-edit" data-id="' + e.id + '" class="ev k-' + e.kind + (e.confirmed ? '' : ' pend') + '">' + (e.confirmed ? '✓ ' : '') + esc(hFmt(e.starts_at)) + ' ' + esc(e.title) + '</button>'; }).join('') + '</div>'; }
  var prox = neg.evs.filter(function(e){ return new Date(e.starts_at) >= new Date(new Date().toDateString()); }).slice(0, 6);
  var sigc = prox.filter(function(e){ return e.confirmed; })[0];
  $('#pn-main').innerHTML = '<h1>Agenda</h1><p class="pn-s ay">Tus eventos y sesiones. Los confirmados muestran cuánto falta. Si aceptas una cotización con fecha, el evento se agrega solo.</p><div class="pn-row"><button class="pn-btn" data-act="n-ev-nuevo">+ Nuevo evento</button><button class="pn-btn sec" data-act="n-ics-todo">Descargar agenda (.ics)</button></div>' +
    (!neg.ok ? negFalta() : '<div class="pn-mes"><button class="pn-btn sec" data-act="n-mes" data-d="-1">‹</button><b>' + esc(m.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' }).replace(/^./, function(c){ return c.toUpperCase(); })) + '</b><button class="pn-btn sec" data-act="n-mes" data-d="1">›</button></div>' +
    (sigc ? '<div class="pn-card pn-sig"><div><span class="pn-s">Próximo evento confirmado</span><h3>' + esc(sigc.title) + '</h3><span class="pn-s">' + esc(fFmt(sigc.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + esc(hFmt(sigc.starts_at)) + (sigc.location ? ' · ' + esc(sigc.location) : '') + '</span></div><div class="pn-cdn"><b>' + cuenta(sigc.starts_at).replace(/^Faltan /, '').replace(/^Es /, '') + '</b></div></div>' : '') + '<div class="pn-cal"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>' + cel + '</div>' +
    '<h2>Próximos</h2><div class="pn-card">' + (prox.length ? prox.map(function(e){ return '<p><b>' + esc(fFmt(e.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + esc(hFmt(e.starts_at)) + '</b> — ' + esc(e.title) + (e.location ? ' <span class="pn-s">(' + esc(e.location) + ')</span>' : '') + ' <span class="pn-pill">' + (e.confirmed ? 'Confirmado' : 'Por confirmar') + '</span> <b class="pn-cta">' + cuenta(e.starts_at) + '</b> <button class="pn-btn sec" data-act="n-ics-uno" data-id="' + e.id + '">.ics</button></p>'; }).join('') : '<p class="pn-s">No hay eventos próximos.</p>') + '</div>');
}
function evAbrir(id, pre){
  neg.evEd = id || null; var e = id ? neg.evs.filter(function(x){ return x.id === id; })[0] : null; pre = pre || {};
  $('#n-ecl').innerHTML = '<option value="">— Sin cliente —</option>' + neg.clientes.map(function(x){ return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
  $('#n-eti').value = e ? e.title : (pre.title || ''); $('#n-eki').value = e ? e.kind : (pre.kind || 'evento'); $('#n-ecl').value = e ? (e.client_id || '') : (pre.client || '');
  var s = e ? new Date(e.starts_at) : (pre.fecha ? new Date(pre.fecha + 'T09:00:00') : new Date(new Date().setHours(9, 0, 0, 0)));
  $('#n-efe').value = dKey(s); $('#n-eho').value = pad(s.getHours()) + ':' + pad(s.getMinutes());
  $('#n-edu').value = e && e.ends_at ? Math.round((new Date(e.ends_at) - new Date(e.starts_at)) / 3600000 * 10) / 10 : 2;
  $('#n-eco').checked = e ? !!e.confirmed : !!pre.confirmed; $('#n-elu').value = e ? (e.location || '') : (pre.lugar || ''); $('#n-eno').value = e ? (e.notes || '') : '';
  $('#n-edel').hidden = !e; $('#n-ics1').hidden = !e; $('#n-dev').showModal();
}
async function evGuardar(e){
  e.preventDefault(); var ini = new Date($('#n-efe').value + 'T' + ($('#n-eho').value || '09:00') + ':00'); if (isNaN(ini)) return aviso('Revisa la fecha y la hora.');
  var dur = parseFloat($('#n-edu').value) || 0;
  var d = { title: $('#n-eti').value.trim(), kind: $('#n-eki').value, client_id: $('#n-ecl').value || null, starts_at: ini.toISOString(), ends_at: dur ? new Date(ini.getTime() + dur * 3600000).toISOString() : null, location: $('#n-elu').value.trim() || null, notes: $('#n-eno').value.trim() || null, confirmed: $('#n-eco').checked };
  if (!d.title) return aviso('Escribe un título.');
  var r = neg.evEd ? await db.from('events').update(d).eq('id', neg.evEd) : await db.from('events').insert(Object.assign({ photographer_id: ph.id }, d));
  if (r.error) return aviso(/confirmed/i.test(r.error.message) ? 'Falta ejecutar etapa12.sql en Supabase (ver instrucciones).' : r.error.message);
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
  return '<h2>Tu agenda y cotizaciones</h2><div class="pn-dos"><div class="pn-card"><h3>Próximos eventos</h3>' + (prox.length ? prox.map(function(e){ return '<div class="pn-ev"><div><span class="d">' + esc(fFmt(e.starts_at, { weekday: 'short', day: 'numeric', month: 'short' })) + ' · ' + esc(hFmt(e.starts_at)) + '</span><span class="t">' + (e.confirmed ? '✓ ' : '') + esc(e.title) + '</span></div><span class="pn-pl">' + cuenta(e.starts_at) + '</span></div>'; }).join('') : '<p class="pn-s">Nada agendado.</p>') + '<button class="pn-btn sec" data-act="n-ir" data-v="agenda">Ver agenda</button></div><div class="pn-card"><h3>Cotizaciones por responder</h3>' + (pend.length ? pend.slice(0, 3).map(function(c){ return '<p><b>' + esc(c.client_name) + '</b> · ' + qFmt(c.total) + '</p>'; }).join('') : '<p class="pn-s">No hay cotizaciones pendientes.</p>') + '<button class="pn-btn sec" data-act="n-ir" data-v="cotiz">Ver cotizaciones</button></div></div>';
}

/* ---------- Acciones y formularios ---------- */

/* ---------- Galería asistida por IA ---------- */
var AS = { paso: 1, tipo: 'Clausura', nombre: '', fecha: '', creando: false, activo: false, show: false, restaurar: false, borr: null };
function idbAbrir(){ return new Promise(function(res, rej){ var r = indexedDB.open('galeria-ia', 1); r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); }; r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); }; }); }
function idbGet(k){ return idbAbrir().then(function(d){ return new Promise(function(res){ var q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = function(){ res(q.result || null); }; q.onerror = function(){ res(null); }; }); }).catch(function(){ return null; }); }
function idbSet(k, v){ return idbAbrir().then(function(d){ return new Promise(function(res){ var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function(){ res(true); }; t.onerror = function(){ res(false); }; }); }).catch(function(){ return false; }); }
function idbDel(k){ return idbAbrir().then(function(d){ return new Promise(function(res){ var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = function(){ res(true); }; t.onerror = function(){ res(false); }; }); }).catch(function(){ return false; }); }
async function asistCargarBorrador(){
  var m = await idbGet('as-meta'), d = await idbGet('as-draft');
  AS.borr = (m && d && d.fotos && d.fotos.length) ? { meta: m, fotos: d.fotos.length, personas: (d.personas || []).length, ts: d.ts || m.ts } : null;
  if (vista === 'asist' && AS.paso === 1) pintarAsist();
}
function asistLoop(){
  var h = document.getElementById('pn-as-hold'); if (!h) { AS.loop = false; return; }
  var ph = document.getElementById('pn-as-ph');
  if (AS.show && ph) { var r = ph.getBoundingClientRect(); h.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;z-index:5;visibility:visible'; }
  else h.style.cssText = 'position:fixed;left:-20000px;top:0;width:1100px;height:800px;visibility:hidden;pointer-events:none';
  requestAnimationFrame(asistLoop);
}
function asistIframe(){
  if (document.getElementById('pn-as-if')) return;
  var h = document.getElementById('pn-as-hold'); if (!h) { h = document.createElement('div'); h.id = 'pn-as-hold'; document.body.appendChild(h); }
  var tm = disenoGuardado() === 'oscura' ? 'dark' : temaGuardado();
  h.innerHTML = '<iframe id="pn-as-if" src="rostros.html?embed=1' + (tm === 'light' ? '&tema=luz' : tm === 'dark' ? '&tema=osc' : '') + (AS.restaurar ? '&borrador=1' : '') + '" title="Reconocimiento de rostros" style="width:100%;height:100%;border:0;background:transparent"></iframe>';
  AS.activo = true; if (!AS.loop) { AS.loop = true; requestAnimationFrame(asistLoop); }
  if (!AS.chipT) AS.chipT = setInterval(asistChip, 800);
}
function asistCerrar(){ var h = document.getElementById('pn-as-hold'); if (h) h.remove(); AS.activo = false; AS.restaurar = false; AS.show = false; var c = document.getElementById('pn-as-chip'); if (c) c.hidden = true; }
function asistChip(){
  var c = document.getElementById('pn-as-chip'); if (!c) return;
  if (!AS.activo || vista === 'asist' || AS.creando) { c.hidden = true; return; }
  var txt = '', ifr = document.getElementById('pn-as-if');
  try { var d = ifr.contentDocument, pg = d.getElementById('pg'); txt = pg && !pg.hidden ? d.getElementById('pt').textContent : (d.getElementById('out') && !d.getElementById('out').hidden ? 'Análisis listo · pon los nombres' : 'Galería con IA en pausa'); } catch (e) { txt = 'Galería con IA'; }
  c.textContent = txt + ' · Volver'; c.hidden = false;
}
var AS_TIPOS = ['Clausura', 'Graduación', 'Fin de curso', 'Evento escolar', 'Quinceañera', 'Boda', 'Cumpleaños', 'Otro'];
function asistReset(){ if (AS.activo) { return; } AS.paso = 1; AS.tipo = 'Clausura'; AS.nombre = ''; AS.fecha = ''; AS.creando = false; AS.restaurar = false; asistCargarBorrador(); }
function asistPasos(){
  var n = ['Evento', 'Fotos y nombres', 'Crear galería'];
  return '<ol class="pn-as-p">' + n.map(function(t, i){ return '<li class="' + (AS.paso === i + 1 ? 'on' : AS.paso > i + 1 ? 'ok' : '') + '"><b>' + (AS.paso > i + 1 ? '✓' : i + 1) + '</b> ' + t + '</li>'; }).join('') + '</ol>';
}
function pintarAsist(){
  var h = '<h1>Nueva galería asistida por IA</h1><p class="pn-s ay">La inteligencia artificial reconoce a cada persona en tus fotos y arma una escena por persona dentro de la galería, cada una con su propio enlace.</p>' + asistPasos();
  if (AS.paso === 1) {
    if (AS.borr) h += '<div class="pn-card"><h3>Tienes un avance guardado</h3><p class="pn-s">«' + esc(AS.borr.meta.nombre || 'Sin nombre') + '» · ' + AS.borr.fotos + ' fotos analizadas · ' + AS.borr.personas + ' personas' + (AS.borr.ts ? ' · guardado ' + new Date(AS.borr.ts).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '') + '. Al continuar, tendrás que volver a elegir las mismas fotos para poder subirlas.</p><div class="pn-row"><button class="pn-btn" data-act="as-cont">Continuar donde me quedé</button><button class="pn-btn sec" data-act="as-desc">Descartar y empezar de cero</button></div></div>';
    h += '<div class="pn-card"><h3>1. Datos del evento</h3><p class="pn-k">Tipo de evento</p><div class="pn-rc" id="pn-as-t">' + AS_TIPOS.map(function(t){ return '<label class="pn-rcl"><input type="radio" name="pn-as-tp" value="' + t + '"' + (t === AS.tipo ? ' checked' : '') + '><span class="d"></span><span>' + t + '</span></label>'; }).join('') + '</div>' +
      '<label class="pn-s" for="pn-as-n" style="display:block;margin:1rem 0 .4rem">Nombre de la galería (por ejemplo, el colegio)</label><input type="text" id="pn-as-n" maxlength="80" placeholder="Ej. Colegio San José" value="' + esc(AS.nombre) + '">' +
      '<label class="pn-s" for="pn-as-f" style="display:block;margin:1rem 0 .4rem">Fecha del evento</label><input type="date" id="pn-as-f" value="' + esc(AS.fecha) + '">' +
      '<div class="pn-row" style="margin-top:1rem"><button class="pn-btn" data-act="as-sig">Siguiente</button><button class="pn-btn sec" data-act="as-cancel">Cancelar</button></div></div>';
  } else {
    h += '<div class="pn-card"><h3>Elige las fotos, revisa los rostros y ponles nombre</h3><p class="pn-s">Elige todas las fotos del evento y toca «Analizar». El análisis se hace en tu computadora, una foto a la vez; con cientos de fotos puede tardar varios minutos, no cierres esta pestaña. Después escribe el nombre de cada persona. Puedes cambiar de pantalla: el análisis sigue en segundo plano y tu avance se guarda solo en este navegador. Cuando todo esté listo, toca «Crear galería y subir fotos».</p></div>' +
      '<div id="pn-as-ph" style="height:calc(100vh - 9rem);min-height:560px;margin-top:.6rem"></div>' +
      '<div class="pn-card" id="pn-as-ct"><h3>Crear la galería</h3><p class="pn-s">Se crea la galería «' + esc(AS.nombre) + '» con una escena por persona. Cada escena tiene su enlace propio y solo se abre con ese enlace. Las fotos donde salen varias personas van a la escena de cada una. Las fotos de quien excluyas no se suben.</p>' +
      '<div class="pn-row"><button class="pn-btn" data-act="as-crear">Crear galería y subir fotos</button><button class="pn-btn sec" data-act="as-atras">Atrás</button><button class="pn-btn sec" data-act="as-cancel">Cancelar</button></div><div id="pn-as-est" class="pn-s"></div></div>';
  }
  $('#pn-main').innerHTML = h;
  if (AS.paso === 2) { AS.show = true; asistIframe(); }
}
function fechaOk(v){ return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= '2000-01-01' && v <= '2100-12-31'; }
function asistSig(){
  var rt = root.querySelector('input[name=pn-as-tp]:checked'); AS.tipo = rt ? rt.value : AS.tipo; AS.nombre = $('#pn-as-n').value.trim(); AS.fecha = $('#pn-as-f').value || '';
  if (!AS.nombre) return aviso('Escribe el nombre de la galería.');
  if (AS.fecha && !fechaOk(AS.fecha)) return aviso('Revisa la fecha: el año debe tener 4 dígitos (entre 2000 y 2100).');
  AS.paso = 2; idbSet('as-meta', { tipo: AS.tipo, nombre: AS.nombre, fecha: AS.fecha, ts: Date.now() }); pintarAsist();
}
function asistEstado(t, pct){
  var e = document.getElementById('pn-as-est'); if (!e) return;
  e.innerHTML = esc(t) + (pct == null ? '' : '<div class="pn-up-b" style="margin-top:.5rem"><i style="width:' + Math.round(pct * 100) + '%"></i></div>');
}
async function asistCrear(){
  if (AS.creando) return;
  var ifr = document.getElementById('pn-as-if'), RT = ifr && ifr.contentWindow && ifr.contentWindow.__RT;
  if (!RT || !RT.resumen) return aviso('La herramienta todavía no termina de cargar. Espera un momento.');
  var R = RT.resumen();
  if (!R.listo || !R.total) return aviso('Primero elige las fotos y toca «Analizar».');
  if (!R.archivos.some(Boolean)) return aviso('Vuelve a elegir las mismas fotos del evento («Reconectar fotos») para poder subirlas.');
  var act = R.personas.filter(function(p){ return !p.excl && p.fotos.length; });
  if (!act.length) return aviso('No hay personas con fotos para crear escenas. Revisa los nombres o la exigencia.');
  var sn = act.filter(function(p){ return p.sinNombre; }).length;
  if (sn && !await seguro('Hay ' + sn + ' persona' + (sn === 1 ? '' : 's') + ' sin nombre; se llamarán «Persona 1», «Persona 2»… ¿Continuar?', 'Sí, continuar')) return;
  /* plan de subida: que escena le toca a cada foto */
  var dueños = {}, vistas = {};
  R.personas.forEach(function(p){ p.todas.forEach(function(i){ vistas[i] = 1; }); });
  act.forEach(function(p){ p.fotos.forEach(function(i){ (dueños[i] = dueños[i] || []).push(p); }); });
  var plan = [], omitidas = 0;
  var sinArch = 0;
  for (var i = 0; i < R.total; i++) {
    if (!R.archivos[i]) { sinArch++; continue; }
    if (dueños[i]) plan.push({ i: i, own: dueños[i] });
    else if (vistas[i]) omitidas++;
    else plan.push({ i: i, own: [] });
  }
  var sinCarp = plan.filter(function(x){ return !x.own.length; }).length;
  if (!await seguro('Se creará «' + AS.nombre + '» con ' + act.length + ' escenas y se subirán ' + plan.length + ' fotos' + (omitidas ? ' (' + omitidas + ' no se suben: son de personas excluidas o quitadas)' : '') + (sinArch ? ' (' + sinArch + ' no se suben porque no volviste a elegir esos archivos)' : '') + (sinCarp ? '. ' + sinCarp + ' fotos sin rostro claro quedarán en la galería general' : '') + '. No cierres esta pestaña hasta que termine.', 'Crear')) return;
  if (cola.activos || cola.trabajos.length) return aviso('Espera a que termine la subida que está en curso.');
  AS.creando = true; var archivos = R.archivos;
  cola.total = plan.length; cola.hechas = 0; cola.fallos = []; cola.gids = {}; cola.titulo = 'Creando «' + AS.nombre + '»…'; pintarCola();
  try {
    asistEstado('Listo: la galería se está creando y las fotos se suben en segundo plano. Puedes cambiar de pantalla y seguir trabajando; mira el avance en el recuadro de abajo a la derecha. No cierres esta pestaña hasta que termine.');
    var r = null, titulo = AS.nombre;
    for (var k = 0; k < 4; k++) {
      r = await db.from('galleries').insert({ photographer_id: ph.id, client_id: null, title: titulo, slug: slug(titulo) + '-' + codigo().slice(0, 4).toLowerCase(), access_code: codigo(), event_date: AS.fecha || null, status: 'selection', selection_enabled: true, downloads_enabled: false, watermark_text: marcaBase(), watermark_opacity: 35, gallery_type: AS.tipo }).select('id').single();
      if (!r.error || r.error.code !== '23505') break;
    }
    if (r.error) throw new Error(r.error.message);
    var gid = r.data.id, esc2 = {};
    for (var q = 0; q < act.length; q++) {
      cola.titulo = 'Creando escenas… ' + (q + 1) + ' de ' + act.length; pintarCola();
      var rc = await api('/api/admin/scene', { gallery: gid, action: 'create', name: act[q].nombre });
      if (!rc.ok) throw new Error('No se pudo crear la escena de ' + act[q].nombre);
      esc2[act[q].id] = rc.escena.id;
      await api('/api/admin/scene', { gallery: gid, action: 'update', id: rc.escena.id, hidden: true });
    }
    cola.titulo = 'Subiendo fotos de «' + AS.nombre + '»…'; pintarCola();
    var extras = [], fallos = [], hechas = 0, sig = 0, tot = plan.length;
    async function hilo(){
      while (sig < plan.length) {
        var t = plan[sig++], f = archivos[t.i];
        try {
          var pid = await subirUna({ file: f, tipo: 'selection', marca: null, gid: gid, cal: 'media', texto: marcaBase(), esc: t.own.length ? esc2[t.own[0].id] : '' });
          if (pid) t.own.slice(1).forEach(function(p){ extras.push({ scene_id: esc2[p.id], photo_id: pid, photographer_id: ph.id }); });
          else if (t.own.length > 1) fallos.push(f.name + ': no se pudo ligar a varias escenas');
        } catch (e) { fallos.push(f.name + ': ' + (e.message || 'error')); }
        hechas++; cola.hechas = hechas; if (fallos.length) cola.fallos = fallos.slice(); pintarCola();
      }
    }
    await Promise.all([hilo(), hilo(), hilo()]);
    var errSp = '';
    for (var c = 0; c < extras.length; c += 400) {
      var ri = await db.from('scene_photos').insert(extras.slice(c, c + 400));
      if (ri.error) { errSp = ri.error.message; break; }
    }
    AS.creando = false; cola.titulo = ''; idbDel('as-draft'); idbDel('as-meta'); asistCerrar(); AS.borr = null; if (errSp) cola.fallos.push('Las fotos con varias personas no se ligaron: ejecuta etapa14.sql'); pintarCola();
    await cargarGalerias();
    if (vista === 'asist') { vista = 'detalle'; await abrirDetalle(gid); } else if (vista === 'galerias') pintarLista();
    aviso(errSp ? 'Galería creada, pero las fotos con varias personas no se pudieron ligar (¿ya ejecutaste etapa14.sql?).' : fallos.length ? 'Galería creada. ' + fallos.length + ' foto(s) no se subieron: ' + fallos.slice(0, 2).join('; ') : 'Galería creada con ' + act.length + ' escenas. Los enlaces están en la pestaña Compartir.');
  } catch (e) {
    AS.creando = false; cola.titulo = ''; cola.fallos.push('Algo falló: ' + (e.message || 'error') + '. Si la galería ya se creó, búscala en «Galerías de clientes» y revisa qué fotos faltan.'); pintarCola(); asistEstado('Algo falló: ' + (e.message || 'error'));
  }
}
/* ---------- Grupos de graduación ---------- */
var GR = { lista: [], miembros: [], ok: true, cargado: false, abierto: null };
var GR_URL = 'https://alexandergeerre.github.io/galeria/grupo.html?g=';
var GR_TIERS = [[1, 350], [3, 300], [5, 260], [7, 240], [8, 225], [9, 200], [10, 180], [11, 165], [12, 150]];
function grPrecio(t, n){ var p = t[0][1], i; for (i = 0; i < t.length; i++) if (n >= t[i][0]) p = t[i][1]; return p; }
function grToken(){ var a = new Uint8Array(18), s = '', i, c = 'abcdefghjkmnpqrstuvwxyz23456789'; (window.crypto || window.msCrypto).getRandomValues(a); for (i = 0; i < a.length; i++) s += c[a[i] % c.length]; return s; }
async function grCargar(){
  var g = await db.from('groups').select('*').order('created_at', { ascending: false });
  GR.ok = !g.error; GR.lista = g.data || [];
  var m = GR.ok ? await db.from('group_members').select('*').order('created_at') : { data: [] };
  GR.miembros = m.data || []; GR.cargado = true;
}
async function pintarGrupos(){
  $('#pn-main').innerHTML = '<h1>Grupos de graduación</h1><p class="pn-s">Cargando…</p>'; await grCargar();
  var h = '<h1>Grupos de graduación</h1><p class="pn-s ay">Crea un enlace por colegio y compártelo. Cada estudiante se anota con su nombre y contacto, y el precio baja mientras más se anotan.</p><div class="pn-row"><button class="pn-btn" data-act="n-gr-nuevo">+ Nuevo grupo</button></div>';
  if (!GR.ok) return $('#pn-main').innerHTML = h + '<div class="pn-card"><h2>Falta un paso</h2><p class="pn-s">Hay que ejecutar <b>etapa13.sql</b> en Supabase (SQL Editor, pegar y Run). Después recarga el panel.</p></div>';
  if (!GR.lista.length) h += '<div class="pn-card"><p class="pn-s">Aún no hay grupos. Crea el primero con el botón de arriba.</p></div>';
  GR.lista.forEach(function(g){
    var ms = GR.miembros.filter(function(m){ return m.group_id === g.id; }), n = ms.length, t = g.tiers || GR_TIERS, pr = grPrecio(t, n), fin = t[t.length - 1], ab = GR.abierto === g.id;
    h += '<div class="pn-card"><h3>' + esc(g.name) + (g.status === 'closed' ? ' <span class="pn-s">(cerrado)</span>' : '') + '</h3><p class="pn-s">' + (g.event_date ? 'Graduación: ' + esc(fFmt(g.event_date)) + ' · ' : '') + (g.deadline ? 'Se cierra el ' + esc(fFmt(g.deadline)) + ' · ' : '') + '<b>' + n + '</b> anotados · precio hoy <b>' + qFmt(pr) + '</b>' + (n < fin[0] ? ' · faltan ' + (fin[0] - n) + ' para ' + qFmt(fin[1]) : ' · ¡meta lograda!') + '</p>' +
      '<div class="pn-row"><button class="pn-btn" data-act="n-gr-copiar" data-id="' + g.id + '">Copiar enlace</button><a class="pn-btn sec" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block" href="' + esc(waLink('', 'Hola 👋 Anótate al paquete de graduación de ' + g.name + ' (' + g.includes + '). Mientras más se anotan, más baja el precio: ' + GR_URL + g.token)) + '">Compartir por WhatsApp</a><button class="pn-btn sec" data-act="n-gr-ver" data-id="' + g.id + '">' + (ab ? 'Ocultar lista' : 'Ver lista (' + n + ')') + '</button><button class="pn-btn sec" data-act="n-gr-est" data-id="' + g.id + '">' + (g.status === 'closed' ? 'Reabrir' : 'Cerrar grupo') + '</button><button class="pn-btn sec" data-act="n-gr-del" data-id="' + g.id + '">Eliminar</button></div>';
    if (ab) h += (n ? '<div style="overflow:auto"><table class="pn-tb"><tr><th>#</th><th>Estudiante</th><th>Contacto</th><th>Grado</th><th></th></tr>' + ms.map(function(m, i){ return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.name) + '</td><td>' + esc(m.phone) + '</td><td>' + esc(m.grade || '') + '</td><td class="pn-ac"><a class="pn-btn sec" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block" href="' + esc(waLink(m.phone)) + '">WhatsApp</a> <button class="pn-btn sec" data-act="n-gr-qm" data-id="' + m.id + '">Quitar</button></td></tr>'; }).join('') + '</table></div><p class="pn-s">Total a cobrar con el precio de hoy: <b>' + qFmt(pr * n) + '</b></p>' : '<p class="pn-s">Todavía no se anota nadie.</p>');
    h += '</div>';
  });
  $('#pn-main').innerHTML = h;
}
async function grGuardar(e){
  e.preventDefault(); var nm = $('#n-gn').value.trim(); if (!nm) return aviso('Escribe el nombre del colegio.');
  var d = { photographer_id: ph.id, name: nm, event_date: $('#n-gf').value || null, deadline: $('#n-gl').value || null, token: grToken() + grToken().slice(0, 4) };
  var r = await db.from('groups').insert(d).select('id').single();
  if (r.error) return aviso(/groups/i.test(r.error.message) ? 'Falta ejecutar etapa13.sql en Supabase.' : r.error.message);
  $('#n-dgr').close(); e.target.reset(); aviso('Grupo creado'); GR.abierto = r.data.id; pintarGrupos();
}
async function grAccion(a, el){
  var g = GR.lista.filter(function(x){ return x.id === el.dataset.id; })[0];
  if (a === 'n-gr-nuevo') return $('#n-dgr').showModal();
  if (a === 'n-gr-ver') { GR.abierto = GR.abierto === el.dataset.id ? null : el.dataset.id; return pintarGrupos(); }
  if (a === 'n-gr-copiar' && g) { var u = GR_URL + g.token; try { await navigator.clipboard.writeText(u); aviso('Enlace copiado'); } catch (x) { prompt('Copia este enlace:', u); } return; }
  if (a === 'n-gr-est' && g) { var r = await db.from('groups').update({ status: g.status === 'closed' ? 'open' : 'closed' }).eq('id', g.id); if (r.error) return aviso(r.error.message); return pintarGrupos(); }
  if (a === 'n-gr-del' && g) { if (!await seguro('¿Eliminar este grupo y todos sus anotados?')) return; var r2 = await db.from('groups').delete().eq('id', g.id); if (r2.error) return aviso(r2.error.message); return pintarGrupos(); }
  if (a === 'n-gr-qm') { if (!await seguro('¿Quitar a este estudiante de la lista?')) return; var r3 = await db.from('group_members').delete().eq('id', el.dataset.id); if (r3.error) return aviso(r3.error.message); return pintarGrupos(); }
}
async function negAccion(a, el){
  if (a.indexOf('n-gr-') === 0) return grAccion(a, el);
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
  if (a === 'n-cli-del') { if (!await seguro('¿Eliminar este cliente? Sus galerías no se borran.')) return; return db.from('clients').delete().eq('id', neg.cliEd).then(async function(r){ if (r.error) return aviso(r.error.message); $('#n-dcli').close(); await negCargar(true); pintar(); }); }
  if (a === 'n-ev-del') { if (!await seguro('¿Eliminar este evento?')) return; return db.from('events').delete().eq('id', neg.evEd).then(async function(r){ if (r.error) return aviso(r.error.message); $('#n-dev').close(); await negCargar(true); pintar(); }); }
  if (a === 'n-qdel') { if (!await seguro('¿Eliminar esta cotización?')) return; return db.from('quotes').delete().eq('id', neg.cotEd).then(async function(r){ if (r.error) return aviso(r.error.message); $('#n-dcot').close(); await negCargar(true); pintar(); }); }
  if (a === 'n-usar-sug') { neg.qMan.tot = false; return cotRecalc(); }
  if (a === 'n-pr-save') return prGuardar(false);
  if (a === 'n-pr-reset') { if (!await seguro('¿Volver a los precios iniciales?')) return; return prGuardar(true); }
  if (a === 'n-cerrar') { var dg = el.closest('dialog'); if (dg) dg.close(); return; }
  if (a.indexOf('n-cot-') === 0) return cotAccion(a, el);
}
function negHtml(){
  var F = function(id, t, ty, ex){ return '<label class="pn-s" for="' + id + '" style="display:block;margin-top:.6rem">' + t + '</label><input type="' + (ty || 'text') + '" id="' + id + '" ' + (ex || '') + '>'; };
  return '<dialog id="n-dgr"><h2>Nuevo grupo de graduación</h2><form id="n-fgr">' + F('n-gn', 'Colegio o instituto', 'text', 'maxlength="80"') + F('n-gf', 'Fecha de la graduación (opcional)', 'date') + F('n-gl', 'Fecha límite para anotarse (opcional)', 'date') + '<p class="pn-s">Incluye 8 fotos digitales + 8 impresas. El precio empieza en Q350 y baja hasta Q150 con 12 estudiantes.</p><div class="pn-row"><button class="pn-btn" type="submit">Crear grupo</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button></div></form></dialog>' +
    '<dialog id="n-dcli"><h2>Cliente</h2><form id="n-fcli">' + F('n-cn', 'Nombre', 'text', 'maxlength="80"') + F('n-ct', 'Teléfono / WhatsApp', 'tel', 'maxlength="30"') + F('n-ce', 'Correo', 'email', 'maxlength="80"') + '<label class="pn-s" for="n-cno" style="display:block;margin-top:.6rem">Notas</label><textarea id="n-cno" rows="3" maxlength="300" style="width:100%"></textarea><div class="pn-row"><button class="pn-btn" type="submit">Guardar</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button><button class="pn-btn sec" type="button" id="n-cdel" data-act="n-cli-del" hidden>Eliminar</button></div></form></dialog>' +
    '<dialog id="n-dcot"><h2>Cotización</h2><form id="n-fcot"><label class="pn-s" for="n-qcl" style="display:block">Cliente</label><select id="n-qcl"></select>' + F('n-qnm', 'Nombre que aparece en la cotización', 'text', 'maxlength="80"') + '<label class="pn-s" for="n-qtp" style="display:block;margin-top:.6rem">Tipo de evento</label><select id="n-qtp"></select>' + F('n-qfe', 'Fecha del evento', 'date') + F('n-qlu', 'Lugar', 'text', 'maxlength="80"') +
    '<div class="pn-dos">' + '<div>' + F('n-qdg', 'Fotografías digitales', 'number', 'min="0"') + '</div><div>' + F('n-qim', 'Fotografías impresas', 'number', 'min="0"') + '</div></div><label class="pn-s" for="n-qvi" style="display:block;margin-top:.6rem">Video</label><select id="n-qvi"><option value="ninguno">Sin video</option><option value="resumen">Video resumen</option><option value="completo">Video completo</option></select><div class="pn-dos"><div>' + F('n-qds', 'Descuento (%)', 'number', 'min="0" max="90" step="1"') + '</div><div>' + F('n-qva', 'Válida (días)', 'number', 'min="1"') + '</div></div>' + F('n-qto', 'Total para el cliente (Q)', 'number', 'min="0" step="1"') + '<p class="pn-s" id="n-qde"></p><p class="pn-s" id="n-qgn" style="padding:.5rem .8rem;border:1px dashed var(--l);border-radius:10px"></p><p class="pn-s">El total se calcula solo con tus precios; puedes cambiarlo. El cliente solo ve cantidades y el total.</p><div class="pn-row"><button class="pn-btn" type="submit">Guardar y ver imagen</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button><button class="pn-btn sec" type="button" id="n-qdel" data-act="n-qdel" hidden>Eliminar</button></div></form></dialog>' +
    '<dialog id="n-dver" style="width:min(46rem,96vw)"><h2 id="n-vti"></h2><div class="pn-nvr"><canvas id="n-vcv" style="width:100%;max-width:340px;border-radius:10px;border:1px solid var(--l)"></canvas><div><p class="pn-s">Diseño</p><div class="pn-row" id="n-dbt"></div><p class="pn-s">Estado</p><select id="n-vst"><option value="draft">Borrador</option><option value="sent">Enviada</option><option value="accepted">Aceptada</option><option value="rejected">Rechazada</option></select>' +
    '<div class="pn-col" style="margin-top:1rem"><button class="pn-btn" data-act="n-cot-png">Descargar imagen (WhatsApp)</button><button class="pn-btn sec" data-act="n-cot-wa">Abrir WhatsApp con mensaje</button><button class="pn-btn sec" data-act="n-cot-txt">Copiar mensaje</button><button class="pn-btn sec" data-act="n-cot-agenda">Agendar el evento</button><button class="pn-btn sec" data-act="n-cot-edit">Editar datos</button><button class="pn-btn sec" data-act="n-cot-del">Eliminar</button><button class="pn-btn sec" data-act="n-cerrar">Cerrar</button></div></div></div></dialog>' +
    '<dialog id="n-dev"><h2>Evento</h2><form id="n-fev">' + F('n-eti', 'Título', 'text', 'maxlength="100"') + '<label class="pn-s" for="n-eki" style="display:block;margin-top:.6rem">Tipo</label><select id="n-eki"><option value="evento">Evento</option><option value="sesion">Sesión</option><option value="entrega">Entrega</option><option value="otro">Otro</option></select><label class="pn-s" for="n-ecl" style="display:block;margin-top:.6rem">Cliente</label><select id="n-ecl"></select><div class="pn-dos"><div>' + F('n-efe', 'Fecha', 'date') + '</div><div>' + F('n-eho', 'Hora', 'time') + '</div></div>' + F('n-edu', 'Duración (horas)', 'number', 'min="0" step="0.5"') + F('n-elu', 'Lugar', 'text', 'maxlength="100"') + '<label class="pn-s" for="n-eno" style="display:block;margin-top:.6rem">Notas</label><textarea id="n-eno" rows="2" maxlength="300" style="width:100%"></textarea><label style="display:flex;gap:.6rem;align-items:center;margin-top:.8rem"><input type="checkbox" id="n-eco"> <span>Evento confirmado (el cliente ya reservó)</span></label><div class="pn-row"><button class="pn-btn" type="submit">Guardar</button><button class="pn-btn sec" type="button" data-act="n-cerrar">Cancelar</button><button class="pn-btn sec" type="button" id="n-ics1" data-act="n-ics-este" hidden>Agregar a mi calendario (.ics)</button><button class="pn-btn sec" type="button" id="n-edel" data-act="n-ev-del" hidden>Eliminar</button></div></form></dialog>';
}
function negIniciar(){
  if (window.__PN_TEST) window.__PN_TEST = { cotLienzo: cotLienzo, tema: tema, emblema: emblema, cotLogos: cotLogos, neg: neg, pqPrecio: pqPrecio };
  root.querySelector('.pn').insertAdjacentHTML('beforeend', negHtml());
  root.addEventListener('click', function(e){ var a = e.target.closest('[data-act^="n-"]'); if (a) negAccion(a.dataset.act, a); });
  root.addEventListener('submit', function(e){ if (e.target.id === 'n-fcli') cliGuardar(e); else if (e.target.id === 'n-fcot') cotGuardar(e); else if (e.target.id === 'n-fev') evGuardar(e); else if (e.target.id === 'n-fgr') grGuardar(e); });
  root.addEventListener('change', function(e){ if (e.target.id === 'pn-pfo' && e.target.files && e.target.files[0]) portadaDesdeArchivo(e.target.files[0]); if (e.target.id === 'pn-pfesc' && e.target.files && e.target.files[0]) portadaEscenaArchivo(e.target.files[0]); });
  root.addEventListener('change', async function(e){ if (e.target.id === 'n-vst' && neg.cotImg) { var r = await db.from('quotes').update({ status: e.target.value }).eq('id', neg.cotImg.id); if (r.error) return aviso(r.error.message); neg.cotImg.status = e.target.value; aviso('Estado actualizado'); if (e.target.value === 'accepted') await cotAAgenda(neg.cotImg, true); } });
  root.addEventListener('input', function(e){ var id = e.target.id; if (id === 'n-qdg') cotRecalc('dg'); else if (id === 'n-qim') { neg.qMan.imp = true; cotRecalc(); } else if (id === 'n-qto') { neg.qMan.tot = true; cotRecalc(); } else if (id === 'n-qds') { neg.qMan.tot = false; cotRecalc(); } });
  root.addEventListener('change', function(e){ if (e.target.id === 'n-qvi') cotRecalc(); });
  root.addEventListener('close', function(e){ if (e.target.id === 'n-dver' && (vista === 'cotiz')) negCargar(true).then(pintarCotiz); }, true);
}

async function crearGaleria(e){
  e.preventDefault();
  var cli = $('#pn-cn').value.trim(), titulo = $('#pn-ct').value.trim() || cli, fecha = $('#pn-cf').value || null;
  if (!titulo) return aviso('Escribe un nombre para la galería.');
  if (fecha && !fechaOk(fecha)) return aviso('Revisa la fecha: el año debe tener 4 dígitos (entre 2000 y 2100).');
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
  (function(){
    var lim = function(n){ if (n.nodeType !== 1) return; var l = n.matches && n.matches('input[type=date]') ? [n] : Array.prototype.slice.call(n.querySelectorAll ? n.querySelectorAll('input[type=date]') : []); l.forEach(function(i){ i.min = '2000-01-01'; i.max = '2100-12-31'; }); };
    new MutationObserver(function(ms){ ms.forEach(function(m){ Array.prototype.forEach.call(m.addedNodes, lim); }); }).observe(root, { childList: true, subtree: true }); lim(root);
    root.addEventListener('input', function(e){ var t = e.target; if (t && t.type === 'date' && /^\d{5,}-/.test(t.value || '')) t.value = t.value.replace(/^(\d{4})\d+/, '$1'); });
  })();
  if (!document.getElementById('pn-css')) { var st = document.createElement('style'); st.id = 'pn-css'; st.textContent = CSS + disCss(); document.head.appendChild(st); }
  root.innerHTML = '<div class="pn"><aside></aside><main id="pn-main"><div class="pn-skel w1"></div><div class="pn-skel"></div><div class="pn-skel h2"></div></main>' +
    '<dialog id="pn-dnueva"><h2>Nueva galería</h2><form id="pn-fn"><input type="text" id="pn-cn" placeholder="Cliente (ej. Ana y Luis)"><input type="text" id="pn-ct" placeholder="Nombre de la galería (ej. Boda Ana y Luis)"><input type="date" id="pn-cf"><div class="pn-row"><button class="pn-btn" type="submit">Crear</button><button class="pn-btn sec" type="button" id="pn-cc">Cancelar</button></div></form></dialog><dialog id="pn-dqr"><h2 id="pn-qt">Código QR</h2><div class="pn-qr"><canvas id="pn-qc" width="10" height="10"></canvas></div><p class="pn-s ay">Quien lo escanee con la cámara del celular abre la galería. Puedes imprimirlo o mandarlo por WhatsApp.</p><div class="pn-row"><button class="pn-btn" data-act="qr-bajar" type="button">Descargar imagen</button><button class="pn-btn sec" data-act="qr-cerrar" type="button">Cerrar</button></div></dialog><input type="file" id="pn-pfo" accept="image/jpeg,image/png,image/webp" hidden><input type="file" id="pn-pfesc" accept="image/jpeg,image/png,image/webp" hidden><dialog id="pn-dport"><h2>Elegir portada</h2><p class="pn-s">Toca la foto que quieres como portada. Después te pediré su archivo original para que la portada salga <b>sin marca de agua</b>.</p><div class="pn-grid" id="pn-gport"></div><div class="pn-row"><button class="pn-btn sec" data-act="cerrar-portada">Cancelar</button></div></dialog></div>';
  root.querySelector('.pn').insertAdjacentHTML('beforeend', '<dialog id="pn-denl"></dialog><div id="pn-dzov" hidden><div><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4"/></svg><b>Suelta tus fotos para subirlas</b></div></div>');
  dzIniciar();
  root.querySelector('.pn').insertAdjacentHTML('beforeend', '<div id="pn-up" hidden></div><button id="pn-as-chip" data-act="asist" hidden type="button"></button>');
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
    if (e.target.id === 'pn-vea' || e.target.id === 'pn-veb') { if (e.target.id === 'pn-vea') vidEA = e.target.value; else vidEB = e.target.value; vidStop(); clearTimeout(vidDeb); vidEsc = null; vidDeb = setTimeout(vidPrepara, 500); return; }
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
    if (sm) { var r1 = await api('/api/admin/scene', { gallery: galId, action: 'update', id: sm.dataset.escmodo, access_mode: sm.value }); if (!r1.ok) return aviso('No se pudo cambiar.'); cur.escenas.filter(function(x){ return x.id === sm.dataset.escmodo; })[0].access_mode = sm.value; enlRefrescar(); return pintar(); }
    var wmS = e.target.closest('select[data-escwm]');
    if (wmS) { var r3 = await api('/api/admin/scene', { gallery: galId, action: 'update', id: wmS.dataset.escwm, no_watermark: wmS.value === '1' }); if (!r3.ok) return aviso('No se pudo cambiar. ¿Ya ejecutaste etapa15.sql y actualizaste el Worker?'); cur.escenas.filter(function(x){ return x.id === wmS.dataset.escwm; })[0].no_watermark = wmS.value === '1'; return aviso(wmS.value === "1" ? 'Esta escena se verá sin marca de agua en su enlace' : 'Esta escena vuelve a seguir la Configuración'); }
    var ch = e.target.closest('input[data-eschid]');
    if (ch) { var r2 = await api('/api/admin/scene', { gallery: galId, action: 'update', id: ch.dataset.eschid, hidden: ch.checked }); if (!r2.ok) return aviso('No se pudo cambiar.'); cur.escenas.filter(function(x){ return x.id === ch.dataset.eschid; })[0].hidden = ch.checked; return aviso(ch.checked ? 'Solo se ve con su enlace' : 'Aparece también en la galería principal'); }
  });
  root.onclick = function(e){
    var ddm = $('#pn-dis'); if (ddm && !e.target.closest('#pn-dis')) { var ddu = ddm.querySelector('ul'); if (ddu) ddu.hidden = true; }
    if (!e.target.closest('.np-dd')) vdCerrar();
    var v = e.target.closest('aside [data-v]'); if (v) { vista = v.dataset.v; return pintar(); }
    var a = e.target.closest('[data-act]'); if (a) accion(a.dataset.act, a);
  };
  root.addEventListener('close', function(e){ if (e.target && e.target.id === 'pn-dvid') { vidEdCerrado = true; vidStop(); } }, true);
  $('#pn-fn').addEventListener('submit', crearGaleria);
  negIniciar();
  $('#pn-cc').addEventListener('click', function(){ $('#pn-dnueva').close(); });
  if (window.matchMedia && !window.__pnMq) { window.__pnMq = matchMedia('(prefers-color-scheme: dark)'); window.__pnMq.addEventListener('change', function(){ aplicarTema(); }); }
  vista = 'inicio';
  await cargarGalerias();
  var nv = navLeer();
  if (nv && nv.v && nv.v !== 'asist' && nv.v !== 'ia') {
    if (nv.v === 'detalle') {
      if (nv.g && gals.some(function(x){ return x.id === nv.g; })) { tab = nv.t || 'panel'; if (+nv.p) vidPest = +nv.p; return abrirDetalle(nv.g, true); }
    } else { vista = nv.v; }
  }
  pintar();
};
})();
