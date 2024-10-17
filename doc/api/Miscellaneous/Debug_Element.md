# Displaying the RxPlayer's debugging element

The `DEBUG_ELEMENT` feature allows to render an HTML element displaying debug information
that might be interesting while debugging playback.

![Example of a debug element](../../static/img/debug_elt.png)

That element displays various metrics, some of the RxPlayer configuration currently set
and displays information on the content of the various buffers. Details on everything that
may be diplayed is described lower in this page.

Before that feature, each application generally created its own way of displaying debug
information.

Using one directly defined in the RxPlayer API instead allows to:

1. Use a default and complete debugging element, if you don't want to have to create one
   from scratch

2. Display debugging information that is not even available through the API, like a
   representation of the content in the various buffers.

## Importing the DEBUG_ELEMENT feature

This feature is not present in default builds to prevent adding unnecessary code to
codebases that don't need it.

As such, to add it, you will need to add the `DEBUG_ELEMENT` feature:

```js
// Import the RxPlayer
// (here through the "minimal" build, though it doesn't change for other builds)
import RxPlayer from "rx-player/minimal";

// Import the feature
import { DEBUG_ELEMENT } from "rx-player/features";

// Attach the feature to imported RxPlayer
RxPlayer.addFeatures([DEBUG_ELEMENT]);
```

## Rendering the debugging element

The debugging element will be displayed inside an HTML element of your choosing.

That element is communicated through the same RxPlayer's method used to display debugging
information: `createDebugElement`:

```js
const myElement = document.querySelector(".debug-element");
const debuggingInfo = rxPlayer.createDebugElement(myElement);

// Note: the debugging info can be removed at any time by calling `dispose`
// on the returned object:
debuggingInfo.dispose();
```

Note that more or less information may be displayed depending on the height of that HTML
element. If playing video, it would be a good default to communicate an HTML element of
the same size than the video element on which the content plays. Ultimately, only the
upper left corner of that element should be used to display current debugging information.

## Displayed information

The debug element contains a lof of values, each preceded by a 2-to-4 letter acronyms put
in bold and followed by a slash (/). Each of these designates a specific metric that is
explained below.

It should however be noted that the data inside the debugging element is updated at
regular interval, every seconds or so. As such, information might not always reflect
exactly what's going on at a particular point in time.

