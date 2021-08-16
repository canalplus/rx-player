---
id: TextTrackRenderer-tool
title: TextTrackRenderer
sidebar_label: TextTrackRenderer
slug: tools/text-track-renderer
---

## Overview

The TextTrackRenderer is a tool allowing to render subtitles synchronized with
a video element (or any HTMLMediaElement).

For now it supports the following formats:

- TTML
- webVTT
- srt
- sami

The video does not need to be played through the RxPlayer for the
TextTrackRenderer to work. It is a completely independent tool which just
rely on the video element for synchronization information.

## Brief summary

If you don't want to read all this documentation, here is a complete example of
how it can be used:

```js
// import TextTrackRenderer and the parsers we want
import TextTrackRenderer, {
  TTML_PARSER,
  VTT_PARSER,
  SRT_PARSER,
  SAMI_PARSER,
} from "rx-player/tools/TextTrackRenderer";

// Add the needed parsers to the TextTrackRenderer
TextTrackRenderer.addParsers([
  TTML_PARSER,
  VTT_PARSER,
  SRT_PARSER,
  SAMI_PARSER,
]);

// get video element the subtitles has to be synchronized to
const videoElement = document.querySelector("video");

// get HTML element in which the text track will be displayed
// Should generally be on top of the video, with the same size than it (but can
// also be in any shape, corresponding to your UI needs).
const textTrackElement = document.querySelector(".text-track-container");

const textTrackRenderer = new TextTrackRenderer({
  videoElement,
  textTrackElement,
});

// example: a ".srt" track
const exampleSRT = `1
00:00:01,600 --> 00:00:04,200
English (US)

2
00:00:05,900 --> 00:00:07,999
This is a subtitle in American English

3
00:00:10,000 --> 00:00:14,000
Adding subtitles is very easy to do
`;

try {
  textTrackRenderer.setTextTrack({
    data: exampleSRT,
    type: "srt", // or "ttml" / "vtt" / "sami"
    // timeOffset: 2.3, // optional offset in seconds to add to the subtitles
  });
} catch (e) {
  console.error(`Could not parse the subtitles: ${e}`);
}
```

## How to import it

The TextTrackRenderer alone can be imported as such:

```ts
import TextTrackRenderer from "rx-player/tools/TextTrackRenderer";
```

But just importing the TextTrackRenderer alone is pointless, you also have to
import the text track parsers you want to use manually (this is a choice we
made to avoid wasting space for subtitles formats you might not want).

To import the parsers you want, you just have to do something along the line
of:

```js
// Add two parsers to the TextTrackRenderer: one for TTML subtitles and one for
// srt subtitles
import TextTrackRenderer, {
  TTML_PARSER,
  SRT_PARSER,
} from "rx-player/tools/TextTrackRenderer";
TextTrackRenderer.addParsers([TTML_PARSER, SRT_PARSER]);
```

Here are the different available parsers:

| Import name   | Subtitles format parsed |
| ------------- | ----------------------- |
| `TTML_PARSER` | TTML                    |
| `VTT_PARSER`  | WebVTT                  |
| `SRT_PARSER`  | SubRip (.srt)           |
| `SAMI_PARSER` | SAMI                    |

## How to use it

### Preamble

Now that it is imported, we can begin to use it.

We will need three items:

1. The video element our subtitles has to be synchronized to.

2. Another HTML element, in which the various subtitles will be rendered by
   the TextTrackRenderer. In general, you want that element to be on top of
   the video element, with the same dimensions. You might however set it in
   the shape and size you want.

   It can even be reduced dynamically at any time (for example, to reduce this
   element's height when a UI element appear at the bottom of the screen,
   thus avoiding the subtitles from overlapping that new element).

3. The whole text track data, as a string (you will have to download the
   subtitles yourself).

To simplify, let's give a name to all those 3 elements:

1. the `videoElement`
2. the `textTrackElement`
3. the `textTrackData`

### Creating a TextTrackRenderer

We first have to create a new TextTrackRenderer with the first two items:

```js
const textTrackRenderer = new TextTrackRenderer({
  videoElement,
  textTrackElement,
});
```

### Setting a text track on it

With `textTrackRenderer`, the TextTrackRenderer instance, we can now add at
any time a text track through its `setTextTrack` method:

```js
try {
  textTrackRenderer.setTextTrack({
    data: textTrackData,
    type: SUBTITLES_FORMAT,
  });
} catch (e) {
  console.error(`Could not parse the subtitles: ${e}`);
}
```

Here, `SUBTITLES_FORMAT` is a string indicating in which format the subtitles
are. It can be any of those strings:

| type     | Corresponding subtitles format |
| -------- | ------------------------------ |
| `"ttml"` | TTML                           |
| `"vtt"`  | WebVTT                         |
| `"srt"`  | SubRip (.srt)                  |
| `"sami"` | SAMI                           |

(Each format needs the corresponding parser to be imported. See the previous
chapter for more information.)

Note that the `setTextTrack` method can throw if the subtitles are found to be
invalid.

Any subsequent call to `setTextTrack` will remove the current text track and
replace them with the new text track instead:

```js
// Add TTML subtitles
textTrackRenderer.setTextTrack({
  data: textTrackData1,
  type: "ttml",
});

// Completely removes the TTML subtitles and replace them by other subtitles, in
// webVTT this time
textTrackRenderer.setTextTrack({
  data: textTrackData2,
  type: "vtt",
});
```

If your subtitles have a delay or are in advance relatively to the video, you
can also set an offset in seconds through the `timeOffset` property.

For example, this will display each subtitles 1.3 seconds later (for when
subtitles appear and disappear too much in advance):

```js
textTrackRenderer.setTextTrack({
  data: textTrackData,
  type: "srt",
  timeOffset: 1.3,
});
```

And this will display each subtitles 1.3 seconds before they normally appear
and disappear (for when subtitles are too late):

```js
textTrackRenderer.setTextTrack({
  data: textTrackData,
  type: "srt",
  timeOffset: -1.3,
});
```

### Removing the current text track

If you just want to completely remove the current text track, you can call the
`removeTextTrack` method:

```js
textTrackRenderer.removeTextTrack();
```

### Disposing of the TextTrackRenderer

If you're sure that you won't need the TextTrackRenderer anymore, you can
dispose of most ressources (which is not much) it took on your page by calling
the `dispose` method:

```js
textTrackRenderer.dispose();
```

That TextTrackRenderer instance won't be usable once you've call this method,
so be sure you don't need it anymore before calling it.

### Notes on the SAMI format

The SAMI subtitles format might necessitate you to specify the language you want
to parse.

This can be done on the `setTextTrack` call like this:

```js
textTrackRenderer.setTextTrack({
  data: textTrackData,
  type: "sami",
  language: "en-US", // or fr-FR...
});
```

## About logs

The TextTrackRenderer can display logs to the console. It relies on the exact
same logger instance than the RxPlayer.

This logger can be independently imported from `"rx-player/logger"`:

```js
import logger from "rx-player/logger";
```

You can then set its verbosity through its `setLevel` method:

```js
logger.setLevel(LOGGER_LEVEL);
```

`LOGGER_LEVEL` can be any of those strings (from the less verbose to the most):

- `"NONE"`: no log

- `"ERROR"`: unexpected errors (via `console.error`)

- `"WARNING"`: The previous level + minor problems encountered (via
  `console.warn`)

- `"INFO"`: The previous levels + noteworthy events (via `console.info`)

- `"DEBUG"`: The previous levels + regular events (via `console.log`)

:::caution
Updating the logger level will also update the RxPlayer's logger
level as it is the exact same logger that is used there.
:::
