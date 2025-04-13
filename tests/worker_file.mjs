// NOTE: This file is the basis for the alternative worker file used by our
// integration tests when interaction is needed.
//
// It has to be built before running integration tests.

import RxPlayerWorker from "../dist/es2017/importable_worker";
import { DASH } from "../dist/es2017/experimental/features/worker/index";

RxPlayerWorker.addFeatures([DASH]);

const rxPlayerWorker = new RxPlayerWorker();

/**
 * Value that may be sent by the main thread to affect the
 * `bitrate-limiting-representation-filter` `representationFilter`.
 */
let bitrateLimitation = null;

let fakeManifest = null;

// Some simple event system so we're able to test it
rxPlayerWorker.addMessageListener("ping", (value) => {
  rxPlayerWorker.sendMessage("pong", value);
});

// Listen for new bitrate limit for the
// `bitrate-limiting-representation-filter` `representationFilter`.
rxPlayerWorker.addMessageListener("limit-bitrate", (value) => {
  bitrateLimitation = value;
});

// Listen for new manifest for the
// `fake-manifest-manifest-loader` `manifestLoader`.
rxPlayerWorker.addMessageListener("fake-manifest", (value) => {
  fakeManifest = value;
});

// `default-segment-loader`: send back metrics and run regular logic
rxPlayerWorker.registerSegmentLoader("default-segment-loader", (value, cbs) => {
  rxPlayerWorker.sendMessage("segment-loader", value);
  cbs.fallback();
});

// `default-manifest-loader`: send back metrics and run regular logic
rxPlayerWorker.registerManifestLoader("default-manifest-loader", (value, cbs) => {
  rxPlayerWorker.sendMessage("manifest-loader", value);
  cbs.fallback();
});

// `bitrate-limiting-representation-filter` - Filter Representation based on
// received `bitrateLimitation` values
rxPlayerWorker.registerRepresentationFilter(
  "bitrate-limiting-representation-filter",
  (representation, context) => {
    rxPlayerWorker.sendMessage("representation-filter", { representation, context });
    if (bitrateLimitation === null) {
      return true;
    }
    return representation.bitrate < bitrateLimitation;
  },
);

// `hanging-segment-loader`: send back metrics and never respond to the RxPlayer
rxPlayerWorker.registerSegmentLoader("hanging-segment-loader", (value) => {
  rxPlayerWorker.sendMessage("segment-loader", value);
});

// `hanging-manifest-loader`: send back metrics and never respond to the RxPlayer
rxPlayerWorker.registerManifestLoader("hanging-manifest-loader", (value) => {
  rxPlayerWorker.sendMessage("manifest-loader", value);
});

// `fake-manifest-manifest-loader`: send back a hardcoded manifest
rxPlayerWorker.registerManifestLoader(
  "fake-manifest-manifest-loader",
  (value, callbacks) => {
    rxPlayerWorker.sendMessage("manifest-loader", value);
    callbacks.resolve({ data: fakeManifest });
  },
);

// `xhr-manifest-loader`: actually re-implement a manifest loader
rxPlayerWorker.registerManifestLoader("xhr-manifest-loader", (value, callbacks) => {
  rxPlayerWorker.sendMessage("xhr-manifest-loader", value);
  const xhr = new XMLHttpRequest();
  const sendingTime = Date.now();

  xhr.onload = (r) => {
    if (200 <= xhr.status && xhr.status < 300) {
      const duration = Date.now() - sendingTime;
      const size = r.total;
      const data = xhr.response;
      callbacks.resolve({ duration, size, data });
    } else {
      const err = new Error("didn't work");
      err.xhr = xhr;
      callbacks.reject(err);
    }
  };

  xhr.onerror = () => {
    const err = new Error("didn't work");
    err.xhr = xhr;
    callbacks.reject(err);
  };

  xhr.open("GET", value.url);
  xhr.responseType = "text";

  xhr.send();

  return () => {
    xhr.abort();
  };
});
