package local.gestorweb.android;

import android.webkit.WebView;

/**
 * SpoofInjector v2 — anti-fingerprint indetectable.
 *
 * Vectores cubiertos:
 *  1. navigator.webdriver          → false / borrado
 *  2. navigator.plugins            → lista vacía con length 0
 *  3. navigator.mimeTypes          → vacío
 *  4. navigator.hardwareConcurrency→ valor fijo 4
 *  5. navigator.deviceMemory       → valor fijo 8
 *  6. navigator.platform           → 'Win32'
 *  7. navigator.vendor             → 'Google Inc.'
 *  8. navigator.languages / language → spoof por perfil
 *  9. screen: width/height/colorDepth → valores ruidosos estables por sesión
 * 10. Battery API                  → stub que devuelve promesa resuelta falsa
 * 11. Permissions API              → stub neutral (sin revelar estado real)
 * 12. WebRTC ICE leak              → bloqueo de RTCPeerConnection en modo strict
 * 13. Canvas                       → ruido 1-bit por pixel en toDataURL/toBlob
 * 14. WebGL renderer/vendor        → Intel spoof en getParameter
 * 15. Timezone / Intl.DateTimeFormat→ spoof por perfil
 * 16. Automation props             → delete window.cdc_* y chrome.app.isInstalled
 * 17. Dark mode CSS                → persistencia en navegación
 */
public final class SpoofInjector {

    private SpoofInjector() {}

