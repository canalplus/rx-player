import { formatError } from "../errors";
import errorMessage from "../errors/error_message";
import { getPeriodForTime } from "../manifest";
import type { IThumbnailRenderingOptions } from "../public_types";
import type { IThumbnailResponse } from "../transports";
import arrayFind from "../utils/array_find";
import TaskCanceller from "../utils/task_canceller";
import type { IPublicApiContentInfos } from "./api/public_api";

/**
 * Render thumbnail available at `time` in the given `container` (in place of
 * a potential previously-rendered thumbnail in that container).
 *
 * If there is no thumbnail at this time, or if there is but it fails to
 * load/render, also removes the previously displayed thumbnail, unless
 * `options.keepPreviousThumbnailOnError` is set to `true`.
 *
 * Returns a Promise which resolves when the thumbnail is rendered successfully,
 * rejects if anything prevented a thumbnail to be rendered.
 *
 * A newer `renderThumbnail` call performed while a previous `renderThumbnail`
 * call on the same container did not yet finish will abort that previous call,
 * rejecting the old call's returned promise.
 *
 * You may know if the promise returned by `renderThumbnail` rejected due to it
 * being aborted, by checking the `code` property on the rejected error: Error
 * due to aborting have their `code` property set to `ABORTED`.
 *
 * @param {Object} contentInfos
 * @param {Object} options
 * @returns {Object}
 */
