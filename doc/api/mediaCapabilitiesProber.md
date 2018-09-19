# MediaCapabilitiesProber ######################################################


## Overview ####################################################################

The MediaCapabilitiesProber is a tool probing what your browser can do,
especially:

  - Which DRM system is supported

  - Check for HDCP support

  - which codecs are available

  - Check the color space support


:warning: This tool is still in an experimental phase, meaning that its API can
change at any new release. This is not because it is not stable (it is actually)
or should not be used in production. This is just because we want to receive
your feedbacks before locking definitely the API.

We can for example add supplementary informations of even explode the
MediaCapabilitiesProber into several tools to lower the size of the import.
We're waiting for your feedbacks!



## How to use it ###############################################################


As an experimental tool, the MediaCapabilitiesProber won't be included in a
default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency
trough the npm registry (e.g. by doing something like ``npm install
rx-player``) and then specifically importing this tool from
``"rx-player/experimental/tools"``:

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber.getStatusForHDCP("1.1")
  .then((hdcp11Status) => {
    if (hdcp11Status === "Supported") {
      console.log("HDCP 1.1 is supported");
    }
  });
```



## Properties ##################################################################


### LogLevel ###################################################################

_type_: ``string``

_default_: ``"WARNING"``

The current level of verbosity for this prober logs. Those logs all use the
console.

From the less verbose to the most:

  - ``"NONE"``: no log

  - ``"ERROR"``: unexpected errors (via ``console.error``)

  - ``"WARNING"``: The previous level + minor problems encountered (via
    ``console.warn``)

  - ``"INFO"``: The previous levels + noteworthy events (via ``console.info``)

  - ``"DEBUG"``: The previous levels + normal events of the prober (via
    ``console.log``)


If the value set to this property is different than those, it will be
automatically set to ``"NONE"``.

It is set to ``"WARNING"`` by default as it allows you to know if you forgot to
set required informations on each APIs, if some APIs are missing in your
browser, etc.

You might want to set it to ``"NONE"`` when in production.

#### Example
```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";
mediaCapabilitiesProber.LogLevel = "NONE";
```



## Functions ###################################################################


### getCompatibleDRMConfigurations #############################################

_arguments_:

  - _configurations_ (``Array.<Object>``): An array of configuration that contains:
    - _type_ (``string``): DRM reverse domain name, identifying the keySystem in
    the browser.

    - _configuration_ (``Object``): MediaKeySystemConfiguration for this
    key system as defined in [the EME w3c specification
    ](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration)

_return value_: ``Array.<Object>``

For each given configuration, probe for support. The API returns the input
elements, with the compatible configuration subset for each element, if
configuration is supported.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

const configurations = [
  { // Consider this as compatible
    type: "com.widevine.alpha",
    configuration, // w3c MediaKeySystemConfiguration
  },
  { // Consider this as not compatible
    type: "com.microsoft.playready",
    configuration, // w3c MediaKeySystemConfiguration
  },
];

mediaCapabilitiesProber.getCompatibleDRMConfigurations("com.widevine.alpha", {
  persistentState: "required"
}).then((drmConfigurations) => {
  configurations.forEach((drmConfigurations) => {
    if (drmConfigurations.combatibleConfiguration != null) {
      console.log("The configuration is supported", drmConfiguration);
    } else {
      console.log("The configuration is not supported", drmConfiguration);
    }
  });
});
```


### getStatusForHDCP ###########################################################

_arguments_:

  - _type_ (``string``): The HDCP type (e.g. "1.0", "1.1" or "2.0")

_return value_: ``string``

Test for an HDCP configuration.

The returned string of this function is either:

  - ``"Supported"``: This HDCP configuration is supported.

  - ``"NotSupported"``: The HDCP configuration is not supported.

  - ``"Unknown"``: The API is not available or it is but could not check if the
    HDCP type is supported.

