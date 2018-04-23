## MediaCapabilitiesProber

The tool probes media capabilities from browsers (Chrome, Firefox, etc.) exploiting current available [media API](./browserAPI.md)

### Configuration

This attributes are inspired from the tested API configurations.
The prober attributes are:

- Type: The media is either buffered in MediaSource, or direclty as a file. Can be: "media-source", "file".
- Video capabilities: Video stream attributes.
    - ___contentType___: Media codec in mimeType format.
    - ___width___ and ___height___: Video resolution.
    - ___bitrate___: Bitrate from stream (bits/second).
    - ___framerate___: Number of frames used in one second.
    - ___bitsPerComponent___: Number of bits used to encode one component par pixel.
- Audio capabilities: Audio stream attributes.
    - ___contentType___: Media codec in mimeType format.
    - ___channels___: Audio channels used by the track.
    - ___bitrate___: Bitrate from stream (bits/second).
    - ___samplerate___: Number of samples of audio carried per second.
- Media Protection: Wanted protection for playback (drm/output protection).
    - ___drm___:
        - ___type___: DRM reverse domain name, identifying the keySystem in the browser.
        - ___configuration___: MediaKeySystemConfiguration configuration, as defined in EME w3c spec.
    - ___output___:
        - ___hdcp___: HDCP revision ("1.0", "2.2", etc).
- Display capabilities:
    - ___colorSpace___: Displaying wanted color space ("srgb", "p3", etc).
    - ___width___: Wanted display horizontal resolution.
    - ___height___: Wanted display vertical resolution.
    - ___bitsPerComponent___: Wanted display bpc capability.

After probing, the given configuration is either:
- "__Supported__": All fields have been checked with media capabilities API, and the configuration is supported.
- "__Maybe Supported__": A part of configuration is supported. Some fields could not be checked.
- "__Not Supported__": The configuration is not supported.

#### Complete configuration example

```js
const configuration = {
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
  mediaProtection: {
    drm: {
      type: "org.w3.clearkey",
      configuration: {
        persistentLicense: true,
        persistentStateRequired: true,
        distinctiveIdentifierRequired: true,
        videoRobustnesses: [
          "HW_SECURE_ALL",
          "HW_SECURE_DECODE",
        ], 
        audioRobustnesses: [
          "HW_SECURE_ALL",
          "HW_SECURE_DECODE",
        ], 
      }
    },
    output: {
      hdcp: "2.2",
    }
  },
  display: {
    colorSpace: "p3",
    width: 3840,
    height: 2160,
    bitsPerComponent: 10,
  }
}
```

### API

  __getCapabilities()__

  _arguments_: 
  - config {``Object``} : Configuration as defined above.

  _returns_:
  - A promise wrapping an object with:
    - The status of capability. ("Supported", "Maybe Supported","Not Supported")
    - An object with all untested fields on configuration.

  __getStatusForHDCP()__

  _arguments_:
  - type {``string``}: The HDCP type.

  _returns_:
  - The status for a specific HDCP version.

  ```js
    const capabilities =
      await mediaCapabilitiesProber.getStatusForHDCP("1.1");
  ```

  __getStatusForDRM()__

  _arguments_:
  - type {``string``}: The DRM type
  - infos {``Object``}: MediaKeySystemConfiguration configuration, as defined in EME w3c spec.

  _returns_:
  - The status for a specific DRM.

  ```js
    const capabilities =
      await mediaCapabilitiesProber.getStatusForDRM("org.w3.clearkey");
  ```

  __getDecodingCapabilities()__

   _arguments_: 
  - config {``Object``} : Type, video and audio configuration.

  _returns_:
  - The status of given capabilities.

  ```js
    const capabilities = await mediaCapabilitiesProber.getDecodingCapabilities(
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
    );
  ```

  __getDisplayCapabilities()__

   _arguments_: 
  - config {``Object``} : Display configuration.

  _returns_:
  - The status of given capabilities.

  ```js
    const capabilities = await mediaCapabilitiesProber.getDisplayCapabilities(
      {
        colorSpace: "p3",
        width: 3840,
        height: 2160,
        bitsPerComponent: 10,
      }
    );
  ```

Usage :

```js
import { MediaCapabilitiesProber } from "rx-player";

const configurationSupport = MediaCapabilitiesProber.getCapabilities(config);
configurationSupport.then((result) => {
  // ...
}); 
```