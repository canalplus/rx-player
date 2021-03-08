---
id: howToUse-getStarted
title: How to use it?
sidebar_label: How to use it?
slug: how-to-use
---

The fastest way to use the player directly in your code is to add this
repository as a dependency.

You can do it via **npm** or **yarn**:

```
npm install --save rx-player
```

or

```
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
  videoElement: document.querySelector("video"),
});

// play a video
player.loadVideo({
  url:
    "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```
