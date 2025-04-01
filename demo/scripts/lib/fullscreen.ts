const doc: Document & {
  mozFullScreenElement?: typeof document.fullscreenElement | null | undefined;
  webkitFullscreenElement?: typeof document.fullscreenElement | null | undefined;
  msFullscreenElement?: typeof document.fullscreenElement | null | undefined;
  mozCancelFullScreen?: typeof document.exitFullscreen | null | undefined;
  webkitExitFullscreen?: typeof document.exitFullscreen | null | undefined;
  msExitFullscreen?: typeof document.exitFullscreen | null | undefined;
} = document;

type ICompatHTMLElement = HTMLElement & {
  msRequestFullscreen?: typeof HTMLElement.prototype.requestFullscreen | null | undefined;
  mozRequestFullScreen?:
    | typeof HTMLElement.prototype.requestFullscreen
    | null
    | undefined;
  webkitRequestFullscreen?:
    | ((x: unknown) => Promise<unknown> | undefined | null)
    | null
    | undefined;
};

/**
 * Add the given callback as an event listener of any "fullscreenchange" event.
 * @param {Function} listener
 */
export function addFullscreenListener(listener: () => void): void {
  doc.addEventListener("webkitfullscreenchange", listener, false);
  doc.addEventListener("mozfullscreenchange", listener, false);
  doc.addEventListener("fullscreenchange", listener, false);
  doc.addEventListener("MSFullscreenChange", listener, false);
}

/**
 * Remove the given callback from event listeners of any "fullscreenchange"
 * event.
 * @param {Function} listener
 */
export function removeFullscreenListener(listener: () => void): void {
  doc.removeEventListener("webkitfullscreenchange", listener, false);
  doc.removeEventListener("mozfullscreenchange", listener, false);
  doc.removeEventListener("fullscreenchange", listener, false);
  doc.removeEventListener("MSFullscreenChange", listener, false);
}

/**
 * Returns true if an element in the document is being displayed in fullscreen
 * mode;
 * otherwise it's false.
 * @returns {boolean}
 */
export function isFullscreen(): boolean {
  return !!(
    doc.fullscreenElement ||
    doc.mozFullScreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Request fullScreen action on a given element.
 * @param {HTMLElement} elt
 */
export function requestFullscreen(elt: ICompatHTMLElement): void {
  if (!isFullscreen()) {
    let prom;
    if (elt.requestFullscreen) {
      prom = elt.requestFullscreen();
    } else if (elt.msRequestFullscreen) {
      prom = elt.msRequestFullscreen();
    } else if (elt.mozRequestFullScreen) {
      prom = elt.mozRequestFullScreen();
    } else if (elt.webkitRequestFullscreen) {
      // TODO Open issue in TypeScript?
      prom = elt.webkitRequestFullscreen(
        (
          Element as typeof Element & {
            ALLOW_KEYBOARD_INPUT?: unknown;
          }
        ).ALLOW_KEYBOARD_INPUT,
      );
    }
    if (prom && typeof prom.catch === "function") {
      prom.catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to go into fullscreen:", err);
      });
    }
  }
}

/**
 * Exit fullscreen if an element is currently in fullscreen.
 * TODO this exit fullscreen mode even if any element in the document is in
 * fullscreen, is it really what we want?
 */
export function exitFullscreen() {
  if (isFullscreen()) {
    let prom;
    if (doc.exitFullscreen) {
      prom = doc.exitFullscreen();
    } else if (doc.msExitFullscreen) {
      prom = doc.msExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      prom = doc.mozCancelFullScreen();
    } else if (doc.webkitExitFullscreen) {
      prom = doc.webkitExitFullscreen();
    }
    if (prom && typeof prom.catch === "function") {
      prom.catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to go into fullscreen:", err);
      });
    }
  }
}
