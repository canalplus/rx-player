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

// Returned error when rejecting
export default class VideoThumbnailLoaderError extends Error {
  public readonly name : "VideoThumbnailLoaderError";
  public readonly message : string;
  public readonly code : string;

  /**
   * @param {string} code
   * @param {string} reason
   * @param {Boolean} fatal
   */
  constructor(code : string, message : string) {
    super();
    Object.setPrototypeOf(this, VideoThumbnailLoaderError.prototype);
    this.name = "VideoThumbnailLoaderError";
    this.code = code;
    this.message = message;
  }
}
