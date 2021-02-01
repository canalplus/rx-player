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

import isNode from "../../is_node";
import { ICustomMediaKeys } from "./types";

interface IMozMediaKeysConstructor {
  new(keySystem: string): ICustomMediaKeys;
  isTypeSupported(keySystem: string, type?: string | null): boolean;
}

let MozMediaKeysConstructor: IMozMediaKeysConstructor|undefined;
if (!isNode) {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  const { MozMediaKeys } = (window as any);
  if (MozMediaKeys !== undefined &&
      MozMediaKeys.prototype !== undefined &&
      typeof MozMediaKeys.isTypeSupported === "function" &&
      typeof MozMediaKeys.prototype.createSession === "function") {
    MozMediaKeysConstructor = MozMediaKeys;
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
export { MozMediaKeysConstructor };

export default function getMozMediaKeysCallbacks() : {
  isTypeSupported: (keyType: string) => boolean;
  createCustomMediaKeys: (keyType: string) => ICustomMediaKeys;
  setMediaKeys: (
    elt: HTMLMediaElement,
    mediaKeys: MediaKeys|ICustomMediaKeys|null
  ) => void;
} {
  const isTypeSupported = (keySystem: string, type?: string|null) => {
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
    elt: HTMLMediaElement,
    mediaKeys: MediaKeys|ICustomMediaKeys|null
  ): void => {
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    if ((elt as any).mozSetMediaKeys === undefined ||
        typeof (elt as any).mozSetMediaKeys !== "function") {
      throw new Error("Can't set video on MozMediaKeys.");
    }
    return (elt as any).mozSetMediaKeys(mediaKeys);
    /* eslint-enable @typescript-eslint/no-unsafe-return */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
  };
  return {
    isTypeSupported,
    createCustomMediaKeys,
    setMediaKeys,
  };
}