:warning: As of the 2018-july-03, this feature is very poorly supported (with only
some support on the EDGE browser).
We should have a real support of it in the coming months on
[Chrome](https://www.chromestatus.com/feature/5652917147140096) and
[Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=1404230).


#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber.getStatusForHDCP("1.1")
  .then((hdcpStatus) => {
    switch (hdcpStatus) {
      case "Supported":
        console.log("This HDCP version is supported");
        break;

      case "NotSupported":
        console.log("This HDCP version is not supported");
        break;

      case "Unknown":
        console.log("We could'nt tell if this HDCP version is supported.");
        break;
    }
  });
```


### getDecodingCapabilities ####################################################

_arguments_:

  - _config_ (``Object``): Object with type, video and audio configuration.

_return value_: ``string``

Probe for audio/video decoding capabilities.

#### Argument

The object in argument is inspired from the concerned API configurations.
All its properties are optional, here are what you can set.

  - _type_ (``string``): The media is either buffered in MediaSource, or
    directly as a file.
    As such, you can specify which one you want to probe through one of the
    following strings:
      - "media-source"
      - "file".

  - _video_ (``Object``): The video capabilities you want to probe.
    - _contentType_ (``string``): Media codec in mimeType format.
    - _width_ (``number``): Video width.
    - _height_ (``number``): Video Height.
    - _bitrate_ (``number``): Bitrate of the video (in bits per second).
    - _framerate_ (``string``): Number of frames used in one second.
    - _bitsPerComponent_ (``number``): Number of bits used to encode one
      component par pixel.

  - _audio_ (``Object``): The video capabilities you want to probe.
    - _contentType_ (``string``): Media codec in mimeType format.
    - _channels_ (``string``): Audio channels used by the track.
    - _bitrate_ (``number``): Bitrate from stream (bits/second).
    - _samplerate_ (``number``): Number of samples of audio carried per second.

#### Return value

The returned string of this function is either:

  - ``"Supported"``: This configuration is supported.

  - ``"MaybeSupported"``: Some set configuration could not be probed because
    not enough information was provided, but what has been probed is supported.

  - ``"NotSupported"``: The configuration is not supported.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber.getDecodingCapabilities({
  type: "media-source",
  video: {
    contentType: "video/webm; codecs=\"vp09.00.10.08\"",
    width: 1920,
    height: 1080,
    bitrate: 3450000,
    framerate: '25',
    bitsPerComponent: 8,
  },
  audio: {
    contentType: "audio/webm; codecs=\"opus\"",
    channels: 6,
    bitrate: 1200,
    samplerate: 44100,
  },
}).then((status) => {
  switch (status) {
    case "Supported":
      console.log("The configuration is supported");
      break;

    case "MaybeSupported":
      console.log("The configuration may be supported");
      break;

    case "NotSupported":
      console.log("The configuration is not supported");
      break;
  }
});
```


### getDisplayCapabilities #####################################################

_arguments_:

  - _config_ (``Object``): Object with display configuration.

_return value_: ``string``

Probe what can be displayed on the screen.

#### Argument

The object in argument is inspired from the concerned API configurations.
All its properties are optional, here are what you can set.

  - _colorSpace_ (``string``): Wanted color space ("srgb", "p3", etc).
  - _width_ (``number``): Wanted display horizontal resolution.
  - _height_ (``number``): Wanted display vertical resolution.
  - _bitsPerComponent_ (``number``): Wanted display bpc capability.

#### Return Value

The returned string of this function is either:

  - ``"Supported"``: This configuration is supported.

  - ``"MaybeSupported"``: Some set configuration could not be probed because
    not enough information was provided, but what has been probed is supported.

  - ``"NotSupported"``: The configuration is not supported.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber.getDisplayCapabilities({
  colorSpace: "p3",
  width: 3840,
  height: 2160,
  bitsPerComponent: 10,
}).then((status) => {
  switch (status) {
    case "Supported":
      console.log("The configuration is supported");
      break;

    case "MaybeSupported":
      console.log("The configuration may be supported");
      break;

    case "NotSupported":
      console.log("The configuration is not supported");
      break;
  }
});
```



## Exploited browser APIs ######################################################

The tool probes media capabilities from browsers (Chrome, Firefox, etc.)
exploiting current available media API:

- __mediaCapabilities__ - Chrome >= 64
  (https://github.com/WICG/media-capabilities)
  - Check for decoding capabilites from video and audio attributes.

- __isTypeSupportedWithFeatures__ - Microsoft EDGE
  - Check for DRM support + decoding and displaying capabilites from video,
    audio, display and media protection configuration.

- __isTypeSupported__ - Chrome >= 31 / Firefox >= 41 / EDGE / IE >= 11 / Safari
  >= 8
(https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/isTypeSupported)
  - Check for video and audio decoding support from content type.

- __matchMedia__ (with color gamut support) - Chrome >= 58.
  - Check for color space support.

- __requestMediaKeySystemAccess__ - Chrome >= 42 / Firefox / EDGE / Safari
(https://developer.mozilla.org/fr/docs/Web/API/Navigator/requestMediaKeySystemAccess)
  - Check for DRM support.

- __getStatusForPolicy__ - ?
(https://github.com/WICG/hdcp-detection/blob/master/explainer.md)
  - Query a hypothetical status associated with an HDCP policy.
