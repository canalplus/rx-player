---
id: local_manifest_v0.1
title: Local Manifest format version 0.1
sidebar_label: Local Manifest
slug: local_manifest_v0.1
---

:::caution
The `0.1` version of the local Manifest format is an old version which
is not properly understood by the RxPlayer anymore.

The last version of this specification can be found [here](./local_contents.md).

:::

## Preamble

The RxPlayer is also able to load downloaded DASH, Smooth, MetaPlaylist or even
HLS (CMAF-based) contents, whether it is for offline playback or just for an
online seamless playback without buffering.

This documentation page will be about how to load already downloaded contents.
We suppose the content is already downloaded and that you just want to play it
through the RxPlayer.

However, a tool to download DASH/Smooth/MetaPlaylist contents compatible to this
API is under way.

## Overview

To play contents stored locally, the RxPlayer uses its own Manifest format - the
"local manifest" which is close in semantics to DASH's own Manifest file, the
MPD.

This new Manifest format will be the only element you will need to generate on
your side to play stored contents. As such, this what most of this documentation
page is about.

Note that the wanted content does not need to be completely downloaded before
creating this local manifest. Playback can even begin while the content is
still downloading.

You will just need to:

1. indicate that this is a "local" content by setting the `transport` option
   in `loadVideo` to `"local"`
2. As the generated Manifest object most likely won't be available through an
   URL but directly as a JavaScript object, you will need to communicate it
   through the `manifestLoader` property in the `transportOptions` `loadVideo`
   option.

Here is an example:

```js
rxPlayer.loadVideo({
  transport: "local",
  transportOptions: {
    // Note: `_url` here will be `undefined`
    manifestLoader(_url, callbacks) {
      // where `localManifest` is the local Manifest in object form
      callbacks.resolve({ data: localManifest });
    },
  },
  // ...
});
```

More infos on the `manifestLoader` can be found
[here](../api/plugins.md#manifestLoader).

## How to import this feature

The `"LOCAL_MANIFEST"` feature is not included in the default RxPlayer build.

There's two way you can import it, depending on if you're relying on the minimal
version or if you prefer to make use of environment variables and build the
player manually.

#### Through the minimal version of the RxPlayer

If you're using the "minimal" version of the RxPlayer (through the
`"rx-player/minimal"` import), you will need to import the `LOCAL_MANIFEST`
experimental feature:

```js
import RxPlayer from "rx-player/minimal";
import { LOCAL_MANIFEST } from "rx-player/experimental/features";

RxPlayer.addFeatures([LOCAL_MANIFEST]);
```

#### Through environment variables

If you don't want to go the minimal version's route and you have no problem with
building yourself a new version of the RxPlayer, you can make use of environment
variables to activate it.

This can be done through the `RXP_LOCAL_MANIFEST` environment variable, which
you have to set to `true`:

```sh
RXP_LOCAL_MANIFEST=true npm run build:min
```

More information about any of that can be found in the [minimal player
documentation](./minimal_player.md).

## The Manifest format

As explained in the overview, offline playback by the RxPlayer mainly rely on a
specific sort of manifest, called the "local manifest".

It is not the task of the RxPlayer to download and store the content here (a
tool to do just that is on its way), this page only explains how to play a
stored content once it has been stored.

The local manifest looks like a DASH MPD in its structure and as such is very
hierarchical.

It has the following structure:

```
manifest Object
  ...manifest properties
  period Object
    ...period properties
    adaptation Object
      ...adaptation properties
      representation Object
        ...representation properties
```

We will go progressively from the elements higher in the hierarchy (the manifest
object) to the lower ones (the representation Object).

## The manifest Object

The manifest object describes information about the whole local content:

- its duration
- whether it is still downloading or if its completely available
- the different "parts" (or "periods") the content is divided in

First, let's go into an example, before describing what each property is for:

```js
{
  type: "local", // always set to "local"
  version: "0.1", // version number, in a MAJOR.MINOR form
  duration: 60000, // duration of the whole content, in ms
  isFinished: true, // if `false`, the content is still downloading
  periods: [ // different "periods" in the content - see below
    // ...
  ],
}
```

