import arrayFind from "../../../utils/array_find";
/**
 * Returns a JS object where keys are the type of buffers (e.g. "audio",
 * "video", "text") and values are the corresponding range of buffered
 * data according to the given `IMediaSourceInterface` (or `null` if not
 * known / nothing is buffered).
 * @param {Object|null} mediaSourceInterface
 * @param {Object|null} textDisplayer
 * @returns {Object}
 */
export default function getBufferedDataPerMediaBuffer(mediaSourceInterface, textDisplayer) {
    const buffered = {
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
    const audioBuffer = arrayFind(mediaSourceInterface.sourceBuffers, (s) => s.type === "audio" /* SourceBufferType.Audio */);
    const videoBuffer = arrayFind(mediaSourceInterface.sourceBuffers, (s) => s.type === "video" /* SourceBufferType.Video */);
    const audioBuffered = audioBuffer === null || audioBuffer === void 0 ? void 0 : audioBuffer.getBuffered();
    if (audioBuffered !== undefined) {
        buffered.audio = audioBuffered;
    }
    const videoBuffered = videoBuffer === null || videoBuffer === void 0 ? void 0 : videoBuffer.getBuffered();
    if (videoBuffered !== undefined) {
        buffered.video = videoBuffered;
    }
    return buffered;
}
