# Plugins

## Overview

To allow the player to be extended, a system of "plugins" has been added.

Those plugins are often under the form of functions passed as an argument to the
`loadVideo` API call.

## segmentLoader

The `segmentLoader` is a function that can be included in the `transportOptions`
of the `loadVideo` API call.

A `segmentLoader` allows to define a custom audio/video segment loader (it might
on the future work for other types of segments, so always check the type if you
only want those two).
The segment loader is the part performing the segment request. One usecase where
you might want to set your own segment loader is to integrate Peer-to-Peer
segment downloading through the player.

Before the complete documentation, let's write an example which will just use
an XMLHttpRequest (it has no use, as our implementation does the same thing and
more):
```js
/**
 * @param {Object} segmentInfo - Information about the segment to download
 * @param {Object} callbacks - Object containing several callbacks to indicate
 * that the segment has been loaded, the loading operation has failed or to
 * fallback to our default implementation. More information on this object below
 * this code example.
 * @returns {Function|undefined} - If a function is defined in the return value,
 * it will be called if and when the request is canceled.
 */
const customSegmentLoader = (segmentInfo, callbacks) => {

  // we will only use this custom loader for videos segments.
  // we will also ignore edge cases where the URL is undefined.
  if (segmentInfo.type !== "video" || segmentInfo.url === undefined) {
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
      callbacks.reject(err);
    }
  };

  xhr.onprogress = function onXHRProgress(event) {
    const currentTime = performance.now();
    callbacks.progress({ type: "progress",
                         value: { duration: currentTime - sendingTime,
                                  size: event.loaded,
                                  totalSize: event.total } });
  };

  xhr.onerror = function onXHRError() {
    const err = new Error("didn't work");
    callbacks.reject(err);
  };

  xhr.open("GET", segmentInfo.url);
  xhr.responseType = "arraybuffer";

  const range = segmentInfo.range;
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

As you can see, this function takes two arguments:

  1. **segmentInfo** (`object`): An Object giving information about the wanted
     segments.  This object contains the following properties:

       - **url** (`string|undefined`): The URL the segment request should
         normally be performed at.

         This property can be `undefined` in a condition where the segment URL
         either doesn't exist or has not been communicated by the Manifest.
         This case is not currently possible but may be in future versions.

       - *isInit* (`boolean|undefined`): If true this segment is an
         initialization segment which contains no decodable data.

         Those types of segment are mainly there for initialization
         purposes, such as giving initial infos to the decoder on
         subsequent media segments that will be pushed.

         Note that if `isInit` is false, it only means that the segment
         contains decodable media, it can also contain important
         initialization information.

         If `undefined`, we could not determine whether this segment was an
         initialization segment.
         This case is not currently possible but may be in future versions.

       - `range` (`Array.<number>|undefined`): If defined, it means that the
         segment data is actually defined in a specific byte-range of the given
         URL.

         Segment loaders are expected to only communicate that range of data
         to the RxPlayer (if both a `range` and `indexRange` property
         exists, it should communicate both).

       - `indexRange` (`Array.<number>|undefined`): If defined, it means that a
         segment index can be retrieved at the associated URL by the byte range
         expressed by this value.

         When this values is set - which is only done for specific contents
         it is expected that the loader load both the segment's data and
         this index.

         How to perform that last operation can be format-specific.
         For ISOBMFF segments, both the data and the segment index can just
         be concatenated.

  2. **callbacks**: An object containing multiple callbacks to allow this
     `segmentLoader` to communicate various events to the RxPlayer.

     This Object contains the following functions:

       - **resolve**: To call after the segment is loaded, to communicate it to
         the RxPlayer.

         When called, it should be given an object with the following
         properties:
           - *data* (`ArrayBuffer`|`Uint8Array`) - the segment data.

           - *duration* (`Number|undefined`) - the duration the request took, in
             milliseconds.

             This value may be used to estimate the ideal user bandwidth.

           - *size* (`Number|undefined`) size, in bytes, of the total downloaded
             response.

             This value may be used to estimate the ideal user bandwidth.

       - **progress** - Callback to call when progress information is available
         on the current request. This callback allows to improve our adaptive
         streaming logic by better predicting the bandwidth before the request
         is finished and whether a request is stalling.

         When called, it should be given an object with the following
         properties:

           - *duration* (`Number`) - The duration since the beginning of the
             request, in milliseconds.

           - *size* (`Number`) - the current size loaded, in bytes.

           - *totalSize* (`Number|undefined`) - the whole size of the wanted
             data, in bytes. Can be let to undefined when not known.

       - **reject**: Callback to call when an error is encountered which made
         loading the segment impossible.

         It is recommended (but not enforced) to give it an Object or error
         instance with the following properties:
            - *canRetry* (`boolean|undefined`): If set to `true`, the RxPlayer
              may retry the request (depending on the configuration set by the
              application).

              If set to `false`, the RxPlayer will never try to retry this
              request and will probably just stop the current content.

              If not set or set to `undefined`, the RxPlayer might retry or fail
              depending on other factors.

            - *isOfflineError* (`boolean|undefined`): If set to `true`, this
              indicates that this error is due to the user being offline
              (disconnected from the needed network).

              If set to `false`, this indicates that it wasn't.

              If not known or not applicable, you can just set it to undefined
              or not define it at all.

              The RxPlayer might retry a segment request due to the user being
              offline a different amount of time than when the error is due to
              another issue, depending on its configuration.

       - **fallback**: Callback to call if you want to call our default
         implementation instead for loading this segment. No argument is needed.

The `segmentLoader` can also return a function, which will be called if/when
the request is aborted. You can define one to clean-up or dispose all resources.

## manifestLoader

The `manifestLoader` is a function that can be included in the
`transportOptions` of the `loadVideo` API call.

A manifestLoader allows to define a custom [Manifest](../../Getting_Started/Glossary.md#manifest)
loader.

Before the complete documentation, let's write an example which will just use
an XMLHttpRequest (it has no use, as our implementation does the same thing and
more):
```js
/**
 * @param {string|undefined} url - the url the Manifest request should normally
 * be on.
 * Can be undefined in very specific conditions, like in cases when the
 * `loadVideo` call had no defined URL (e.g. "local" manifest, playing a locally
 * crafted "Metaplaylist" content).
 * @param {Object} callbacks - Object containing several callbacks to indicate
 * that the manifest has been loaded, the loading operation has failed or to
 * fallback to our default implementation. More information on this object below
 * this code example.
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

As you can see, this function takes two arguments:

  1. **url**: The URL the Manifest request should normally be performed at.

     This argument can be `undefined` in very rare and specific conditions where
     the Manifest URL doesn't exist or has not been communicated by the
     application.

  2. **callbacks**: An object containing multiple callbacks to allow this
     `manifestLoader` to communicate the loaded Manifest or an encountered error
     to the RxPlayer.

     This Object contains the following functions:

       - **resolve**: To call after the Manifest is loaded, to communicate it to
         the RxPlayer.

         When called, it should be given an object with the following
         properties:
           - *data* - the Manifest data.
             Many formats are accepted depending on what makes sense in the
             current transport: string, Document, ArrayBuffer, Uint8Array,
             object.

           - *duration* (`Number|undefined`) - the duration of the request, in
             milliseconds.

           - *size* (`Number|undefined`) size, in bytes, of the total downloaded
             response.

           - *url* (`string|undefined`) - url of the Manifest (after any
             potential redirection if one).

           - *sendingTime* (`number|undefined`) - Time at which the manifest
             request was done as a unix timestamp in milliseconds.

           - *receivingTime* (`number|undefined`) - Time at which the manifest
             request was finished as a unix timestamp in milliseconds.

       - **reject**: Callback to call when an error is encountered which made
         loading the Manifest impossible.

         It is recommended (but not enforced) to give it an Object or error
         instance with the following properties:
            - *canRetry* (`boolean|undefined`): If set to `true`, the RxPlayer
              may retry the request (depending on the configuration set by the
              application).

              If set to `false`, the RxPlayer will never try to retry this
              request and will probably just stop the current content.

              If not set or set to `undefined`, the RxPlayer might retry or fail
              depending on other factors.

            - *isOfflineError* (`boolean|undefined`): If set to `true`, this
              indicates that this error is due to the user being offline
              (disconnected from the needed network).

              If set to `false`, this indicates that it wasn't.

              If not known or not applicable, you can just set it to undefined
              or not define it at all.

              The RxPlayer might retry a Manifest request due to the user being
              offline a different amount of time than when the error is due to
              another issue, depending on its configuration.

       - **fallback**: Callback to call if you want to call our default
         implementation instead for this Manifest. No argument is needed.

The `manifestLoader` can also return a function, which will be called if/when
the request is aborted. You can define one to clean-up or dispose all resources.

## representationFilter

The representationFilter is a function that can be included in the
`transportOptions` of the `loadVideo` API call.

A representationFilter allows you to filter out
[Representations](../../Getting_Started/Glossary.md#representation) (i.e. media qualities) based on
its attributes.

The representationFilter will be called each time we load a
[Manifest](../../Getting_Started/Glossary.md#manifest) with two arguments:

- representation `{Representation}`: The concerned `Representation`.
  A `Representation` structure's is described [in the Manifest structure
  documentation](./Manifest_Object.md#representation).

- representationInfos `{Object}`: Basic information about this
  `Representation`. Contains the following keys:

  - bufferType `{string}`: The concerned type of buffer. Can be
    `"video"`, `"audio"`, `"text"` (for subtitles)
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

[1] [Representation structure](./Manifest_Object.md#representation)
