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
import globalScope from "../../../utils/global_scope";
import wrapInPromise from "../../../utils/wrapInPromise";
let MozMediaKeysConstructor;
const { MozMediaKeys } = globalScope;
if (MozMediaKeys !== undefined &&
    MozMediaKeys.prototype !== undefined &&
    typeof MozMediaKeys.isTypeSupported === "function" &&
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    typeof MozMediaKeys.prototype.createSession === "function"
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
) {
    MozMediaKeysConstructor = MozMediaKeys;
}
export { MozMediaKeysConstructor };
export default function getMozMediaKeysCallbacks() {
    const isTypeSupported = (keySystem, type) => {
        if (MozMediaKeysConstructor === undefined) {
            throw new Error("No MozMediaKeys API.");
        }
        if (type !== undefined) {
            return MozMediaKeysConstructor.isTypeSupported(keySystem, type);
        }
        return MozMediaKeysConstructor.isTypeSupported(keySystem);
    };
    const createCustomMediaKeys = (keyType) => {
        if (MozMediaKeysConstructor === undefined) {
            throw new Error("No MozMediaKeys API.");
        }
        return new MozMediaKeysConstructor(keyType);
    };
    const setMediaKeys = (mediaElement, mediaKeys) => {
        return wrapInPromise(() => {
            const elt = mediaElement;
            if (elt.mozSetMediaKeys === undefined ||
                typeof elt.mozSetMediaKeys !== "function") {
                throw new Error("Can't set video on MozMediaKeys.");
            }
            return elt.mozSetMediaKeys(mediaKeys);
        });
    };
    return {
        isTypeSupported,
        createCustomMediaKeys,
        setMediaKeys,
    };
}
