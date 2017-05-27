# Rx-player

The Rx-player is a JavaScript library implementing a [DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP) and [Microsoft Smooth Streaming](https://www.iis.net/downloads/microsoft/smooth-streaming) video player directly on the browser, without plugins. It relies on HTML5 [Media Source Extensions](https://en.wikipedia.org/wiki/Media_Source_Extensions) and [Encrypted Media extensions](https://en.wikipedia.org/wiki/Encrypted_Media_Extensions).

It is currently used in production for premium services and targets several devices, such as computers, phones, but also set-top-boxes and other peculiar environments.

Its main goals are:
  - To play live and On Demand Smooth and DASH contents for extended amounts of time, with or without DRM
  - To offer a first-class user experience (best quality without any buffering, low latency...)
  - To be configurable and extendable (e.g. for Peer-to-Peer streaming, STB integration...)
  - To be easy to integrate and use as a library in various codebases.

Latest release: ``v2.1.0``

## API

We documented the API in every little details in [the API documentation](./doc/api/index.md).

This project follows [semver](http://semver.org/). If you're already using our API, please make sure you're not using [deprecated methods or options](./doc/deprecated.md). Those will be removed on the next major version.

## Demo

You can view our online Demo, built from our last version, [here](http://canalplus.github.io/rx-player/).

This demo is a small application written in [React](https://github.com/facebook/react) demonstrating a simple usage of the player.

## How to use it?

The fastest way to use our player directly in your code is to add this repository as a dependency. You can do it via the npm install command:
```
npm install --save git+https://git@github.com/canalplus/rx-player.git
```

You can then either link directly to the `dist/rx-player.min.js` file (which is our last released version, ``v2.1.0``, compiled and minified):
```html
<script src="node_modules/rx-player/dist/rx-player.min.js"></script>
```

Or import it in your code with tools like [Browserify](http://browserify.org/) or [Webpack](http://webpack.github.io/):
```js
// CommonJS syntax
const Player = require("rx-player");

// ECMAScript 2015 syntax
import Player from "rx-player";
```

## Your questions

You can ask directly your questions about the project on [our gitter](https://gitter.im/canalplus/rx-player). We will try our best to answer them as quickly as possible.

## Contribute

You can help and contribute either by:
  - reporting bugs directly on the [issues tab](https://github.com/canalplus/rx-player/issues) on top of this page.
  - adding new features / fixing bugs and doing a pull request (please open an issue first for that).

If you have any questions about contributing, you can ask it in our [gitter room](https://gitter.im/canalplus/rx-player).

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

# launch the demo on a local server (port 8080)
npm run start

# launch our test suite on various browsers
npm run karma

# list all available npm scripts
npm run info
```

Builds are included in the ``dist/`` directory (builds based on the last version are already included there).

## Why a new player? Why Rx?

Building a streaming video player in javascript is a complex task due to the numerous interactions with the outside world it has to deal with. Whether they come from the user seeking at a particular moment of its movie, changing the current channel or the network congestion. The video player being the centerpiece of our applications, it needs to adapt very quickly to any of these inputs and stay resilient to various errors.

Many current video player implementations rely on classical object-oriented hierarchy and imperative event callbacks with shared mutable objects to manage all these asynchronous tasks and states. We found this approach to be the wrong abstraction to handle the complexity of a video player.

Rx on the contrary provides gracious interfaces and operators to compose asynchronous tasks together by representating changing states as observable stream of values. It also comes with a **cancelation** contract so that every asynchronous side-effect can be properly disposed when discarded by the system (this is still [a controversial issue in the JS community](https://github.com/whatwg/fetch/issues/27)).

This allowed us to implement some nice features quite easily. For instance, because in the rx-player all asynchronous tasks are encapsulated in observable data-structures, we were able to add a transparent [retry system](https://github.com/canalplus/canal-js-utils/blob/master/rx-ext.js#L73-L100) with a simple observable operator to declaratively handle any failure and replay the whole process.

Another example is the way we abstracted our transport layer into an observable pipeline, allowing us to support different type of streaming systems with its own asynchronous specifities. And because Rx is message-driven, this encapsulation allows us isolate the transport I/O into a WebWorker without any effort, or add an offline support for any pipeline implementation.

## Target support

Here is a basic list of supported platforms:

|             |  Chrome   |   IE [1]  |  Edge   |  Firefox  |  Safari  |  Opera  |
|-------------|:---------:|:---------:|:-------:|:---------:|:--------:|:-------:|
| Windows     |   >= 30   |   >= 11   |  >= 12  |   >= 42   |   >= 8   |  >= 25  |
| OX X        |   >= 30   |     -     |    -    |   >= 42   |   >= 8   |  >= 25  |
| Linux       |   >= 37   |     -     |    -    |   >= 42   |    -     |  >= 25  |
| Android [2] |   >= 30   |     -     |    -    |   >= 42   |    -     |  >= 15  |
| iOS         |    No     |     -     |    -    |    No     |    No    |    No   |

[1] Only on Windows >= 8.

[2] Android version >= 4.2

And more. A good way to know if the browser should be supported by our player is to go
on the page https://www.youtube.com/html5 and check support for MSE & H.264.
