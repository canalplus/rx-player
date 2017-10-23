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

import MediaError from "../../../errors/MediaError.js";
import log from "../../../utils/log";

import {
  HTMLTextSourceBuffer,
  NativeTextSourceBuffer,
} from "./text";
import ImageSourceBuffer from "./image";

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
 * @param {Object} sourceBufferMemory
 * @param {Object} sourceBufferMemory.native
 * @returns {SourceBuffer}
 */
function addNativeSourceBuffer(mediaSource, type, codec, { native }) {
  if (!native[type]) {
    log.info("add sourcebuffer", codec);
    native[type] = mediaSource.addSourceBuffer(codec);
  }
  return native[type];
}

/**
 * Creates a new SourceBuffer.
 * Can be a native one (audio/video) as well as a custom one (image/text).
 * @throws MediaError - The type of bugger given is unknown.
 * @param {HTMLMediaElement} video
 * @param {MediaSource} mediaSource
 * @param {string} type
 * @param {string} codex
 * @param {Object} custom
 * @param {Object} custom
 * @returns {SourceBuffer|AbstractSourceBuffer}
 */
function createSourceBuffer(
  video,
  mediaSource,
  type,
  codec,
  sourceBufferMemory,
  options = {},
) {
  let sourceBuffer;

  if (shouldHaveNativeSourceBuffer(type)) {
    sourceBuffer =
      addNativeSourceBuffer(mediaSource, type, codec, sourceBufferMemory);
  }
  else {
    const { custom } = sourceBufferMemory;
    const oldSourceBuffer = custom[type];
    if (oldSourceBuffer) {
      try {
        oldSourceBuffer.abort();
      } catch(e) {
        log.warn(e);
      } finally {
        delete custom[type];
      }
    }

    if (type === "text") {
      log.info("add text sourcebuffer", codec);
      if (options.textTrackMode === "html") {
        sourceBuffer = new HTMLTextSourceBuffer(
          codec,
          video,
          options.textTrackElement
        );
      } else {
        sourceBuffer = new NativeTextSourceBuffer(
          codec,
          video,
          options.hideNativeSubtitle
        );
      }
    }
    else if (type === "image") {
      log.info("add image sourcebuffer", codec);
      sourceBuffer = new ImageSourceBuffer(codec);
    }
    else {
      log.error("unknown buffer type " + type);
      throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
    }

    custom[type] = sourceBuffer;
  }

  return sourceBuffer;
}

/**
 * Abort and remove the SourceBuffer given.
 * @param {HTMLMediaElement} video
 * @param {MediaSource} mediaSource
 * @param {string} type
 * @param {Object} sourceBufferMemory
 * @param {Object} sourceBufferMemory.native
 * @param {Object} sourceBufferMemory.custom
 */
function disposeSourceBuffer(video, mediaSource, type, sourceBufferMemory) {
  const {
    native,
    custom,
  } = sourceBufferMemory;

  let oldSourceBuffer;

  const isNative = shouldHaveNativeSourceBuffer(type);
  if (isNative) {
    oldSourceBuffer = native[type];
    delete native[type];
  }
  else {
    oldSourceBuffer = custom[type];
    delete custom[type];
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
}

export {
  shouldHaveNativeSourceBuffer,
  addNativeSourceBuffer,
  createSourceBuffer,
  disposeSourceBuffer,
};
