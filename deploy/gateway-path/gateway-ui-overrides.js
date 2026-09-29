// ATEGateway UI override notes (injected by Worker, markup preserved upstream).
// - /gateway/  : white background, red -> black, enterprise logo, jQuery transitions.
// - /gateway/app*: raining-binaries background (same as main site), enterprise logo, transitions.
// API / SSE / JS / CSS pass through byte-for-byte.
const ATE_ENTERPRISE_LOGO =
  "https://plain-apac-prod-public.komododecks.com/202608/12/3HS3RGiBnGa12S29398i/image.png";
const ATE_JQUERY_CDN = "https://code.jquery.com/jquery-3.7.1.min.js";
const ATE_RAIN_VIDEO = "/assets/rain.mp4";

const ATE_ROOT_CSS = [
  '<style id="ate-root-override">',
  "body.ate-theme{background:#ffffff!important;background-image:none!important;color:#111827!important}",
  ".ate-theme{color-scheme:light;background-color:#ffffff!important;background-image:none!important;--red:#111827!important;--red-bright:#111827!important;--red-glow:rgba(0,0,0,.14)!important;--border-red:rgba(17,24,39,.28)!important}",
  ".ate-theme::selection{background:rgba(17,24,39,.22)!important;color:#111827!important}",
  ".ate-theme header{background:rgba(255,255,255,.94)!important;border-color:#e5e7eb!important}",
  ".ate-theme .bg-white{background-color:#ffffff!important}",
  ".ate-theme .bg-gray-50{background-color:#f9fafb!important}",
  ".ate-theme .bg-gray-100,.ate-theme .bg-gray-100\\/80{background-color:#f3f4f6!important}",
  ".ate-theme .text-gray-900{color:#111827!important}",
  ".ate-theme .text-gray-700{color:#374151!important}",
  ".ate-theme .text-gray-600{color:#4b5563!important}",
  ".ate-theme .text-gray-500,.ate-theme .text-gray-400{color:#6b7280!important}",
  ".ate-theme .border-gray-100,.ate-theme .border-gray-200{border-color:#e5e7eb!important}",
  ".ate-theme .divide-gray-200>:not([hidden])~:not([hidden]){border-color:#e5e7eb!important}",
  ".ate-theme .bg-gray-900{background:linear-gradient(135deg,#111827,#000000)!important;border:1px solid #111827!important;box-shadow:0 4px 14px rgba(0,0,0,.25)!important;transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,background .25s!important}",
  ".ate-theme button.bg-gray-900:hover,.ate-theme .bg-gray-900.hover\\:bg-gray-800:hover{background:linear-gradient(135deg,#1f2937,#030304)!important;box-shadow:0 6px 22px rgba(0,0,0,.35)!important;transform:translateY(-1px)}",
  ".ate-theme button.bg-gray-900:active{transform:scale(.97)}",
  ".ate-theme button.bg-white{border:1px solid #111827!important;transition:transform .25s,box-shadow .25s!important}",
  ".ate-theme button.bg-white:hover{box-shadow:0 0 16px rgba(0,0,0,.18)!important;transform:translateY(-1px)}",
  ".ate-theme button.bg-white:active{transform:scale(.97)}",
  ".ate-theme .glass-card{background:rgba(255,255,255,.97)!important;border:1px solid #e5e7eb!important;box-shadow:0 4px 16px rgba(0,0,0,.06)!important;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s!important}",
  ".ate-theme .glass-card:hover{transform:translateY(-4px)!important;border-color:#111827!important;box-shadow:0 12px 32px rgba(0,0,0,.12)!important}",
  ".ate-theme .glass-card table tbody tr:hover{background-color:#f9fafb!important}",
  ".ate-theme .price-table tbody tr.price-row{background:#ffffff!important;box-shadow:0 1px 3px rgba(0,0,0,.06)!important;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,background-color .3s!important}",
  ".ate-theme .price-table tbody tr.price-row:hover{background:#f9fafb!important;transform:translateY(-2px)!important;box-shadow:0 8px 20px rgba(0,0,0,.1)!important}",
  ".ate-theme input:not([type=range]):not([type=checkbox]){background-color:#ffffff!important;border:1px solid #d1d5db!important;color:#111827!important;transition:border-color .2s,box-shadow .2s!important}",
  ".ate-theme input::placeholder{color:#9ca3af!important}",
  ".ate-theme input:not([type=range]):not([type=checkbox]):focus{border-color:#111827!important;box-shadow:0 0 0 3px rgba(17,24,39,.14)!important}",
  ".ate-theme .input-error{border-color:#111827!important;box-shadow:0 0 0 3px rgba(17,24,39,.18)!important}",
  ".ate-theme input[type=range].ate-slider{background:#e5e7eb!important}",
  ".ate-theme input[type=range].ate-slider::-webkit-slider-thumb{background:#111827!important;border-color:#ffffff!important;box-shadow:0 2px 8px rgba(0,0,0,.35)!important;transition:transform .2s!important}",
  ".ate-theme input[type=range].ate-slider::-webkit-slider-thumb:hover{transform:scale(1.12)}",
  ".ate-theme input[type=range].ate-slider::-moz-range-thumb{background:#111827!important;border-color:#ffffff!important}",
  ".ate-theme input[type=range].ate-slider::-moz-range-track{background:#e5e7eb!important}",
  ".ate-theme .lang-btn{color:#6b7280!important;transition:all .25s!important}",
  ".ate-theme .lang-btn.active{background:#111827!important;color:#fff!important;box-shadow:0 2px 10px rgba(0,0,0,.3)!important}",
  ".ate-theme .filter-btn{color:#374151!important;background:#ffffff!important;border-color:#e5e7eb!important;transition:all .25s!important}",
  ".ate-theme .filter-btn:hover{background:#f9fafb!important;border-color:#111827!important}",
  ".ate-theme .filter-btn.active{background:#111827!important;color:#fff!important;border-color:#111827!important}",
  ".ate-theme .rgb-sym{animation:ateBlackPulse 2.4s ease-in-out infinite!important}",
  "@keyframes ateBlackPulse{0%,100%{color:#111827;text-shadow:0 0 10px rgba(0,0,0,.18)}50%{color:#4b5563;text-shadow:0 0 18px rgba(0,0,0,.3)}}",
  ".ate-theme #view-home h1{text-shadow:none!important}",
  ".ate-theme #toast>div{background:#ffffff!important;border:1px solid #111827!important;box-shadow:0 12px 32px rgba(0,0,0,.16)!important}",
  ".ate-theme #ateMnav{background:rgba(255,255,255,.98)!important;border:1px solid #e5e7eb!important;box-shadow:0 16px 40px rgba(0,0,0,.12)!important}",
  ".ate-theme .bg-blue-600{background-color:#111827!important}",
  ".ate-theme .bg-blue-600:hover,.ate-theme .hover\\:bg-blue-500:hover{background-color:#1f2937!important}",
  ".ate-theme .text-red-500{color:#111827!important}",
  ".ate-theme .text-emerald-600,.ate-theme .text-emerald-700{color:#047857!important}",
  ".ate-theme .hover\\:bg-gray-900:hover{background:#111827!important;border-color:#111827!important;color:#fff!important}",
  ".ate-logo-img{width:40px;height:40px;object-fit:contain;border-radius:12px;border:1px solid #111827!important;background:#fff!important;padding:2px;box-shadow:0 2px 10px rgba(0,0,0,.12);transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s}",
  ".ate-logo-img:hover{transform:scale(1.06) rotate(-2deg);box-shadow:0 6px 20px rgba(0,0,0,.2)}",
  ".ate-logo-img-lg{width:48px;height:48px;border-radius:14px}",
  ".view-section{transition:opacity .45s cubic-bezier(.16,1,.3,1),transform .45s cubic-bezier(.16,1,.3,1)!important}",
  ".ate-fade-enter{opacity:0;transform:translateY(14px)}",
  ".ate-view-flash{animation:ateFlash .45s cubic-bezier(.22,1,.36,1)}",
  "@keyframes ateFlash{from{opacity:.25;transform:translateY(10px)}to{opacity:1;transform:none}}",
  ".glass-card table tbody tr{transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s,background-color .35s!important}",
  ".glass-card table tbody tr:hover{transform:scale(1.02)!important;box-shadow:0 8px 25px rgba(0,0,0,.1)!important;background-color:#f9fafb!important}",
  "@media (prefers-reduced-motion:reduce){.ate-theme .glass-card:hover,.ate-theme button.bg-gray-900:hover,.ate-theme button.bg-white:hover,.ate-logo-img:hover{transform:none!important}.view-section{transition:none!important}.ate-theme .rgb-sym{animation:none!important}.ate-view-flash{animation:none!important}}",
  "</style>",
].join("\n");

