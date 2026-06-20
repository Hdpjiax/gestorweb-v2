import { installRendererUrlGuard } from "./url-guard.js";
import { installUxPolish } from "./ux-polish.js";
import { installBrowserNativeFix } from "./browser-native-fix.js";
import "./browser-soft-fonts.js";

installRendererUrlGuard();
installUxPolish();
installBrowserNativeFix();
