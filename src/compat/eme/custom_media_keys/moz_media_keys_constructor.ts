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
import type { IMediaElement } from "../../browser_compatibility_types";
import type { ICustomMediaKeys } from "./types";

interface IMozMediaKeysConstructor {
  new (keySystem: string): ICustomMediaKeys;
  isTypeSupported(keySystem: string, type?: string | null): boolean;
}

let MozMediaKeysConstructor: IMozMediaKeysConstructor | undefined;
const { MozMediaKeys } = globalScope as typeof globalThis & {
  MozMediaKeys?: IMozMediaKeysConstructor;
};
if (
  MozMediaKeys !== undefined &&
  MozMediaKeys.prototype !== undefined &&
  typeof MozMediaKeys.isTypeSupported === "function" &&
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  typeof MozMediaKeys.prototype.createSession === "function"
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
) {
  MozMediaKeysConstructor = MozMediaKeys;
}
export { MozMediaKeysConstructor };

export default function getMozMediaKeysCallbacks(): {
  isTypeSupported: (keyType: string) => boolean;
  createCustomMediaKeys: (keyType: string) => ICustomMediaKeys;
  setMediaKeys: (
    elt: IMediaElement,
    mediaKeys: MediaKeys | ICustomMediaKeys | null,
  ) => Promise<unknown>;
} {
  const isTypeSupported = (keySystem: string, type?: string | null) => {
    if (MozMediaKeysConstructor === undefined) {
      throw new Error("No MozMediaKeys API.");
    }
    if (type !== undefined) {
      return MozMediaKeysConstructor.isTypeSupported(keySystem, type);
    }
    return MozMediaKeysConstructor.isTypeSupported(keySystem);
  };
  const createCustomMediaKeys = (keyType: string) => {
    if (MozMediaKeysConstructor === undefined) {
      throw new Error("No MozMediaKeys API.");
    }
    return new MozMediaKeysConstructor(keyType);
  };
  const setMediaKeys = (
    elt: IMediaElement,
    mediaKeys: MediaKeys | ICustomMediaKeys | null,
  ): Promise<unknown> => {
    return wrapInPromise(() => {
      if (
        elt.mozSetMediaKeys === undefined ||
        typeof elt.mozSetMediaKeys !== "function"
      ) {
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
