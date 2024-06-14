import getIE11MediaKeysCallbacks, { MSMediaKeysConstructor } from "./ie11_media_keys";
import getMozMediaKeysCallbacks, {
  MozMediaKeysConstructor,
} from "./moz_media_keys_constructor";
import getOldKitWebKitMediaKeyCallbacks, {
  isOldWebkitMediaElement,
} from "./old_webkit_media_keys";
import type { ICustomMediaKeys, ICustomMediaKeySession } from "./types";
import getWebKitMediaKeysCallbacks from "./webkit_media_keys";
import { WebKitMediaKeysConstructor } from "./webkit_media_keys_constructor";

export type { ICustomMediaKeys, ICustomMediaKeySession };
export {
  getIE11MediaKeysCallbacks,
  MSMediaKeysConstructor,
  getMozMediaKeysCallbacks,
  MozMediaKeysConstructor,
  getOldKitWebKitMediaKeyCallbacks,
  isOldWebkitMediaElement,
  getWebKitMediaKeysCallbacks,
  WebKitMediaKeysConstructor,
};
