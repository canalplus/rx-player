# Rx-player

The Rx-player is a JavaScript library implementing a [DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP) and [Microsoft Smooth Streaming](https://www.iis.net/downloads/microsoft/smooth-streaming) video player directly on the browser, without plugins. It relies on HTML5 [Media Source Extensions](https://en.wikipedia.org/wiki/Media_Source_Extensions) and [Encrypted Media extensions](https://en.wikipedia.org/wiki/Encrypted_Media_Extensions).

It is currently used in production for premium services and targets several devices, such as computers, phones, but also set-top-boxes, smart TVs and other peculiar environments.

Its main goals are:
  - To play live and On Demand Smooth and DASH contents for extended amounts of time, with or without DRM
  - To offer a first-class user experience (best quality without any buffering, low latency...)
  - To be configurable and extendable (e.g. for Peer-to-Peer streaming, STB integration...)
  - To be easy to integrate and use as a library in various codebases.

Latest release: ``v3.0.0``

## API

We documented the API in every little details in [the API documentation](./doc/api/index.md).

## Demo

You can view our online Demo, built from our last version, [here](http://canalplus.github.io/rx-player/).

This demo is a small application written in [React](https://github.com/facebook/react) demonstrating a simple usage of the player.

## How to use it?

The fastest way to use our player directly in your code is to add this repository as a dependency. You can do it via npm:
```
npm install --save rx-player
```

You can then directly import and use the Rx-Player in your code:
```js
// import it ES6 style:
import RxPlayer from "rx-player";

// same in CommonJS style:
// const RxPlayer = require("rx-player");

// instantiate it
const player = new RxPlayer({ videoElement: document.getElementById("my-video") });

// play a video
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true
});
```

You can now also perform your own [custom build](./doc/api/custom_builds.md) with only the features you need to reduce the file size.

## Your questions

You can ask directly your questions about the project on [our gitter](https://gitter.im/canalplus/rx-player). We will try our best to answer them as quickly as possible.

## Contribute

You can help and contribute either by:
  - reporting bugs directly on the [issues tab](https://github.com/canalplus/rx-player/issues) on top of this page.
  - adding new features / fixing bugs and doing a pull request (please open an issue first for that).

If you have any questions about contributing, you can ask it in our [gitter room](https://gitter.im/canalplus/rx-player). We also began to add a little architecture documentation (at the moment only about the file organization [here](./doc/architecture/files.md)). More is coming soon!

### Dependencies

After cloning our repo, you should first install our dependencies via [npm](https://www.npmjs.com/):
```sh
npm install
```

### Build

We use npm scripts to bundle, lint and test the player. Here are some examples:
```sh
# build the player in dist/rx-player.js
npm run build

# lint the code with eslint
npm run lint

# launch the demo on a local server (http://127.0.0.1:8000)
npm run start

# launch our test suite on various browsers
npm run test

# list all available npm scripts
npm run info
```

Builds are included in the ``dist/`` directory (builds based on the last version are already included there).

## Why a new player? Why Rx?

Building a streaming video player in javascript is a complex task due to the numerous interactions with the outside world it has to deal with. Whether they come from the user providing an input, network interactions or browser capabilities. If you add the speed with which browsers APIs are changed and added, you end up with a really important (both in the significant and large sense) piece of software. The video player being the centerpiece of our applications, it needs to adapt very quickly and stay resilient to various errors.

Many current video player implementations rely mostly on classical object-oriented hierarchy and imperative event callbacks with shared mutable objects to manage all these asynchronous tasks and states. We found that we could profit a lot more from adding a reactive-programming approach, with most notably the help of [the RxJS library](https://github.com/ReactiveX/rxjs).

RxJS provides gracious interfaces and operators to compose asynchronous tasks together by representating changing states as observable stream of values. It also comes with a **cancelation** contract so that every asynchronous side-effect can be properly disposed when discarded by the system. This change of paradigm answers gracefully to most of our needs.

This helps us to build what we think is a _maintainable_ and _evolutive_ codebase, allowing us to adapt quickly to very active standards.

## Target support

Here is a basic list of supported platforms:

|             |  Chrome   |   IE [1]  |  Edge   |  Firefox  |  Safari  |  Opera  |
|-------------|:---------:|:---------:|:-------:|:---------:|:--------:|:-------:|
| Windows     |   >= 30   |   >= 11   |  >= 12  |   >= 42   |   >= 8   |  >= 25  |
| OSX         |   >= 30   |     -     |    -    |   >= 42   |   >= 8   |  >= 25  |
| Linux       |   >= 37   |     -     |    -    |   >= 42   |    -     |  >= 25  |
| Android [2] |   >= 30   |     -     |    -    |   >= 42   |    -     |  >= 15  |
| iOS         |    No     |     -     |    -    |    No     |    No    |    No   |

[1] Only on Windows >= 8.

[2] Android version >= 4.2

And more. A good way to know if the browser should be supported by our player is to go
on the page https://www.youtube.com/html5 and check support for MSE & H.264.
