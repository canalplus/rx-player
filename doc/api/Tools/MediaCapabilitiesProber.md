# MediaCapabilitiesProber

## Overview

The MediaCapabilitiesProber is a tool probing what your browser can do, especially:

- Which DRM system is supported

- Check for HDCP support

- which codecs are available

- Check the color space support

<div class="warning">
This tool is still in an experimental phase, meaning that its API can
change at any new release. This is not because it is not stable (it is actually)
or should not be used in production. This is just because we want to receive
your feedbacks before locking definitely the API.
</div>

We can for example add supplementary information of even explode the
MediaCapabilitiesProber into several tools to lower the size of the import. We're waiting
for your feedbacks!

## How to use it

As an experimental tool, the MediaCapabilitiesProber won't be included in a default
RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency trough the npm
registry (e.g. by doing something like `npm install rx-player`) and then specifically
importing this tool from `"rx-player/experimental/tools"`:

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber.getStatusForHDCP("1.1").then((hdcp11Status) => {
  if (hdcp11Status === "Supported") {
    console.log("HDCP 1.1 is supported");
  }
});
```

## Properties

### LogLevel

_type_: `string`

_default_: `"WARNING"`

The current level of verbosity for this prober logs. Those logs all use the console.

From the less verbose to the most:

- `"NONE"`: no log

- `"ERROR"`: unexpected errors (via `console.error`)

- `"WARNING"`: The previous level + minor problems encountered (via `console.warn`)

- `"INFO"`: The previous levels + noteworthy events (via `console.info`)

- `"DEBUG"`: The previous levels + normal events of the prober (via `console.log`)

If the value set to this property is different than those, it will be automatically set to
`"NONE"`.

It is set to `"WARNING"` by default as it allows you to know if you forgot to set required
information on each APIs, if some APIs are missing in your browser, etc.

You might want to set it to `"NONE"` when in production.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";
mediaCapabilitiesProber.LogLevel = "NONE";
```

## Functions

### checkDrmConfiguration

_arguments_:

- _keySystemType_ (`string`): Key system string identifying it in the browser. Always a
  reverse domain name (e.g. "org.w3.clearkey").

- _configuration_ (`Object`): Wanted `MediaKeySystemConfiguration` for this key system, as
  defined in
  [the EME w3c specification.](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration)

- _options_ (`Object|undefined`): Can be set to an object with the following keys:

  - _timeout_ (`number|undefined`): Optional timeout in seconds, If set and one of the
    lower-level API calls do not answer, we will consider the configuration as not
    supported.

    XXX TODO And what happens if in the future `checkDrmConfiguration` actually perform
    multiple API Calls?

_return value_: `Object`

Probe the support of the given key sytem configuration. If it is supported, this call will
resolve with a `MediaKeySystemConfiguration` compatible to what you asked that would
actually be relied on. It will often correspond to a subset of the inputted
_configuration_ object (for example, you might have there fewer _videoCapabilities_ that
in the _configuration_ object).

Rejects if the given configuration is not supported or if we have no way to know if it is
supported or not.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

const mksConfiguration = {
  initDataTypes: ["cenc"],
  videoCapabilities: [
    {
      contentType: 'video/mp4;codecs="avc1.4d401e"', // standard mp4 codec
      robustness: "HW_SECURE_CRYPTO",
    },
    {
      contentType: 'video/mp4;codecs="avc1.4d401e"',
      robustness: "SW_SECURE_DECODE",
    },
  ],
};

mediaCapabilitiesProber.checkDrmConfiguration(
  "com.widevine.alpha",
  mksConfiguration,
  ).then(
  // On success:
  (config) => {
    console.log("This device is compatible with the given configuration!");
    console.log("Wanted configuration:", configuration);
    console.log("Compatible configuration:", compatibleConfiguration);
  },

  // On failure
  (err) => {
    console.log("This device is not compatible with the given configuration!", err);
  },
});

