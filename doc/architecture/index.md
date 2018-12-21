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
As such, the impact an evolution on a particular module has on the rest of the
code is controlled and limited to these interfaces.

Like the code, the documentation is also divided in multiple parts, which link
one by one to a module in the code.

Such modules are (with link to their respective documentation, if one):

  - __the [API](./api/index.md)__

    Defines the public API of the RxPlayer and provides abstractions to help
    implementing it.


  - __the [Init](./init/index.md)__

    Initialize the content and connects the different modules between one
    another to allow continuous playback.


  - __the [EMEManager](./eme/index.md)__

    Allows to handle contents with DRM (Digital Right Management).


  - __the [ABRManager](./abr/index.md)__

    Helps to choose the best quality in the current content by analyzing the
    current network, user settings and viewing conditions.


  - __the [Buffers](./buffers/index.md)__

    Choose which media segments to download and push them to SourceBuffers to
    then be able to decode them.

    Various files documenting the Buffers architecture should be available in
    the ``doc/architecture/buffer`` directory.


  - __the SourceBuffers__

    Provides abstractions on top of the browser's SourceBuffers, which are used
    to push media segments.
    These files help to handle those "native" SourceBuffers (defined by the
    browser), but also define custom ones for media managed entirely by the
    RxPlayer like subtitles and thumbnails.


  - __the [transports](./transports/index.md)__

    Perform manifest/segment requests, and parse them.
    `transports` in essence abstracts the transport protocol used (example:
    Smooth Streaming/DASH) to provide an unified definition of a segment or
    manifest to the other modules.
    In theory, it should be the only directory to update when adding /
    modifying / deleting a transport protocol


  - __the [Pipelines](./pipelines/index.md)__

    Link the `transport` module with the rest of the code, to download segments,
    download/refresh the manifest and collect data (such as the user's
    bandwidth) for the other modules.


The RxPlayer also has multiple isolated helpers (for manifest management,
segment parsing, browser compatibility) which are used by these different
modules.

A documentation about the file organization of the project is also available
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
                   |   ^                                                       |
                   |   ~                                                       |
-----RxPlayer------------------------------------------------------------------|----------
                   |   ~                             +-------------------+     |
                   V   ~          Front-facing API   |  ---> Call        |     |
     +-------------------------------------------+   |  ~~~> Send events |     |
     |                    API                    |   +-------------------+     |
     +-------------------------------------------+                             |
 +--------------------+    |    |   ^                                          |
 |    TrackManager    | <--+    |   ~                                          |
 +--------------------+         |   ~                                          |
 Manage track switching         |   ~                                          |
                                V   ~                                          |
                          +---------------+                                    |
 +------------+           |               | ----> +----------+             +------------+
 | EMEManager | <-------- |               | <~~~~ | Manifest | ----------> | transports |
 +------------+ ~~~~~~~~> |     Init      |       | Pipeline | <~~~~~~~~~~ +------------+
 Handle encrypted         |               |       +----------+             Implement  ^~
 contents                 |               |       Download the             the        |~
                          +---------------+       manifest                 streaming  |~
                                 | ^  Initialize                           protocol   |~
                                 | ~  a content                                       |~
                                 | ~  and connect                                     |~
                                 | ~  everything                                      |~
Buffers                          | ~                                                  |~
+--------------------------------|-~-----------------------------+                    |~
|                                V ~                             |                    |~
|  Create the right         +-------------------------------+    |                    |~
|  PeriodBuffers depending  |       BufferOrchestrator      |    |                    |~
|  on the current position, +-------------------------------+    |                    |~
|  settings, and the         | ^          |  ^           | ^     |                    |~
|  already created buffers   | ~          |  ~           | ~     |                    |~
|                            | ~          |  ~           | ~     |                    |~
|                            | ~          |  ~           | ~     |                    |~
|                  (audio)   v ~  (video) V  ~    (text) v ~     |                    |~
| Create the right +----------+   +----------+    +----------+   | +---------------+  |~
| AdaptationBuffer |          |   |          |    |          |---->|  SourceBuffer |  |~
| depending on the |  Period  |-+ |  Period  |-+  |  Period  |-+ | |   Manager (1) |  |~
| wanted track     |  Buffer  | | |  Buffer  | |  |  Buffer  | | | +---------------+  |~
|                  |          | | |          | |  |          | | | Create and handle  |~
|                  +----------+ | +----------+ |  +----------+ | |     SourceBuffers  |~
|                   |           |  |           |   |           | |                    |~
|                   +-----------+  +-----------+   +-----------+ |                    |~
|                          | ^            |  ^           | ^     |                    |~
|                          | ~            |  ~           | ~     |                    |~
|                          | ~            |  ~           | ~     |                    |~
|                          | ~            |  ~           | ~     |                    |~
|                  (audio) v ~    (video) V  ~    (text) v ~     |                    |~
|                  +----------+   +----------+    +----------+ <~~~+----------------+ |~
| Create the right |          |   |          |    |          | --->| ABRManager (1) | |~
| Representation   |Adaptation|-+ |Adaptation|-+  |Adaptation|-+ | +----------------+ |~
| Buffer depending |  Buffer  | | |  Buffer  | |  |  Buffer  | | |      Find the best |~
| on the current   |          | | |          | |  |          | | |            bitrate |~
| network,         +----------+ | +----------+ |  +----------+ | |                    |~
| settings...)      |           |  |           |   |           | |                    |~
|                   +-----------+  +-----------+   +-----------+ |                    |~
|                          | ^            |  ^           | ^     |                    |~
|                          | ~            |  ~           | ~     |                    |~
|                          | ~            |  ~           | ~     |                    |~
|                          | ~            |  ~           | ~     |                    |~
|                  (audio) v ~    (video) V  ~    (text) v ~     |                    |~
|                  +----------+   +----------+    +----------+ <~~~~ +-------------+  |~
| (Representation  |          |   |          |    |          | ----> | Segment     |--+~
| Buffer).         |Represe...|-+ |Represe...|-+  |Represe...|-+ |   | Pipeline (1)|<~~+
| Download and push|  Buffer  | | |  Buffer  | |  |  Buffer  | | |   +-------------+
| segments based on|          | | |          | |  |          | | |   Download media
| the current      +----------+ | +----------+ |  +----------+ | |   segments
| position and      |           |  |           |   |           | |
| buffer state      +-----------+  +-----------+   +-----------+ |
|                                                                |
+----------------------------------------------------------------+

(1) The SourceBufferManager, Segment Pipeline and ABRManager are actually created by the
Init and then used by the Buffers.
```
