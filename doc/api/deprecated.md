# Deprecated APIs ##############################################################

This documentation lists APIs deprecated in the v3.x.x.

As we guarantee API compatibility in the v3.x.x, those API won't disappear until
we switch to a v4.x.x version.

You will find here which APIs are deprecated, why, and depending on the
concerned API, how to replace it.



<a name="fullscreen-apis"></a>
## Fullscreen APIs #############################################################

All fullscreen APIs have been deprecated, namely:
  - the ``isFullscreen`` method
  - the ``setFullscreen`` method
  - the ``exitFullscreen`` method
  - the ``fullscreenChange`` event

This is because of several things:

  - fullscreen management has now become a lot more complex with features such
    as advanced subtitles management, were the text track HTMLElement is
    controlled by the application.

  - most application developpers also wants to put their own controls into
    fullscreen mode. Those APIs only put the media element into fullscreen mode
    and not any other element. This can be misleading.


The fullscreen logic should now be entirely on the application-side. Replacement
code is provided for each of those APIs below.


## RxPlayer Methods ############################################################

The following RxPlayer methods are deprecated.


### getNativeTextTrack #########################################################

``getNativeTextTrack`` returned the first ``TextTrack`` element attached to the
media element or ``null `` if it did not exist.

This API was originally created to allow users to manipulate the ``TextTrack``
element themselves. For example, to "catch" cues as they appear and display them
differently.

What changed is that we now have two text track modes:
  - `html`, which allow advanced subtitle management
  - `native`, the old mode, which display subtitles natively through a
    ``TextTrack`` element.

This API will only return an element for  the `native` mode, but none for the
`html` mode because its element is not attached to the media element.

We heavily insist on people wanting advanced usecases to use the `html` mode, as
many formatting options do not work in `native` mode.

As we considered that ``getNativeTextTrack`` API was more confusing than it was
helpful in our current API, we decided to deprecate it. Do not hesitate to open
an issue if you use this API.


### isFullscreen ###############################################################

