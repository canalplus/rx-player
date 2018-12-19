# Manifest Object ##############################################################


## Table of Contents ###########################################################

- [Overview](#overview)
- [Structure of a Manifest Object](#manifest)
    - [properties](#manifest-props)
- [Structure of a Period Object](#period)
    - [properties](#period-props)
- [Structure of an Adaptation Object](#adaptation)
    - [properties](#adaptation-props)
    - [methods](#adaptation-meth)
- [Structure of a Representation Object](#representation)
    - [properties](#representation-props)
- [Structure of a RepresentationIndex Object](#representation-index)
    - [methods](representation-index-props)
- [Structure of a Segment Object](#segment)
    - [properties](#segment-props)



<a name="overview"></a>
## Overview ####################################################################

A Manifest Object and its sub-parts are data structures returned by multiple
APIs of the player.

Its data represents the corresponding streaming protocol's
[Manifest](../terms.md#manifest) equivalent (MPD for DASH, Manifest for
Microsoft Smooth Streaming etc.).

Basically, the structure of a Manifest file has the following hierarchy:
```
Manifest Object
  ...Manifest data and methods
  Adaptation Object
    ...Adaptation data and methods
    Representation Object
      ...Representation data and methods
      RepresentationIndex Object
        ...RepresentationIndex data and methods
          SegmentObject
          ...SegmentObject data
```

Due to this highly hierachical structure, each level will be described in its
own chapter here.

:warning: Like in the rest of this documentation, any variable or method not
defined here can change without notice.

Only use the documented variables and open an issue if you think it's not
enough.



<a name="manifest"></a>
## Structure of a Manifest Object ##############################################

The manifest Object represents the [Manifest file](../terms.md#manifest) of the
content loaded.


<a name="manifest-props"></a>
### properties #################################################################

The manifest Object has the following properties.

#### periods

_type_: ``Array.<Period>``

A single Manifest instance can contain multiple [Periods](../terms.md#period),
which are periods of time for which the list of available type of contents
(audio tracks, subtitles, video tracks...) can be different.

Such example of Periods could be multiple Programs of a live contents, which can
be each in different languages, for example.

The player will switch smoothly across subsequent Periods within playback.

Most Streaming technologies (e.g. HLS and Smooth) do not have a "Period"
concept. For those, the Manifest will only have one Period for the whole
content.

#### adaptations

---

:warning: This property is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_type_: ``Object``

Adaptation objects for the first Period.

Both of those lines have the same effect:
```js
console.log(manifest.adaptations);
console.log(manifest.periods[0].adaptations);
```

See [the Period chapter](#period-props) for more informations on Adaptations.


#### isLive

_type_: ``Boolean``

``true`` if the content is a live content, ``false`` for non-live contents.

#### uris

_type_: ``Array.<string>``

The list of uris that can be used to refer to the Manifest file.

#### transport

_type_: ``string``

The type of transport used. For now, this can only be equal to either ``dash``
or ``smooth``.



<a name="period"></a>
## Structure of a Period Object ################################################

A Period is an object describing what to play during a certain time periods.

A Manifest can have a single Period, which means that the played content do not
change its characteristics (same languages, same bitrates etc.) or multiple
ones.

A good example of a content with multiple Periods would be a live channel
broadcasting multiple foreign films. Each film, being in a different language,
will need to be part of a new Period.


<a name="period-props"></a>
### properties #################################################################

#### id

_type_: ``string``

This id should be a string unique to that Period. It serves identifications
purpose, when updating the Manifest for example.

#### start

_type_: ``Number``

Start time at which the Period begins in the whole content, in seconds.

#### end

_type_: ``Number|undefined``

End time at which the Period ends in the whole content, in seconds.

If not set or set to undefined, it means that the end is unknown, in which case
it is the current last content of the current Manifest.

#### adaptations

_type_: ``Object``

The [Adaptations](../terms.md#adaptation) (tracks if you want) for the current
content, per-type (audio/video/text/overlay/image).

See [the Adaptation chapter](#adaptation) for more info about an Adaptation's
structure.

The Adaptation object _can_ contain any of the following keys:
  - audio (``Array.<Adaptation>``): The audio Adaptation(s) available.
  - video (``Array.<Adaptation>``): The video Adaptation(s) available.
  - text (``Array.<Adaptation>``): The text Adaptation(s) available.
  - overlay (``Array.<Adaptation>``): The overlay Adaptation(s) available.
  - image (``Array.<Adaptation>``): The image Adaptation(s) available.



<a name="adaptation"></a>
## Structure of an Adaptation Object ###########################################

An [Adaptation](../terms.md#adaptation) is a set of streams representing the
exact same contents in multiple forms (different sizes, different bitrates...).
Concretely, a frequent usecase is to have a single video Adaptation and multiple
audio ones, one for each language available.

As such, it is also often called in the API a ``track``.


<a name="adaptation-props"></a>
### properties #################################################################

#### id

_type_: ``string``

This id should be a string unique to that Adaptation. It serves
identifications purpose, when updating the Manifest for example.

#### type

_type_: ``string``

The type of the Adaptation. The possible types are:
  - ``"video"``
  - ``"audio"``
  - ``"text"``
  - ``"overlay"``
  - ``"image"``

#### language

_type_: ``string|undefined``

The language of the Adaptation. This is particularly useful for audio and text
Adaptations.

Note that this property is not always present in an Adaptation.

#### normalizedLanguage

_type_: ``string|undefined``

An attempt to translate the language of the Adaptation into an ISO 639-3 code.
If the translation attempt fails (no corresponding ISO 639-3 language code is
found), it will equal the value of ``language``

Note that this property is not always present in an Adaptation.

#### isAudioDescription

_type_: ``Boolean|undefined``

This property only makes sense for audio Adaptations. In this case, if ``true``
it means that the audio track has added commentaries for the visually impaired.

#### isClosedCaption

_type_: ``Boolean|undefined``

This property only makes sense for text Adaptations. In this case, if ``true``
it means that the text track has added hints for the hard of hearing.

#### representations

_type_: ``Array.<Representation>``

The [Represesentations](../terms.md#representation) for this Adaptation.

See [the Representation chapter](#representation) for more info about a
Representation's structure.


<a name="adaptation-meth"></a>
### methods ####################################################################

#### getAvailableBitrates

_return value_: ``Array.<Number>``

Returns every bitrates available for this Adaptation.



<a name="representation"></a>
## Structure of a Representation Object ########################################

A [Representation](../terms.md#representation) is an
[Adaptation](../terms.md#adaptation) encoded in a certain way. It is defined by
multiple values (a codec, a bitrate). Only some of them are documented here (as
stated before, open an issue if you would like to access other properties).


<a name="representation-props"></a>
### properties #################################################################

#### id

_type_: ``string``

This id should be a string unique to that Representation.

#### bitrate

_type_: ``Number``

The bitrate of the Representation.

#### codec

_type_: ``string|undefined``

The codec of the Representation.

#### height

_type_: ``Number|undefined``

This property makes the most sense for video Representations.
It defines the height of the video, in pixels.

#### width

_type_: ``Number|undefined``

This property makes the most sense for video Representations.
It defines the width of the video, in pixels.

#### index

_type_: ``RepresentationIndex``

The represesentation index for this Representation.

See [the RepresentationIndex chapter](#representation-index) for more info about
a RepresentationIndex's structure.

#### frameRate

_type_: ``string|undefined``

The represesentation frame rate for this Representation. It defines either the
number of frames per second as an integer (24), or as a ratio (24000 / 1000).

<a name="representation-index"></a>
## Structure of a RepresentationIndex Object ###################################

A RepresentationIndex is an uniform way of declaring the segment index in any
[Manifest](../terms.md#manifest).

That's the part that calculates which segments will be needed. Because the index
can be different depending on the type of contents/transport most interactions
here are done through few methods which hide the complexity underneath.


<a name="representation-index-meth"></a>
### methods ####################################################################

#### getSegments

_arguments_:
  - _up_ (``Number``): The position, in seconds from which you want to get the
    segment.

  - _duration_ (``Number``): The duration in seconds from the asked position


_return value_: ``Array.<Segment>``

Returns the needed segments as defined by the current Manifest during an asked
timeframe.

See [the Segment chapter](#segment) for more info about a Segment's structure.



<a name="segment"></a>
## Structure of a Segment Object ###############################################

A Segment object defines a segment, as generated by the RepresentationIndex.

Those segments can have multiple useful properties which for the most part are
described here.


<a name="segment-props"></a>
### properties #################################################################

#### id

_type_: ``string``

This id should be a string unique to that segment.

#### timescale

_type_: ``Number``

The timescale in which the duration and time are expressed.

Basically, divide any of those by the timescale to obtain seconds.

#### duration

_type_: ``Number|undefined``

The duration, timescaled, of the Segments in s.

#### time

_type_: ``Number``

The start time, timescaled, of the Segments in s.

#### isInit

_type_: ``Boolean|undefined``

If true, the segment concerned is an init segment.

#### range

_type_: ``Array.<Number>|null|undefined``

If defined, it means that the segment is defined in a certain byte range
remotely. In this case, the array contains two elements, the start byte and the
end byte.

#### indexRange

_type_: ``Array.<Number>|null|undefined``

If defined, it means that a segment index is defined in a certain byte range
remotely. In this case, the array contains two elements, the start byte and the
end byte.

#### number

_type_: ``Number|undefined``

The number of the segment (if numbered), useful with certain types of index.
