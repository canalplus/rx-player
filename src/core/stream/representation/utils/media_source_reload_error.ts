/**
 * Error thrown when the current MediaSource needs to be recreated before
 * buffering can continue safely.
 */
export default class MediaSourceReloadError extends Error {
  public readonly name: "MediaSourceReloadError";

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MediaSourceReloadError.prototype);
    this.name = "MediaSourceReloadError";
  }
}