``isFullscreen`` has been deprecated as it is part of our Fullscreen APIs, see
[the related chapter](#fullscreen-apis) for more informations.

``isFullscreen`` just checked that ANY element was fullscreen. As such, it can
easily be replace for the majority of browsers with the following code:

```js
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.mozFullScreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}
```


### setFullscreen ##############################################################

``setFullscreen`` has been deprecated as it is part of our Fullscreen APIs, see
[the related chapter](#fullscreen-apis) for more informations.

``setFullscreen`` allowed to set the media element in fullscreen mode (or exit
fullscreen mode, if `false` was given as argument).

If you want to just put the media element on fullscreen mode, you can use the
following code:

```js
function setFullscreen(goFull) {
  if (goFull === "false") {
    exitFullscreen();
    return;
  }
  if (isFullscreen()) { // see code above
    return;
  }

  const mediaElement = player.getVideoElement();
  if (!mediaElement) {
    throw new Error("No media element");
  }
  if (mediaElement.requestFullscreen) {
    mediaElement.requestFullscreen();
  } else if (mediaElement.msRequestFullscreen) {
    mediaElement.msRequestFullscreen();
  } else if (mediaElement.mozRequestFullScreen) {
    mediaElement.mozRequestFullScreen();
  } else if (mediaElement.webkitRequestFullscreen) {
    mediaElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  }
}
```

Please consider however that this function will only put the media element in
full screen mode, without the eventual controls and HTML text tracks you might
also want to set in fullscreen. The code is easily adaptable however to put
your own element into fullscreen mode instead.


### exitFullscreen #############################################################

``exitFullscreen`` has been deprecated as it is part of our Fullscreen APIs, see
[the related chapter](#fullscreen-apis) for more informations.

``exitFullscreen`` just ``exited`` any element put in fullscreen mode. As such,
its code can easily be replaced by:

```js
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
```



## RxPlayer Events #############################################################

The following RxPlayer events has been deprecated.


### nativeTextTracksChange #####################################################

``nativeTextTracksChange`` events are deprecated. Which means they probably
won't be sent in a ``v4.x.x`` version.

The reasons are basically the same than for the ``getNativeTextTracks`` method.
It should not be needed anymore as most advanced needs should be better answered
by an ``html`` text track mode.


## fullscreenChange ############################################################

``fullscreenChange`` events have been deprecated as it is part of our Fullscreen
APIs, see [the related chapter](#fullscreen-apis) for more informations.

The ``fullscreenChange`` event was sent when the media element got in or out of
fullscreen mode, with agg boolean as a payload:
  - if ``true``, the element entered fullscreen mode
  - if ``false``, the element exited fullscreen mode

This behavior can easily be recreated through the following code:

```js
const mediaElement = player.getVideoElement();
mediaElement.addEventListener("fullscreenChange", () => {
  if (isFullscreen()) { // see isFullscreen implementation above
    // do things
  } else {
    // do other things
  }
});
```


## loadVideo options ###########################################################

The following loadVideo options are deprecated.


### defaultAudioTrack ##########################################################

[The `preferredAudioTracks` loadVideo
option](./loadVideo_options.md#prop-preferredAudioTracks) is now the preferred
(no pun intended) solution to set the default audio track.
This new option allows to handle much more complex use cases and can even be
updated at any time through [the `setPreferredAudioTracks`
method](./index.md#meth-setPreferredAudioTracks).

#### How to replace that function

It is very easy to replace `defaultAudioTrack` by `preferredAudioTracks`.

For example, if you want to have a default french audio language, you probably
previously did:
```js
player.loadVideo({
  url: myURL,
  transport: myTransport,

  defaultAudioTrack: { language: "fra", audioDescription: false },
  // or just `defaultAudioTrack: "fra"`, both are equivalent
})
```

Now you will have to set it through an array either when creating a new
RxPlayer:
```js
const player = new RxPlayer({
  preferredAudioTracks: [{ language: "fra", audioDescription: false }],
})
```

Or at any time, through the `setPreferredAudioTracks` method:
```js
player.setPreferredAudioTracks([{ language: "fra", audioDescription: false }]);
```


### defaultTextTrack ##########################################################

`defaultTextTrack` is replaced by [the `preferredTextTracks` constructor
option](./loadVideo_options.md#prop-preferredTextTracks) for the same reason
than `defaultAudioTrack`.

#### How to replace that function

It is very easy to replace `defaultTextTrack` by `preferredTextTracks`.

For example, if you want to have a default swedish subtitle language, you
probably previously did:
```js
player.loadVideo({
  url: myURL,
  transport: myTransport,

  defaultTextTrack: { language: "swe", closedCaption: false },
  // or just `defaultTextTrack: "swe"`, both are equivalent
})
```

Now you will have to set it through an array either when creating a new
RxPlayer:
```js
const player = new RxPlayer({
  preferredTextTracks: [{ language: "swe", closedCaption: false }],
})
```

Or at any time, through the `setPreferredTextTracks` method:
```js
player.setPreferredTextTracks([{ language: "fra", closedCaption: false }]);
```


## Other properties ############################################################

Some very specific properties from various methods are deprecated.
You will find them here.

## Other properties ############################################################

Some very specific properties from various methods are deprecated.
You will find them here.


### Manifest ###################################################################

The ``adaptations`` property returned by the ``Manifest`` object you can obtain
through the ``getManifest`` call is deprecated.

This corresponds to the ``adaptations`` property of the first element in the
``periods`` object from the same ``Manifest`` object, so it's very easy to
replace:
```js
const manifest = player.getManifest();

if (manifest && manifest.periods.length) {
  console.log(manifest.adaptations === manifest.periods[0]); // true
}
```


### Smooth #####################################################################

Setting a `*.wsx`, a `*.ism` or a `*.isml` URL as an ``url`` property in
``loadVideo`` is now deprecated when we're talking about a Smooth Streaming
content.

We recommend to only set a Manifest URL in that property when the transport is
equal to `smooth`.


### NetworkError ###############################################################

The `xhr` property from a `NetworkError` is deprecated.

This is to prepare the support of low-latency streaming, with
[CMAF](https://mpeg.chiariglione.org/standards/mpeg-a/common-media-application-format),
where the ``fetch`` API has to be used instead of an `XMLHttpRequest`.

We recommend to not rely on this property anymore. You still should have access
to the `status` and `url` properties.
