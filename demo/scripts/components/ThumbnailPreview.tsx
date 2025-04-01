import * as React from "react";
import useModuleState from "../lib/useModuleState";
import { IPlayerModule } from "../modules/player";
import { IThumbnailTrackInfo } from "../../../src/public_types";

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
}): React.JSX.Element {
  const videoThumbnailLoader = useModuleState(player, "videoThumbnailLoader");
  const videoElement = useModuleState(player, "videoThumbnailsElement");
  const parentElementRef = React.useRef<HTMLDivElement>(null);
  const imageThumbnailRef = React.useRef<HTMLDivElement>(null);
  const [shouldDisplaySpinner, setShouldDisplaySpinner] = React.useState(true);
  const ceiledTime = Math.ceil(time);

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
  }, [videoElement, showVideoThumbnail, parentElementRef]);

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

    // load thumbnail after a  timer to avoid doing too many requests when the
    // user quickly moves its pointer or whatever is calling this
    loadThumbnailTimeout = window.setTimeout(() => {
      loadThumbnailTimeout = null;

      // There's two available ways of displaying thumbnails
      //
      // 1.   Through what's called a "trickmode track", which is a video track
      //      only containing intra-frames. Such thumbnails are shown through a
      //      video tag thanks the the `VideoThumbnailLoader` tool
      //
      // 2.   Through an especially-purposed "thumbnail track" in a Manifest
      //      which usually is based on tiles of jpg/png images. Those are loadd
      //      through specific RxPlayer method.
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
        const metadata = player.actions.getAvailableThumbnailTracks(ceiledTime);
        const thumbnailTrack = metadata.reduce((acc: IThumbnailTrackInfo | null, t) => {
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
        if (thumbnailTrack === null || imageThumbnailRef.current === null) {
          hideSpinner();
          return;
        }
        player.actions
          .renderThumbnail(imageThumbnailRef.current, ceiledTime, thumbnailTrack.id)
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
      }, 100);
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
      <div style={{ position: "absolute" }} ref={imageThumbnailRef} />
      {shouldDisplaySpinner ? (
        <div style={DIV_SPINNER_STYLE}>
          <img src="./assets/spinner.gif" style={IMG_SPINNER_STYLE} />
        </div>
      ) : null}
    </div>
  );
}
