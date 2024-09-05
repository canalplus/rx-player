/**
 * Add the given callback as an event listener of any "fullscreenchange" event.
 * @param {Function} listener
 */
export function addFullscreenListener(listener: () => void): void {
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
export function removeFullscreenListener(listener: () => void): void {
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
export function isFullscreen(): boolean {
  return !!(
    (
      document.fullscreenElement ||
      /* eslint-disable */
      (document as any).mozFullScreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    )
    /* eslint-enable */
  );
}

/**
 * Request fullScreen action on a given element.
 * @param {HTMLElement} elt
 */
export function requestFullscreen(elt: HTMLElement): void {
  if (!isFullscreen()) {
    /* eslint-disable */
    if (elt.requestFullscreen) {
      elt.requestFullscreen();
    } else if ((elt as any).msRequestFullscreen) {
      (elt as any).msRequestFullscreen();
    } else if ((elt as any).mozRequestFullScreen) {
      (elt as any).mozRequestFullScreen();
    } else if ((elt as any).webkitRequestFullscreen) {
      // TODO Open issue in TypeScript?
      (elt as any).webkitRequestFullscreen((Element as any).ALLOW_KEYBOARD_INPUT);
    }
    /* eslint-enable */
  }
}

/**
 * Exit fullscreen if an element is currently in fullscreen.
 * TODO this exit fullscreen mode even if any element in the document is in
 * fullscreen, is it really what we want?
 */
export function exitFullscreen() {
  if (isFullscreen()) {
    /* eslint-disable */
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }
    /* eslint-enable */
  }
}
