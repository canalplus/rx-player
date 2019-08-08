# Transport pipeline ###########################################################

## Definition ##################################################################

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



## A loader ####################################################################

A loader in the transport pipeline is a function whose role is to "load" the
resource.

Depending on the streaming technology, this can mean doing a request or just
creating it from the informations given.

Its concept can be illustrated as such:
```
  INPUT:                                 OUTPUT:
  ------                                 -------
  URL and other informations +--------+  loaded resource
  about the wanted resource  |        |
============================>| LOADER |==============================>
                             |        |
                             +--------+
```

As the wanted resource could be obtained asynchronously (like when an HTTP
request has to be performed), the loader returns an Observable and the resource
is then emitted through it.

This Observable will throw on any problem arising during that step, such as an
HTTP error.

In some specific conditions, the loader can also emit the wanted resource in
multiple sub-parts. This allows for example to play a media file while still
downloading it and is at the basis of low-latency streaming.
To allow such use cases, the segment loaders can also emit the wanted resource
by cutting it into chunks and emitting them through the Observable as they are
available.
This is better explained in the related chapter below.



## A parser ####################################################################

A parser's role is to extract the data and other important informations from a
loaded resource.
It is connected in some ways to the response of the loader (which gives the
loaded resource) and will be the last step before that resource is actually
handled by the rest of the player.

Its concept can be illustrated as such:
```
  INPUT:                                OUTPUT:
  ------                                -------
  loaded resource +                     exploitable resource and
  resource informations +    +--------+ parsed informations from it
  request scheduler [1]      |        |
============================>| PARSER |==============================>
                             |        |
                             +--------+
```

The parser returns an Observable which will emit the parsed resource when done.

This Observable will throw if the resource is corrupted or miss crucial
informations.

[1] the parser could also need to perform requests (e.g. it needs to fetch the
current time from a server).
In such cases, the parser is given a special callback, which allows it to
receive the same error-handling perks than a loader, such as multiple retries,
just for those requests.



## Manifest loader #############################################################

The Manifest loader is the "loader" downloading the Manifest (or MPD) file.

It is a function which receives as argument the URL of the manifest and then
returns an Observable emitting a single time the corresponding Manifest when it
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



## Manifest parser #############################################################

The Manifest parser is a function whose role is to parse the Manifest in its
original form to convert it to the RxPlayer's internal representation of it.

It receives an argument the downloaded Manifest, some manifest-related
informations (e.g. its URL) and a specific function called `scheduleRequest`,
allowing it to ask for supplementary requests before completing (e.g. to fetch
the current time from an URL or to load sub-parts of the Manifests only known
at parse-time).

This function returns an Observable wich emits a single time the parsed
Manifest:
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



## Segment loader ##############################################################

A Transport pipeline declares one Segment loader per type of buffer (e.g. audio,
text, video...)

A segment loader is the "loader" for any segment. Its role is to retrieve a given
segment's data.

It receives informations linked to the segment you want to download:
  - The related `Manifest` data structure
  - The `Period`
  - The `Adaptation`
  - The `Representation`
  - The `Segment`

It then return an Observable which send events as it loads the corresponding
segment.

```
  INPUT:                              OUTPUT:
  ------                              -------
  Segment informations  +----------+  Segment in a generic format
                        |          |  (e.g. ArrayBuffer, string...)
=======================>| SEGMENT  |=================================>
                        |  LOADER  |
                        |          |
                        +----------+
```

The events sent depend on the "mode" chosen by the loader to download the
segment. There is two possible modes:

  - the regular mode, where the loader wait for the segments to be completely
    downloaded before sending it

  - the low-latency mode, where the loader emits segments by chunks at the same
    time they are downloaded.

The latter mode is usually active under the following conditions:
  - low-latency streaming is enabled through the corresponding `loadVideo` option
  - we're loading a DASH content.
  - we're not loading an initialization segment.

In most other cases, it will be in the regular mode.

You can deduce which mode it was in simply by looking a the events it sends.
In the regular mode, any of the following events can be sent through the
Observable:

  - `"progress"`: We have new metrics on the current download (e.g. the amount
    currently downloaded, the time since the beginning of the request...)

  - `"data-created"`: The segment is available without needing to perform a
    network request. This is usually the case when segments are generated like
    smooth's initialization segments.
    The segment's data is also communicated via this event.

    The `"data-created"` event, when sent, is the last event sent from the
    loader. The loader will complete just after.

  - `"data-loaded"`: The segment has been compeletely downloaded from the
    network. The segment's data is also communicated via this event.

    Like `"data-created"`, the `"data-loaded"` will be the last event sent by
    the loader.
    This means that you either have a single `"data-created"` event or a single
    `"data-loaded"` event with the data when the segment has been loaded
    succesfully.

In the low-latency mode, the following events can be sent instead:

  - `"progress"`: We have new metrics on the current download (e.g. the amount
    currently downloaded, the time since the beginning of the request...)

  - `"data-chunk"`: A sub-segment (or chunk) of the data is currently available.
    The corresponding sub-segment is communicated via this event.

    This event can be communicated multiple times until a `"data-complete"`
    event is received.

  - `"data-chunk-complete"`: The segment request just finished. All
    corresponding data has been sent through `"data-chunk"` events.

    If sent, this is the last event sent by a segment loader.



## Segment parser ##############################################################

A segment parser is a function whose role is to extract some informations from
the segment's data:
  - what its precize start time and duration is
  - whether the segment should be offseted when decoded and by what amount
  - the decodable data (which can be wrapped in a container e.g.  subtitles
    in an ISOBMFF file).

It receives the segment or sub-segment as argument and related informations
```
 INPUT:                                       OUTPUT:
 ------                                       -------
 Segment in a generic format +                Decodable data + time
 isChunked? [1] + Segment        +----------+ informations
 informations                    |          |
 ===============================>| SEGMENT  |===========================>
                                 |  PARSER  |
                                 |          |
                                 +----------+
```

[1] The parser can make different guess on the time informations of the
segment depending on if the loaded segment corresponds to the whole segment or
just a small chunk of it. The `isChunked` boolean allows it to be aware of that.
