package local.gestorweb.android;

import android.net.Uri;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

final class TrackerBlocker {
    private static final Set<String> HOSTS = new HashSet<>(Arrays.asList(
        "doubleclick.net","google-analytics.com","googletagmanager.com","googlesyndication.com","googleadservices.com","analytics.google.com","adservice.google.com","ads-twitter.com","analytics.twitter.com",
        "facebook.net","connect.facebook.net","pixel.facebook.com","analytics.tiktok.com","ads.tiktok.com","snap.licdn.com","px.ads.linkedin.com","bat.bing.com","clarity.ms","hotjar.com","static.hotjar.com",
        "segment.io","segment.com","mixpanel.com","amplitude.com","app-measurement.com","scorecardresearch.com","quantserve.com","newrelic.com","nr-data.net","sentry.io","branch.io","appsflyer.com","adjust.com",
        "criteo.com","criteo.net","taboola.com","outbrain.com","adnxs.com","rubiconproject.com","pubmatic.com","openx.net","casalemedia.com","moatads.com","adsrvr.org","demdex.net","omtrdc.net","2o7.net",
        "mathtag.com","bluekai.com","rlcdn.com","tapad.com","bidswitch.net","yieldmo.com","smartadserver.com","serving-sys.com","flashtalking.com","adform.net","amazon-adsystem.com","media.net","chartbeat.com",
        "optimizely.com","fullstory.com","mouseflow.com","luckyorange.com","inspectlet.com","heap.io","kissmetrics.com","intercom.io","intercomcdn.com","zendesk.com","braze.com","onesignal.com","pushwoosh.com",
        "vungle.com","unityads.unity3d.com","applovin.com","mopub.com","inmobi.com","ironsrc.com","startappservice.com","chartboost.com","adcolony.com","tapjoy.com","kochava.com"
    ));
    static boolean blocked(String rawUrl) {
        String host = Uri.parse(rawUrl).getHost();
        if (host == null) return false;
        host = host.toLowerCase();
        for (String item : HOSTS) if (host.equals(item) || host.endsWith("." + item)) return true;
        return false;
    }
    static String stripTracking(String rawUrl) {
        try {
            Uri uri = Uri.parse(rawUrl);
            if (!"http".equals(uri.getScheme()) && !"https".equals(uri.getScheme())) return rawUrl;
            Set<String> remove = new HashSet<>(Arrays.asList("fbclid","gclid","dclid","msclkid","yclid","mc_cid","mc_eid","_ga"));
            Uri.Builder builder = uri.buildUpon().clearQuery();
            for (String name : uri.getQueryParameterNames()) {
                if (name.toLowerCase().startsWith("utm_") || remove.contains(name.toLowerCase())) continue;
                for (String value : uri.getQueryParameters(name)) builder.appendQueryParameter(name, value);
            }
            return builder.build().toString();
        } catch (Exception ignored) { return rawUrl; }
    }
    private TrackerBlocker() {}
}
