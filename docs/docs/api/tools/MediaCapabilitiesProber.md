---
id: MediaCapabilitiesProber-tool
title: MediaCapabilitiesProber
sidebar_label: MediaCapabilitiesProber
slug: media-capabilities-prober
---

## Overview

The MediaCapabilitiesProber is a tool probing what your browser can do,
especially:

- Which DRM system is supported

- Check for HDCP support

- which codecs are available

- Check the color space support

:::caution
This tool is still in an experimental phase, meaning that its API can
change at any new release. This is not because it is not stable (it is actually)
or should not be used in production. This is just because we want to receive
your feedbacks before locking definitely the API.
:::

We can for example add supplementary information of even explode the
MediaCapabilitiesProber into several tools to lower the size of the import.
We're waiting for your feedbacks!

## How to use it

As an experimental tool, the MediaCapabilitiesProber won't be included in a
default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency
trough the npm registry (e.g. by doing something like `npm install rx-player`) and then specifically importing this tool from
`"rx-player/experimental/tools"`:

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

The current level of verbosity for this prober logs. Those logs all use the
console.

From the less verbose to the most:

- `"NONE"`: no log

- `"ERROR"`: unexpected errors (via `console.error`)

- `"WARNING"`: The previous level + minor problems encountered (via
  `console.warn`)

- `"INFO"`: The previous levels + noteworthy events (via `console.info`)

- `"DEBUG"`: The previous levels + normal events of the prober (via
  `console.log`)

If the value set to this property is different than those, it will be
automatically set to `"NONE"`.

It is set to `"WARNING"` by default as it allows you to know if you forgot to
set required information on each APIs, if some APIs are missing in your
browser, etc.

You might want to set it to `"NONE"` when in production.

#### Example

```js
import { mediaCapabilitiesProber } from "rx-player/experimental/tools";
mediaCapabilitiesProber.LogLevel = "NONE";
```

## Functions

### getCompatibleDRMConfigurations

_arguments_:

- _keySystems_ (`Array.<Object>`): An array of key system
  configurations. Those objects have the following properties:

  - _type_ (`string`): Key system string identifying it in the browser.
    Always a reverse domain name (e.g. "org.w3.clearkey").

  - _configuration_ (`Object`): Wanted MediaKeySystemConfiguration for this
    key system, as defined in [the EME w3c
    specification.](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration)

_return value_: `Array.<Object>`

Probe the support of various key sytems and for each compatible ones, returns
the corresponding configuration that will be used.

#### Return value

The returned value is an array of object with the same number of elements than
the one given in argument.

It indicates the support for each Key System given in argument in the same
order.

Due to that, the objects in this array look like the ones given in argument (but
with an added property):

- _type_ (`string`): Corresponding key system string given in input.

- _configuration_ (`Object`): Corresponding wanted
  MediaKeySystemConfiguration given in input.

- _compatibleConfiguration_ (`undefined|Object`):

  if the type and configuration are both compatible with the browser, this
  is the corresponding actual MediaKeySystemConfiguration that will be
  effectively used.
  It will often correspond to a subset of the inputted _configuration_
  object (for example, you might have there fewer _videoCapabilities_ that
  in the _configuration_ object).

  If the type and/or the configuration are not compatible, this property
  will not be defined.

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

const keySystems = [
  // Let's consider this one as a compatible key system configuration
  { type: "com.widevine.alpha", configuration: mksConfiguration },

  // Let's consider this one as not compatible
  { type: "com.microsoft.playready", configuration: mksConfiguration },
];

mediaCapabilitiesProber
  .getCompatibleDRMConfigurations(keySystems)
  .then((drmConfigs) => {
    drmConfigs.forEach((config) => {
      const { type, configuration, compatibleConfiguration } = config;

      if (compatibleConfiguration !== undefined) {
        console.log("# Compatible configuration #############################");
        console.log("Key System:", type);
        console.log("Wanted configuration:", configuration);
        console.log("Compatible configuration:", compatibleConfiguration);
        console.log("########################################################");
        console.log("");
      } else {
        console.log("# Incompatible configuration ###########################");
        console.log("Key System:", type);
        console.log("Wanted configuration:", configuration);
        console.log("########################################################");
        console.log("");
      }
    });
  });

