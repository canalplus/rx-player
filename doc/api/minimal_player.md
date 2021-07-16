# Minimal player with Feature selection ########################################


## Overview ####################################################################

The RxPlayer comes with many features, even some you might never need.
For example, you may only care for DASH with TTML subtitles and not about
Smooth streaming, VTT or SRT parsing.

Because each implementation has its need, we permit multiple ways to import
the player with limited features.
This principally leads to a smaller file size.

This customization can be done through two principal ways:

  - by importing a minimal version and then adding only the features your want

  - by setting environment variables at build time


The first solution is the most straightforward and should be used in most
usecases. The main disadvantages of this solution are that to reduce file size:

  - you will need to use a module-bundler or minifier which performs
    [tree-shaking](https://en.wikipedia.org/wiki/Tree_shaking), like webpack's
    production mode or rollup.

  - you will need to use the package published on npm (as opposed to the git
    repository directly).


The second solution will always work but needs you to build the bundle yourself
through our npm scripts.



## Importing a minimal version #################################################

### How it works ###############################################################

If you imported the RxPlayer library through the npm package (like via the ``npm
install rx-player`` command), you can import a minimal version of the player by
importing it from `"rx-player/minimal"`:

```js
import MinimalRxPlayer from "rx-player/minimal";

// This player has the same API than the RxPlayer, but with no feature
// (e.g. no DASH, Smooth or Directfile playback)
const player = new MinimalRxPlayer();

// use the regular APIs...
player.setVolume(0.5);
```

You then will need to add the features you want on it. Those can be accessed
through the path `"rx-player/features"`:

```js
// import the DASH and Smooth features, which will be added to the RxPlayer
import { DASH, SMOOTH } from "rx-player/features";
```

At last you can add those features to the imported RxPlayer class by calling the
special ``addFeatures`` static method, which is only present on the minimal
version of the Player:

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

There is also "experimental" features. Such features can completely change from
one version to the next - unlike regular features which just follows semantic
versioning. This means that you may have to keep the concerned code up-to-date
each time you depend on a new RxPlayer version.
Such features are imported from `"rx-player/experimental/features"` instead:

```js
import MinimalRxPlayer from "rx-player/minimal";
import { DASH_WASM } from "rx-player/experimental/features";

MinimalRxPlayer.addFeatures([DASH_WASM]);
```

You can of course depend on both experimental and regular features:

```js
import MinimalRxPlayer from "rx-player/minimal";
import { DASH, SMOOTH } from "rx-player/features";
import { DASH_WASM } from "rx-player/experimental/features";

MinimalRxPlayer.addFeatures([DASH, SMOOTH, DASH_WASM]);
```

By using the minimal version, you will reduce the final bundle file __if
tree-shaking is performed on the final code (like in webpack's production
mode)__.

The key is just to know which feature does what. The next chapter will list
and explain the role of every one of them.


### List of features ###########################################################

Features, which are variables imported from the ``"rx-player/features"`` path,
are all objects declared in upper-case.

Here is the anotated exhaustive list (notes are at the bottom of the table):

| Feature                  | Description of the feature                                 |
| ------------------------ | --------------------------------------------------------   |
| `SMOOTH`                 | Enable Smooth streaming (HSS) playback                     |
| `DASH`                   | Enable DASH playback using a JavaScript-based MPD parser   |
| `DIRECTFILE`             | Enable playback of "directfile" contents                   |
| `EME`                    | Enable playback of encrypted contents                      |
| `NATIVE_TEXT_BUFFER` [1] | Allow to display text tracks through \<tracks\> elements   |
| `HTML_TEXT_BUFFER` [1]   | Allow to display richer text tracks through HTML elements  |
| `NATIVE_SRT_PARSER` [2]  | Parse SRT text tracks for the native text buffer           |
| `NATIVE_VTT_PARSER` [2]  | Parse VTT text tracks for the native text buffer           |
| `NATIVE_TTML_PARSER` [2] | Parse TTML text tracks for the native text buffer          |
| `NATIVE_SAMI_PARSER` [2] | Parse SAMI text tracks for the native text buffer          |
| `HTML_SRT_PARSER` [3]    | Parse SRT text tracks for the HTML text buffer             |
| `HTML_VTT_PARSER` [3]    | Parse VTT text tracks for the HTML text buffer             |
| `HTML_TTML_PARSER` [3]   | Parse TTML text tracks for the HTML text buffer            |
| `HTML_SAMI_PARSER` [3]   | Parse SAMI text tracks for the HTML text buffer            |
| `DASH_WASM` [4] [5]      | Enable DASH playback using a WebAssembly-based MPD parser  |
| `LOCAL_MANIFEST` [4]     | Enable playback of "local" contents                        |
| `METAPLAYLIST` [4]       | Enable playback of "metaplaylist" contents                 |

---

__Notes__:

__[1]__: You will need to also add at least one parser for this type of buffer
 for those features to be useful.
 (example: ``NATIVE_SRT_PARSER`` will parse srt subtitles for the
 ``NATIVE_TEXT_BUFFER``)

__[2]__: Those features will only be used if ``NATIVE_TEXT_BUFFER`` is an added
feature.

__[3]__: Those features will only be used if ``HTML_TEXT_BUFFER`` is an added
feature.

__[4]__: Those type of contents are experimental. They should be imported
from `rx-player/experimental/features`.

__[5]__: In cases where both the `DASH` and `DASH_WASM` features are added
(which are both parsers for DASH contents), the RxPlayer will default using the
WebAssembly parser (provided by `DASH_WASM`) and fallback on the JavaScript
parser (provided by `DASH`) when it cannot do so.

---


### Examples ###################################################################

To help you choose your features, are some examples that represents common
usecases.

#### unencrypted DASH contents with native webVTT subtitles

```js
import RxPlayer from "rx-player/minimal";
import {
  DASH,
  NATIVE_TEXT_BUFFER,
  NATIVE_VTT_PARSER
} from "rx-player/features";

RxPlayer.addFeatures([DASH, NATIVE_TEXT_BUFFER, NATIVE_VTT_PARSER]);
```

#### possibly-encrypted DASH contents with HMTL webVTT and TTML subtitles

```js
import RxPlayer from "rx-player/minimal";
import {
  DASH,
  EME,
  HTML_TEXT_BUFFER,
  HTML_VTT_PARSER,
  HTML_HTML_PARSER
} from "rx-player/features";

RxPlayer.addFeatures([
  DASH,
  EME,
  HTML_TEXT_BUFFER,
  HTML_VTT_PARSER,
  HTML_TTML_PARSER
]);
```


## Building with environment variables #########################################

### How it works ###############################################################

You can also include only the features you need on the RxPlayer library by
building it while having specific environment variables.

The code related to the unwanted features should be removed when the final code
is minified (as the corresponding code is made unreachable).

To avoid any conflict with other environment variables, they all are named
``RXP_<FEATURE-NAME>``.

For example, the following will remove all code related to Microsoft Smooth
Streaming from the build:

```sh
RXP_SMOOTH=false npm run build:min
```


### List of environment variables ##############################################

<a name="env-smooth"></a>
#### RXP_SMOOTH
True by default. If set to "false", all code relative to HSS streaming will be
ignored during a build.

<a name="env-dash"></a>
#### RXP_DASH
True by default. If set to "false", all code relative to DASH streaming will be
ignored during a build.

<a name="env-dash"></a>
#### RXP_DIRECTFILE
True by default. If set to "false", all code relative to directfile streaming
will be ignored during a build.

<a name="env-local"></a>
#### RXP_LOCAL_MANIFEST
False by default. If set to "true", all code relative to the "local" transport
(to be able to play content offline for example) will be included during a
build.

<a name="env-metaplaylist"></a>
#### RXP_METAPLAYLIST
False by default. If set to "true", all code relative to metaplaylist streaming
will be included during a build.

<a name="env-eme"></a>
#### RXP_EME
True by default. If set to "false", all code relative to encrypted contents will
be ignored during a build.

<a name="env-native-ttml"></a>
#### RXP_NATIVE_TTML
True by default. If set to "false", all code relative to TTML parsing for native
text tracks will be ignored during a build.

<a name="env-native-sami"></a>
#### RXP_NATIVE_SAMI
True by default. If set to "false", all code relative to SAMI parsing for native
text tracks will be ignored during a build.

<a name="env-native-vtt"></a>
#### RXP_NATIVE_VTT
True by default. If set to "false", all code relative to VTT parsing for native
text tracks will be ignored during a build.

<a name="env-native-srt"></a>
#### RXP_NATIVE_SRT
True by default. If set to "false", all code relative to SRT parsing for native
text tracks will be ignored during a build.

<a name="env-html-ttml"></a>
#### RXP_HTML_TTML
True by default. If set to "false", all code relative to TTML parsing for html
text tracks[[1]](#note-1) will be ignored during a build.

<a name="env-html-sami"></a>
#### RXP_HTML_SAMI
True by default. If set to "false", all code relative to SAMI parsing for html
text tracks[[1]](#note-1) will be ignored during a build.

<a name="env-html-vtt"></a>
#### RXP_HTML_VTT
True by default. If set to "false", all code relative to VTT parsing for html
text tracks[[1]](#note-1) will be ignored during a build.

<a name="env-html-srt"></a>
#### RXP_HTML_SRT
True by default. If set to "false", all code relative to SRT parsing for html
text tracks[[1]](#note-1) will be ignored during a build.

<a name="env-barebone"></a>
#### RXP_BAREBONE
If set to true, no feature is activated by default and all other environment
variables are considered as false by default (unless set).

For example, to only activate DASH, you could do:
```sh
RXP_BAREBONE=true RXP_DASH=true npm run build:min
```

<a name="env-env"></a>
#### RXP_ENV
Either "production" or "development". "production" as a default.
In the "development" case:
  - logs will be activated
  - the code will be less tolerant towards unwanted behavior
  - the code will be less optimized

---

__Notes__:

<a name="note-1"></a>__[1]__ html text tracks are tracks which are added to a
DOM element instead of a ``<track>`` (the latter here being called "native") tag
for a richer formatting.

---
