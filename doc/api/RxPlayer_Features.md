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
| `DASH` [1] [2]           | Enable DASH playback using a JavaScript-based MPD parser  |
| `DIRECTFILE`             | Enable playback of "directfile" contents                  |
| `EME`                    | Enable playback of encrypted contents                     |
| `HTML_SRT_PARSER` [3]    | Parse SRT text tracks for the `"html"` `textTrackMode`    |
| `HTML_VTT_PARSER` [3]    | Parse VTT text tracks for the `"html"` `textTrackMode`    |
| `HTML_TTML_PARSER` [3]   | Parse TTML text tracks for the `"html"` `textTrackMode`   |
| `HTML_SAMI_PARSER` [3]   | Parse SAMI text tracks for the `"html"` `textTrackMode`   |
| `NATIVE_SRT_PARSER` [3]  | Parse SRT text tracks for the `"native"` `textTrackMode`  |
| `NATIVE_VTT_PARSER` [3]  | Parse VTT text tracks for the `"native"` `textTrackMode`  |
| `NATIVE_TTML_PARSER` [3] | Parse TTML text tracks for the `"native"` `textTrackMode` |
| `NATIVE_SAMI_PARSER` [3] | Parse SAMI text tracks for the `"native"` `textTrackMode` |
| `DEBUG_ELEMENT`          | Allows to use the `createDebugElement` RxPlayer method    |
| `DASH_WASM` [1] [2] [5]  | Enable DASH playback using a WebAssembly-based MPD parser |
| `LOCAL_MANIFEST` [4]     | Enable playback of "local" contents                       |
| `METAPLAYLIST` [4]       | Enable playback of "metaplaylist" contents                |
| `NATIVE_TEXT_BUFFER` [6] | (Deprecated) Base for the `"native"` `textTrackMode`.     |
| `HTML_TEXT_BUFFER` [6]   | (Deprecated) Base for the `"html"` `textTrackMode`.       |

---

**Notes**:

**[1]**: In cases where both the `DASH` and `DASH_WASM` features are added (which are both
parsers for DASH contents), the RxPlayer will default using the WebAssembly parser
(provided by `DASH_WASM`) and fallback on the JavaScript parser (provided by `DASH`) when
it cannot do so.

**[2]**: Both the `DASH` and `DASH_WASM` features only concern DASH contents loaded in
main thread. If you just want to load DASH content in
[`"multithread"` mode](../api/Miscellaneous/MultiThreading.md), you don't need any of
those features, but the `MULTI_THREAD` feature instead.

**[3]**: The `"native"` and `"html"` `textTrackMode` are options set when loading a new
content through the [`loadVideo` method](../api/Loading_a_Content.md). To help you choose
between those two:

- The `"native"` mode relies on HTMLTrackElement (`<track>` tags) to display subtitles.
  This does not need any setup but may lead to poorly stylized subtitles. You may rely on
  this if you don't need advanced subtitles stylization.
- The `"html"` mode relies on regular HTMLElement (like `<div>` and such) to display
  subtitles. It allows more powerful stylization but will need a parent `textTrackElement`
  to also be provided on that same `loadVideo` call (as documented
  [in the corresponding API documentation page](../api/Loading_a_Content.md).

**[4]**: Those features are experimental. They should be imported from
`rx-player/experimental/features`.

**[5]**: The `DASH_WASM` feature has its own setup, detailed in the
[corresponding documentation page](../api/Miscellaneous/DASH_WASM_Parser.md).

**[6]**: Both the `NATIVE_TEXT_BUFFER` and `HTML_TEXT_BUFFER` features are deprecated.
They are already implicitly imported when parsing any of the corresponding text parsers.

**[7]**: The `MULTI_THREAD` feature has its own setup, detailed in the
[corresponding documentation page](../api/Miscellaneous/MultiThreading.md).

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
