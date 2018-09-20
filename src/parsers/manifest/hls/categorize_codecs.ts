import type { IParsedAdaptationType } from "../types";

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
