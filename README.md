 <p align="center">
  <img src="./doc/assets/logo.png" />
  <br /><br />
  <a href="https://canalplus.github.io/rx-player/doc/pages/api/index.html">📖 <b>API documentation</b></a>
  -
  <a href="https://developers.canal-plus.com/rx-player/">⏯ <b>Demo</b></a>
  -
  <a href="https://canalplus.github.io/rx-player/doc/pages/tutorials/index.html">🎓 <b>Tutorials</b></a>
  -
  <a href="./CONTRIBUTING.md">🔧 <b>Contributing</b></a>
  <br /><br />
  <a href="https://github.com/canalplus/rx-player/releases">
    <img src="https://img.shields.io/badge/dynamic/json.svg?label=Latest%20release&url=https://api.github.com/repos/canalplus/rx-player/releases/latest&query=$.tag_name&colorB=blue" />
 </a>
 <a href="https://travis-ci.org/canalplus/rx-player">
  <img src="https://travis-ci.org/canalplus/rx-player.svg?branch=master" />
 </a>
 <a href="https://gitter.im/canalplus/rx-player">
  <img src="https://img.shields.io/gitter/room/canalplus/rx-player.svg" />
 </a>
 <br /><br />
 <a href="https://nodei.co/npm/rx-player/">
  <img src="https://nodei.co/npm/rx-player.png?compact=true)" />
 </a>
</p>

