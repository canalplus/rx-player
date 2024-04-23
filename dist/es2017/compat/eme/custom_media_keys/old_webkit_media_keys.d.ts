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
import type { ICustomMediaKeys, ICustomMediaKeySession } from "./types";
export interface IOldWebkitHTMLMediaElement extends HTMLVideoElement {
    webkitGenerateKeyRequest: (keyType: string, initData: ArrayBuffer) => void;
    webkitAddKey: (keyType: string, key: BufferSource, kid: BufferSource | null, sessionId: string) => void;
}
/**
 * Returns true if the given media element has old webkit methods
 * corresponding to the IOldWebkitHTMLMediaElement interface.
 * @param {HTMLMediaElement} element
 * @returns {Boolean}
 */
export declare function isOldWebkitMediaElement(element: unknown): element is IOldWebkitHTMLMediaElement;
declare class OldWebKitCustomMediaKeys implements ICustomMediaKeys {
    private readonly _keySystem;
    private _videoElement?;
    constructor(keySystem: string);
    _setVideo(videoElement: IOldWebkitHTMLMediaElement | HTMLMediaElement): Promise<unknown>;
    createSession(): ICustomMediaKeySession;
    setServerCertificate(): Promise<void>;
}
export default function getOldWebKitMediaKeysCallbacks(): {
    isTypeSupported: (keyType: string) => boolean;
    createCustomMediaKeys: (keyType: string) => OldWebKitCustomMediaKeys;
    setMediaKeys: (elt: HTMLMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null) => Promise<unknown>;
};
export {};
