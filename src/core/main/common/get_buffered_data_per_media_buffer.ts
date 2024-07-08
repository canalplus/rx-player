import type { ITextDisplayer } from "../../../main_thread/types";
import type { IMediaSourceInterface } from "../../../mse";
import { SourceBufferType } from "../../../mse";
import type { ITrackType } from "../../../public_types";
import arrayFind from "../../../utils/array_find";
import type { IRange } from "../../../utils/ranges";

/**
 * Returns a JS object where keys are the type of buffers (e.g. "audio",
 * "video", "text") and values are the corresponding range of buffered
 * data according to the given `IMediaSourceInterface` (or `null` if not
 * known / nothing is buffered).
 * @param {Object|null} mediaSourceInterface
 * @param {Object|null} textDisplayer
 * @returns {Object}
 */
export default function getBufferedDataPerMediaBuffer(
  mediaSourceInterface: IMediaSourceInterface | null,
  textDisplayer: ITextDisplayer | null,
): Record<ITrackType, IRange[] | null> {
  const buffered: Record<ITrackType, IRange[] | null> = {
    audio: null,
    video: null,
    text: null,
  };
  if (textDisplayer !== null) {
    buffered.text = textDisplayer.getBufferedRanges();
  }
  if (mediaSourceInterface === null) {
    return buffered;
  }
  const audioBuffer = arrayFind(
    mediaSourceInterface.sourceBuffers,
    (s) => s.type === SourceBufferType.Audio,
  );
  const videoBuffer = arrayFind(
    mediaSourceInterface.sourceBuffers,
    (s) => s.type === SourceBufferType.Video,
  );
  const audioBuffered = audioBuffer?.getBuffered();
  if (audioBuffered !== undefined) {
    buffered.audio = audioBuffered;
  }
  const videoBuffered = videoBuffer?.getBuffered();
  if (videoBuffered !== undefined) {
    buffered.video = videoBuffered;
  }
  return buffered;
}
