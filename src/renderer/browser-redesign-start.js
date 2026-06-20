import { installRendererUrlGuard } from "./url-guard.js";
import { installBrowserNativeFix } from "./browser-native-fix.js";
import "./browser-soft-fonts.js";

installRendererUrlGuard();
installBrowserNativeFix();
