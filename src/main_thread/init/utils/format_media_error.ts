import { MediaError as RxPlayerMediaError } from "../../../errors/index.ts";
import isNullOrUndefined from "../../../utils/is_null_or_undefined.ts";

/**
 * Format a `MediaError` as linked to an `HMTLMediaElement` into the
 * corresponding RxPlayer's `MediaError`.
 * @param {MediaError|null} mediaError - The media error currently linked to
 * the media element.
 * @returns {Object} - RxPlayer's `MediaError` instance corresponding to this
 * error.
 */
export default function formatMediaError(
  mediaError: MediaError | null,
): RxPlayerMediaError {
  let errorCode: number | undefined;
  let errorMessage: string | undefined;
  if (!isNullOrUndefined(mediaError)) {
    errorCode = mediaError.code;
    errorMessage = mediaError.message;
  }

  switch (errorCode) {
    case 1:
      errorMessage =
        errorMessage ??
        "The fetching of the associated resource was aborted by the user's request.";
      return new RxPlayerMediaError("MEDIA_ERR_ABORTED", errorMessage);
    case 2:
      errorMessage =
        errorMessage ??
        "A network error occurred which prevented the media from being " +
          "successfully fetched";
      return new RxPlayerMediaError("MEDIA_ERR_NETWORK", errorMessage);
    case 3:
      errorMessage =
        errorMessage ?? "An error occurred while trying to decode the media resource";
      return new RxPlayerMediaError("MEDIA_ERR_DECODE", errorMessage);
    case 4:
      errorMessage =
        errorMessage ?? "The media resource has been found to be unsuitable.";
      return new RxPlayerMediaError("MEDIA_ERR_SRC_NOT_SUPPORTED", errorMessage);
    default:
      errorMessage =
        errorMessage ?? "The HTMLMediaElement errored due to an unknown reason.";
      return new RxPlayerMediaError("MEDIA_ERR_UNKNOWN", errorMessage);
  }
}