The RxPlayer is a library implementing a [DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP)
and [Microsoft Smooth Streaming](https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming#Microsoft_Smooth_Streaming)
video player directly on the browser, without plugins.
It relies on HTML5 [Media Source Extensions](https://en.wikipedia.org/wiki/Media_Source_Extensions)
and [Encrypted Media extensions](https://en.wikipedia.org/wiki/Encrypted_Media_Extensions)
and is written in [TypeScript](http://www.typescriptlang.org/), a superset of
JavaScript.

It is currently used in production for premium services and targets several
devices, such as computers, phones, but also set-top-boxes, smart TVs and other
peculiar environments.

Its main goals are:

  - To play live and On Demand Smooth and DASH contents for extended amounts of
    time, with or without DRM

  - To offer a first-class user experience (best quality without any buffering,
    low latency...)

  - To be configurable and extendable (e.g. for Peer-to-Peer streaming, STB
    integration...)

  - To be easy to integrate and use as a library in various codebases.


## API #########################################################################

We documented the API in every little details in [the API
documentation](https://canalplus.github.io/rx-player/doc/pages/api/index.html).

You can also refer to the documentation of our previous versions
[here](https://developers.canal-plus.com/rx-player/documentation_pages_by_version.html)

These documentation pages are automatically generated from the content of the
[doc/api](./doc/api/index.md) directory in this repository.



## Demo ########################################################################

You can view our online Demo, built from our last version,
[here](https://developers.canal-plus.com/rx-player/).

This demo is a small application written in
[React](https://github.com/facebook/react) demonstrating a simple usage of the
player.

Demo pages for our previous versions are also available
[here](https://developers.canal-plus.com/rx-player/demo_page_by_version.html).


## How to use it? ##############################################################

The fastest way to use the player directly in your code is to add this
repository as a dependency. You can do it via npm:

```
npm install --save rx-player
# or, when using yarn instead of npm
yarn add rx-player
```

You can then directly import and use the RxPlayer in your code:
```js
// import it ES6 style:
import RxPlayer from "rx-player";

// same in CommonJS style:
// const RxPlayer = require("rx-player");

// instantiate it
const player = new RxPlayer({
  videoElement: document.querySelector("video")
});

// play a video
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true
});
```

We've also written [short
tutorials](https://canalplus.github.io/rx-player/doc/pages/tutorials/index.html)
to help you familiarize with the RxPlayer API:
  - [Quick start into the API](https://canalplus.github.io/rx-player/doc/pages/tutorials/quick_start.html).
  - [Playing contents with DRMs](https://canalplus.github.io/rx-player/doc/pages/tutorials/contents_with_DRM.html).
  - [Selecting a track](https://developers.canal-plus.com/rx-player/doc/pages/tutorials/track_selection.html)
  - [Listening to events contained in the content](https://canalplus.github.io/rx-player/doc/pages/tutorials/stream_events.html)

We also wrote Live Editable Demo to play with the API:
 - [Playing a clear dash content](https://codesandbox.io/s/rx-player-classic-wc38j)
 - [Playing an encrypted dash content](https://codesandbox.io/s/rx-player-drm-g51hb)
 - [Playing a metaplaylist content](https://codesandbox.io/s/rx-player-metaplaylist-l0t0d)

### Minimal Builds #############################################################

To reduce the size of the final code, you might also want to import a minimal
version of the player and only import the features you need. This is documented
[here
](https://canalplus.github.io/rx-player/doc/pages/api/minimal_player.html):

```js
import RxPlayer from "rx-player/minimal";
import { DASH, EME } from "rx-player/features";

// Allow to play encrypted DASH contents
RxPlayer.addFeatures([DASH, EME]);
```



## Your questions ##############################################################

You can ask directly your questions about the project on [our
gitter](https://gitter.im/canalplus/rx-player).
We will try our best to answer them as quickly as possible.



## Contribute ##################################################################

Details on how to contribute is written in the [CONTRIBUTING.md
file](./CONTRIBUTING.md) at the root of this repository.

If you need more information, you can contact us via our [gitter
room](https://gitter.im/canalplus/rx-player).


### Dependencies ###############################################################

After cloning our repo, you should first install our dependencies via
[npm](https://www.npmjs.com/):
```sh
npm install
```


### Build ######################################################################

We use npm scripts to bundle, lint and test the player. Here are some examples:
```sh
# build the player in dist/rx-player.js
npm run build

# lint the code in src/ with eslint
npm run lint

# launch the demo on a local server (http://127.0.0.1:8000)
npm run start

# launch our test suite on various browsers
npm run test

# list all available npm scripts
npm run info
```

Builds are included in the ``dist/`` directory (builds based on the last version
are already included there).



## Why a new player? ###########################################################

### A need for an advanced media player ########################################

Canal+ Group is a media company with many advanced needs when it comes to media
playback: it provides both live and VoD stream with many encryption
requirements, supports a very large panel of devices and has many other
specificities (like adult content restrictions, ad-insertion, Peer-To-Peer
integration...).

When the time came to switch from a plugin-based web player approach to an HTML5
one back in 2015, no media player had the key features we wanted, and including
those needs into an already existing media player would not be straightforward
either.

The R&D department of Canal+ Group thus started to work on a new featureful
media-player: the RxPlayer. To both help and profit from the community, it also
decided to share it to everyone under a permissive open-source licence.

Now, more than 5 years later, the RxPlayer continues to evolve at the same fast
pace to include a lot of features we don't find in other media players.
You can look at our
[API documentation](https://canalplus.github.io/rx-player/doc/pages/api/index.html),
[tutorials](https://canalplus.github.io/rx-player/doc/pages/tutorials/index.html)
and our [demo page](https://canalplus.github.io/rx-player/doc/pages/api/index.html)
(an RxPlayer instance is available in the console through the global `player`
variable there) to see if it matches your need.


### Our approach ###############################################################

As media players rely a lot on asynchronous interactions with the outside world
(HTTP requests, browser events, CDM messages), we felt that we could profit a
lot by adopting reactive programming patterns with the help of the RxJS library.
The abstractions provided by this library and the inclusion of cancellation
mechanisms (unlike say, ES6 Promises) were perfectly adapted to some of our
IO-heavy code.

With the help of a carefully-crafted and well-documented architecture, we were
able to quickly support avanced features when we - or the community - needed
them. Amongst those:

  - support for live and VoD DASH / Smooth / HLS* / Downloaded contents /
    MP4* / WebM* contents and more

  - support of advanced encryption configuration, such as multiple keys in a
    single or separate licences for a given content (with automatic fallbacks
    when we found an un-decipherable content), persistent licenses, and
    other device-specific restrictions.

  - support for low-latency DASH streams

  - support of TTML, WebVTT, SAMI and SRT subtitles

  - advanced optimizations for devices with low memory constraints

  - advanced APIs for advanced use-cases (audio-only mode, video track
    selection, manual garbage collection of segments, Peer-To-Peer
    integration, quality filtering...)

  - advanced adaptive streaming algorithms making use of both a network-based
    approach (for quick start-up) and a buffer-based one (to provide the best
    quality possible).

\* In "directfile" mode, on compatible browsers


## Target support ##############################################################

Here is a basic list of supported platforms:

|             | Chrome  |  IE [1] |  Edge  |  Firefox  |  Safari  |  Opera  |
|-------------|:-------:|:-------:|:------:|:---------:|:--------:|:-------:|
| Windows     |  >= 30  |  >= 11  |  >= 12 |   >= 42   |   >= 8   |  >= 25  |
| OSX         |  >= 30  |    -    |    -   |   >= 42   |   >= 8   |  >= 25  |
| Linux       |  >= 37  |    -    |    -   |   >= 42   |    -     |  >= 25  |
| Android [2] |  >= 30  |    -    |    -   |   >= 42   |    -     |  >= 15  |
| iOS         |   No    |    -    |    -   |    No     |    No    |    No   |

[1] Only on Windows >= 8.

[2] Android version >= 4.2

And more. A good way to know if the browser should be supported by our player is
to go on the page https://www.youtube.com/html5 and check for "Media Source
Extensions" support.
