---
id: glossary
title: Glossary
sidebar_label: Glossary
slug: glossary
---

## Overview

As the RxPlayer manages multiple type of streaming technologies, which can use
their own definition and terminology, we had to find a compromise and use our
own terminology, which try to take the best from these.

We here define various terms used in the documentation which might not be
obvious right along.

## Definitions

### Adaptation

Simply put, what we call an "Adaptation" is just an audio, video or text track.

More technically, it is an element of a [Period](#period) (and by extension of
the [Manifest](#manifest)) which represents a single type of media.

An adaptation can be for example any of those things:

- A video track
- A french audio track
- An italian text track
- A thumbnail track
- ...

Many Streaming Technology have this concept even though their name can change,
an Adaptation is equivalent to:

- DASH's _AdaptationSet_
- Microsoft Smooth Streaming's _StreamIndex_

Note: There is minor differences between the RxPlayer's `Adaptation` and DASH'
`AdaptationSet`. Namely multiple `AdaptationSet`s can be merged into a single
`Adaptation` in very specific cases.
You can find more infos on it [here](./dash_rxplayer_adaptation_difference).

### Bitrate

In the RxPlayer, a bitrate of a [Representation](#representation) indicates the
number of bits per second of content described by that Representation.

For example, let's imagine a video [Adaptation](#adaptation) with two
Representation:

1. one with a bitrate at `1,000,000` (which is 1 Megabit)
2. the other with a bitrate at `500,000` (which is 500 kilobits)

Each seconds of content described by the first Representation will be
represented by 1 megabit of data

Each seconds for the second Representation will be represented by 500 kilobits.

Both will represent the same data, but the first one will need that the RxPlayer
fetch more data to show the same amount of content.

In most cases, a higher bitrate means a higher quality. That's why the RxPlayer
has to compromise between having the best quality and choosing a Representation
having a low-enough bitrate to be able to play on the user's computer without
needing to pause due to poor network conditions.

### Buffer

When we talk about the "buffer" in the RxPlayer, we most likely refer to the
structures in the browser holding media data, waiting to be decoded.

Several layers of buffers can be defined in the browser-side to allow to have a
smooth playback, fast seeking etc.

### Buffer type

RxPlayer's buffer types describe a single "type" of media.

Example of such types are:

- "video": which represents only the video content
- "audio": the audio content without the video
- "text": the subtitles, for example

### Chunk

Depending on the context, a chunk can be either a sub-part of a [Media Segment](#media-segment) or the Media segment itself.

### Initialization segment

An initialization segment is a specific type of [media segment](#media-segment), which
includes metadata necessary to initialize the browser's internal decoder.

Those are sometimes needed before we can actually begin to push any "real" media
segment from the corresponding [Representation](#representation).

As such, when one is needed, the initialization segment is the first segment
downloaded for a given Representation.

### Manifest

The Manifest is the generic name for the document which describes the content
you want to play.

This is equivalent to the DASH's _Media Presentation Description_ (or _MPD_),
the Microsoft Smooth Streaming's _Manifest_ and the HLS' _Master Playlist_.

Such document can describe for example:

- multiple qualities for the same video or audio tracks
- multiple audio tracks in different languages
- presence of subtitles

Note that this concept is only used in Streaming technologies.
You won't interact with a Manifest if you're directly playing a MP4 or webM
file.

### Media segment

A media segment (or simply segment), is a small chunk of media data.

In many streaming technologies, a content is separated into multiple chunks of
small duration (usually between 2 and 10 seconds).

This allows, for reasons to long to detail here, to easily implements many
features:

- live streaming,
- language switching
- adaptive streaming

When you play a content with the RxPlayer, it will most of the time download
media segments of different types (audio, video, text...) progressively rather
than the whole content at a single time.

### Period

Simply put, a Period defines what the content will be from a starting time to
an ending time. It is an element contained in the [Manifest](#manifest)) and it
will contain the [Adaptations](#adaptation) available for the corresponding
time period.

Depending on the transport used, they correspond to different concepts:

- for DASH contents, it is more or less the same thing than an MPD's
  `<Period>` element
- for "local" contents, it corresponds to a single object from the `periods`
  array.
- for "MetaPlaylist" contents, it corresponds to all the Period elements we
  retrieved after parsing the corresponding [Manifest](#manifest) from the
  elements of the `contents` array.
- any other transport will have a single Period, describing the whole content.

--

As an example, let's take a manifest describing a live content with
chronologically:

1. an english TV Show
2. an old italian film with subtitles
3. an American blockbuster with closed captions.

Let's say that those sub-contents are drastically different:

- they are all in different languages
- the american blockbuster has more available video bitrates than the old
  italian one

Because the available tracks and available qualities are different from
sub-content to sub-content, we cannot just give a single list of Adaptations
valid for all of them. They have to be in some way separated in the Manifest
object.

That's a case where Periods will be used.
Here is a visual representation of how the Periods would be divided here:

```
        Period 1                Period 2                Period 3
08h05              09h00                       10h30                 now
  |==================|===========================|====================|
        TV Show               Italian Film        American Blockbuster
```

Each of these Periods will be linked to different audio, video and text
Adaptations, themselves linked to different Representations.

### Representation

A Representation is an element of an [Adaptation](#adaptation), and by extension
of the [Manifest](#manifest)) that describes an interchangeable way to represent
the parent Adaptation.

For example, a video Adaptation can have several Representations, each having
its own bitrate, its own width or its own height.
The idea behind a Representation is that it can be changed by any other one in
the same Adaptation as the content plays.

This is most often implemented to allow multiple bitrates for the same
Adaptation, to be more flexible to poor network (low bandwidth) or computing
(slow computer) conditions.

A Representation has its equivalent in multiple Streaming technologies. It is
roughly the same as:

- DASH's _Representation_
- Microsoft Smooth Streaming's _QualityIndex_
- HLS' _variant_ (the notion of variant is actually a little more complex,
  so here it's not an exact comparison)
