import * as React from "react";
import useModuleState from "../lib/useModuleState";
import { IPlayerModule } from "../modules/player";
import { IThumbnailMetadata } from "../../../src/public_types";

const DIV_SPINNER_STYLE = {
  backgroundColor: "gray",
  position: "absolute",
  width: "100%",
  height: "100%",
  opacity: "50%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
} as const;

const IMG_SPINNER_STYLE = {
  width: "50%",
  margin: "auto",
} as const;

export default function ThumbnailPreview({
  xPosition,
  time,
  player,
  showVideoThumbnail,
}: {
  player: IPlayerModule;
  xPosition: number | null;
  time: number;
  showVideoThumbnail: boolean;
}): JSX.Element {
  const videoThumbnailLoader = useModuleState(player, "videoThumbnailLoader");
  const videoElement = useModuleState(player, "videoThumbnailsElement");
  const imageThumbnailElement = useModuleState(player, "imageThumbnailContainerElement");
  const parentElementRef = React.useRef<HTMLDivElement>(null);
  const [shouldDisplaySpinner, setShouldDisplaySpinner] = React.useState(true);
  const ceiledTime = Math.ceil(time);

  // Insert the div element containing the image thumbnail
  React.useEffect(() => {
    if (showVideoThumbnail) {
      return;
    }

    if (parentElementRef.current !== null) {
      parentElementRef.current.appendChild(imageThumbnailElement);
    }
    return () => {
      if (
        parentElementRef.current !== null &&
        parentElementRef.current.contains(imageThumbnailElement)
      ) {
        parentElementRef.current.removeChild(imageThumbnailElement);
      }
    };
  }, [showVideoThumbnail]);

  // OR insert the video element containing the thumbnail
  React.useEffect(() => {
    if (!showVideoThumbnail) {
      return;
    }
    if (videoElement !== null && parentElementRef.current !== null) {
      parentElementRef.current.appendChild(videoElement);
    }
    return () => {
      if (
        videoElement !== null &&
        parentElementRef.current !== null &&
        parentElementRef.current.contains(videoElement)
      ) {
        parentElementRef.current.removeChild(videoElement);
      }
    };
  }, [videoElement, showVideoThumbnail]);

  React.useEffect(() => {
    if (!showVideoThumbnail) {
      return;
    }
    player.actions.attachVideoThumbnailLoader();
    return () => {
      player.actions.dettachVideoThumbnailLoader();
    };
  }, [showVideoThumbnail]);

  // Change the thumbnail when a new time is wanted
  React.useEffect(() => {
    let spinnerTimeout: number | null = null;
    let loadThumbnailTimeout: number | null = null;

    startSpinnerTimeoutIfNotAlreadyStarted();

    // load thumbnail after a 40ms timer to avoid doing too many requests
    // when the user quickly moves its pointer or whatever is calling this
    loadThumbnailTimeout = window.setTimeout(() => {
      loadThumbnailTimeout = null;
      if (showVideoThumbnail) {
        if (videoThumbnailLoader === null) {
          return;
        }
        videoThumbnailLoader
          .setTime(ceiledTime)
          .then(hideSpinner)
          .catch((err) => {
            if (
              typeof err === "object" &&
              err !== null &&
              (err as Partial<Record<string, unknown>>).code === "ABORTED"
            ) {
              return;
            } else {
              hideSpinner();

              // eslint-disable-next-line no-console
              console.error("Error while loading thumbnails:", err);
            }
          });
      } else {
        const metadata = player.actions.getThumbnailMetadata(ceiledTime);
        const thumbnailTrack = metadata.reduce((acc: IThumbnailMetadata | null, t) => {
          if (acc === null || acc.height === undefined) {
            return t;
          }
          if (t.height === undefined) {
            return acc;
          }
          if (acc.height > t.height) {
            return t.height > 100 ? t : acc;
          } else {
            return acc.height > 100 ? acc : t;
          }
        }, null);
        if (thumbnailTrack === null) {
          hideSpinner();
          return;
        }
        player.actions
          .renderThumbnail(ceiledTime, thumbnailTrack.id)
          .then(hideSpinner)
          .catch((err) => {
            if (
              typeof err === "object" &&
              err !== null &&
              (err as Partial<Record<string, unknown>>).code === "ABORTED"
            ) {
              return;
            } else {
              hideSpinner();
              // eslint-disable-next-line no-console
              console.warn("Error while loading thumbnails:", err);
            }
          });
      }
    }, 30);

    return () => {
      if (loadThumbnailTimeout !== null) {
        clearTimeout(loadThumbnailTimeout);
      }
      hideSpinner();
    };

    /**
     * Display a spinner after some delay if `stopSpinnerTimeout` hasn't been
     * called since.
     * This function allows to schedule a spinner if the request to display a
     * thumbnail takes too much time.
     */
    function startSpinnerTimeoutIfNotAlreadyStarted() {
      if (spinnerTimeout !== null) {
        return;
      }

      // Wait a little before displaying spinner, to
      // be sure loading takes time
      spinnerTimeout = window.setTimeout(() => {
        spinnerTimeout = null;
        setShouldDisplaySpinner(true);
      }, 150);
    }

    /**
     * Hide the spinner if one is active and stop the last started spinner
     * timeout.
     * Allow to avoid showing a spinner when the thumbnail we were waiting for
     * was succesfully loaded.
     */
    function hideSpinner() {
      if (spinnerTimeout !== null) {
        clearTimeout(spinnerTimeout);
        spinnerTimeout = null;
      }
      setShouldDisplaySpinner(false);
    }
  }, [ceiledTime, videoThumbnailLoader, parentElementRef]);

  return (
    <div
      className="thumbnail-wrapper"
      style={xPosition !== null ? { transform: `translate(${xPosition}px, -136px)` } : {}}
      ref={parentElementRef}
    >
      {shouldDisplaySpinner ? (
        <div style={DIV_SPINNER_STYLE}>
          <img src="./assets/spinner.gif" style={IMG_SPINNER_STYLE} />
        </div>
      ) : null}
    </div>
  );
}
