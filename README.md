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
media player on a browser, by relying on the HTML5
[Media Source Extensions](https://en.wikipedia.org/wiki/Media_Source_Extensions)
and [Encrypted Media extensions](https://en.wikipedia.org/wiki/Encrypted_Media_Extensions)
browser APIs.

---

Originally designed to power Canal+ many applications, the RxPlayer is today
used in production by several companies in multiple countries and runs on most
devices where a browser can run: Computers, phones, set-top-boxes, smart TVs,
game consoles and other peculiar environments are all supported and able to
profit from its many features.

Its main goals are:

  - __Stability__: The RxPlayer can play live and On Demand DASH and Smooth
    contents for extended amounts of time, with or without DRM - without any
    performance, memory or logic issue.

    If you encounter a new issue while using it, we'll be very happy to help
    fixing it. Any encountered bug is put at high priority.

  - __Quality of experience__: It aims to play the best possible quality
    without any rebuffering.

    Unsupported codecs and undecipherable qualities (e.g. higher qualities with
    more drastic DRM conditions on untrusted devices) are automatically
    filtered out, even if this happens during playback.

    The player is also very resilient: any temporary network issue, fall in
    bandwidth, poorly-packaged content or platform quirk should be properly
    handled with the main goal of avoiding playback interruption.

  - __Portability__: The RxPlayer has been ported to a lot of devices, some on
    the lower-end of performance and memory capabilities and others on the higher end.

    As such, it can adapt to important memory and performance constraints while
    still being able to retain its many features.

  - __Configurability__: The RxPlayer has a plethora of options to let you tweak
    its behavior.
    You should be able to play any content the way you want, on any device.

    You should also be able to integrate complex supplementary logic like
    Peer-to-Peer solutions.

  - __Easy to use__: We try hard to make this player easy to integrate and to
    use in various codebases.

    Even for the more advanced options, we aim to make our documentation as
    legible and as complete as possible.

The RxPlayer has probably already all the features you want :)!

Even if that's not the case, we will be very pleased to exchange with you on it
and look forward for external contributions.


## How to use it? ##############################################################

The fastest way to use the player directly in your code is to add this
repository as a dependency.

You can do it via [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/):
```sh
# when using npm:
npm install --save rx-player

# or, when using yarn instead:
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

To be able to play with the player without needing to perform any setup we also
created multiple live-editable demos:
 - [Playing a clear DASH content](https://codesandbox.io/s/rx-player-classic-wc38j)
 - [Playing an encrypted DASH content](https://codesandbox.io/s/rx-player-drm-g51hb)
 - [Playing an RxPlayer-specific MetaPlaylist content](https://codesandbox.io/s/rx-player-metaplaylist-l0t0d)

### Minimal Builds #############################################################

To reduce the size of the final code, you might also want to import a minimal
version of the player and only import the features you need. This is documented
[here
](https://canalplus.github.io/rx-player/doc/pages/api/minimal_player.html):

For example, to play encrypted DASH contents, you could just write:
```js
import RxPlayer from "rx-player/minimal";
import { DASH, EME } from "rx-player/features";

// Allow to play encrypted DASH contents
RxPlayer.addFeatures([DASH, EME]);
```


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

After cloning our repo, you should first install our dependencies via either
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
npm run list
```

Builds are included in the ``dist/`` directory (builds based on the last version
are already included there).



## Why a new player? ###########################################################

### A need for an advanced media player ########################################

Canal+ Group is a media company with many advanced needs when it comes to media
playback: it provides both live and VoD stream with multiple encryption
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

Now, more than 6 years later, the RxPlayer continues to evolve at the same fast
pace to include a lot of features and improvements you may not find in other
media players.
You can look at our
[API documentation](https://canalplus.github.io/rx-player/doc/pages/api/index.html),
[tutorials](https://canalplus.github.io/rx-player/doc/pages/tutorials/index.html)
and our [demo page](https://canalplus.github.io/rx-player/doc/pages/api/index.html)
(an RxPlayer instance is available in the console through the global `player`
variable there) to see if it matches your need.


### A featureful player ########################################################

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

  - an available WebAssembly-based MPD parser for DASH contents, allowing to
    drastically reduce the loading time and memory usage of larger contents.

  - advanced APIs for advanced use-cases (audio-only mode, video track
    selection, manual garbage collection of segments, Peer-To-Peer
    integration, quality filtering...)

  - advanced adaptive streaming algorithms making use of both a network-based
    approach (for quick start-up) and a buffer-based one (to provide the best
    quality possible).

  - advanced optimizations for devices with low memory constraints

  - a complex segment scheduling logic, prioritizing closer media segments while
    making sure that the bandwidth usage is always optimal and the rebuffering
    risks always low.

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
