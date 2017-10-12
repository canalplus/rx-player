# Networking (WIP)

## Overview

In the rx-player, what we call _net_ (short for _networking_) is the part of the code
interacting directly with CDNs. It is thus tightly coupled with the streaming technology chosen (e.g. DASH or Smooth Streaming).

There is as much _net_ implementations as there are transport technologies supported by the rx-player. At the time of writing, we have only the following implementations:
  - DASH
  - Smooth Streaming

Those files, which are located in the ``src/net/`` subdirectory, provide an interface to download and parse media segments, in a technology-agnostic way.

## Implementation

Each technology exports its function, which takes in argument options (that can be given through the ``transportOptions`` argument in the ``loadVideo`` method).

The function then returns an object, with the following keys:
  - ``manifest``: download and parse the technology's manifest or playlist
  - ``audio``: download and parse infos from audio segments
  - ``video``: download and parse infos from video segments
  - ``text``: download and parse infos from text tracks
  - ``image``: download and parse infos from image playlists

All of these properties are also objects, with two functions as properties:
  - ``resolver``(deprecated?): Infer the url of the wanted segment/manifest
  - ``loader``: Download the given segment / manifest
  - ``parser``: Parse the data of the downloaded segment or manifest, in a format compatible with the rx-player

All those functions return an observable.

