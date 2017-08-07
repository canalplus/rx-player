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

import log from "../../../utils/log";

import TextSourceBuffer from "./text-buffer.js";
import ImageSourceBuffer from "./image-buffer.js";

/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" source buffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
const shouldHaveNativeSourceBuffer = (bufferType) =>
    bufferType == "audio" ||
    bufferType == "video";

/**
 * Adds a SourceBuffer to the MediaSource.
 * @param {MediaSource} mediaSource
 * @param {string} type - The "type" of SourceBuffer (audio/video...)
 * @param {string} codec
 * @param {Object} nativeBuffers
 * @returns {SourceBuffer}
 */
const addNativeSourceBuffer = (mediaSource, type, codec, nativeBuffers) => {
  if (!nativeBuffers[type]) {
    log.info("add sourcebuffer", codec);
    nativeBuffers[type] = mediaSource.addSourceBuffer(codec);
  }
  return nativeBuffers[type];
};

/**
 * Creates a new SourceBuffer.
 * Can be a native one (audio/video) as well as a custom one (image/text).
 * @throws MediaError - The type of bugger given is unknown.
 * @param {HTMLMediaElement} video
 * @param {MediaSource} mediaSource
 * @param {string} type
 * @param {string} codex
 * @param {Object} customBuffers
 * @returns {SourceBuffer|AbstractSourceBuffer}
 */
const createSourceBuffer = (
  video,
  mediaSource,
  type,
  codec,
  nativeBuffers,
  customBuffers,
  options = {},
) => {
  let sourceBuffer;

  if (shouldHaveNativeSourceBuffer(type)) {
    sourceBuffer = addNativeSourceBuffer(mediaSource, type, codec, nativeBuffers);
  }
  else {
    const oldSourceBuffer = customBuffers[type];
    if (oldSourceBuffer) {
      try {
        oldSourceBuffer.abort();
      } catch(e) {
        log.warn(e);
      } finally {
        delete customBuffers[type];
      }
    }

    if (type == "text") {
      log.info("add text sourcebuffer", codec);
      sourceBuffer = new TextSourceBuffer(video, codec, options.hideNativeSubtitle);
    }
    else if (type == "image") {
      log.info("add image sourcebuffer", codec);
      sourceBuffer = new ImageSourceBuffer(codec);
    }
    else {
      log.error("unknown buffer type " + type);
      throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
    }

    customBuffers[type] = sourceBuffer;
  }

  return sourceBuffer;
};

/**
 * Abort and remove the SourceBuffer given.
 * @param {HTMLMediaElement} video
 * @param {MediaSource} mediaSource
 * @param {string} type
 */
const disposeSourceBuffer = (
  video,
  mediaSource,
  type,
  nativeBuffers,
  customBuffers
) => {
  let oldSourceBuffer;

  const isNative = shouldHaveNativeSourceBuffer(type);
  if (isNative) {
    oldSourceBuffer = nativeBuffers[type];
    delete nativeBuffers[type];
  }
  else {
    oldSourceBuffer = customBuffers[type];
    delete customBuffers[type];
  }

  if (oldSourceBuffer) {
    try {
      oldSourceBuffer.abort();

      if (isNative) {
        mediaSource.removeSourceBuffer(oldSourceBuffer);
      }

    } catch(e) {
      log.warn(e);
    }
  }
};

export {
  shouldHaveNativeSourceBuffer,
  addNativeSourceBuffer,
  createSourceBuffer,
  disposeSourceBuffer,
};
