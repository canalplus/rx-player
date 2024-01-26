# Transport code

## Overview

The `transports` code in the `transports/` directory is the code translating
the streaming protocols available into a unified API.

Its roles are to:

- download the Manifest and parse it into an object that can be understood
  by the core of the rx-player

- download segments, convert them into a decodable format if needed, and
  report important information about them (like the duration of a segment)

- give networking metrics to allow the core to better adapt to poor networking
  conditions

As such, most network request needed by the player are directly performed by
the `transports` code.

Note: the only HTTP request which might be done elsewhere would be the request
for a `directfile` content. That request is not done explicely with a JavaScript
API but implicitely by the browser (inclusion of an `src` attribute).

## Implementation

This code is completely divided by streaming protocols used.
E.g. `DASH` streaming is entirely defined in its own directory and the same
thing is true for `Smooth Streaming` or `MetaPlaylist` contents.

When playing a `DASH` content only the DASH-related code will be called. When
switching to a `Smooth Streaming` content, only the `Smooth Streaming` code
will be used instead.

To allow this logic, any streaming protocol exposed in `transports` exposes
the same interface and abstracts the difference to the rest of the code.
For the core of the rx-player, we do not have any difference between playing
any of the streaming protocols available.

This also means that the code relative to a specific streaming technology is
within the `transports` directory.
This allows to greatly simplify code maintenance and evolutivity. For example,
managing a new streaming protocol would mainly just need us to add some code
there (you might also need to add parsers in the `parsers` directory). Same
thing for adding a new feature to e.g. `DASH` or `Smooth`.

Each streaming protocol implementation present in the `transports` code exports
a single `transport` function.

The object returned by that function is often referenced as the `transport
pipelines`.

## Transport pipeline

Each streaming protocol defines a function that takes some options in arguments
and returns an object. This object is often referenced as the `transport
pipelines` of the streaming protocol.

This object then contains the following functions:

- a Manifest "loader"
- a Manifest "parser"
- multiple segment "loaders" (one per type of buffer, like "audio", "video",
  "text"...).
- multiple segment "parsers"

As you can see, there's two recurrent concepts here: the loader and the parser.

### A loader

A loader in the transport pipeline is a function whose role is to "load" the
resource.

Depending on the streaming technology, this can mean doing a request or just
creating it from the information given.

Its concept can be illustrated as such:

```
  INPUT:                                 OUTPUT:
  ------                                 -------
  URL and other information  +--------+  loaded resource
  about the wanted resource  |        |
============================>| LOADER |==============================>
                             |        |
                             +--------+
```

As the wanted resource could be obtained asynchronously (like when an HTTP
request has to be performed), the loader returns a Promise which resolves once
the full resource is loaded.

This Promise will reject on any problem arising during that step, such as an
HTTP error.

In some specific conditions, the loader can also emit the wanted resource in
multiple sub-parts. This allows for example to play a media file while still
downloading it and is at the basis of low-latency streaming.
To allow such use cases, the segment loaders can also emit the wanted resource
by cutting it into chunks and emitting them through a callback as it becomes
available.
This is better explained in the related chapter below.

### A parser

A parser's role is to extract the data and other important information from a
loaded resource.
It is connected in some ways to the response of the loader (which gives the
loaded resource) and will be the last step before that resource is actually
handled by the rest of the player.

Its concept can be illustrated as such:

```
  INPUT:                                OUTPUT:
  ------                                -------
  loaded resource +                     exploitable resource and
  resource information +     +--------+ parsed information from it
  request scheduler [1]      |        |
============================>| PARSER |==============================>
                             |        |
                             +--------+
```

Depending on the type of parser (e.g. Manifest parser or segment parser), that
task can be synchronous or asynchronous.

In asynchronous cases, the parser will return a Promise resolving with
the result when done and rejecting if an error is encountered.

In synchronous cases, the parser returns directly the result, and can throw
directly when/if an error is encountered.

