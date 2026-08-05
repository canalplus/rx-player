import getIE11MediaKeysCallbacks, { MSMediaKeysConstructor } from "./ie11_media_keys.ts";
import getMozMediaKeysCallbacks, {
  MozMediaKeysConstructor,
} from "./moz_media_keys_constructor.ts";
import getOldKitWebKitMediaKeyCallbacks, {
  isOldWebkitMediaElement,
} from "./old_webkit_media_keys.ts";
import getWebKitMediaKeysCallbacks from "./webkit_media_keys.ts";
import getWebKitMediaKeysConstructor from "./webkit_media_keys_constructor.ts";

export {
  getIE11MediaKeysCallbacks,
  MSMediaKeysConstructor,
  getMozMediaKeysCallbacks,
  MozMediaKeysConstructor,
  getOldKitWebKitMediaKeyCallbacks,
  isOldWebkitMediaElement,
  getWebKitMediaKeysCallbacks,
  getWebKitMediaKeysConstructor,
};
