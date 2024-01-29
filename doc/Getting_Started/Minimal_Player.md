# Importing a minimal player with feature selection

## Overview

The RxPlayer comes with many features, even some you might never need. For example, you
may only care for DASH with TTML subtitles and not about Smooth streaming, VTT or SRT
parsing.

Because each implementation has its need, we permit multiple ways to import the player
with limited features.

This customization can be done by importing the minimal version of the RxPlayer and then
adding only the features your want. This allows to greatly reduce the final bundle size,
if your bundler (esbuild, webpack, rollup, vite...) support
[tree-shaking](https://en.wikipedia.org/wiki/Tree_shaking), like most do.

## How it works

If you imported the RxPlayer library through the npm package (like via the
`npm install rx-player` command), you can import a minimal version of the player by
importing it from `"rx-player/minimal"`:

```js
import MinimalRxPlayer from "rx-player/minimal";

// This player has the same API than the RxPlayer, but with no feature
// (e.g. no DASH, Smooth or Directfile playback)
const player = new MinimalRxPlayer();

// use the regular APIs...
player.setVolume(0.5);
```

You then will need to add the features you want on it. Those can be accessed through the
path `"rx-player/features"`:

```js
// import the DASH and Smooth features, which will be added to the RxPlayer
import { DASH, SMOOTH } from "rx-player/features";
```

At last you can add those features to the imported RxPlayer class by calling the
`addFeatures` static method:

```js
// addFeatures takes an array of features as argument
MinimalRxPlayer.addFeatures([DASH, SMOOTH]);
```

Here is the complete example:

```js
import MinimalRxPlayer from "rx-player/minimal";
import { DASH, SMOOTH } from "rx-player/features";

MinimalRxPlayer.addFeatures([DASH, SMOOTH]);
```

There is also "experimental" features. Such features can completely change from one
version to the next - unlike regular features which just follows semantic versioning. This
means that you may have to keep the concerned code up-to-date each time you depend on a
new RxPlayer version. Such features are imported from `"rx-player/experimental/features"`
instead:

```js
import MinimalRxPlayer from "rx-player/minimal";
import { LOCAL_MANIFEST } from "rx-player/experimental/features";

MinimalRxPlayer.addFeatures([LOCAL_MANIFEST]);
```

You can of course depend on both experimental and regular features:

```js
import MinimalRxPlayer from "rx-player/minimal";
import { DASH, SMOOTH } from "rx-player/features";
import { LOCAL_MANIFEST } from "rx-player/experimental/features";

MinimalRxPlayer.addFeatures([DASH, SMOOTH, LOCAL_MANIFEST]);
```

By using the minimal version, you will reduce the final bundle file **if tree-shaking is
performed on the final code (like in webpack's production mode)**.

The key is just to know which feature does what. You can refer to the
[RxPlayer Features documentation page](../api/RxPlayer_Features.md) for this.