// Vanilla transition layer (no jQuery): wraps window.switchView exactly once
// and forwards every call synchronously, so the origin view state machine
// keeps its exact timing. The only addition is a non-destructive CSS flash
// on the target section. Never hides <body>, never sets inline opacity.
// Also guards ateNotify so object-shaped API errors render as readable text
// instead of "[object Object]".
const ATE_ROOT_INLINE = [
  "(function(){",
  "var LOGO='" + ATE_ENTERPRISE_LOGO + "';",
  "function swapLogos(){try{",
  "document.querySelectorAll('div').forEach(function(el){",
  "var t=(el.textContent||'').trim();",
  "if(t==='ATE'&&el.className&&el.className.indexOf('bg-gray-900')!==-1&&!el.dataset.ateSwapped){",
  "el.dataset.ateSwapped='1';var img=document.createElement('img');img.src=LOGO;img.alt='Akmal Taufik Enterprise';",
  "var big=el.className.indexOf('w-12')!==-1||el.className.indexOf('h-12')!==-1;",
  "img.className='ate-logo-img'+(big?' ate-logo-img-lg':'');",
  "if(big){img.style.width='48px';img.style.height='48px';}",
  "el.replaceWith(img);}});",
  "}catch(e){}}",
  "function flashView(v){try{",
  "var el=document.getElementById('view-'+v);if(!el||!el.classList)return;",
  "el.classList.add('ate-view-flash');",
  "setTimeout(function(){try{el.classList.remove('ate-view-flash');}catch(e){}},500);",
  "}catch(e){}}",
  "function errText(e){try{",
  "if(e==null)return '';",
  "if(typeof e==='string')return e;",
  "if(typeof e.message==='string'&&e.message)return e.message;",
  "if(typeof e.error!=='undefined')return errText(e.error);",
  "if(Object.prototype.toString.call(e)==='[object Array]')return e.map(errText).filter(Boolean).join('; ');",
  "return JSON.stringify(e);",
  "}catch(err){return '';}}",
  "function initTransitions(){try{",
  "if(typeof window.switchView==='function'&&!window.__ateSwitchWrapped){window.__ateSwitchWrapped=true;var orig=window.switchView;",
  "window.switchView=function(){var a=arguments;var v=a.length?a[0]:undefined;var r=orig.apply(this,a);setTimeout(swapLogos,60);flashView(v);return r;};}",
  "if(typeof window.ateNotify==='function'&&!window.__ateNotifyWrapped){window.__ateNotifyWrapped=true;var origN=window.ateNotify;",
  "window.ateNotify=function(t,ti,m,o){if(typeof m==='object'&&m!==null){m=errText(m)||'Request failed. Please try again.';}return origN.call(this,t,ti,m,o);};}",
  "}catch(e){}}",
  "swapLogos();initTransitions();",
  "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){swapLogos();initTransitions();});}",
  "try{if('MutationObserver' in window){new MutationObserver(swapLogos).observe(document.documentElement,{childList:true,subtree:true});}}catch(e){}",
  "setTimeout(function(){swapLogos();initTransitions();},800);",
  "setTimeout(swapLogos,2000);",
  "})();",
].join("\n");