// Example output (please note that in this example, one of the widevine
// robustness is not supported):
//
// Wanted configuration:
// {
//   "initDataTypes":["cenc"],
//   "videoCapabilities": [
//     {
//       "contentType": "video/mp4;codecs=\"avc1.4d401e\"",
//       "robustness": "HW_SECURE_CRYPTO"
//     },
//     {
//       "contentType": "video/mp4;codecs=\"avc1.4d401e\"",
//       "robustness": "SW_SECURE_DECODE"
//     }
//   ]
// }
// Compatible configuration:
// {
//   "audioCapabilities": [],
//   "distinctiveIdentifier": "not-allowed",
//   "initDataTypes": ["cenc"],
//   "label": "",
//   "persistentState": "not-allowed",
//   "sessionTypes": ["temporary"],
//   "videoCapabilities": [
//     {
//       "contentType": "video/mp4;codecs=\"avc1.4d401e\"",
//       "robustness":"SW_SECURE_DECODE"
//     }
//   ]
// }
```

### getStatusForHDCP

_arguments_:

- _type_ (`string`): The HDCP type (e.g. "1.0", "1.1" or "2.0")

_return value_: `string`

Test for the compatibility with an HDCP configuration.

The returned string of this function is either:

- `"Supported"`: This HDCP configuration should be supported.

- `"NotSupported"`: The HDCP configuration is not supported.

- `"Unknown"`: The API is not available or it is but could not check if the HDCP type is
  supported.

Note that depending on the device, this API might be not reliable. Please test for your
use cases before relying on this method.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber.getStatusForHDCP("1.1").then((hdcpStatus) => {
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

### getDecodingCapabilities

_arguments_:

- _config_ (`Object`): Object with type, video and audio configuration.

_return value_: `string`

Probe for audio/video decoding capabilities.

Note that depending on the device, this API might be not reliable. Please test for your
use cases before relying on this method.

#### Argument

The object in argument is inspired from the concerned API configurations. All its
properties are optional, here are what you can set.

- _type_ (`string`): The media is either buffered in MediaSource, or directly as a file.
  As such, you can specify which one you want to probe through one of the following
  strings:

  - "media-source"
  - "file".

- _video_ (`Object`): The video capabilities you want to probe.

  - _contentType_ (`string`): Media codec in mimeType format.
  - _width_ (`number`): Video width.
  - _height_ (`number`): Video Height.
  - _bitrate_ (`number`): Bitrate of the video (in bits per second).
  - _framerate_ (`string`): Number of frames used in one second.
  - _bitsPerComponent_ (`number`): Number of bits used to encode one component par pixel.

- _audio_ (`Object`): The video capabilities you want to probe.
  - _contentType_ (`string`): Media codec in mimeType format.
  - _channels_ (`string`): Audio channels used by the track.
  - _bitrate_ (`number`): Bitrate from stream (bits/second).
  - _samplerate_ (`number`): Number of samples of audio carried per second.

#### Return value

The returned string of this function is either:

- `"Supported"`: This configuration should be supported.

- `"MaybeSupported"`: Some set configuration could not be probed because not enough
  information was provided, but what has been probed is supported.

- `"NotSupported"`: The configuration is not supported.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber
  .getDecodingCapabilities({
    type: "media-source",
    video: {
      contentType: 'video/webm; codecs="vp09.00.10.08"',
      width: 1920,
      height: 1080,
      bitrate: 3450000,
      framerate: "25",
      bitsPerComponent: 8,
    },
    audio: {
      contentType: 'audio/webm; codecs="opus"',
      channels: 6,
      bitrate: 1200,
      samplerate: 44100,
    },
  })
  .then((status) => {
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

### getDisplayCapabilities

_arguments_:

- _config_ (`Object`): Object with display configuration.

_return value_: `string`

Probe what can be displayed on the screen.

Note that depending on the device, this API might be not reliable. Please test for your
use cases before relying on this method.

#### Argument

The object in argument is inspired from the concerned API configurations. All its
properties are optional, here are what you can set.

- _colorSpace_ (`string`): Wanted color space ("srgb", "p3", etc).
- _width_ (`number`): Wanted display horizontal resolution.
- _height_ (`number`): Wanted display vertical resolution.
- _bitsPerComponent_ (`number`): Wanted display bpc capability.

#### Return Value

The returned string of this function is either:

- `"Supported"`: This configuration is supported.

- `"MaybeSupported"`: Some set configuration could not be probed because not enough
  information was provided, but what has been probed is supported.

- `"NotSupported"`: The configuration is not supported.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";

mediaCapabilitiesProber
  .getDisplayCapabilities({
    colorSpace: "p3",
    width: 3840,
    height: 2160,
    bitsPerComponent: 10,
  })
  .then((status) => {
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
