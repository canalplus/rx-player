---
id: plugins
title: Plugins
sidebar_label: Plugins
slug: plugins
---

## Overview

To allow the player to be extended, a system of "plugins" has been added.

Those plugins are often under the form of functions passed as an argument to the
`loadVideo` API call.

## segmentLoader

The segmentLoader is a function that can be included in the `transportOptions`
of the `loadVideo` API call.

A segmentLoader allows to define a custom audio/video segment loader (it might
on the future work for other types of segments, so always check the type if you
only want those two).

The segment loader is the part performing the segment request. One usecase where
you might want to set your own segment loader is to integrate Peer-to-Peer
segment downloading through the player.

To give a complete example, here is a segment loader which uses an XHR (it has
no use, as our implementation does the same thing and more):

```js
/**
 * @param {Object} infos - infos about the segment to download
 * @param {string} infos.url - the url the segment request should normally be on
 * @param {Object} infos.adaptation - the Adaptation containing the segment.
 * More information on its structure can be found on the documentation linked
 * below [1]
 * @param {Object} infos.representation - the Representation containing the
 * segment.
 * More information on its structure can be found on the documentation linked
 * below [2]
 * @param {Object} infos.segment - the segment itself
 * More information on its structure can be found on the documentation linked
 * below [3]

 * @param {Object} callbacks
 * @param {Function} callbacks.resolve - Callback to call when the request is
 * finished with success. It should be called with an object with at least 3
 * properties:
 *   - data {ArrayBuffer} - the segment data
 *   - duration {Number|undefined} - the duration of the request, in
 *     milliseconds.
 *   - size {Number|undefined} - size, in bytes, of the total downloaded
 *     response.
 * @param {Function} callbacks.progress - Callback to call when progress
 * information is available on the current request. This callback allows to
 * improve our adaptive streaming logic by better predicting the bandwidth
 * before the request is finished.
 * This function should be called with the following properties:
 *   - duration {Number} - the duration since the beginning of the request
 *   - size {Number} - the current size, in bytes, downloaded
 *   - totalSize {Number|undefined} - the whole size of the wanted data, in
 *     bytes. Can be let to undefined when not known.
 * our default implementation instead for this segment. No argument is needed.
 * @param {Function} callbacks.reject - Callback to call when an error is
 * encountered. If you relied on an XHR, it is recommended to include it as an
 * object property named "xhr" in the argument.
 * @param {Function} callbacks.fallback - Callback to call if you want to call
 * our default implementation instead for this segment. No argument is needed.

 * @returns {Function|undefined} - If a function is defined in the return value,
 * it will be called if and when the request is canceled.
 */
const customSegmentLoader = (infos, callbacks) => {
  // we will only use this custom loader for videos segments.
  if (infos.adaptation.type !== "video") {
    callbacks.fallback();
    return;
  }

  const xhr = new XMLHttpRequest();
  const sendingTime = performance.now();

  xhr.onload = function onXHRLoaded(r) {
    if (200 <= xhr.status && xhr.status < 300) {
      const duration = performance.now() - sendingTime;
      const size = r.total;
      const data = xhr.response;
      callbacks.resolve({ duration, size, data });
    } else {
      const err = new Error("didn't work");
      err.xhr = xhr;
      callbacks.reject(err);
    }
  };

  xhr.onprogress = function onXHRProgress(event) {
    const currentTime = performance.now();
    callbacks.progress({
      type: "progress",
      value: {
        duration: currentTime - sendingTime,
        size: event.loaded,
        totalSize: event.total,
      },
    });
  };

  xhr.onerror = function onXHRError() {
    const err = new Error("didn't work");
    err.xhr = xhr;
    callbacks.reject(err);
  };

  xhr.open("GET", infos.url);
  xhr.responseType = "arraybuffer";

  const range = infos.segment.range;
  if (range) {
    if (range[1] && range[1] !== Infinity) {
      xhr.setRequestHeader("Range", `bytes=${range[0]}-${range[1]}`);
    } else {
      xhr.setRequestHeader("Range", `bytes=${range[0]}-`);
    }
  }

  xhr.send();

  return () => {
    xhr.abort();
  };
};
```