const ATE_ROOT_JS = [
  '<script id="ate-root-transitions">',
  ATE_ROOT_INLINE,
  "</script>",
].join("\n");

const ATE_APP_CSS = [
  '<style id="ate-app-override">',
  "body{background:#07070a!important}",
  "#ate-rain-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#07070a}",
  "#ate-rain-bg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6}",
  "#ate-binary-rain{position:absolute;inset:0;width:100%;height:100%;opacity:.32}",
  "#ate-rain-overlay{position:absolute;inset:0;background:radial-gradient(ellipse at top,rgba(0,0,0,.05) 0%,rgba(7,7,10,.6) 75%)}",
  ".bg-mesh,.sidebar,.main,#page-gateway,.auth-wrap{position:relative;z-index:1}",
  ".card,#page-gateway .card{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s!important}",
  ".card:hover,#page-gateway .card:hover{transform:translateY(-3px)!important}",
  ".sidebar-link{transition:transform .25s cubic-bezier(.22,1,.36,1),background .25s,color .25s,padding-left .25s!important}",
  ".sidebar-link:hover{transform:translateX(4px)}",
  ".sidebar-link.active{transition:all .25s!important}",
  ".btn,.tab,.gw-tab{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,background .25s!important}",
  ".btn:hover{transform:translateY(-1px)}",
  ".btn:active{transform:scale(.97)}",
  ".ate-app-logo{width:36px!important;height:36px!important;object-fit:contain;border-radius:10px;background:#fff!important;padding:2px;border:1px solid rgba(255,255,255,.25)!important;box-shadow:0 0 16px rgba(0,0,0,.45);transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s}",
  ".ate-app-logo:hover{transform:scale(1.08) rotate(-2deg)}",
  ".gw-panel.on{animation:ateAppFadeUp .45s cubic-bezier(.22,1,.36,1)!important}",
  "@keyframes ateAppFadeUp{from{opacity:0;transform:translateY(12px) scale(.995)}to{opacity:1;transform:none}}",
  ".ate-view-enter{opacity:0;transform:translateY(10px)}",
  ".ate-view-enter-active{opacity:1;transform:none;transition:opacity .35s,transform .35s}",
  "@media (prefers-reduced-motion:reduce){#ate-rain-bg video,#ate-binary-rain{display:none!important}.card:hover,.sidebar-link:hover,.btn:hover{transform:none!important}.gw-panel.on{animation:none!important}}",
  "</style>",
].join("\n");