> TODO delete completely the ``resolver`` part? (in some complex case, loader has to do it anyway (e.g. initialization segment with index separated)
> TODO merge ``loader`` and ``parser``? What about errors? (This is because of xlinks in manifest, for example)
> TODO own logic for manifest?

### resolver

#### Arguments

A ``resolver`` for the ``manifest`` property will receive a single object in argument with the following properties:
  - ``url`` {string}: Url of the manifest to download.

A ``resolver`` for ``audio``, ``video``, ``text`` and ``image`` segments will receive a single object in argument with the following properties:
  - ``manifest`` {Manifest}: The manifest of the playing content.
  - ``adaptation`` {Adaptation}: The adaptation (track) concerned.
  - ``representation`` {Representation}: The representation (quality) concerned.
  - ``segment`` {Segment}: The segment wanted.
  - ``init`` {Object}: Data parsed from the last initialization segment downloaded for this type.

#### Return value

A ``resolver`` should return any data necessary for the loader to perform its request.

What the observable emit will be directly fed into either:
  - the ``loader`` argument if defined.
  - the ``parser`` if the ``loader`` is not defined.

> TODO Too complicated, simplify this

### loader

The ``loader`` is the part downloading the manifests or segments.

As the major part interacting with CDN (only the ``loader`` and the license fetching logic should have access to the network), it also has the task to report the progress and bandwidth of the user.

#### Arguments

The ``loader`` receive as arguments either:
  - what was emitted by the ``resolver`` if defined.
  - the same data the ``resolver`` would have received if not defined.

> TODO delete totally ``resolver``, simplify ``loader`` arguments rules.

#### Return value

The objects returned by the observable of a ``loader`` are linked to a request.

They can be under two forms:
  - 0 or more progress reports
  - only 1 response (always the last object emitted)

Those objects have two keys: ``type`` {string} and ``value`` {Object}. ``type`` allows
to know which type of object we have:
  - ``"progress"``: means it is a progress report
  - ``"response"``: means it is a response

The ``value`` object differs depending on the type.

For ``"progress"`` reports, ``value`` has the following keys:
  - ``size`` {Number}: number of bytes currently loaded
  - ``totalSize`` {Number|undefined}: number of bytes to download in total
  - ``duration`` {Number}: amount of time since the beginning of the request, in
    ms
  - ``url`` {string}: the url on which the request was done

For a ``"response"``, ``value`` has the following keys:
  - ``size`` {Number|undefined}: number of bytes of the response
  - ``duration`` {Number}: total amount of time for the request, in ms
  - ``url`` {string}: the url on which the request was done
  - ``responseData`` {*}: the response, its value depends on the responseType
    header.

### parser

The ``parser`` is the part _parsing_ the given manifest or media segment.

Its role is mainly to get more informations about the content playing and to add more infos in the media containers (e.g. DRM informations for the browser or time infos).

#### Arguments

The ``parser`` for the ``manifest`` reveive in argument an object with the following properties:
  - ``response`` {Object}: What was emitted as a ``value`` in the ``response`` event of the ``loader``.

The ``parser`` for the ``audio``, ``video``, ``text`` and ``image`` segments will receive a single object in argument with the following properties:
  - ``manifest`` {Manifest}: The manifest of the playing content.
  - ``adaptation`` {Adaptation}: The adaptation (track) concerned.
  - ``representation`` {Representation}: The representation (quality) concerned.
  - ``segment`` {Segment}: The segment wanted.
  - ``response`` {Object}: What was emitted as a ``value`` in the ``response`` event of the ``loader``.
  - ``init`` {Object}: Data parsed from the last initialization segment downloaded for this type.

> TODO simplify parser argument (response, the rules of transmition from the previous pipelines)

#### Return value

The object returned by the observable of the manifest parser has the
following keys:
  - ``manifest`` {Object}: The parsed manifest
  - ``url`` {string}: url at which the manifest was downloaded, and at which it should be refreshed.

> TODO Complete ``manifest`` format specification.
> TODO link manifest file directly into net?
> TODO better solution for manifest refreshing?

The object returned by the observable of the ``audio``, ``video``, ``text`` and ``image``'s
parser has the following keys:

  - segmentData {*}: The raw exploitable data of the downloaded segment.
    The type of data depends on the type of segment concerned.

  - segmentInfos {Object|undefined}: Informations about the parsed segment.
    Contains the following keys:

      - time {Number}: initial start time for that segment, in the segment
        timescale.
        Can be -1 if the segment is not meant to be played (e.g. initialization
        segments).

      - duration {Number}: duration for that segment, in the segment
        timescale. Can be 0 if the segment has no duration (e.g initialization
        segments).

      - timescale {Number|undefined}: timescale in which the duration
        and time of this same object are defined. For initialization segments, this
        value can be undefined.

    For initialization segments, this object can be important for subsequent download
    of "regular" segments. As such, it should be re-fed as an ``init`` object
    to the load function of the corresponding pipeline, for segments linked
    to this initialization segment (the pipelines here do not save any state).

  - nextSegments {Array.<Object>|undefined}: Supplementary informations on
  subsequent segment.

> TODO documentation of nextSegments.

##### text parser

More specifically, the ``text`` parser's ``segmentData`` should be an object, with
the following keys:

  - type {string}: type of subtitles.
    Can be either "ttml", "vtt", "sami" or "smil" for the moment.

  - data {string} The texttrack data.

  - language {string|undefined}: language the subtitles are in. Not needed
    in most cases.

  - timescale {Number}: the timescale. That is, the number of time units that
    pass in one second. For example, a time coordinate system that measures
    time in sixtieths of a second has a timescale of 60.

  - start {Number}: The start time, timescaled, those texttracks are for.
    Note that this value is different than the start of the first cue:
      - the start of the first cue is the time at which the first cue in the
        data given should begin to be displayed.
      - ``start`` is the absolute start time for which the data apply.
    That means, if the given data is for a segment that begins with 10s
    without any cue, the ``start`` value should be 10s (timescaled) inferior
    to the start of the first cue.
    This is useful to copy the behavior of "native" SourceBuffer to indicate
    which segments have been "buffered".

  - end {Number|undefined}: The end time, timescaled, those texttracks are
    for.
    Check ``start`` for more informations about the difference between this
    value and the end of the last cue in the data.
    This number can be undefined to raise the error resilience. In that case,
    the end time will be defined from the last text track in the data.
