# Plugins ######################################################################


## Overview ####################################################################

To allow the player to be extended, a system of "plugins" has been added.

Those plugins are often under the form of functions passed as an argument to the
``loadVideo`` API call.



<a name="segmentLoader"></a>
## segmentLoader ###############################################################

The segmentLoader is a function that can be included in the ``transportOptions``
of the ``loadVideo`` API call.

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
 * @param {Object} infos.adaptation - the adaptation containing the segment.
 * More information on its structure can be found on the documentation linked
 * below [1]
 * @param {Object} infos.representation - the representation containing the
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
 *   - duration {Number} - the duration of the request, in ms
 *   - size {Number} - size, in bytes, of the total downloaded response.
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
  const sentTime = Date.now();

  xhr.onload = (r) => {
    if (200 <= xhr.status && xhr.status < 300) {
      const duration = Date.now() - sentTime;
      const size = r.total;
      const data = r.responseData;
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

[1] [Adaptation structure](./manifest.md#adaptation)

[2] [Representation structure](./manifest.md#representation)

[3] [Segment structure](./manifest.md#segment)



<a name="manifestLoader"></a>
## manifestLoader ##############################################################

The manifestLoader is a function that can be included in the
``transportOptions`` of the ``loadVideo`` API call.

A manifestLoader allows to define a custom manifest loader.

The manifest loader is the part performing the manifest request.

Here is a manifest loader which uses an XHR (it has no use, as our
implementation does the same thing and more):

```js
/**
 * @param {string} url - the url the manifest request should normally be on

 * @param {Object} callbacks
 * @param {Function} callbacks.resolve - Callback to call when the request is
 * finished with success. It should be called with an object with at least 3
 * properties:
 *   - data {Document|String} - the manifest data
 *   - duration {Number} - the duration of the request, in ms
 *   - size {Number} - size, in bytes, of the total downloaded response.
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
  const sentTime = Date.now();

  xhr.onload = (r) => {
    if (200 <= xhr.status && xhr.status < 300) {
      const duration = Date.now() - sentTime;
      const size = r.total;
      const data = r.targget.response;
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

  xhr.open("GET", infos.url);
  xhr.responseType = "document";

  xhr.send();

  return () => {
    xhr.abort();
  };
};
```


<a name="representationFilter"></a>
## representationFilter ########################################################

The representationFilter is a function that can be included in the
``transportOptions`` of the ``loadVideo`` API call.

A representationFilter allows to define a custom representation filter.

There may be a need for filtering representations, on specific representation
attributes (that may be related to media properties).

Here is a representation filter that allow video representation to be played
if the resolution is lower than HD (1920x1080):

```js
const customRepresentationFilter = (representation) => {
  if (representation.width != null && representation.height != null) {
    return (
      width <= 1920 &&
      height <= 1080
    );
  }
  // Otherwise, allow all non-video adaptation
  return representation.mimeType ? !representation.mimeType.startsWith("video") : false;
}
```