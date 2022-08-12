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

import MediaError from "../media_error";

describe("errors - MediaError", () => {
  it("should format a MediaError", () => {
    const reason = "test";
    const mediaError = new MediaError("BUFFER_FULL_ERROR", reason);
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("BUFFER_FULL_ERROR");
    expect(mediaError.fatal).toBe(false);
    expect(mediaError.message).toBe("MediaError (BUFFER_FULL_ERROR) test");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const mediaError = new MediaError("BUFFER_APPEND_ERROR", reason);
    mediaError.fatal = true;
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("BUFFER_APPEND_ERROR");
    expect(mediaError.fatal).toBe(true);
    expect(mediaError.message).toBe("MediaError (BUFFER_APPEND_ERROR) test");
  });

  it("should filter in a valid error code", () => {
  /* eslint-enable max-len */
    const reason = "test";
    const mediaError = new MediaError("MEDIA_ERR_NETWORK", reason);
    mediaError.fatal = true;
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("MEDIA_ERR_NETWORK");
    expect(mediaError.fatal).toBe(true);
    expect(mediaError.message).toBe("MediaError (MEDIA_ERR_NETWORK) test");
  });
});