export default async function renderThumbnail(
  contentInfos: IPublicApiContentInfos | null,
  options: IThumbnailRenderingOptions,
): Promise<void> {
  const { time, container } = options;
  if (
    contentInfos === null ||
    contentInfos.fetchThumbnailDataCallback === null ||
    contentInfos.manifest === null
  ) {
    return Promise.reject(
      new ThumbnailRenderingError(
        "NO_CONTENT",
        "Cannot get thumbnail: no content loaded",
      ),
    );
  }

  const { thumbnailRequestsInfo, currentContentCanceller } = contentInfos;
  const canceller = new TaskCanceller();
  canceller.linkToSignal(currentContentCanceller.signal);

  let imageUrl: string | undefined;

  const olderTaskSameContainer = thumbnailRequestsInfo.pendingRequests.get(container);
  olderTaskSameContainer?.cancel();

  thumbnailRequestsInfo.pendingRequests.set(container, canceller);

  const onFinished = () => {
    canceller.cancel();
    thumbnailRequestsInfo.pendingRequests.delete(container);

    // Let's revoke the URL after a round-trip to the event loop just in case
    // to prevent revoking before the browser use it.
    // This is normally not necessary, but better safe than sorry.
    setTimeout(() => {
      if (imageUrl !== undefined) {
        URL.revokeObjectURL(imageUrl);
      }
    }, 0);
  };

  try {
    const period = getPeriodForTime(contentInfos.manifest, time);
    if (period === undefined) {
      throw new ThumbnailRenderingError("NO_THUMBNAIL", "Wanted Period not found.");
    }
    const thumbnailTracks = period.thumbnailTracks;
    const thumbnailTrack =
      options.thumbnailTrackId !== undefined
        ? arrayFind(thumbnailTracks, (t) => t.id === options.thumbnailTrackId)
        : thumbnailTracks[0];
    if (thumbnailTrack === undefined) {
      if (options.thumbnailTrackId !== undefined) {
        throw new ThumbnailRenderingError(
          "NO_THUMBNAIL",
          "Given `thumbnailTrackId` not found",
        );
      } else {
        throw new ThumbnailRenderingError(
          "NO_THUMBNAIL",
          "Wanted Period has no thumbnail track.",
        );
      }
    }

    const { lastResponse } = thumbnailRequestsInfo;
    let res: IThumbnailResponse | undefined;
    if (
      lastResponse !== null &&
      lastResponse.thumbnailTrackId === thumbnailTrack.id &&
      lastResponse.periodId === period.id
    ) {
      const previousThumbs = lastResponse.response.thumbnails;
      if (
        previousThumbs.length > 0 &&
        time >= previousThumbs[0].start &&
        time < previousThumbs[previousThumbs.length - 1].end
      ) {
        res = lastResponse.response;
      }
    }

    if (res === undefined) {
      res = await contentInfos.fetchThumbnailDataCallback(
        period.id,
        thumbnailTrack.id,
        time,
      );
      thumbnailRequestsInfo.lastResponse = {
        response: res,
        periodId: period.id,
        thumbnailTrackId: thumbnailTrack.id,
      };
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new ThumbnailRenderingError(
        "RENDERING",
        "Cannot display thumbnail: cannot create canvas context",
      );
    }
    let foundIdx: number | undefined;
    for (let i = 0; i < res.thumbnails.length; i++) {
      if (res.thumbnails[i].start <= time && res.thumbnails[i].end > time) {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx === undefined) {
      throw new Error("Cannot display thumbnail: time not found in fetched data");
    }
    const image = new Image();
    const blob = new Blob([res.data], { type: res.mimeType });
    imageUrl = URL.createObjectURL(blob);
    image.src = imageUrl;
    canvas.height = res.thumbnails[foundIdx].height;
    canvas.width = res.thumbnails[foundIdx].width;
    return new Promise((resolve, reject) => {
      image.onload = () => {
        try {
          context.drawImage(
            image,
            res.thumbnails[foundIdx].offsetX,
            res.thumbnails[foundIdx].offsetY,
            res.thumbnails[foundIdx].width,
            res.thumbnails[foundIdx].height,
            0,
            0,
            res.thumbnails[foundIdx].width,
            res.thumbnails[foundIdx].height,
          );
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          canvas.className = "__rx-thumbnail__";
          clearPreviousThumbnails();
          container.appendChild(canvas);
          resolve();
        } catch (srcError) {
          reject(
            new ThumbnailRenderingError(
              "RENDERING",
              "Could not draw the image in a canvas",
            ),
          );
        }
        onFinished();
      };

      image.onerror = () => {
        if (options.keepPreviousThumbnailOnError !== true) {
          clearPreviousThumbnails();
        }
        reject(
          new ThumbnailRenderingError(
            "RENDERING",
            "Could not load the corresponding image in the DOM",
          ),
        );
        onFinished();
      };
    });
  } catch (srcError) {
    if (options.keepPreviousThumbnailOnError !== true) {
      clearPreviousThumbnails();
    }
    if (srcError !== null && srcError === canceller.signal.cancellationError) {
      const error = new ThumbnailRenderingError(
        "ABORTED",
        "Thumbnail rendering has been aborted",
      );
      throw error;
    }
    const formattedErr = formatError(srcError, {
      defaultCode: "NONE",
      defaultReason: "Unknown error",
    });

    let returnedError;
    if (formattedErr.type === "NETWORK_ERROR") {
      returnedError = new ThumbnailRenderingError("LOADING", formattedErr.message);
    } else {
      returnedError = new ThumbnailRenderingError("NOT_FOUND", formattedErr.message);
    }
    onFinished();
    throw returnedError;
  }

  function clearPreviousThumbnails() {
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];
      if (child.className === "__rx-thumbnail__") {
        container.removeChild(child);
      }
    }
  }
}

/**
 * Error specifcically defined for the thumbnail rendering API.
 * A caller is then supposed to programatically classify the type of error
 * by checking the `code` property from such an error.
 * @class ThumbnailRenderingError
 */
class ThumbnailRenderingError extends Error {
  public readonly name: "ThumbnailRenderingError";
  public readonly code: string;

  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code: string, message: string) {
    super(errorMessage(code, message));
    Object.setPrototypeOf(this, ThumbnailRenderingError.prototype);
    this.name = "ThumbnailRenderingError";
    this.code = code;
  }
}
