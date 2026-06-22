package local.gestorweb.android;

/**
 * SpoofInjector — genera el script de arranque que se inyecta vía
 * WebView.addJavascriptInterface + evaluateJavascript ANTES de que
 * cualquier script de la página se ejecute.
 *
 * Técnica: Object.defineProperty con configurable:false + writable:false
 * para que ningún framework pueda leer ni sobreescribir los valores.
 * NO muta window.navigator directamente (detectable); en su lugar
 * redefine cada descriptor en el prototype chain.
 */
final class SpoofInjector {

    /** Preset de spoofing asociado a un perfil. */
    static final class Preset {
        final String platform;        // "Win32", "Linux x86_64", "MacIntel", etc.
        final String vendor;          // "Google Inc.", "", etc.
        final int    hardwareConcurrency; // 4, 8, 16 …
        final int    deviceMemory;    // 4, 8 (GB)
        final String languages;       // JSON array string: "[\"es-MX\",\"es\"]"
        final boolean hideWebdriver;  // ocultar navigator.webdriver
        final boolean spoofPlugins;   // fingir plugins reales de Chrome
        final boolean spoofCanvas;    // pequeño ruido en canvas fingerprint

        Preset(String platform, String vendor, int hardwareConcurrency,
               int deviceMemory, String languages,
               boolean hideWebdriver, boolean spoofPlugins, boolean spoofCanvas) {
            this.platform             = platform;
            this.vendor               = vendor;
            this.hardwareConcurrency  = hardwareConcurrency;
            this.deviceMemory         = deviceMemory;
            this.languages            = languages;
            this.hideWebdriver        = hideWebdriver;
            this.spoofPlugins         = spoofPlugins;
            this.spoofCanvas          = spoofCanvas;
        }

        /** Preset por defecto: Windows 10 Chrome, 8 cores, 8 GB RAM */
        static Preset defaults() {
            return new Preset(
                "Win32", "Google Inc.", 8, 8,
                "[\\"es-MX\\",\\"es\\",\\"en\\"]",
                true, true, true
            );
        }

        /** Preset mobile: Android Chrome */
        static Preset mobile() {
            return new Preset(
                "Linux armv8l", "Google Inc.", 4, 4,
                "[\\"es-MX\\",\\"es\\"]",
                true, false, true
            );
        }

        /** Preset macOS */
        static Preset macos() {
            return new Preset(
                "MacIntel", "Google Inc.", 10, 16,
                "[\\"es-MX\\",\\"es\\",\\"en\\"]",
                true, true, true
            );
        }
    }

    /**
     * Construye el script completo de spoofing para un Preset dado.
     * Usar como argumento de WebView.evaluateJavascript() en onPageStarted
     * O como startup script vía addJavascriptInterface + document.write trick.
     */
    static String buildScript(Preset p) {
        StringBuilder sb = new StringBuilder();
        sb.append("(function(){");
        sb.append("'use strict';");

        // Helper local — define una propiedad no configurable, no escribible
        sb.append("function def(obj,prop,val){");
        sb.append("try{Object.defineProperty(obj,prop,");
        sb.append("{get:function(){return val;},");
        sb.append("configurable:false,enumerable:true});");
        sb.append("}catch(e){}}");

        // navigator.platform
        appendDef(sb, "navigator", "platform", quote(p.platform));

        // navigator.vendor
        appendDef(sb, "navigator", "vendor", quote(p.vendor));

        // navigator.hardwareConcurrency
        appendDef(sb, "navigator", "hardwareConcurrency", String.valueOf(p.hardwareConcurrency));

        // navigator.deviceMemory
        appendDef(sb, "navigator", "deviceMemory", String.valueOf(p.deviceMemory));

        // navigator.languages
        appendDef(sb, "navigator", "languages", p.languages);
        appendDef(sb, "navigator", "language",
            // primer elemento del array
            p.languages.replaceAll(".*\\[\\\\?\"([^\"]+).*", "'$1'")
                       .replaceAll(".*\\[\"([^\"]+).*", "'$1'")
        );

        // navigator.webdriver → false (no configurable)
        if (p.hideWebdriver) {
            appendDef(sb, "navigator", "webdriver", "false");
        }

        // navigator.plugins — fingir 5 plugins reales de Chrome
        if (p.spoofPlugins) {
            sb.append("try{");
            sb.append("var fakePlugins={");
            sb.append("0:{name:'Chrome PDF Plugin',filename:'internal-pdf-viewer',description:'Portable Document Format'},");
            sb.append("1:{name:'Chrome PDF Viewer',filename:'mhjfbmdgcfjbbpaeojofohoefgiehjai',description:''},");
            sb.append("2:{name:'Native Client',filename:'internal-nacl-plugin',description:''},");
            sb.append("length:3,item:function(i){return this[i]||null;},");
            sb.append("namedItem:function(n){for(var i=0;i<this.length;i++)if(this[i].name===n)return this[i];return null;},");
            sb.append("refresh:function(){}");
            sb.append("};");
            sb.append("def(navigator,'plugins',fakePlugins);");
            sb.append("}catch(e){}");
        }

        // Canvas fingerprint noise — sobrescribe toDataURL y getImageData
        if (p.spoofCanvas) {
            sb.append("try{");
            // toDataURL
            sb.append("var origToDataURL=HTMLCanvasElement.prototype.toDataURL;");
            sb.append("Object.defineProperty(HTMLCanvasElement.prototype,'toDataURL',{");
            sb.append("value:function(){var d=origToDataURL.apply(this,arguments);");
            // Añadir 1 char de ruido determinista en la posición 32
            sb.append("return d.substring(0,32)+(d.charCodeAt(32)^1).toString(16)+d.substring(33);},");
            sb.append("configurable:false,writable:false});");
            // getImageData
            sb.append("var origGID=CanvasRenderingContext2D.prototype.getImageData;");
            sb.append("Object.defineProperty(CanvasRenderingContext2D.prototype,'getImageData',{");
            sb.append("value:function(){var d=origGID.apply(this,arguments);");
            sb.append("if(d&&d.data&&d.data.length>4){d.data[0]=(d.data[0]+1)&0xFF;}");
            sb.append("return d;},configurable:false,writable:false});");
            sb.append("}catch(e){}");
        }

        // Ocultar rastros de automatización en chrome.runtime
        sb.append("try{if(!window.chrome){");
        sb.append("Object.defineProperty(window,'chrome',{value:{runtime:{}},configurable:false,enumerable:true});");
        sb.append("}}catch(e){}");

        // Permissions API — navigator.permissions.query simula 'granted' para notifications
        sb.append("try{var origQuery=window.navigator.permissions.query.bind(navigator.permissions);");
        sb.append("Object.defineProperty(navigator.permissions,'query',{");
        sb.append("value:function(p){if(p&&p.name==='notifications')");
        sb.append("return Promise.resolve({state:'granted',onchange:null});");
        sb.append("return origQuery(p);},configurable:false,writable:false});}catch(e){}");

        sb.append("})();");
        return sb.toString();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static void appendDef(StringBuilder sb, String obj, String prop, String jsVal) {
        sb.append("def(").append(obj).append(",'")
          .append(prop).append("',").append(jsVal).append(");");
    }

    private static String quote(String value) {
        return "'" + value.replace("'", "\\'") + "'";
    }

    private SpoofInjector() {}
}
