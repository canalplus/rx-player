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

import { IParsedAdaptationType } from "../types";

const VIDEO_CODEC_REGEXP = /^((avc)|(hev)|(hvc)|(vp0?[89])|(av1$))/;

const AUDIO_CODEC_REGEXP = /^((vorbis$)|(opus)|(mp4a)|(flac$)|([ae]c-3))/;

const TEXT_CODEC_REGEXP = /^((w?vtt)|stpp)/;

export default function categorizeCodecs(
  codecs: string,
): Partial<Record<IParsedAdaptationType, string>> {
  const codecsArr = codecs.split(",");
  const result: Partial<Record<IParsedAdaptationType, string>> = {};
  for (let i = 0; i < codecsArr.length; i++) {
    const codec = codecsArr[i];
    if (VIDEO_CODEC_REGEXP.test(codec)) {
      result.video = result.video === undefined ? codec : result.video + "," + codec;
    } else if (AUDIO_CODEC_REGEXP.test(codec)) {
      result.audio = result.audio === undefined ? codec : result.audio + "," + codec;
    } else if (TEXT_CODEC_REGEXP.test(codec)) {
      result.text = result.text === undefined ? codec : result.text + "," + codec;
    }
  }
  return result;
}
