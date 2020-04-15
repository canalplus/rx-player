# Terms and definitions ########################################################


## Table of Contents ###########################################################

- [Overview](#overview)
- [Definitions](#instantiation)
    - [Adaptation](#adaptation)
    - [Bitrate](#bitrate)
    - [Buffer](#buffer)
    - [Buffer Type](#type)
    - [Chunk](#chunk)
    - [Initialization Segment](#init-segment)
    - [Manifest](#manifest)
    - [Media Segment (or segment)](#segment)
    - [Period](#period)
    - [Representation](#representation)



<a name="overview"></a>
## Overview ####################################################################

As the RxPlayer manages multiple type of streaming technologies, which can use
their own definition and terminology, we had to find a compromise and use our
own terminology, which try to take the best from these.

We here define various terms used in the documentation which might not be
obvious right along.



<a name="definitions"></a>
## Definitions #################################################################

<a name="adaptation"></a>
### Adaptation ##################################################################

An Adaptation is an element of a [Period](#period) (and by extension of the
[Manifest](#manifest)) which represents a single type of media.

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
``AdaptationSet``. Namely multiple `AdaptationSet`s can be merged into a single
`Adaptation` in very specific cases.
You can find more infos on it [here](./dash_rxplayer_adaptation_difference.md).


<a name="bitrate"></a>
### Bitrate #####################################################################

In the RxPlayer, a bitrate of a [Representation](#representation) indicates the
number of bits per second of content described by that Representation.

For example, a video [Adaptation](#adaptation) could have two Representation:
  1. one with a bitrate: ``1,000,000``
  2. the other with the bitrate: ``500,000``

The first representation here will be considered to encode each second of
content by a million bits (or 1Mb).

The second one will represent the same content for the same time and duration
for hald the bits (500kb).

The second one is thus more attracting for situations where the current network
conditions are too poor to play the first one smoothly. The catch is that most
often a Representation with a lower bitrate will describe a content of a lower
quality.


<a name="buffer"></a>
### Buffer ######################################################################

RxPlayer's Buffer can describe two things, depending on the context:

  - modules in the RxPlayer downloading [media segments](#segment) and doing
    what is needed to play them.

  - The part in the browser storing the segments downloaded, waiting for it to
    be decoded.



<a name="type"></a>
### Buffer Type #################################################################

RxPlayer's buffer types describe a single "type" of media.

Example of such types are:
  - "video": which represents only the video content
  - "audio": the audio content without the video
  - "text": the subtitles, for example
  - "image": the thumbnail tracks.

Those are called buffer types here (or simply "types") as each type will have a
single, uncorellated [Buffer](#buffer) in the RxPlayer.


<a name="chunk"></a>
### Chunk ######################################################################

Depending on the context, a chunk can be either a sub-part of a [Media
Segment](#segment) or the Media segment itself.


<a name="init-segment"></a>
### Initialization Segment ######################################################

An initialization Segment is a [Media Segment](#segment), which includes
metadata necessary to play the other segment of the same
[Representation](#representation).

This is used by multiple Streaming Technologies to avoid inserting the same
data in multiple Media Segments.

As such initialization Segments are the first segment downloaded, to indicate
the metadata of the following content.


<a name="manifest"></a>
### Manifest ###################################################################

Document which describes the content you want to play.

This is equivalent to the DASH's _Media Presentation Description_ (or _MPD_),
the Microsoft Smooth Streaming's Manifest and the HLS' playlist.

Such document can describe for example:
  - multiple qualities for the same video or audio tracks
  - multiple audio tracks in different languages
  - presence of subtitles

Note that this concept is only used in Streaming technologies.
You won't interact with a Manifest if you're directly playing a MP4 or webM
file.


<a name="segment"></a>
### Media Segment ###############################################################

A media segment (or simply segment), is a small chunk of media data.

In many streaming technologies, a content is separated into multiple chunks of
small duration (usually between 2 and 10 seconds).

This allows, for reasons to long to detail here, to easily implements many
features:
  - live streaming,
  - language switching
  - adaptive streaming

When you play a content with the RxPlayer, it will most of the time download
media segments of different types (audio, video, text...) rather than the whole
content a single time.


<a name="period"></a>
### Period #####################################################################

A Period is an element of the [Manifest](#manifest) which describes the media
to play at a given point in time.

Depending on the transport used, they correspond to different concepts:
  - for DASH contents, it is linked to an MPD's Period element
  - for "local" contents, it corresponds to a single object from the `periods`
    array.
  - for "MetaPlaylist" contents, it corresponds to all the Period elements we
    retrieved bwhen parsing the corresponding [Manifest](#manifest) from the
    elements of the `contents` array.
  - any other transport will have a single Period, describing the whole content.

Despite having a different source depending on the transport used, a Period is
a single concept in the RxPlayer.

Simply put, it allows to set various types of content successively in the same
manifest.

For example, let's take a manifest describing a live content with
chronologically:
  1. an english TV Show
  2. an old italian film with subtitles
  3. an American blockbuster with closed captions.

Those contents are drastically different (they have different languages, the
american blockbuster might have more available bitrates than the old italian
one).

As such, they have to be considered separately in the Manifest.
This can be done by putting each in a different Period:
```
        Period 1                Period 2                Period 3
08h05              09h00                       10h30                 now
  |==================|===========================|====================|
        TV Show               Italian Film        American Blockbuster
```

Each of these Periods will be linked to different audio, video and text tracks,
themselves linked to different qualities.


<a name="representation"></a>
### Representation ##############################################################

A Representation is an element of an [Adaptation](#adaptation), and by extension
of the [Manifest](#manifest)) that describes an interchangeable way to represent
the parent Adaptation.

For example, a video Adaptation can have several representation, each having
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
  - HLS' _variant_