const ATE_APP_BODY_PREFIX = [
  '<div id="ate-rain-bg" aria-hidden="true">',
  '<video autoplay muted loop playsinline preload="metadata">',
  '<source src="' + ATE_RAIN_VIDEO + '" type="video/mp4">',
  "</video>",
  '<canvas id="ate-binary-rain"></canvas>',
  '<div id="ate-rain-overlay"></div>',
  "</div>",
].join("\n");

// Vanilla app layer (no jQuery): logo swap + binary rain + a ready marker.
// Never hides content or sets inline opacity, so upstream views keep working.
const ATE_APP_INLINE = [
  "(function(){",
  "var LOGO='" + ATE_ENTERPRISE_LOGO + "';",
  "function swapAppLogo(){try{",
  "document.querySelectorAll('.sidebar-logo').forEach(function(el){",
  "if(el.dataset.ateSwapped)return;el.dataset.ateSwapped='1';",
  "if(el.tagName==='IMG'){el.src=LOGO;return;}",
  "var img=document.createElement('img');img.src=LOGO;img.alt='Akmal Taufik Enterprise';img.className='ate-app-logo';",
  "el.textContent='';el.appendChild(img);",
  "el.style.background='#fff';el.style.display='grid';el.style.placeItems='center';el.style.overflow='hidden';",
  "});",
  "var fav=document.querySelector('link[rel=\"icon\"]');if(fav&&fav.href.indexOf('apikey.fun')!==-1){fav.href=LOGO;}",
  "}catch(e){}}",
  "function initBinaryRain(){try{",
  "if(window.__ateRainStarted)return;window.__ateRainStarted=true;",
  "if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;",
  "var c=document.getElementById('ate-binary-rain');if(!c)return;",
  "var ctx=c.getContext('2d');if(!ctx)return;",
  "function size(){c.width=c.offsetWidth||window.innerWidth;c.height=c.offsetHeight||window.innerHeight;}",
  "size();window.addEventListener('resize',size);",
  "var chars='01';var font=14;var cols=0;var drops=[];",
  "function reset(){cols=Math.floor(c.width/font);drops=[];for(var i=0;i<cols;i++)drops[i]=Math.random()*-40;}",
  "reset();window.addEventListener('resize',reset);",
  "var last=0;",
  "function frame(t){if(t-last<66){requestAnimationFrame(frame);return;}last=t;",
  "ctx.fillStyle='rgba(7,7,10,.18)';ctx.fillRect(0,0,c.width,c.height);",
  "ctx.font=font+'px monospace';",
  "for(var i=0;i<drops.length;i++){var ch=chars[Math.floor(Math.random()*chars.length)];",
  "ctx.fillStyle=i%3===0?'rgba(255,255,255,.5)':'rgba(161,161,170,.42)';",
  "ctx.fillText(ch,i*font,drops[i]*font);",
  "if(drops[i]*font>c.height&&Math.random()>.976)drops[i]=0;drops[i]++;}",
  "requestAnimationFrame(frame);}",
  "requestAnimationFrame(frame);",
  "}catch(e){}}",
  "function markReady(){try{if(document.body)document.body.classList.add('ate-app-ready');}catch(e){}}",
  "function fixPlaceholders(){try{",
  "document.querySelectorAll('input[placeholder=\"work.akmaltaufik\"]').forEach(function(el){",
  "el.setAttribute('placeholder','Your Display Name');});",
  "}catch(e){}}",
  "swapAppLogo();initBinaryRain();markReady();fixPlaceholders();",
  "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){swapAppLogo();initBinaryRain();markReady();fixPlaceholders();});}",
  "try{if('MutationObserver' in window){new MutationObserver(function(){swapAppLogo();fixPlaceholders();}).observe(document.documentElement,{childList:true,subtree:true});}}catch(e){}",
  "setTimeout(function(){swapAppLogo();initBinaryRain();fixPlaceholders();},800);",
  "setTimeout(function(){swapAppLogo();fixPlaceholders();},2000);",
  "})();",
].join("\n");

