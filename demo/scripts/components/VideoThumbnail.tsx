import * as React from "react";
import useModuleState from "../lib/useModuleState";
import { IPlayerModule } from "../modules/player";

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

export default function VideoThumbnail({
  xPosition,
  time,
  player,
}: {
  player: IPlayerModule;
  xPosition: number | null;
  time: number;
}): JSX.Element {
  const videoThumbnailLoader = useModuleState(player, "videoThumbnailLoader");
  const videoElement = useModuleState(player, "videoThumbnailsElement");

  React.useEffect(() => {
    player.actions.attachVideoThumbnailLoader();
    return () => {
      player.actions.dettachVideoThumbnailLoader();
    };
  }, []);

  const elementRef = React.useRef<HTMLDivElement>(null);
  const [shouldDisplaySpinner, setShouldDisplaySpinner] = React.useState(true);
  const roundedTime = Math.round(time);

  // Insert the video element containing the thumbnail when it changes
  React.useEffect(() => {
    if (videoElement !== null && elementRef.current !== null) {
      elementRef.current.appendChild(videoElement);
    }
    return () => {
      if (
        videoElement !== null &&
        elementRef.current !== null &&
        elementRef.current.contains(videoElement)
      ) {
        elementRef.current.removeChild(videoElement);
      }
    };
  }, [videoElement]);

  // Change the thumbnail when a new time is wanted
  React.useEffect(() => {
    let spinnerTimeout: number | null = null;
    let loadThumbnailTimeout: number | null = null;

    if (videoThumbnailLoader === null) {
      return;
    }

    startSpinnerTimeoutIfNotAlreadyStarted();

    if (loadThumbnailTimeout !== null) {
      clearTimeout(loadThumbnailTimeout);
    }

    // load thumbnail after a 40ms timer to avoid doing too many requests
    // when the user quickly moves its pointer or whatever is calling this
    loadThumbnailTimeout = window.setTimeout(() => {
      loadThumbnailTimeout = null;
      videoThumbnailLoader
        .setTime(roundedTime)
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
    }, 40);
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
  }, [roundedTime, videoThumbnailLoader]);

  return (
    <div
      className="thumbnail-wrapper"
      style={xPosition !== null ? { transform: `translate(${xPosition}px, -136px)` } : {}}
      ref={elementRef}
    >
      {shouldDisplaySpinner ? (
        <div style={DIV_SPINNER_STYLE}>
          <img src="./assets/spinner.gif" style={IMG_SPINNER_STYLE} />
        </div>
      ) : null}
    </div>
  );
}
