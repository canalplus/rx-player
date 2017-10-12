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
import MediaError from "../../../errors/MediaError";

import {
  HTMLTextSourceBuffer,
  NativeTextSourceBuffer,
} from "./text";
import ImageSourceBuffer from "./image";
import { ICustomSourceBuffer } from  "./abstract";
import ICustomTimeRanges from  "./time_ranges";

export interface ISourceBufferMemory {
  custom : {
    [keyName : string ] : ICustomSourceBuffer;
  };
  native : {
    audio? : SourceBuffer;
    video? : SourceBuffer;
  };
}

export {
  ICustomSourceBuffer,
  ICustomTimeRanges,
};

export type SourceBufferOptions = {
  textTrackMode? : "native";
  hideNativeSubtitle? : boolean;
}|{
  textTrackMode : "html";
  textTrackElement : HTMLElement;
};

/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" source buffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(
  bufferType : string
) : bufferType is "audio"|"video" {
  return bufferType === "audio" || bufferType === "video";
}

/**
 * Adds a SourceBuffer to the MediaSource.
 * @param {MediaSource} mediaSource
 * @param {string} bufferType - The "type" of SourceBuffer (audio/video...)
 * @param {string} codec
 * @param {Object} sourceBufferMemory
 * @param {Object} sourceBufferMemory.native
 * @returns {SourceBuffer}
 */
function addNativeSourceBuffer(
  mediaSource : MediaSource,
  bufferType : "audio"|"video",
  codec : string,
  { native } : ISourceBufferMemory
) : SourceBuffer {
  if (native[bufferType] == null) {
    log.info("add sourcebuffer", codec);
    native[bufferType] = mediaSource.addSourceBuffer(codec);
  }

  // TODO is TypeScript playing Dumb here?
  return native[bufferType] as SourceBuffer;
}

/**
 * Creates a new SourceBuffer.
 * Can be a native one (audio/video) as well as a custom one (image/text).
 * @throws MediaError - The type of bugger given is unknown.
 * @param {HTMLMediaElement} video
 * @param {MediaSource} mediaSource
 * @param {string} bufferType
 * @param {string} codex
 * @param {Object} custom
 * @param {Object} custom
 * @returns {SourceBuffer|AbstractSourceBuffer}
 */
function createSourceBuffer(
  video : HTMLMediaElement,
  mediaSource : MediaSource,
  bufferType : string,
  codec : string,
  sourceBufferMemory : ISourceBufferMemory,
  options : SourceBufferOptions = {}
) : SourceBuffer|ICustomSourceBuffer {
  let sourceBuffer;

  if (shouldHaveNativeSourceBuffer(bufferType)) {
    sourceBuffer =
      addNativeSourceBuffer(mediaSource, bufferType, codec, sourceBufferMemory);
  }
  else {
    const { custom } = sourceBufferMemory;
    const oldSourceBuffer = custom[bufferType];
    if (oldSourceBuffer) {
      try {
        oldSourceBuffer.abort();
      } catch (e) {
        log.warn(e);
      } finally {
        delete custom[bufferType];
      }
    }

    if (bufferType === "text") {
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
    else if (bufferType === "image") {
      log.info("add image sourcebuffer", codec);
      sourceBuffer = new ImageSourceBuffer(codec);
    }
    else {
      log.error("unknown buffer type " + bufferType);
      throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
    }

    custom[bufferType] = sourceBuffer;
  }

  return sourceBuffer;
}

/**
 * Abort and remove the SourceBuffer given.
 * @param {HTMLMediaElement} video
 * @param {MediaSource} mediaSource
 * @param {string} bufferType
 * @param {Object} sourceBufferMemory
 * @param {Object} sourceBufferMemory.native
 * @param {Object} sourceBufferMemory.custom
 */
function disposeSourceBuffer(
  _video : HTMLMediaElement,
  mediaSource : MediaSource,
  bufferType : string,
  sourceBufferMemory : ISourceBufferMemory
) : void {
  const {
    native,
    custom,
  } = sourceBufferMemory;

  let oldSourceBuffer : undefined|ICustomSourceBuffer|SourceBuffer;

  const isNative = shouldHaveNativeSourceBuffer(bufferType);
  if (isNative) {
    // TODO 2Smart4TypeScript here. Find another way.
    oldSourceBuffer = native[bufferType as "audio"|"video"];
    delete native[bufferType as "audio"|"video"];
  }
  else {
    oldSourceBuffer = custom[bufferType];
    delete custom[bufferType];
  }

  if (oldSourceBuffer) {
    try {
      oldSourceBuffer.abort();

      if (isNative) {
        // TODO once again, we outsmart TypeScript here.
        mediaSource.removeSourceBuffer(oldSourceBuffer as SourceBuffer);
      }

    } catch (e) {
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
