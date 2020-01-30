# Text tracks ##################################################################


## Table of Contents ###########################################################

  - [Overview](#overview)
  - [Supported text track formats](#supported)
  - [Text tracks indicated in a manifest](#manifest)
    - [In DASH](#manifest-dash)
    - [In Smooth](#manifest-smooth)
  - [Text tracks added manually](#manual)
  - [Text track display modes](#modes)



<a name="overview"></a>
## Overview ####################################################################

The rx-player allows to display text tracks - such as subtitles or closed
captions - directly over your content:

![Example of a textrack on a
content](./assets/text_track_example.png "Example of a textrack")

Adding text tracks to contents can be done by two means:
  - by using a [Manifest](../terms.md#manifest) declaring those text tracks
  - by manually adding text track(s) when you call the ``loadVideo`` API

You can then choose the right track through the different text track-related
API, all documented in the [general API documentation](./index.md).



<a name="supported"></a>
## Supported text track formats ################################################

The rx-player supports the following formats:
  - TTML (TTML1, EBU-TT and IMSC1)
  - WebVTT
  - SAMI
  - SRT
  - TTML embedded in an MP4 file
  - WebVTT embedded in an MP4 file



<a name="manifest"></a>
## Text tracks indicated in a manifest #########################################

Each streaming technology supported by the Manifest defines a way to add text
track directly in their Manifests files.

This chapter explains what is supported by the RxPlayer.


<a name="manifest-dash"></a>
### In DASH ####################################################################

In DASH, text tracks are defined by ``AdaptationSet`` elements, which have a
``contentType`` attribute equal to ``text``.

Those ``AdaptationSet`` can also define a ``lang``, ``codecs`` and ``mimeType``,
which are then exploited by the RxPlayer.

----

The ``lang`` attribute is used to know the language the track is in.

The RxPlayer understands the following standards:
  - ISO 639-1 (2 letters)
  - ISO 639-2 (3 letters)
  - ISO 639-3 (3 letters)

More complex combined formats are also understood, as long as it begins by one
of the understood standards, followed by a dash ("-").

For example "en-US" is translated into just "en", and then inferred to be
english.

----

The ``mimeType`` attribute is used to know in which format the track is in.

The RxPlayer understands the following ones:
  - ``application/ttml+xml``: TTML in plain text
  - ``text/vtt``: WebVTT in plain text
  - ``application/x-sami``: SAMI in plain text
  - ``application/mp4``: Text track embedded in an MP4 container.
  - ``text/plain``: Generic plain text mimeType

For the last two, the ``codecs`` attribute of the ``AdaptationSet`` will be
exploited to know the exact format.

----

The rx-player uses the ``codecs`` attribute for text tracks in only two cases:
  - the ``mimeType`` is equal to ``application/mp4``
  - the ``mimeType`` is equal to ``text/plain``

For the first case, both WebVTT and TTML can be embedded in an MP4 file. To know
which one we're dealing with, the ``codecs`` attribute should be equal to:
  - ``stpp`` for TTML
  - ``wvtt`` for WebVTT

For the second case (``"text/plain"``), this is specifically to support plain
SubRip (SRT) subtitles. To use them you need to set ``codecs`` simply to
``srt``.

----

To know if we're dealing with a closed caption text track, the RxPlayer uses the
[DVB-DASH specification](https://www.dvb.org/resources/public/standards/a168_dvb-dash.pdf).

That is, an ``AdaptationSet`` is inferred to be a closed caption for the hard of
hearing, if it contains an ``Accessibility`` descriptor with the following
attributes:
  - ``SchemeIdUri`` set to ``urn:tva:metadata:cs:AudioPurposeCS:2007``
  - ``value`` set to ``2``


<a name="manifest-smooth"></a>
### In Microsoft Smooth Streaming ##############################################

In Smooth Manifests, a ``StreamIndex`` is inferred to be for a text track if its
``Type`` attribute is equal to ``text``.

----

The ``FourCC`` attribute is used to infer the format of the text track. Only
``TTML`` is understood, and is translated to be a TTML track embedded in an MP4
container.

Adding support for other formats is very simple, open an issue if you want us to
add a standardized FourCC code for another supported format.

----

The ``Language`` is used to know the language the track is in. The rules are the
same than for DASH:

The rx-player understand the following standards:
  - ISO 639-1 (2 letters)
  - ISO 639-2 (3 letters)
  - ISO 639-3 (3 letters)
More complex combined formats are also understood, as long as it begins by one
of the understood standards, followed by a dash ("-").

For example "en-US" is translated into just "en", and then inferred to be
english.

----

The ``Subtype`` attribute is used to know if the language is a closed caption or
not.

At the moment, the RxPlayer infers the track to be a closed caption only if its
value is ``DESC``.



<a name="manual"></a>
## Text tracks added manually ##################################################

It is also possible to add a supplementary text track dynamically, by using the
`TextTrackRenderer` tool. You can read its documentation
[here](./TextTrackRenderer.md).


<a name="modes"></a>
## Text track display modes ####################################################

There is two ways the text track can be displayed:

  - ``"native"``: The text track is displayed in ``<track>`` elements, which are
    directly in the linked ``videoElement``.

  - ``"html"``: The text track is displayed in a separate ``<div>`` element.

The second ones allows for a better track stylisation. The distinction between
those two is pretty simple and is explained
[here](./loadVideo_options.md#prop-textTrackMode), in the [loadVideo options
documentation](./loadVideo_options.md).
