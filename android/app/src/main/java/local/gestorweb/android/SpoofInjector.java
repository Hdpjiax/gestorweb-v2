package local.gestorweb.android;

import android.webkit.WebView;

/**
 * Genera y inyecta los scripts de spoof en el WebView.
 * Llamado desde BrowserActivity.onPageFinished para re-aplicar
 * automáticamente en cada navegación.
 */
public final class SpoofInjector {

    private SpoofInjector() {}

    public static void apply(WebView wv, BrowserMenuSheet.SpoofState s) {
        if (s == null) return;
        StringBuilder js = new StringBuilder("(function(){");

        // ── Canvas ────────────────────────────────────────────────────────────
        if (s.spoofCanvas) {
            js.append(
                "var _origToDataURL = HTMLCanvasElement.prototype.toDataURL;"
                + "HTMLCanvasElement.prototype.toDataURL = function(type) {"
                + "  var ctx = this.getContext('2d');"
                + "  if (ctx) {"
                + "    var imgData = ctx.getImageData(0,0,this.width,this.height);"
                + "    for (var i=0; i<imgData.data.length; i+=4) {"
                + "      imgData.data[i]   ^= (Math.random()*2)|0;"
                + "      imgData.data[i+1] ^= (Math.random()*2)|0;"
                + "      imgData.data[i+2] ^= (Math.random()*2)|0;"
                + "    }"
                + "    ctx.putImageData(imgData,0,0);"
                + "  }"
                + "  return _origToDataURL.apply(this, arguments);"
                + "};"
                + "var _origToBlob = HTMLCanvasElement.prototype.toBlob;"
                + "HTMLCanvasElement.prototype.toBlob = function(cb,type,q) {"
                + "  var ctx = this.getContext('2d');"
                + "  if (ctx) {"
                + "    var imgData = ctx.getImageData(0,0,this.width,this.height);"
                + "    for (var i=0; i<imgData.data.length; i+=4) {"
                + "      imgData.data[i]   ^= (Math.random()*2)|0;"
                + "      imgData.data[i+1] ^= (Math.random()*2)|0;"
                + "      imgData.data[i+2] ^= (Math.random()*2)|0;"
                + "    }"
                + "    ctx.putImageData(imgData,0,0);"
                + "  }"
                + "  return _origToBlob.apply(this, arguments);"
                + "};"
            );
        }

        // ── WebGL ─────────────────────────────────────────────────────────────
        if (s.spoofWebGL) {
            js.append(
                "var _origGetParam = WebGLRenderingContext.prototype.getParameter;"
                + "WebGLRenderingContext.prototype.getParameter = function(p) {"
                + "  if (p === 37445) return 'Intel Inc.';"
                + "  if (p === 37446) return 'Intel Iris OpenGL Engine';"
                + "  return _origGetParam.apply(this, arguments);"
                + "};"
                + "var _origGetParam2 = WebGL2RenderingContext.prototype.getParameter;"
                + "WebGL2RenderingContext.prototype.getParameter = function(p) {"
                + "  if (p === 37445) return 'Intel Inc.';"
                + "  if (p === 37446) return 'Intel Iris OpenGL Engine';"
                + "  return _origGetParam2.apply(this, arguments);"
                + "};"
            );
        }

        // ── Timezone ──────────────────────────────────────────────────────────
        if (s.spoofTZ != null && !s.spoofTZ.isEmpty()) {
            // Calculamos el offset en minutos a partir del TZ id
            // Lo hacemos via JS para evitar dependencias nativas
            js.append(
                "(function(){"
                + "  var tz='" + s.spoofTZ + "';"
                + "  var offset = -new Intl.DateTimeFormat('en',{timeZone:tz,timeZoneName:'shortOffset'})"
                + "    .formatToParts(new Date()).filter(function(p){return p.type==='timeZoneName';})"
                + "    .reduce(function(acc,p){"
                + "      var m=p.value.match(/GMT([+-]\\d+):?(\\d{2})?/);"
                + "      return m?parseInt(m[1])*60+(m[2]?parseInt(m[2]):0):acc;"
                + "    },0);"
                + "  var _origGTO = Date.prototype.getTimezoneOffset;"
                + "  Date.prototype.getTimezoneOffset = function(){return offset;};"
                + "  var _origDTF = Intl.DateTimeFormat;"
                + "  Intl.DateTimeFormat = function(loc,opts){"
                + "    opts = opts || {};"
                + "    if (!opts.timeZone) opts.timeZone = tz;"
                + "    return new _origDTF(loc,opts);"
                + "  };"
                + "  Object.getOwnPropertyNames(_origDTF).forEach(function(k){"
                + "    try{Intl.DateTimeFormat[k]=_origDTF[k];}catch(e){}"
                + "  });"
                + "})()"
            );
        }

        // ── Language ──────────────────────────────────────────────────────────
        if (s.spoofLang != null && !s.spoofLang.isEmpty()) {
            js.append(
                "Object.defineProperty(navigator,'language',{get:function(){return '" + s.spoofLang + "';}});"
                + "Object.defineProperty(navigator,'languages',{get:function(){return ['" + s.spoofLang + "'];}});"
            );
        }

        // ── Dark mode (persistencia en navegación) ────────────────────────────
        if (s.darkMode) {
            js.append(
                "if(!document.getElementById('__gw_dark')){"
                + "  var el=document.createElement('style');"
                + "  el.id='__gw_dark';"
                + "  el.textContent='html{filter:invert(1) hue-rotate(180deg)!important}'"
                + "  +'img,video,canvas,iframe{filter:invert(1) hue-rotate(180deg)!important}';"
                + "  document.head.appendChild(el);"
                + "}"
            );
        }

        js.append("})()");
        wv.evaluateJavascript(js.toString(), null);
    }
}