    public static void apply(WebView wv, BrowserMenuSheet.SpoofState s) {
        if (wv == null) return;
        if (s == null)  s = new BrowserMenuSheet.SpoofState();

        StringBuilder js = new StringBuilder(4096);
        js.append("(function(){'use strict';");

        // ── 1. navigator.webdriver ────────────────────────────────────────────
        js.append(
            "try{Object.defineProperty(navigator,'webdriver',"
            + "{get:function(){return false;},configurable:true});}catch(e){}"
        );

        // ── 2-3. plugins / mimeTypes vacíos con spoofed length ────────────────
        js.append(
            "try{"
            + "  function FakePluginArray(){}"
            + "  FakePluginArray.prototype={length:0,item:function(){return null;},"
            + "    namedItem:function(){return null;},refresh:function(){}};"
            + "  Object.defineProperty(navigator,'plugins',"
            + "    {get:function(){return new FakePluginArray();},configurable:true});"
            + "  Object.defineProperty(navigator,'mimeTypes',"
            + "    {get:function(){return new FakePluginArray();},configurable:true});"
            + "}catch(e){}"
        );

        // ── 4. hardwareConcurrency ────────────────────────────────────────────
        js.append(
            "try{Object.defineProperty(navigator,'hardwareConcurrency',"
            + "{get:function(){return 4;},configurable:true});}catch(e){}"
        );

        // ── 5. deviceMemory ───────────────────────────────────────────────────
        js.append(
            "try{Object.defineProperty(navigator,'deviceMemory',"
            + "{get:function(){return 8;},configurable:true});}catch(e){}"
        );

        // ── 6-7. platform / vendor ────────────────────────────────────────────
        js.append(
            "try{Object.defineProperty(navigator,'platform',"
            + "{get:function(){return 'Win32';},configurable:true});}catch(e){}"
            + "try{Object.defineProperty(navigator,'vendor',"
            + "{get:function(){return 'Google Inc.';},configurable:true});}catch(e){}"
        );

        // ── 8. Language (si spoof activo) ─────────────────────────────────────
        if (s.spoofLang != null && !s.spoofLang.isEmpty()) {
            String lang = s.spoofLang.replace("'", "\\'" );
            js.append(
                "try{Object.defineProperty(navigator,'language',"
                + "{get:function(){return '" + lang + "';},configurable:true});"
                + "Object.defineProperty(navigator,'languages',"
                + "{get:function(){return ['" + lang + "'];},configurable:true});}catch(e){}"
            );
        }

        // ── 9. Screen noise estable por sesión ────────────────────────────────
        // Añade un delta pequeño y constante basado en Math.random seeded una sola vez
        js.append(
            "(function(){"
            + "  if(window.__gwScreenDone)return; window.__gwScreenDone=true;"
            + "  var dx=(Math.random()*6|0)-3, dy=(Math.random()*6|0)-3;"
            + "  var rw=screen.width+dx, rh=screen.height+dy;"
            + "  try{Object.defineProperty(screen,'width',{get:function(){return rw;},configurable:true});}catch(e){}"
            + "  try{Object.defineProperty(screen,'height',{get:function(){return rh;},configurable:true});}catch(e){}"
            + "  try{Object.defineProperty(screen,'colorDepth',{get:function(){return 24;},configurable:true});}catch(e){}"
            + "  try{Object.defineProperty(screen,'pixelDepth',{get:function(){return 24;},configurable:true});}catch(e){}"
            + "})()"
        );

        // ── 10. Battery API stub ──────────────────────────────────────────────
        js.append(
            "try{if(navigator.getBattery){"
            + "  navigator.getBattery=function(){"
            + "    return Promise.resolve({charging:true,chargingTime:0,"
            + "      dischargingTime:Infinity,level:1.0,"
            + "      addEventListener:function(){},removeEventListener:function(){}});"
            + "  };"
            + "}}catch(e){}"
        );

        // ── 11. Permissions API stub ──────────────────────────────────────────
        js.append(
            "try{if(navigator.permissions&&navigator.permissions.query){"
            + "  var _origPQ=navigator.permissions.query.bind(navigator.permissions);"
            + "  navigator.permissions.query=function(d){"
            + "    if(d&&d.name==='notifications') return Promise.resolve({state:'denied'});"
            + "    return _origPQ(d).catch(function(){return{state:'denied'};});"
            + "  };"
            + "}}catch(e){}"
        );

        // ── 12. WebRTC ICE leak block (modo strict) ───────────────────────────
        if (s.blockWebRTC) {
            js.append(
                "try{"
                + "  var _origRTC=window.RTCPeerConnection||window.webkitRTCPeerConnection;"
                + "  if(_origRTC){window.RTCPeerConnection=function(cfg){"
                + "    if(cfg&&cfg.iceServers)cfg.iceServers=[];"
                + "    return new _origRTC(cfg);"
                + "  };"
                + "  window.RTCPeerConnection.prototype=_origRTC.prototype;}"
                + "}catch(e){}"
            );
        }

        // ── 13. Canvas noise ──────────────────────────────────────────────────
        if (s.spoofCanvas) {
            js.append(
                "(function(){"
                + "  if(window.__gwCanvasDone)return; window.__gwCanvasDone=true;"
                + "  var _oTDU=HTMLCanvasElement.prototype.toDataURL;"
                + "  HTMLCanvasElement.prototype.toDataURL=function(t,q){"
                + "    _noise(this); return _oTDU.apply(this,arguments);"
                + "  };"
                + "  var _oTB=HTMLCanvasElement.prototype.toBlob;"
                + "  HTMLCanvasElement.prototype.toBlob=function(cb,t,q){"
                + "    _noise(this); return _oTB.apply(this,arguments);"
                + "  };"
                + "  function _noise(c){"
                + "    var ctx=c.getContext('2d'); if(!ctx)return;"
                + "    var d=ctx.getImageData(0,0,c.width,c.height);"
                + "    for(var i=0;i<d.data.length;i+=4){"
                + "      d.data[i]  ^=(Math.random()*2)|0;"
                + "      d.data[i+1]^=(Math.random()*2)|0;"
                + "      d.data[i+2]^=(Math.random()*2)|0;"
                + "    }"
                + "    ctx.putImageData(d,0,0);"
                + "  }"
                + "})()"
            );
        }

        // ── 14. WebGL vendor/renderer ─────────────────────────────────────────
        if (s.spoofWebGL) {
            js.append(
                "(function(){"
                + "  if(window.__gwWebGLDone)return; window.__gwWebGLDone=true;"
                + "  function _patchGL(proto){"
                + "    if(!proto)return;"
                + "    var _o=proto.getParameter;"
                + "    proto.getParameter=function(p){"
                + "      if(p===37445)return 'Intel Inc.';"
                + "      if(p===37446)return 'Intel Iris OpenGL Engine';"
                + "      if(p===37447)return null;"
                + "      return _o.apply(this,arguments);"
                + "    };"
                + "  }"
                + "  _patchGL(WebGLRenderingContext&&WebGLRenderingContext.prototype);"
                + "  _patchGL(WebGL2RenderingContext&&WebGL2RenderingContext.prototype);"
                + "})()"
            );
        }

        // ── 15. Timezone ──────────────────────────────────────────────────────
        if (s.spoofTZ != null && !s.spoofTZ.isEmpty()) {
            String tz = s.spoofTZ.replace("'", "\\'" );
            js.append(
                "(function(){"
                + "  if(window.__gwTZDone)return; window.__gwTZDone=true;"
                + "  var tz='" + tz + "';"
                + "  var rawOff=-new Date().getTimezoneOffset();"
                + "  try{"
                + "    var fmt=new Intl.DateTimeFormat('en',{timeZone:tz,timeZoneName:'shortOffset'});"
                + "    var parts=fmt.formatToParts(new Date());"
                + "    var tzStr=parts.filter(function(p){return p.type==='timeZoneName';})[0];"
                + "    if(tzStr){var m=tzStr.value.match(/GMT([+-]\\d+):?(\\d{2})/);"
                + "      if(m)rawOff=parseInt(m[1])*60+(m[2]?parseInt(m[2]):0);}"
                + "  }catch(e){}"
                + "  var off=-rawOff;"
                + "  Date.prototype.getTimezoneOffset=function(){return off;};"
                + "  var _ODTF=Intl.DateTimeFormat;"
                + "  window.Intl=Object.assign({},Intl,{DateTimeFormat:function(loc,opts){"
                + "    opts=Object.assign({},opts||{});"
                + "    if(!opts.timeZone)opts.timeZone=tz;"
                + "    return new _ODTF(loc,opts);"
                + "  }});"
                + "  Object.getOwnPropertyNames(_ODTF).forEach(function(k){"
                + "    try{window.Intl.DateTimeFormat[k]=_ODTF[k];}catch(e){}"
                + "  });"
                + "})()"
            );
        }

        // ── 16. Borrar flags de automatización ────────────────────────────────
        js.append(
            "(function(){"
            + "  var keys=Object.keys(window).filter(function(k){return k.startsWith('cdc_');});"
            + "  keys.forEach(function(k){try{delete window[k];}catch(e){}});"
            + "  try{if(window.chrome&&window.chrome.app&&window.chrome.app.isInstalled!==undefined)"
            + "    Object.defineProperty(window.chrome.app,'isInstalled',"
            + "      {get:function(){return false;},configurable:true});}catch(e){}"
            + "})()"
        );

        // ── 17. Dark mode persistente ─────────────────────────────────────────
        if (s.darkMode) {
            js.append(
                "if(!document.getElementById('__gw_dark')){"
                + "  var el=document.createElement('style');"
                + "  el.id='__gw_dark';"
                + "  el.textContent='html{filter:invert(1) hue-rotate(180deg)!important}'"
                + "    +'img,video,canvas,iframe{filter:invert(1) hue-rotate(180deg)!important}';"
                + "  document.head.appendChild(el);"
                + "}"
            );
        }

        js.append("})()");
        wv.evaluateJavascript(js.toString(), null);
    }
}
