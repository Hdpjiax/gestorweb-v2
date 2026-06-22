package local.gestorweb.android;

/** Genera mitigaciones de fingerprint coherentes con un dispositivo Android. */
final class SpoofInjector {
    static String buildScript(ProfileStore.Profile p) {
        if (p == null || "off".equals(p.spoofLevel)) return privacyOnly(p);
        boolean strong = "strong".equals(p.spoofLevel) || p.hardenAll;
        StringBuilder js = new StringBuilder("(()=>{'use strict';");
        js.append("const seed=").append(Math.abs(p.noiseSeed % 2147483647L)).append(";");
        js.append("const def=(o,k,v)=>{try{Object.defineProperty(o,k,{get:()=>v,configurable:true,enumerable:true})}catch(e){}};");
        js.append("const n=(i)=>((seed^(i*1103515245))>>>0)%3-1;");
        js.append("def(navigator,'platform','Linux armv8l');def(navigator,'vendor','Google Inc.');");
        js.append("def(navigator,'hardwareConcurrency',").append(p.cores).append(");def(navigator,'deviceMemory',").append(p.memoryGb).append(");");
        js.append("def(navigator,'language',").append(q(p.locale)).append(");def(navigator,'languages',[").append(q(p.locale)).append(",'es','en-US']);");
        js.append("def(screen,'width',").append(p.width).append(");def(screen,'height',").append(p.height).append(");def(screen,'availWidth',").append(p.width).append(");def(screen,'availHeight',").append(Math.max(1, p.height - 80)).append(");");

        if (p.sanitizeHeaders) js.append("try{def(navigator,'userAgentData',undefined)}catch(e){};");
        if (strong) {
            js.append("try{const gp=WebGLRenderingContext.prototype.getParameter;WebGLRenderingContext.prototype.getParameter=function(x){if(x===37445)return'Google Inc. (Google)';if(x===37446)return").append(q(p.webGlLabel())).append(";return gp.call(this,x)}}catch(e){};");
            js.append("try{const gi=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(){const d=gi.apply(this,arguments);for(let i=0;i<Math.min(d.data.length,128);i+=4)d.data[i]=Math.max(0,Math.min(255,d.data[i]+n(i)));return d}}catch(e){};");
            js.append("try{const gc=AudioBuffer.prototype.getChannelData;AudioBuffer.prototype.getChannelData=function(){const d=gc.apply(this,arguments),c=new Float32Array(d);for(let i=0;i<Math.min(c.length,64);i++)c[i]+=n(i)*1e-7;return c}}catch(e){};");
            js.append("try{const Old=Intl.DateTimeFormat;Intl.DateTimeFormat=function(l,o){o=Object.assign({},o||{});if(!o.timeZone)o.timeZone=").append(q(p.timezone)).append(";return new Old(l,o)};Intl.DateTimeFormat.prototype=Old.prototype}catch(e){};");
        }
        js.append(privacyBody(p));
        js.append("})();");
        return js.toString();
    }

    private static String privacyOnly(ProfileStore.Profile p) { return "(()=>{'use strict';" + privacyBody(p) + "})();"; }

    private static String privacyBody(ProfileStore.Profile p) {
        if (p == null) return "";
        StringBuilder js = new StringBuilder();
        if (p.webrtcBlock || p.antiLeak) {
            js.append("try{const deny=()=>{throw new DOMException('Blocked by profile','NotAllowedError')};window.RTCPeerConnection=undefined;window.webkitRTCPeerConnection=undefined;if(navigator.mediaDevices){navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Blocked','NotAllowedError'));navigator.mediaDevices.enumerateDevices=()=>Promise.resolve([])}}catch(e){};");
        }
        if (p.strictReferer) js.append("try{let m=document.createElement('meta');m.name='referrer';m.content='no-referrer';(document.head||document.documentElement).appendChild(m)}catch(e){};");
        return js.toString();
    }

    private static String q(String value) { return "'" + String.valueOf(value).replace("\\", "\\\\").replace("'", "\\'") + "'"; }
    private SpoofInjector() {}
}
