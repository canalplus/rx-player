import config from "../../../config.ts";
import { CustomLoaderError } from "../../../errors/internal/index.ts";
import { NetworkErrorTypes } from "../../../errors/public_api/index.ts";
import log from "../../../log.ts";
import { RequestError } from "../../../utils/request/index.ts";

/** Read the raw Retry-After value carried by an HTTP 429 error, if any. */
function getRetryAfter(error: unknown): string | null {
  if (
    error instanceof RequestError &&
    error.type === NetworkErrorTypes.ERROR_HTTP_CODE &&
    error.status === 429
  ) {
    return error.retryAfter ?? null;
  }

  if (!(error instanceof CustomLoaderError)) {
    return null;
  }

  const { xhr } = error;
  if (xhr?.status !== 429) {
    return null;
  }

  // The XHR here comes from a user-supplied custom loader (CustomLoaderError.xhr):
  // it is not the native XMLHttpRequest built by our own request utils, so it may
  // be a polyfill, a monkey-patched object, or a XHR-like object whose
  // getResponseHeader can throw. The native XHR path in our fetch/xhr utils does
  // not need this guard.
  try {
    return xhr.getResponseHeader("Retry-After");
  } catch {
    log.debug("utils", "Could not read Retry-After header from custom loader XHR.");
    return null;
  }
}

/** Parse a Retry-After delay-seconds value into milliseconds. */
function parseRetryAfter(retryAfter: string): number | undefined {
  const trimmedRetryAfter = retryAfter.trim();
  if (!/^\d+$/.test(trimmedRetryAfter)) {
    return undefined;
  }

  const delaySeconds = Number(trimmedRetryAfter);
  return Number.isFinite(delaySeconds) ? delaySeconds * 1000 : undefined;
}

/**
 * Adjust a fallback retry delay according to the Retry-After field from an
 * HTTP 429 error. Returns the fallback delay when the field is absent or
 * invalid.
 */
export default function getRetryDelayWithRetryAfter(
  error: unknown,
  fallbackDelay: number,
): number {
  const retryAfter = getRetryAfter(error);
  if (retryAfter === null) {
    return fallbackDelay;
  }

  const retryAfterDelay = parseRetryAfter(retryAfter);
  if (retryAfterDelay === undefined) {
    log.debug("utils", "Ignoring invalid Retry-After header.", {
      retryAfter,
      selectedDelay: fallbackDelay,
    });
    return fallbackDelay;
  }

  const { MAX_RETRY_AFTER_DELAY } = config.getCurrent();
  const cappedRetryAfterDelay = Math.min(retryAfterDelay, MAX_RETRY_AFTER_DELAY);
  const selectedDelay = Math.max(fallbackDelay, cappedRetryAfterDelay);
  if (cappedRetryAfterDelay < retryAfterDelay) {
    log.warn("utils", "Capping Retry-After delay.", {
      retryAfter,
      maximumRetryAfterDelay: MAX_RETRY_AFTER_DELAY,
      selectedDelay,
    });
  } else {
    log.debug("utils", "Applying Retry-After delay.", {
      retryAfter,
      selectedDelay,
    });
  }

  return selectedDelay;
}
