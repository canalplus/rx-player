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

import { OtherError } from "../../../errors";
import isEMEReadyEvent from "../is_eme_ready";

describe("core - init - isEMEReadyEvent", () => {
  it("should return false for a warning event", () => {
    expect(isEMEReadyEvent({
      type: "warning",
      value: new OtherError("NONE", ""),
    })).toBe(false);
  });

  /* tslint:disable max-line-length */
  it("should return false for a `created-media-keys` event without `disableMediaKeysAttachmentLock`", () => {
  /* tslint:enable max-line-length */
    expect(isEMEReadyEvent({
      type: "created-media-keys",
      value: {
        mediaKeySystemAccess: {} as any,
        keySystemOptions: {
          type: "blabla",
          getLicense() : never { throw new Error(); },
        },
        mediaKeys: {} as any,
        loadedSessionsStore: {} as any,
        persistentSessionsStore: null,
      },
    })).toBe(false);
    expect(isEMEReadyEvent({
      type: "created-media-keys",
      value: {
        mediaKeySystemAccess: {} as any,
        keySystemOptions: {
          type: "blabla",
          getLicense() : never { throw new Error(); },
          disableMediaKeysAttachmentLock: false,
        },
        mediaKeys: {} as any,
        loadedSessionsStore: {} as any,
        persistentSessionsStore: null,
      },
    })).toBe(false);
  });

  /* tslint:disable max-line-length */
  it("should return true for a `created-media-keys` event with `disableMediaKeysAttachmentLock`", () => {
  /* tslint:enable max-line-length */
    expect(isEMEReadyEvent({
      type: "created-media-keys",
      value: {
        mediaKeySystemAccess: {} as any,
        keySystemOptions: {
          type: "blabla",
          getLicense() : never { throw new Error(); },
          disableMediaKeysAttachmentLock: true,
        },
        mediaKeys: {} as any,
        loadedSessionsStore: {} as any,
        persistentSessionsStore: null,
      },
    })).toBe(true);
  });

  it("should return true for any `attached-media-keys` event", () => {
    expect(isEMEReadyEvent({
      type: "attached-media-keys",
      value: {
        mediaKeySystemAccess: {} as any,
        keySystemOptions: {
          type: "blabla",
          getLicense() : never { throw new Error(); },
        },
        mediaKeys: {} as any,
        loadedSessionsStore: {} as any,
        persistentSessionsStore: null,
      },
    })).toBe(true);
    expect(isEMEReadyEvent({
      type: "attached-media-keys",
      value: {
        mediaKeySystemAccess: {} as any,
        keySystemOptions: {
          type: "blabla",
          getLicense() : never { throw new Error(); },
          disableMediaKeysAttachmentLock: true,
        },
        mediaKeys: {} as any,
        loadedSessionsStore: {} as any,
        persistentSessionsStore: null,
      },
    })).toBe(true);
  });
});
