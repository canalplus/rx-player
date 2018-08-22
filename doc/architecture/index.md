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


  - __the [Stream](./stream/index.md)__

    Initialize the content and connects the different modules between one
    another to allow continuous playback.


  - __the EMEManager__

    Allows to handle contents with DRM (Digital Right Management).


  - __the [ABRManager](./abr/index.md)__

    Helps to choose the best quality in the current content by analyzing the
    current network, user settings and viewing conditions.


  - __the [Buffer](./buffer/index.md)__

    Choose which media segments to download and push them to SourceBuffers to
    then be able to decode them.

    Various files documenting the Stream architecture should be available in the
    ``doc/architecture/buffer`` directory.


  - __the Source Buffers__

    Provides abstractions on top of the SourceBuffers, which are used to push
    media segments.
    These files help to handle "native" SourceBuffers already defined by the
    browser (for audio and video segments), but also define custom ones for
    media managed entirely by the RxPlayer (example: subtitles and thumbnails).


  - __the [Networking code](./net/index.md)__

    Perform manifest/segment requests, and parse them.
    "_Net_" in essence abstracts the transport protocol used (example:
    HSS/DASH) to provide an unified definition of a segment or manifest to
    the other modules.
    In theory, it should be the only directory to update when adding /
    modifying / deleting a transport protocol


  - __the [Pipelines](./pipelines/index.md)__

    Link the _Net_ module with the rest of the code, to download segments,
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
               +---------------------------------------------+
               |                                             |
               |               Application/UI                |
               |                                             |
               +---------------------------------------------+
                   |       ^
                   |       |
-----RxPlayer-------------------------------------------------------------------
                   |       |
                   V       |                  Front-facing API
               +---------------------------------------------+
               |                    API                      |
               +---------------------------------------------+
                            ^ |         |          ^
                            | |         |          |
 +----------------------+ --+ |         |          |
 |     TrackManager     | <---+         |          |
 +----------------------+               |          |
 Manage track switching                 |          |
                                        V          |
  +-------------------+           +--------------------+ ----> +------------+
  | Manifest Pipeline | <-------- |                    | <---- | EMEManager |
  +-------------------+ --------> |                    |       +------------+
   Download and parse             |                    |     Handle encrypted
   the manifest                   |                    |             contents
                      +---------- |                    |
                      |  +------> |       Stream       | ----> +--------------+
                      v  |        |                    | <---- | SpeedManager |
 +----------------------------+   |                    |       +--------------+
 | SegmentPipelineManager (1) |   |                    |       Manage playback
 +----------------------------+   |                    |                  rate
  Factory creating segment        |                    | <---------------+
  `pipelines` to download         +--------------------+ ------------+   |
  segments                         ^ |    |  ^  Initialize           V   |
                                   | |    |  |  a content     +----------------+
+---------------------+ -----------+ |    |  |  and connect   | ABRManager (1) |
|                     | <------------+    |  |  everything    +----------------+
| SourceBufferManager |                   |  |                     Find the best
|         (1)         |                   |  |                           bitrate
|                     |                   |  |
+---------------------+                   |  |
 Create and handle                        |  |
 SourceBuffers                            |  |
                                          |  |
+------------------------------------------------------------------------------+
|                                         |  |                                 |
|                                         V  |                                 |
|                               +--------------------------------+             |
| +-------------------+ ------> |       PeriodBufferManager      |             |
| | SegmentBookkeeper | <------ +--------------------------------+             |
| +-------------------+   +------^ | |          ^     Create the right         |
|  Keeps track of which   | -------+ |          |     AdaptationBuffer(s)      |
|  segments are currently | |        |          |                              |
|  available              | |        |          |                              |
|                         | V        |          |                              |
| +------------------------+   +------------------------+                      |
| | BufferGarbageCollector |   |    AdaptationBuffer    | Create the right     |
| +------------------------+   +------------------------+ RepresentationBuffer |
|  Control memory taken              |          ^                              |
|  by the SourceBuffers              V          |                              |
|  (Needed on some peculiar    +----------------------+                        |
|  devices)                    + RepresentationBuffer |                        |
|                              +----------------------+                        |
|                                 Download and push media                      |
|   ...                           segments for a given                         |
|                                 type (video/audio/text...)                   |
|                                                                              |
+------------------------------------------------------------------------------+
                                                                        Buffers

(1) The SourceBufferManager, SegmentPipelineManager and ABRManager are actually
initialized by the Stream but are then mainly used by the Buffers.
```
