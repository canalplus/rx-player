import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

/**
 * Add the given callback as an event listener of any "fullscreenchange" event.
 * @param {Function} listener
 */
function addFullscreenListener(listener) {
  document.addEventListener("webkitfullscreenchange", listener, false);
  document.addEventListener("mozfullscreenchange", listener, false);
  document.addEventListener("fullscreenchange", listener, false);
  document.addEventListener("MSFullscreenChange", listener, false);
}

/**
 * Remove the given callback from event listeners of any "fullscreenchange"
 * event.
 * @param {Function} listener
 */
function removeFullscreenListener(listener) {
  document.removeEventListener("webkitfullscreenchange", listener, false);
  document.removeEventListener("mozfullscreenchange", listener, false);
  document.removeEventListener("fullscreenchange", listener, false);
  document.removeEventListener("MSFullscreenChange", listener, false);
}

/**
 * Returns true if an element in the document is being displayed in fullscreen
 * mode;
 * otherwise it's false.
 * @returns {boolean}
 */
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.mozFullScreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Request fullScreen action on a given element.
 * @paras {HTMLElement} elt
 * rs-detect)
 */
function requestFullscreen(elt) {
  if (!isFullscreen()) {
    if (elt.requestFullscreen) {
      elt.requestFullscreen();
    } else if (elt.msRequestFullscreen) {
      elt.msRequestFullscreen();
    } else if (elt.mozRequestFullScreen) {
      elt.mozRequestFullScreen();
    } else if (elt.webkitRequestFullscreen) {
      // TODO Open issue in TypeScript?
      elt.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  }
}

/**
 * Exit fullscreen if an element is currently in fullscreen.
 * TODO this exit fullscreen mode even if any element in the document is in
 * fullscreen, is it really what we want?
 */
function exitFullscreen() {
  if (isFullscreen()) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

/**
 * Simple fullscreen button.
 * Triggers the right callback on click.
 *
 * Needs the following props:
 *   - {Object} player: the player module.
 *   - {HTMLElement} videoElement: the element in fullscreen mode
 *   - {string} [className]: An optional className to add to the
 *     button
 *
 * @param {Object} props
 * @returns {Object}
 */
function FullscreenButton({
  videoElement,
  hasCurrentContent,
  className,
}) {
  const isInitiallyFullscreen = useMemo(() => isFullscreen(), []);
  const [
    isCurrentlyFullScreen,
    setFullscreenValue,
  ] = useState(isInitiallyFullscreen);

  useEffect(() => {
    const fullscreenListener = () => {
      const isInFullscreen = isFullscreen();
      if (!isInFullscreen) {
        videoElement.classList.remove("fullscreen");
      }
      setFullscreenValue(isInFullscreen);
    };

    addFullscreenListener(fullscreenListener);

    return () => {
      removeFullscreenListener(fullscreenListener);
    };
  }, [videoElement]);

  const setFullscreen = useCallback(() => {
    requestFullscreen(videoElement);
    videoElement.classList.add("fullscreen");
  }, [isCurrentlyFullScreen, videoElement]);

  return (
    <Button
      ariaLabel="Go/Quit fullscreen"
      className={"fullscreen-button " + className}
      onClick={isCurrentlyFullScreen ?
        exitFullscreen :
        setFullscreen }
      disabled={!hasCurrentContent}
      value={String.fromCharCode(isCurrentlyFullScreen ? 0xf066 : 0xf065)}
    />
  );
}

export default React.memo(withModulesState({
  player: {
    hasCurrentContent: "hasCurrentContent",
  },
})(FullscreenButton));
