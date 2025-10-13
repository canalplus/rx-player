<p align="center">
  <img src="./doc/static/img/logo.png#gh-light-mode-only" alt="RxPlayer's logo"/>
  <img src="./doc/static/img/logo-white.png#gh-dark-mode-only" alt="RxPlayer's logo"/>
  <br /><br />
  <a href="https://developers.canal-plus.com/rx-player/doc/api/Overview.html">📖 <b>API documentation</b></a>
  -
  <a href="https://developers.canal-plus.com/rx-player/">⏯ <b>Demo</b></a>
  -
  <a href="https://developers.canal-plus.com/rx-player/doc/Getting_Started/Welcome.html">🎓 <b>Getting Started</b></a>
  -
  <a href="./CONTRIBUTING.md">🔧 <b>Contributing</b></a>
  <br /><br />
  <a href="https://github.com/canalplus/rx-player/releases"><img src="https://img.shields.io/badge/dynamic/json.svg?label=Latest%20release&url=https://api.github.com/repos/canalplus/rx-player/releases/latest&query=$.tag_name&colorB=blue" /></a>
  <a href="https://github.com/canalplus/rx-player/actions/workflows/checks.yml"><img src="https://github.com/canalplus/rx-player/actions/workflows/checks.yml/badge.svg" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=rx-player"><img src="https://sonarcloud.io/api/project_badges/measure?project=rx-player&metric=alert_status" /></a>
  <br /><br />
  <a href="https://nodei.co/npm/rx-player/"><img src="https://nodei.co/npm/rx-player.png?compact=true)" /></a>
</p>

The RxPlayer is a library implementing a
[DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP) and
[Microsoft Smooth Streaming](https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming#Microsoft_Smooth_Streaming)
media player on a browser, by relying on the HTML5
[Media Source Extensions](https://en.wikipedia.org/wiki/Media_Source_Extensions) and
[Encrypted Media extensions](https://en.wikipedia.org/wiki/Encrypted_Media_Extensions)
browser APIs.

This library only implements the core, non-UI part of a media player - you provide the
interface while it handles the streaming. See our
[demo page](https://developers.canal-plus.com/rx-player/) for an example implementation.

Initially built for Canal+'s complex requirements across diverse devices, it prioritizes
configurability and integration flexibility.

---

The RxPlayer can be seen as the "engine" providing adaptive streaming capabilities to an
application:

- Beyond DASH and Smooth Streaming support (and HLS on devices with native support like
  Safari), it handles complex scenarios like multiple DRM keys, fallback mechanisms for
  undecipherable or undecodable qualities, most subtitle formats and advanced heuristics
  to keep the playback going.

- Multi-threaded architecture: core logic can be offloaded to a separate thread, keeping
  the player from blocking your application and vice-versa.

- Production-tested across a wide device range: from low-end set-top boxes to high-end
  computers, with optimizations for constrained environments.

- Highly configurable with
  [a well-documented API](https://developers.canal-plus.com/rx-player/doc/api/Overview.html):
  player behavior can be controlled at a granular level.

## How to use it?

The fastest way to use the player directly in your code is to add this repository as a
dependency.

You can do it via [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/):

```sh
# when using npm:
npm install --save rx-player

# or, when using yarn instead:
yarn add rx-player
```

You can then directly import and use the RxPlayer in your code:

```js
import RxPlayer from "rx-player";

const player = new RxPlayer({
  videoElement: document.querySelector("video"),
});

// play a video
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```

We've also written short tutorials to help you familiarize with the RxPlayer API:

- [Quick start into the API](https://developers.canal-plus.com/rx-player/doc/Getting_Started/Tutorials/Quick_Start.html).
- [Playing contents with DRMs](https://developers.canal-plus.com/rx-player/doc/Getting_Started/Tutorials/Content_with_DRM.html).
- [Selecting a track](https://developers.canal-plus.com/rx-player/doc/Getting_Started/Tutorials/Selecting_a_Track.html)
- [Listening to events contained in the content](https://developers.canal-plus.com/rx-player/doc/Getting_Started/Tutorials/EventStream_Handling.html)

To be able to play with the player without needing to perform any setup we also created
multiple live-editable demos:

- [Playing a clear DASH content](https://codesandbox.io/s/rx-player-classic-wc38j)
- [Playing an encrypted DASH content](https://codesandbox.io/p/sandbox/rx-player-drm-forked-nf6tnx)
- [Playing an RxPlayer-specific MetaPlaylist content](https://codesandbox.io/p/sandbox/rx-player-metaplaylist-forked-4ww55x)

### Minimal Builds

To reduce the size of the final code, you might also want to import a minimal version of
the player and only import the features you need. This is documented
[here ](https://developers.canal-plus.com/rx-player/doc/Getting_Started/Minimal_Player.html):

For example, to play encrypted DASH contents, you could just write:

```js
import RxPlayer from "rx-player/minimal";
import { DASH, EME } from "rx-player/features";

// Allow to play encrypted DASH contents
RxPlayer.addFeatures([DASH, EME]);
```

## API

We documented the API in every little detail in
[the API documentation](https://developers.canal-plus.com/rx-player/doc/api/Overview.html).

You can also refer to the documentation of our previous versions
[here](https://developers.canal-plus.com/rx-player/documentation_pages_by_version.html)

These documentation pages are automatically generated from the content of the
[doc/api](./doc/api/Overview.md) directory in this repository.

## Demo

You can view our online Demo, built from our last version,
[here](https://developers.canal-plus.com/rx-player/).

This demo is a small application written in [React](https://github.com/facebook/react)
demonstrating a simple usage of the player.

Demo pages for our previous versions are also available
[here](https://developers.canal-plus.com/rx-player/demo_page_by_version.html).

## Contribute

After cloning our repo, you should first install our dependencies via
[npm](https://www.npmjs.com/):

```sh
npm install
```

You can then run the `list` script to see the different scripts provided to test your
modifications, run a demo locally etc.:

```sh
npm run list
```

Details on how to contribute is written in the [CONTRIBUTING.md file](./CONTRIBUTING.md)
at the root of this repository.

## Features

Key features:

- live and VoD DASH (including low-latency) / Smooth / HLS* / Downloaded contents / MP4* /
  WebM\* contents and more.

- advanced encryption configuration: multiple keys in a single or separate licenses for a
  given content, automatic fallbacks on undecipherable contents, persistent licenses,
  complex `MediaKeySystemConfiguration`.

- TTML, WebVTT, SAMI and SRT subtitles.

- multi-threading support.

- extensive APIs: audio-only, video track selection, manual garbage collection of
  segments, Peer-To-Peer integration, quality filtering...

- adaptive streaming algorithms: both a network-based for quick start-up and buffer-based
  to provide the best quality possible.

- complex segment scheduling logic: prioritizing closer media segments while making sure
  that the bandwidth usage is always optimal and the rebuffering risks always low.

- heuristics to ensure playback stays smooth, the RxPlayer monitors playback and take
  actions if the current device has issues while decoding the stream.

- optional WebAssembly-based MPD parser for DASH contents (for very large Manifests).

\* In "directfile" mode, on compatible browsers
