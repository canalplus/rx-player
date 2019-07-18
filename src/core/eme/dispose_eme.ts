/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import noop from "../../utils/noop";
import disposeMediaKeys from "./dispose_media_keys";
import { defaultMediaKeysInfosStore } from "./media_keys_infos_store";

/**
 * Free up all ressources taken by the EME management.
 */
export default function disposeEME(mediaElement : HTMLMediaElement) : void {
  disposeMediaKeys(mediaElement, defaultMediaKeysInfosStore).subscribe(noop);
}