[1] a parser could also need to perform requests (e.g. it needs to fetch the
current time from a server).
In such cases, the parser is given a special callback, which allows it to
receive the same error-handling perks than a loader, such as multiple retries,
just for those requests.

### Manifest loader

The Manifest loader is the "loader" downloading the Manifest (or MPD) file.

It is a function which receives as argument the URL of the manifest and then
returns a Promise resolving with the corresponding loaded Manifest when it
finished downloading it:

```
  INPUT:                              OUTPUT:
  ------                              -------
  Manifest/MPD URL      +----------+  Manifest in a generic format
                        |          |  (e.g. string, Document...)
=======================>| MANIFEST |=================================>
                        |  LOADER  |
                        |          |
                        +----------+
```

### Manifest parser

The Manifest parser is a function whose role is to parse the Manifest in its
original form to convert it to the RxPlayer's internal representation of it.

It receives in argument the downloaded Manifest, some Manifest-related
information (e.g. its URL) and a specific function called `scheduleRequest`,
allowing it to ask for supplementary requests before completing (e.g. to fetch
the current time from an URL or to load sub-parts of the Manifests only known
at parse-time).

This function returns either the parsed Manifest object directly or wrapped in a
Promise:

```
 INPUT:                                       OUTPUT:
 ------                                       -------
 Manifest in a generic format +  +----------+ RxPlayer's `Manifest`
 URL + request scheduler         |          | structure
 ===============================>| MANIFEST |===========================>
                                 |  PARSER  |
                                 |          |
                                 +----------+
```

### Segment loader

A Transport pipeline declares one Segment loader per type of buffer (e.g. audio,
text, video...)

A segment loader is the "loader" for any segment. Its role is to retrieve a given
segment's data.

It receives information linked to the segment you want to download:

- The related `Manifest` data structure
- The `Period` it is linked to
- The `Adaptation` it is linked to
- The `Representation` it is linked to
- The `Segment` object it is linked to

It then return a Promise resolving when the segment is loaded.

```
  INPUT:                              OUTPUT:
  ------                              -------
  Segment information   +----------+  Segment in a generic format
                        |          |  (e.g. ArrayBuffer, string...)
=======================>| SEGMENT  |=================================>
                        |  LOADER  |
                        |          |
                        +----------+
```

The events sent in output depend on the "mode" chosen by the loader to download
the segment. There are two possible modes:

- the regular mode, where the loader wait for the segments to be completely
  downloaded before sending it

- the low-latency mode, where the loader emits segments by chunks at the same
  time they are downloaded.

The latter mode is usually active under the following conditions:

- low-latency streaming is enabled through the corresponding `loadVideo`
  option
- we're loading a DASH content.
- we're not loading an initialization segment.
- the segment is in a CMAF container
- the `Fetch` JS API is available

In most other cases, it will be in the regular mode, where the segment is fully
communicated as the returned Promise resolves.

In the low-latency mode, chunks of the data are sent through a callback given
to the segment loaded and the promise only resolves once all chunks have been
communicated that way.

### Segment parser

A segment parser is a function whose role is to extract some information from
the segment's data:

- what its precize start time and duration is
- whether the segment should be offseted when decoded and by what amount
- the decodable data (which can be wrapped in a container e.g. subtitles in an
  ISOBMFF container).
- the attached protection information and data to be able to decrypt that
  segment.

It receives the segment or sub-segment as argument and related information:

```
 INPUT:                                       OUTPUT:
 ------                                       -------
 Segment in a generic format +                Decodable data + time
 isChunked? [1] + Segment        +----------+ information + segment protection
 information                     |          | information
 ===============================>| SEGMENT  |===========================>
                                 |  PARSER  |
                                 |          |
                                 +----------+
```

[1] The parser can make different guess on the time information of the
segment depending on if the loaded segment corresponds to the whole segment or
just a small chunk of it. The `isChunked` boolean allows it to be aware of that.