[1] [Adaptation structure](../additional_ressources/manifest.md#adaptation)

[2] [Representation structure](../additional_ressources/manifest.md#representation)

[3] [Segment structure](../additional_ressources/manifest.md#segment)

## manifestLoader

The manifestLoader is a function that can be included in the
`transportOptions` of the `loadVideo` API call.

A manifestLoader allows to define a custom [Manifest](../glossary.md#manifest)
loader.

The Manifest loader is the part performing the Manifest request.

Here is a Manifest loader which uses an XHR (it has no use, as our
implementation does the same thing and more):

```js
/**
 * @param {string|undefined} url - the url the Manifest request should normally
 * be on.
 * Can be undefined in very specific conditions, like in cases when the
 * `loadVideo` call had no defined URL (e.g. "local" manifest, playing a locally
 * crafted "Metaplaylist" content).
 * @param {Object} callbacks
 * @param {Function} callbacks.resolve - Callback to call when the request is
 * finished with success. It should be called with an object with at least 3
 * properties:
 *   - data {*} - the Manifest data
 *   - duration {Number|undefined} - the duration of the request, in
 *     milliseconds.
 *   - size {Number|undefined} - size, in bytes, of the total downloaded
 *     response.
 *   - url {string|undefined} - url of the Manifest (post redirection if one).
 *   - sendingTime {number|undefined} - Time at which the manifest request was
 *     done as a unix timestamp in milliseconds.
 *   - receivingTime {number|undefined} - Time at which the manifest request was
 *     finished as a unix timestamp in milliseconds.
 * @param {Function} callbacks.reject - Callback to call when an error is
 * encountered. If you relied on an XHR, it is recommended to include it as an
 * object property named "xhr" in the argument.
 * @param {Function} callbacks.fallback - Callback to call if you want to call
 * our default implementation instead for this segment. No argument is needed.

 * @returns {Function|undefined} - If a function is defined in the return value,
 * it will be called if and when the request is canceled.
 */
const customManifestLoader = (url, callbacks) => {
  const xhr = new XMLHttpRequest();
  const baseTime = performance.now();

  xhr.onload = (r) => {
    if (200 <= xhr.status && xhr.status < 300) {
      const duration = performance.now() - baseTime;

      const now = Date.now();
      const receivingTime = now;

      // Note: We could have calculated `sendingTime` before the request, but
      // that date would be wrong if the user updated the clock while the
      // request was pending.
      // `performance.now` doesn't depend on the user's clock. It is thus a
      // better candidate here.
      // This is why we re-calculate the sendingTime a posteriori, we are now
      // sure to be aligned with the current clock.
      const sendingTime = now - duration;

      // the request could have been redirected,
      // we have to feed back the real URL
      const _url = xhr.responseURL || url;

      const size = r.total;
      const data = xhr.response;
      callbacks.resolve({
        url: _url,
        sendingTime,
        receivingTime,
        duration,
        size,
        data,
      });
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

  xhr.open("GET", url);
  xhr.responseType = "document";

  xhr.send();

  return () => {
    xhr.abort();
  };
};
```

## representationFilter

The representationFilter is a function that can be included in the
`transportOptions` of the `loadVideo` API call.

A representationFilter allows you to filter out
[Representations](../glossary.md#representation) (i.e. media qualities) based on
its attributes.

The representationFilter will be called each time we load a
[Manifest](../glossary.md#manifest) with two arguments:

- representation `{Representation}`: The concerned `Representation`.
  A `Representation` structure's is described [in the Manifest structure
  documentation](../additional_ressources/manifest.md#representation).

- representationInfos `{Object}`: Basic information about this
  `Representation`. Contains the following keys:

  - bufferType `{string}`: The concerned type of buffer. Can be
    `"video"`, `"audio"`, `"text"` (for subtitles) or `"image"`
    (for thumbnail).

  - language `{string|undefined}`: The language the `Representation`
    is in, as announced by the Manifest.

  - normalizedLanguage `{string|undefined}`: An attempt to translate the
    language into an ISO 639-3 code.
    If the translation attempt fails (no corresponding ISO 639-3 language
    code is found), it will equal the value of `language`

  - isClosedCaption `{Boolean|undefined}`: If true, the `Representation`
    links to subtitles with added hints for the hard of hearing.

  - isAudioDescription `{Boolean|undefined}`: If true, the
    `Representation` links to an audio track with added commentary for
    the visually impaired.

  - isDub `{Boolean|undefined}`): If set to `true`, this audio track is a
    "dub", meaning it was recorded in another language than the original.
    If set to `false`, we know that this audio track is in an original
    language.
    This property is `undefined` if we do not known whether it is in an
    original language.

This function should then returns `true` if the `Representation` should be
kept or `false` if it should be removed.

For example, here is a `representationFilter` that removes video
`Representation`s with a video resolution higher than HD (1920x1080):

```js
/**
 * @param {Object} representation - The Representation object, as defined in
 * the documentation linked bellow [1]
 * @param {Object} infos - supplementary information about the given
 * Representation.
 * @returns {boolean}
 */
function representationFilter(representation, infos) {
  if (infos.bufferType === "video") {
    // If video representation, allows only those for which the height and width
    // is known to be below our 1920x1080 limit
    const { width, height } = representation;
    return width != null && height != null && width <= 1920 && height <= 1080;
  }

  // Otherwise, allow all non-video representations
  return true;
}
```

[1] [Representation structure](../additional_ressources/manifest.md#representation)