const ATE_APP_JS = [
  '<script id="ate-app-transitions">',
  ATE_APP_INLINE,
  "</script>",
].join("\n");

function isUiHtmlPath(pathname) {
  return (
    pathname === "/gateway/" ||
    pathname === "/gateway/app" ||
    pathname.startsWith("/gateway/app/")
  );
}

function isRootPath(pathname) {
  return pathname === "/gateway/";
}

function shouldInjectRoot(html) {
  return (
    html.indexOf("ate-theme") !== -1 ||
    html.indexOf("ATEGateway") !== -1 ||
    html.indexOf("Akmal Taufik Enterprise") !== -1
  );
}

function shouldInjectApp(html) {
  return (
    html.indexOf("sidebar-logo") !== -1 ||
    html.indexOf("ATEGateway") !== -1 ||
    html.indexOf("apikey.fun") !== -1 ||
    html.indexOf('class="sidebar') !== -1
  );
}

function injectBeforeTag(html, tag, injection) {
  var idx = html.toLowerCase().lastIndexOf(tag);
  if (idx === -1) return html + injection;
  return html.slice(0, idx) + injection + "\n" + html.slice(idx);
}

function injectAfterBodyOpen(html, injection) {
  var m = html.match(/<body[^>]*>/i);
  if (!m) return injection + "\n" + html;
  var idx = m.index + m[0].length;
  return html.slice(0, idx) + "\n" + injection + html.slice(idx);
}

function injectRootOverride(html) {
  var out = html;
  out = out.split(
    '<div class="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-md">ATE</div>',
  ).join(
    '<img src="' +
      ATE_ENTERPRISE_LOGO +
      '" alt="Akmal Taufik Enterprise" class="ate-logo-img">',
  );
  out = out.split(
    '<div class="w-12 h-12 bg-gray-900 text-white rounded-2xl mx-auto flex items-center justify-center font-bold text-xl mb-3">ATE</div>',
  ).join(
    '<img src="' +
      ATE_ENTERPRISE_LOGO +
      '" alt="Akmal Taufik Enterprise" class="ate-logo-img ate-logo-img-lg" style="margin-left:auto;margin-right:auto;margin-bottom:.75rem">',
  );
  out = injectBeforeTag(out, "</head>", ATE_ROOT_CSS);
  out = injectBeforeTag(out, "</body>", ATE_ROOT_JS);
  return out;
}

function injectAppOverride(html) {
  var out = html;
  out = out.split('<div class="sidebar-logo">A</div>').join(
    '<div class="sidebar-logo" data-ate-swapped="1"><img src="' +
      ATE_ENTERPRISE_LOGO +
      '" alt="Akmal Taufik Enterprise" class="ate-app-logo"></div>',
  );
  out = out.split("https://apikey.fun/logo.png").join(ATE_ENTERPRISE_LOGO);
  // Register-form Display Name placeholder used a personal email prefix;
  // use a generic prompt instead. Server-side replace covers the exact
  // markup; the client fallback below covers re-rendered variants.
  out = out.split('placeholder="work.akmaltaufik"').join('placeholder="Your Display Name"');
  out = injectBeforeTag(out, "</head>", ATE_APP_CSS);
  out = injectAfterBodyOpen(out, ATE_APP_BODY_PREFIX);
  out = injectBeforeTag(out, "</body>", ATE_APP_JS);
  return out;
}

function maybeInjectUi(pathname, html) {
  if (isRootPath(pathname)) {
    if (!shouldInjectRoot(html)) return null;
    return injectRootOverride(html);
  }
  if (pathname === "/gateway/app" || pathname.startsWith("/gateway/app/")) {
    if (!shouldInjectApp(html)) return null;
    return injectAppOverride(html);
  }
  return null;
}

export {
  ATE_ENTERPRISE_LOGO,
  ATE_JQUERY_CDN,
  ATE_RAIN_VIDEO,
  ATE_ROOT_CSS,
  ATE_ROOT_INLINE,
  ATE_ROOT_JS,
  ATE_APP_CSS,
  ATE_APP_BODY_PREFIX,
  ATE_APP_INLINE,
  ATE_APP_JS,
  isUiHtmlPath,
  isRootPath,
  shouldInjectRoot,
  shouldInjectApp,
  injectBeforeTag,
  injectAfterBodyOpen,
  injectRootOverride,
  injectAppOverride,
  maybeInjectUi,
};
