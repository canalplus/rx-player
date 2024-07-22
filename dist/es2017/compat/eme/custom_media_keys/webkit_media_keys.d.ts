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
export interface ICustomWebKitMediaKeys {
    _setVideo: (videoElement: HTMLMediaElement) => void;
    createSession(mimeType: string, initData: Uint8Array): ICustomMediaKeySession;
    setServerCertificate(setServerCertificate: BufferSource): Promise<void>;
}
declare class WebKitCustomMediaKeys implements ICustomWebKitMediaKeys {
    private _videoElement?;
    private _mediaKeys?;
    private _serverCertificate?;
    private _keyType;
    constructor(keyType: string);
    _setVideo(videoElement: HTMLMediaElement): Promise<unknown>;
    createSession(): ICustomMediaKeySession;
    setServerCertificate(serverCertificate: Uint8Array): Promise<void>;
}
export default function getWebKitMediaKeysCallbacks(): {
    isTypeSupported: (keyType: string) => boolean;
    createCustomMediaKeys: (keyType: string) => WebKitCustomMediaKeys;
    setMediaKeys: (elt: HTMLMediaElement, mediaKeys: MediaKeys | ICustomMediaKeys | null) => Promise<unknown>;
};
export {};
//# sourceMappingURL=webkit_media_keys.d.ts.map