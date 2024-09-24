# RxPlayer Features

## Overview

The RxPlayer has this concept of "features" which are functionalities which may or may not
be included to your build.

This allows to reduce bundle size by not including features you don't use, like parsers
for subtitles formats you don't depend on.

Which features you will need to import will depend on what RxPlayer's build you rely on;

- If you import the default RxPlayer build (e.g. through an
  `import RxPlayer from "rx-player` import), you will obtain an RxPlayer with most
  features, which should be sufficient for most use-cases. It already includes the
  following features (description of each available in the next chapter):

  - `SMOOTH`
  - `DASH`
  - `DIRECTFILE`
  - `EME`
  - `NATIVE_SRT_PARSER`
  - `NATIVE_VTT_PARSER`
  - `NATIVE_TTML_PARSER`
  - `NATIVE_SAMI_PARSER`
  - `HTML_SRT_PARSER`
  - `HTML_VTT_PARSER`
  - `HTML_TTML_PARSER`
  - `HTML_SAMI_PARSER`

- If you import the [RxPlayer's minimal build](../Getting_Started/Minimal_Player.md)
  however (e.g. through an `import RxPlayer from "rx-player/minimal` import), you will
  obtain an RxPlayer with no feature by default. In that case, you will probably need to
  add the features you want.

## `addFeatures` static method

New features can be added by calling the
[`addFeatures` static method](../api/RxPlayer_Features.md):

```js
import RxPlayer from "rx-player/minimal";
import { DASH } from "rx-player/features";

RxPlayer.addFeatures([DASH]);
```

## Features list

Features, which are variables imported from the `"rx-player/features"` path, are all
objects declared in upper-case.

Here is the anotated exhaustive list (notes are at the bottom of the table):

| Feature                  | Description of the feature                                |
| ------------------------ | --------------------------------------------------------- |
| `SMOOTH`                 | Enable Smooth streaming (HSS) playback                    |
| `DASH` [1]               | Enable DASH playback using a JavaScript-based MPD parser  |
| `DIRECTFILE`             | Enable playback of "directfile" contents                  |
| `EME`                    | Enable playback of encrypted contents                     |
| `NATIVE_SRT_PARSER` [2]  | Parse SRT text tracks for the `"native"` `textTrackMode`  |
| `NATIVE_VTT_PARSER` [2]  | Parse VTT text tracks for the `"native"` `textTrackMode`  |
| `NATIVE_TTML_PARSER` [2] | Parse TTML text tracks for the `"native"` `textTrackMode` |
| `NATIVE_SAMI_PARSER` [2] | Parse SAMI text tracks for the `"native"` `textTrackMode` |
| `HTML_SRT_PARSER` [2]    | Parse SRT text tracks for the `"html"` `textTrackMode`    |
| `HTML_VTT_PARSER` [2]    | Parse VTT text tracks for the `"html"` `textTrackMode`    |
| `HTML_TTML_PARSER` [2]   | Parse TTML text tracks for the `"html"` `textTrackMode`   |
| `HTML_SAMI_PARSER` [2]   | Parse SAMI text tracks for the `"html"` `textTrackMode`   |
| `BIF_PARSER`             | Parse BIF image tracks for the image buffer               |
| `DEBUG_ELEMENT` [3]      | Allows to use the `createDebugElement` RxPlayer method    |
| `DASH_WASM` [1] [3] [4]  | Enable DASH playback using a WebAssembly-based MPD parser |
| `LOCAL_MANIFEST` [3]     | Enable playback of "local" contents                       |
| `METAPLAYLIST` [3]       | Enable playback of "metaplaylist" contents                |
| `NATIVE_TEXT_BUFFER` [5] | (Deprecated) Base for the `"native"` `textTrackMode`.     |
| `HTML_TEXT_BUFFER` [5]   | (Deprecated) Base for the `"html"` `textTrackMode`.       |
| `IMAGE_BUFFER` [5]       | Allow to display thumbnails through the image buffer      |

---

**Notes**:

**[1]**: In cases where both the `DASH` and `DASH_WASM` features are added (which are both
parsers for DASH contents), the RxPlayer will default using the WebAssembly parser
(provided by `DASH_WASM`) and fallback on the JavaScript parser (provided by `DASH`) when
it cannot do so.

**[2]**: The `"native"` and `"html"` `textTrackMode` are options set when loading a new
content through the [`loadVideo` method](../api/Loading_a_Content.md). To help you choose
between those two:

- The `"native"` mode relies on HTMLTrackElement (`<track>` tags) to display subtitles.
  This does not need any setup but may lead to poorly stylized subtitles. You may rely on
  this if you don't need advanced subtitles stylization.
- The `"html"` mode relies on regular HTMLElement (like `<div>` and such) to display
  subtitles. It allows more powerful stylization but will need a parent `textTrackElement`
  to also be provided on that same `loadVideo` call (as documented
  [in the corresponding API documentation page](../api/Loading_a_Content.md).

**[3]**: Those features are experimental. They should be imported from
`rx-player/experimental/features`.

**[4]**: The `DASH_WASM` feature has its own setup, detailed in the
[corresponding documentation page](../api/Miscellaneous/DASH_WASM_Parser.md).

**[5]**: The `NATIVE_TEXT_BUFFER`, `HTML_TEXT_BUFFER` and `IMAGE_BUFFER` features are
deprecated. They are already implicitly imported when parsing any of the corresponding
text or image parsers.

---

## Examples

To help you choose your features, are some examples that represents common usecases.

### unencrypted DASH contents with native webVTT subtitles

```js
import RxPlayer from "rx-player/minimal";
import { DASH, NATIVE_VTT_PARSER } from "rx-player/features";

RxPlayer.addFeatures([DASH, NATIVE_VTT_PARSER]);
```

## possibly-encrypted DASH contents with HMTL webVTT and TTML subtitles

```js
import RxPlayer from "rx-player/minimal";
import { DASH, EME, HTML_VTT_PARSER, HTML_HTML_PARSER } from "rx-player/features";

RxPlayer.addFeatures([DASH, EME, HTML_VTT_PARSER, HTML_TTML_PARSER]);
```

## Building with environment variables (not recommended)

### How it works

If you don't want to or can't rely on tree shaking for your use-case but still would like
to remove features you don't want, you can also build yourself an RxPlayer while only
enabling specific features through environment variables. The code related to the unwanted
features should be removed when the final code is minified (as the corresponding code is
made unreachable).

To be able to do this, you will need to:

1. pull the RxPlayer's repository (for example, through a `git clone`)
2. install its dependencies (for example by calling `npm install` in that repository),
3. run its bundling script (`npm run build:min`) with the right environment variables.

To avoid any conflict with other environment variables, they all are named
`RXP_<FEATURE-NAME>`.

For example, the following will remove all code related to Microsoft Smooth Streaming from
the build:

```sh
RXP_SMOOTH=false npm run build:min
```

### List of environment variables

#### RXP_SMOOTH

True by default. If set to "false", all code relative to HSS streaming will be ignored
during a build.

#### RXP_DASH

True by default. If set to "false", all code relative to DASH streaming will be ignored
during a build.

#### RXP_DIRECTFILE

True by default. If set to "false", all code relative to directfile streaming will be
ignored during a build.

#### RXP_LOCAL_MANIFEST

False by default. If set to "true", all code relative to the "local" transport (to be able
to play content offline for example) will be included during a build.

#### RXP_METAPLAYLIST

False by default. If set to "true", all code relative to metaplaylist streaming will be
included during a build.

#### RXP_DEBUG_ELEMENT

False by default. If set to "true", the method RxPlayer's `createDebugElement` method will
be callable.

#### RXP_EME

True by default. If set to "false", all code relative to encrypted contents will be
ignored during a build.

#### RXP_NATIVE_TTML

True by default. If set to "false", all code relative to TTML parsing for native text
tracks will be ignored during a build.

#### RXP_NATIVE_SAMI

True by default. If set to "false", all code relative to SAMI parsing for native text
tracks will be ignored during a build.

#### RXP_NATIVE_VTT

True by default. If set to "false", all code relative to VTT parsing for native text
tracks will be ignored during a build.

#### RXP_NATIVE_SRT

True by default. If set to "false", all code relative to SRT parsing for native text
tracks will be ignored during a build.

#### RXP_HTML_TTML

True by default. If set to "false", all code relative to TTML parsing for html text tracks
[1] will be ignored during a build.

#### RXP_HTML_SAMI

True by default. If set to "false", all code relative to SAMI parsing for html text tracks
[1] will be ignored during a build.

#### RXP_HTML_VTT

True by default. If set to "false", all code relative to VTT parsing for html text tracks
[1] will be ignored during a build.

#### RXP_HTML_SRT

True by default. If set to "false", all code relative to SRT parsing for html text tracks
[1] will be ignored during a build.

#### RXP_BIF_PARSER

True by default. If set to "false", all code relative to BIF image parsing will be ignored
during a build.

#### RXP_BAREBONE

If set to true, no feature is activated by default and all other environment variables are
considered as false by default (unless set).

For example, to only activate DASH, you could do:

```sh
RXP_BAREBONE=true RXP_DASH=true npm run build:min
```

#### RXP_ENV

Either "production" or "development". "production" as a default. In the "development"
case:

- logs will be activated
- the code will be less tolerant towards unwanted behavior
- the code will be less optimized

---

**Notes**:

DOM element instead of a `<track>` (the latter here being called "native") tag for a
richer formatting.

---
