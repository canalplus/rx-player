# RxPlayer Architecture documentation ##########################################

## Overview ####################################################################

The files in this directory and subdirectories establish a documentation about
the RxPlayer's architecture.

They are here to help you understand the way the player works, by describing
the different bricks and algorithms that come into play.

_Note: As some terms used here might be too foreign or slightly different than
the one you're used to, we also wrote a list of terms and definitions used by
the RxPlayer [here](../terms.md)._



## Organization of the documentation ###########################################

The RxPlayer is heavily modularized.

This helps us maintaining the code and providing evolutions more quickly, as the
various modules use few well-defined interfaces with the rest of the code.

Like the code, the documentation is also divided in multiple parts, which link
one by one to a module in the code.

Such modules are (with link to their respective documentation, if one):

  - __the [API](./api/index.md)__

    Defines the public API of the RxPlayer and provides abstractions to help
    implementing it.


  - __the [Init](./init/index.md)__

    Initialize playback and connects the different modules between one another.


  - __the [EMEManager](./eme/index.md)__

    Negotiate content decryption.

    Only used for contents with DRM (Digital Right Management).


  - __the [ABRManager](./abr/index.md)__

    Helps to choose the best quality in the current content by analyzing the
    current network, user settings and viewing conditions.


  - __the [Stream](./stream/index.md)__

    Choose which media segments to download and push them to media buffers (here
    called the `SegmentBuffers`) to then be able to decode them.

    Various files documenting the Stream architecture should be available in
    the ``doc/architecture/stream`` directory.


  - __the [SegmentBuffers](./segment_buffers/index.md)__

    Implement media buffers on which loaded segments will be pushed.
    The corresponding media data contained in them will then be decoded at the
    right time.

    Those buffers can depend on browser implementations (for example for audio
    and video contents, we rely on `SourceBuffer` JS objects) or may be
    completely defined in the code (for example, text track buffers in the
    `"html"` `textTrackMode` are entirely defined in the RxPlayer).

    Those `SegmentBuffers` have added niceties over just being simple data
    buffers. For example, they include an inventory which allows to retrieve the
    metadata about every segments that is still contained within it.

  - __the [transports](./transports/index.md)__

    Perform manifest/segment requests, and parse them.

    `transports` in essence abstracts the transport protocol used (example:
    Smooth Streaming/DASH) to provide an unified definition of a segment or
    manifest to the other modules.
    In theory, it should be the only directory to update when adding /
    modifying / deleting a transport protocol


  - __the [fetchers](./fetchers/index.md)__

    Link the `transports` module with the rest of the code, to download
    segments, download/refresh the manifest and collect data (such as the
    user's bandwidth) for the other modules.


The RxPlayer also has a multitude of isolated helpers (for manifest management,
segment parsing, browser compatibility, feature switching, error handling etc.)
which are used by these different modules.

A documentation about the file organization of the project is available
[here](./files.md).



## Global architecture #########################################################

To better understand the player's architecture, you can find below a
(simplified!) schema of it:

```
               +---------------------------------------------+              ,,,,,,,
               |                                             |             (  CDN  )
               |               Application/UI                |              ```````
               |                                             |                 ^
               +---------------------------------------------+                 |
                          | ^                                                  |
                          | ~                                                  |
-----RxPlayer------------------------------------------------------------------|----------
                          | ~                          +-------------------+   |
                          V ~     Front-facing API     |  ---> Call        |   |
     +-------------------------------------------+     |  ~~~> Send events |   |
     |                    API                    |     +-------------------+   |
     +-------------------------------------------+                             |
 +--------------------+    |      | ^                                          |
 | TrackChoiceManager | <--+      | ~                                          |
 +--------------------+           | ~                                          |
 Facilitate track                 | ~                                          |
 switching for                    V ~                                          |
 the API                  +---------------+                                    |
                          |               |           +----------+ ------> +------------+
 +------------+ <-------- |               | --------> | Manifest | <~~~~~~ | transports |
 | EMEManager | ~~~~~~~~> |     Init      | <~~~~~~~~ | fetcher  |         +------------+
 +------------+           |               |           +----------+         Abstract   ^ ~
 Negotiate content        |               |           Download the         the        | ~
 decryption               +---------------+           manifest             streaming  | ~
                                 | ^  Initialize                           protocol   | ~
                                 | ~  playback and                                    | ~
                                 | ~  create/connect                                  | ~
                                 | ~  modules                                         | ~
Stream                           | ~                                                  | ~
+--------------------------------|-~-----------------------------+                    | ~
|                                V ~                             |                    | ~
|  Create the right         +-------------------------------+    |                    | ~
|  PeriodStreams depending  |       StreamOrchestrator      |    |                    | ~
|  on the current position, +-------------------------------+    |                    | ~
|  and settings              | ^          | ^            | ^     |                    | ~
|                            | ~          | ~            | ~     |                    | ~
|                            | ~          | ~            | ~     |                    | ~
|                            | ~          | ~            | ~     |                    | ~
|                  (audio)   v ~  (video) V ~     (text) v ~     |                    | ~
| Create the right +----------+   +----------+    +----------+   |  +--------------+  | ~
| AdaptationStream |          |   |          |    |          |----> |SegmentBuffers|  | ~
| depending on the |  Period  |-+ |  Period  |-+  |  Period  |-+ |  |   Store (1)  |  | ~
| wanted track     |  Stream  | | |  Stream  | |  |  Stream  | | |  +--------------+  | ~
| (One per Period  |          | | |          | |  |          | | |  Create one        | ~
| and one per type +----------+ | +----------+ |  +----------+ | |  media buffer per  | ~
| of media)         |           |  |           |   |           | |  type of media     | ~
|                   +-----------+  +-----------+   +-----------+ |                    | ~
|                          | ^            | ^            | ^     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                  (audio) v ~    (video) V ~     (text) v ~     |                    | ~
|                  +----------+   +----------+    +----------+ ---> +--------------+  | ~
| Create the right |          |   |          |    |          | <~~~ |ABRManager (1)|  | ~
| Representation-  |Adaptation|-+ |Adaptation|-+  |Adaptation|-+ |  +--------------+  | ~
| Stream depending |  Stream  | | |  Stream  | |  |  Stream  | | |  Find the best     | ~
| on the current   |          | | |          | |  |          | | |  bitrate           | ~
| network,         +----------+ | +----------+ |  +----------+ | |                    | ~
| settings...       |           |  |           |   |           | |                    | ~
|                   +-----------+  +-----------+   +-----------+ |                    | ~
|                          | ^            | ^            | ^     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                  (audio) v ~    (video) V ~     (text) v ~     |                    | ~
|                  +----------+   +----------+    +----------+ ----> +------------+   | ~
| (Representation- |          |   |          |    |          | <~~~~ |  Segment   | --+ ~
| Stream).         |Represe...|-+ |Represe...|-+  |Represe...|-+ |   | fetcher (1)| <~~~+
| Download and push|  Stream  | | |  Stream  | |  |  Stream  | | |   +------------+
| segments based on|          | | |          | |  |          | | |   Download media
| the current      +----------+ | +----------+ |  +----------+ | |   segments
| position and      |           |  |           |   |           | |
| buffer state      +-----------+  +-----------+   +-----------+ |
|                                                                |
+----------------------------------------------------------------+

(1) The SegmentBuffersStore, Segment fetcher and ABRManager are actually created by the
Init and then used by the Stream.
```