- General information:

  - **ct**: _Current time_. The current position on the media element.
  - **bg**: _Buffer gap_. The difference between the last buffered second of the current
    buffered range and the current second.
  - **rs**: _Ready State_. Reflects the HTMLMediaElement property `readyState`
  - **pr**: _Playback Rate_. Reflects the HTMLMediaElement property `playbackRate`
  - **sp**: _Speed_. The playback rate configurated through the `setPlaybackRate` method.
  - **pa**: _Paused_. Reflects the HTMLMediaElement property `paused`. `0` for `false` and
    `1` for `true`.
  - **en**: _Ended_. Reflects the HTMLMediaElement property `ended`. `0` for `false` and
    `1` for `true`.
  - **li**: _Live_. If `1`, the current content can be considered a live content.
  - **wba**: _WantedBufferAhead_. The configured `wantedBufferAhead`, which is the amount
    of buffer ahead of the current position that is pre-buffered, in seconds.
  - **st**: _State_. The current state of the RxPlayer.
  - **wo**: _Worker Status_:
    - If set to `1`, the playback is currently in "multithreading" mode (a WebWorker is
      running the RxPlayer's main logic concurrently to your application).
    - If set to `2`, it is also running in "multithreading" mode, but with MSE API (for
      buffering media) also running in a WebWorker (which should be more efficient but is
      supported by less platforms).
    - If set to `0`, the playback is in the regular "main" (single thread) mode.
  - **v**: Current version of the RxPlayer.
  - **ks**: _Key System_. If set, the current key system used to decrypt contents.
  - **mbb**: _Max Buffer Behind_. If set, the configured `maxBufferBehind` (amount of
    buffer to keep in memory behind the current position, in seconds).
  - **mba**: _Max Buffer Ahead_. If set, the configured `maxBufferAhead` (amount of buffer
    to keep in memory ahead of the current position, in seconds).
  - **mbs**: _Max video Buffer Size_. If set, the configured `maxVideoBufferSize` (maximum
    amount of video data kept in the video buffer, in kilobytes)
  - **mip**: _Minimum Position_. The minimum position, obtainable through the
    `getMinimumPosition` API, at which the content is reachable
  - **dmi**: _Distance to Minimum Position_. The difference between the current position
    and the minimum position, in seconds
  - **map**: _Maximum Position_. The maximum position, obtainable through the
    `getmaximumPosition` API, at which the content is reachable
  - **dma**: _Distance to Minimum Position_. The difference between the maximum position
    and the current position, in seconds
  - **er**: _Error_. Error converted to string, if one.
  - **url**: _URL_. URL of the current content, may be truncated if too long.
  - **vt**: _Video tracks_. List of the video tracks' `id` property. The line begins with
    a number indicating the number of available video tracks, followed by `:`, followed by
    each video track's id separated by a space. The current video track is prepended by a
    `*` character.
  - **at**: _Audio tracks_. List of the audio tracks' `id` property. The line begins with
    a number indicating the number of available audio tracks, followed by `:`, followed by
    each audio track's id separated by a space. The current audio track is prepended by a
    `*` character.
  - **tt**: _Text tracks_. List of the text tracks' `id` property. The line begins with a
    number indicating the number of available text tracks, followed by `:`, followed by
    each text track's id separated by a space. The current text track is prepended by a
    `*` character.
  - **vb**: _Video Bitrates_. The available video bitrates in the current video track,
    separated by a space. Each bitrate value can optionally be followed by an "`U!`", in
    which case the codec of the corresponding Representation is unsupported, and/or be
    followed by an "`E!`", in which case it is undecipherable currently. In both of those
    cases the corresponding video Representation won't be played by the RxPlayer.
  - **ab**: _Audio Bitrates_. The available audio bitrates in the current audio track,
    separated by a space. Each bitrate value can optionally be followed by an "`U!`", in
    which case the codec of the corresponding Representation is unsupported, and/or be
    followed by an "`E!`", in which case it is undecipherable currently. In both of those
    cases the corresponding audio Representation won't be played by the RxPlayer.

- Buffer information
  - **vbuf**: _Graphical representation of the video buffer_. The red rectangle indicates
    the current position, the different colors indicate different video qualities in the
    buffer.
  - **abuf**: _Graphical representation of the audio buffer_. The red rectangle indicates
    the current position, the different colors indicate different audio qualities in the
    buffer.
  - **tbuf**: _Graphical representation of the text buffer_. The red rectangle indicates
    the current position, the different colors indicate different text qualities in the
    buffer.
  - **play**: Information on the content that should be currently playing on the buffer of
    the type in the previously represented buffer (audio, video or text). Information
    depends on the type and on properties but always begin with the Representation's `id`
    property between quotes (`"`). It can also indicate:
    - the video resolution in a format `<width>x<height>`,
    - the bitrate in a format `(<bitrate>kbps)`,
    - the codec in a format `c:"<codec>"`,
    - the language in a format `l:"<language>"`,
    - if the corresponding track contains sign language interpretation: with `si:1`.
      `si:0` indicates the opposite,
    - if the corresponding track is a trickmode video track: with `tm:1`. `tm:0` indicates
      the opposite,
    - if the corresponding track contains an audio description: with `ad:1`. `ad:0`
      indicates the opposite,
    - if the corresponding track contains closed captions: with `cc:1`. `cc:0` indicates
      the opposite,
    - the start and end time of the Period this track is a part of, in the format
      `p:<period_start>-<period_end>`.
  - **load**: Information on the content that is currently loaded on the buffer of the
    type in the previously represented buffer (audio, video or text). Information
    represented follows the exact same format than the **play** metric.
  - **bgap**: _Buffer gap_. Representation of the evolution of the amount of pre-buffered
    data in the intersection of the video and audio buffers. A raising value means that
    the buffer is being filled and a lowering one means that the buffer is emptying. If
    the bar becomes fully transparent, we may enter into rebuffering mode.