As you can see, it is a simple JavaScript object with few properties we're going
to dive into just now.

### properties

Here is the description about all the properties encountered in a local manifest
object:

- type (`string`): Must be set to `"local"`. This property indicates to the
  RxPlayer that the current content is a local manifest.

- version (`string`): Version number, in a MAJOR.MINOR form.
  The present documentation is for the `"0.1"` version.

  A parser for a version with the a given MAJOR version should be able to
  parse and play contents for any of the corresponding MINOR versions.

  The exception is the `0` MAJOR version (i.e. experimental versions).
  A parser for a version with that major (let's say `0.1`) might be unable to
  parse local Manifests of another version (e.g. `0.2`).

- duration (`number`): duration of the whole content, in milliseconds. This
  means the difference between the absolute maximum position and the absolute
  minimum position.

- isFinished (`boolean`): `true` indicates that the content has been
  completely downloaded and can now be played as a whole. `false` indicates
  that the whole content is not available yet and that the RxPlayer may have
  to refresh the local manifest while playing (to get the new data).

- periods (`Array.<Object>`): The different "periods" available in the
  content. We will explain what a "period" is in the following chapter.

- expired (`Promise.<undefined>|undefined`): Optional Promise which should
  resolve when a newer local manifest is available.

  This is for example useful when playing a content which is still
  downloading. Here `expired` could resolve once a new segment is available,
  the RxPlayer would then request the new local manifest (through the same API
  than for the initial request, e.g. through the `manifestLoader` property
  indicated in `loadVideo`) and would obtain a new local manifest with this
  new segment included and a new `expired` property set.
  This can go on until the content is completely downloaded at which time
  `expired` can be set to `undefined` or just omitted from the last local
  manifest.

## The period object

As seen in the previous chapter, the local manifest contains a `periods`
property. The concept of period comes from DASH and allow to separate a content
into multiple sub-parts, each with their own configurations.

For example, you could have in the same content a TV Show in german followed by
an american film, each with its own language choices and qualities.

If you don't need that kind of granularity, you can just create a single period
for your local manifest.

Here's an example of a period object:

```js
{
  start: 10000, // starting position in the whole content, in ms
  end: 20000, // ending position, in ms
  adaptations: [ // available tracks for this period
    // ***
  ]
}
```

In the context of a local manifest with multiple periods, here is how it can
look like:

```js
{
  type: "local",
  version: "0.1",
  duration: 60000,
  isFinished: true,
  periods: [ // Here we have 3 consecutive periods:
    {
      start: 0,
      end: 10000,
      adaptations: [ /* ... */ ]
    },
    {
      start: 10000,
      end: 30000,
      adaptations: [ /* ... */ ]
    },
    {
      start: 30000,
      end: 60000,
      adaptations: [ /* ... */ ]
    },
  ],
}
```

### properties

The following properties are found in a period object:

- start (`number`): The position in milliseconds at which the period starts.

- end (`number`): The position in milliseconds at which the period ends.

- adaptations (`Array.<Object>`): The different tracks available. See below
  for more information.

## the adaptation object

An adaptation is roughly a "track" of the content. It can for the moment be one
of those three types:

- "audio"
- "video"
- "text" (subtitles)

The form of the adaptation object depends on the type of track. Let's just start
with a simple video track example:

```js
{
  type: "video",
  language: "eng", // optional language code
  representations: [ // describes the different available qualities
    // ...
  ]
}
```

Let's continue with an audio track example:

```js
{
  type: "audio",
  language: "fra", // language code for this audio track
  audioDescription: false, // if `true`, that audio track is a track adapted for
                           // the visually impaired
  representations: [ /* ... */ ]
}
```

We'll finish with a text track example:

```js
{
  type: "text",
  language: "fra", // language code for this audio track
  closedCaption: false, // if `true`, that text track contains supplementary
                        // cues about the audio content (generally used for the
                        // hard of hearing)
  representations: [ /* ... */ ]
}
```

Here how it looks when adaptations are integrated in a given period:

```js
{
  start: 0,
  end: 10000,
  adaptations: [
    {
      type: "video",
      representations: [ /* ... */ ],
    },
    {
      type: "audio",
      language: "eng",
      audioDescription: false,
      representations: [ /* ... */ ]
    },
    {
      type: "audio",
      language: "fra",
      audioDescription: false,
      representations: [ /* ... */ ]
    },
    {
      type: "audio",
      language: "fra",
      audioDescription: true,
      representations: [ /* ... */ ]
    },
    {
      type: "text",
      language: "fra",
      closedCaption: false,
      representations: [ /* ... */ ]
    },
    {
      type: "text",
      language: "fra",
      closedCaption: true,
      representations: [ /* ... */ ]
    }
  ]
},
```

Let's now describes precizely every properties encountered here.

### properties

The following properties are found in an adaptation object:

- type (`string`): The "type" of the current adaptation. Can be one of three
  strings:

  1. audio
  2. video
  3. text
     The two first ones are straightforward to understand, the third one
     designates subtitles.

- language (`string|undefined`): When relevant, this string allows to define
  the language code for the language the track is in. This is mostly useful
  for audio and text adaptations but can also be defined for video tracks.

- audioDescription (`boolean|undefined`): If true, the track contains audio
  indications helping to understand what's on the screen. Mostly useful for
  the visually impaired, this property is generally only relevant for audio
  tracks.

- closedCaption (`boolean|undefined`): If `true`, that text track contains
  supplementary text cues about the audio content. Mostly useful for the hard
  of hearing, this property is generally only relevant for text tracks
  helping to understand what's on the screen. Mostly useful for the visually
  impaired, this property is generally only relevant for audio tracks.

- representations (`Array.<Object>`): The different available qualities for
  this track. Will be described below.

## The representation object

The representation object will describe the different qualities for a given
track (or adaptation). It will also contains logic to fetch segments
corresponding to that quality. The representation object is very similar to the
`Representation` element in a DASH MPD.

As usual, let's look into an example.

```js
{
  bitrate: 5000000, // bitrate of the quality, in bits per seconds
  mimeType: "video/mp4",
  codecs: "avc1.64001f",
  width: 1280, // default width of the quality, in pixels.
               // Mostly relevant for video tracks
  height: 720, // default height of the quality, in pixels.
               // Mostly relevant for video tracks
  index: { // declaration of all the linked segments as well as methods to
           // retrieve them
    loadInitSegment(callbacks) { /* ... */  },
    loadSegment(segment, callbacks) { /* ... */,
    segments: [ /* ... */ ]
  }
}
```

For audio tracks, it can looks like:

```js
{
  bitrate: 200000,
  mimeType: "audio/mp4",
  codecs: "mp4a.40.5",
  index: {
    loadInitSegment(callbacks) { /* ... */  },
    loadSegment(segment, callbacks) { /* ... */,
    segments: [ /* ... */ ]
  }
}
```

At last, an example for text tracks (here ttml in an mp4 container):

```js
{
  bitrate: 3000, // bitrate of the quality, in bits per seconds
  mimeType: "application/mp4",
  codecs: "stpp",
  index: {
    loadInitSegment(callbacks) { /* ... */  },
    loadSegment(segment, callbacks) { /* ... */,
    segments: [ /* ... */ ]
  }
}
```

We'll now explain what each property is for, before going deeper into the
`index` attribute, which allows the RxPlayer to fetch the media segments.

### properties

- bitrate (`number`): The bitrate the quality is in, in bits per seconds. For
  example, a bitrate of 5000000 (5.10^6 == 5 MegaBit) would indicate that each
  second of the content does on average a size of 5 MegaBit.

- mimeType (`string`): As its name suggests, this is the appropriate mime-type
  for the media. Generally, it is either:

  - `"video/mp4"` or `"video/webm"` for a video content (depending on the
    container)
  - `"audio/mp4"` or `"audio/webm"` for an audio content (depending on the
    container)
  - `"application/mp4"` or `"text/plain"` for a text content (depending on
    the container / the absence of container)

- codecs (`string`): The codec necessary to be able to play the content. The
  syntax here is taken from the RFC6381.

- width (`number|undefined`): When relevant (mostly video contents), the width
  of the media, in pixels

- height (`number|undefined`): When relevant (mostly video contents), the
  height of the media, in pixels

- index (`object`): Object allowing the RxPlayer to know the list of segments
  as well as to fetch them. Described in the next chapter.

## the index object

As just seen, the `index` object is a property of a given representation.

it contains itself three properties:

- segments (`Array.<Object>`): the list of every available media segments for
  that representation. Does not include the initialization segment.

  Do not include in this Array the segments that are not downloaded yet.

- loadInitSegment (`function`): Returns the initialization segment or `null`
  if this notion is not relevant, like for subtitles.

- loadSegment (`function`): Returns a specific media segment.

### the segments array

Let's start by the first one, `segments`. `segments` is an array of objects,
each object describing a single segment of media data. Each object has the
following properties:

- time (`number`): starting position of the segment, in milliseconds
- duration (`number`): duration of the segment, in milliseconds
- timestampOffset (`number|undefined`): optional time offset to add to the
  segment's internal time to convert its media time to its presentation time,
  in milliseconds.
  If you don't know what it is, you will most likely not need it.

Let's see a simple example with four segments of 2 seconds:

```js
[
  {
    time: 0,
    duration: 2000,
  },
  {
    time: 2000,
    duration: 2000,
  },
  {
    time: 4000,
    duration: 2000,
  },
  {
    time: 6000,
    duration: 2000,
  },
];
```

### the loadInitSegment callback

The `loadInitSegment` callback allows the RxPlayer to request the initialization
segment of this representation.

Most audio and video representation have an initialization segment which allows
to obtain information about the representation's data without containing data in
itself.
For text representations, where it is most likely not needed, this callback can
emit `null` instead of the segment.

This callback is given a single argument, which is an object containing
callbacks the function should call either when it has fetched the content or
when it failed on error. There is two callbacks in that object:

- resolve: allows `loadInitSegment` to communicate the initialization segment
  in an `ArrayBuffer` form. Can call resolve with `null` if no initialization
  segment is available for that representation.

- reject: allows loadInitSegment to communicate an error which made the
  fetching of the initialization segment impossible.

The `loadInitSegment` callback can also returns a function which will be called
if the caller want to abort the fetch operation.

Here is an example of how a `loadInitSegment` function can look like:

```js
async function loadInitSegment(callbacks) {
  try {
    const initSegment = await getStoredInitSegmentForTheCurrentRepresentation();
    callbacks.resolve(initSegment);
  } catch (e) {
    callbacks.reject(e);
  }

  // Note: in this example, there is no mean to abort the operation, as a result
  // we do not return a function here

  // // Here is how it would look like if we could:
  // return function abort() {
  //   abortStoredInitSegmentRequest();
  // }
}
```

### the loadSegment callback

The `loadSegment` callback is the callback called by the RxPlayer when it wants
any segment in the content.

Note that the segment data returned by `loadSegment` should contain all the data
and metadata necessary to play them on the browser. Downloaded DASH segments -
for example - are generally sufficient but segments linked to Smooth contents
should be updated before being returned by `loadSegment`.

This callback is very similar to `loadInitSegment` with two differences:

- it receives two arguments:

  1. The first being the segment object (from the `segments` array) of the
     segment we want to recuperate. You can generally discriminate which
     segment we want from the `time` property of the given segment, which
     should be unique for that representation.
  2. The second being the callbacks object, which has the exact same form
     than the one in `loadInitSegment` (two properties `resolve` and
     reject).

- it cannot return null. It has to return an `ArrayBuffer` corresponding to
  the wanted segment.

Here is an example of how a `loadSegment` function can look like:

```js
async function loadSegment(segment, callbacks) {
  try {
    const segmentData = await getStoredSegment(segment);
    callbacks.resolve(segmentData);
  } catch (e) {
    callbacks.reject(e);
  }

  // Note: in this example, there is no mean to abort the operation, as a result
  // we do not return a function here

  // // Here is how it would look like if we could:
  // return function abort() {
  //   abortStoredSegmentRequest();
  // }
}
```

## About DRMs

Content with DRMs should be supported as long as the encryption information is
specified in the corresponding containers (e.g. in PSSH boxes for mp4 and other
ISOBMFF containers).

We also look into adding supplementary encryption information into the local
manifest format, but this is not available for now.