// Example output (please note that in this example, one of the widevine
// robustness is not supported):
//
// # Compatible configuration #############################
// Key System: com.widevine.alpha
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
// ########################################################
//
// # Incompatible configuration ###########################
// Key System: com.microsoft.playready
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
// ########################################################
```

### getStatusForHDCP

_arguments_:

- _type_ (`string`): The HDCP type (e.g. "1.0", "1.1" or "2.0")

_return value_: `string`

Test for an HDCP configuration.

The returned string of this function is either:

- `"Supported"`: This HDCP configuration is supported.

- `"NotSupported"`: The HDCP configuration is not supported.

- `"Unknown"`: The API is not available or it is but could not check if the
  HDCP type is supported.

:::caution
As of the 2018-july-03, this feature is very poorly supported (with only
some support on the EDGE browser).

We should have a real support of it in the coming months on
[Chrome](https://www.chromestatus.com/feature/5652917147140096) and
[Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=1404230).
:::

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

#### Argument

The object in argument is inspired from the concerned API configurations.
All its properties are optional, here are what you can set.

- _type_ (`string`): The media is either buffered in MediaSource, or
  directly as a file.
  As such, you can specify which one you want to probe through one of the
  following strings:

  - "media-source"
  - "file".

- _video_ (`Object`): The video capabilities you want to probe.

  - _contentType_ (`string`): Media codec in mimeType format.
  - _width_ (`number`): Video width.
  - _height_ (`number`): Video Height.
  - _bitrate_ (`number`): Bitrate of the video (in bits per second).
  - _framerate_ (`string`): Number of frames used in one second.
  - _bitsPerComponent_ (`number`): Number of bits used to encode one
    component par pixel.

- _audio_ (`Object`): The video capabilities you want to probe.
  - _contentType_ (`string`): Media codec in mimeType format.
  - _channels_ (`string`): Audio channels used by the track.
  - _bitrate_ (`number`): Bitrate from stream (bits/second).
  - _samplerate_ (`number`): Number of samples of audio carried per second.

#### Return value

The returned string of this function is either:

- `"Supported"`: This configuration is supported.

- `"MaybeSupported"`: Some set configuration could not be probed because
  not enough information was provided, but what has been probed is supported.

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

#### Argument

The object in argument is inspired from the concerned API configurations.
All its properties are optional, here are what you can set.

- _colorSpace_ (`string`): Wanted color space ("srgb", "p3", etc).
- _width_ (`number`): Wanted display horizontal resolution.
- _height_ (`number`): Wanted display vertical resolution.
- _bitsPerComponent_ (`number`): Wanted display bpc capability.

#### Return Value

The returned string of this function is either:

- `"Supported"`: This configuration is supported.

- `"MaybeSupported"`: Some set configuration could not be probed because
  not enough information was provided, but what has been probed is supported.

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

## Exploited browser APIs

The tool probes media capabilities from browsers (Chrome, Firefox, etc.)
exploiting current available media API:

- **mediaCapabilities** - Chrome >= 64
  (https://github.com/WICG/media-capabilities)

  - Check for decoding capabilites from video and audio attributes.

- **isTypeSupportedWithFeatures** - Microsoft EDGE

  - Check for DRM support + decoding and displaying capabilites from video,
    audio, display and media protection configuration.

- **isTypeSupported** - Chrome >= 31 / Firefox >= 41 / EDGE / IE >= 11 / Safari

  > = 8
  > (https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/isTypeSupported)

  - Check for video and audio decoding support from content type.

- **matchMedia** (with color gamut support) - Chrome >= 58.

  - Check for color space support.

- **requestMediaKeySystemAccess** - Chrome >= 42 / Firefox / EDGE / Safari
  (https://developer.mozilla.org/fr/docs/Web/API/Navigator/requestMediaKeySystemAccess)

  - Check for DRM support.

- **getStatusForPolicy** - ?
  (https://github.com/WICG/hdcp-detection/blob/master/explainer.md)
  - Query a hypothetical status associated with an HDCP policy.
