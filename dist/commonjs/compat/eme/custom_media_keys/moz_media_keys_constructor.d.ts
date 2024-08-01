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
import type { IMediaElement } from "../../browser_compatibility_types";
import type { ICustomMediaKeys } from "./types";
interface IMozMediaKeysConstructor {
    new (keySystem: string): ICustomMediaKeys;
    isTypeSupported(keySystem: string, type?: string | null): boolean;
}
declare let MozMediaKeysConstructor: IMozMediaKeysConstructor | undefined;
export { MozMediaKeysConstructor };
export default function getMozMediaKeysCallbacks(): {
    isTypeSupported: (keyType: string) => boolean;
    createCustomMediaKeys: (keyType: string) => ICustomMediaKeys;
    setMediaKeys: (elt: IMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null) => Promise<unknown>;
};
//# sourceMappingURL=moz_media_keys_constructor.d.ts.map