# RxPlayer Architecture documentation ##########################################

## Preliminary notes ###########################################################

You will find the architecture documentation alongside the code it documents,
as `README.md` files (like this one).


## Global architecture #########################################################

The RxPlayer may either run in a multithreaded "mode" or a monothreaded
one depending on how it is configured.
To easily allow for both, files containing its main logic are principally
organized between two directories:

  - `./main_thread` contains code that will always run in the main JS thread
    regardless of the RxPlayer's current mode.

  - `./core` contains code that may either run in a separate Worker thread (in
    the multithreaded mode) or in main thread (in monothreaded mode).

There are also several other files and directories those two may depend on.

To better understand the player's architecture, you can find below a
simplified schema for it:

```
               +---------------------------------------------+
               |                                             |
               |               Application/UI                |
               |                                             |
               +---------------------------------------------+
                         |
                         | call RxPlayer API
                         |
-------------------------|- RxPlayer Main Thread ---------------------------
                         |
     Front-facing API    v
     +---------------------------------------+    +--------------------+
     |               Public API              |uses|     TracksStore    |
     |          (./main_thread/api)          |--->|(./main_thread/track|
     +---------------------------------------+    |s_store)            |
                 |                                +--------------------+
                 |                                 Facilitate track switching
 Initialize      | creates                         for the API
 playback and    |
 create/connect  |        Negotiate content
 modules         v        decryption
 +--------------------+   +-----------------------+
 |                    |   |   Content Decryptor   |       Renders text
 |      Content       |-->|(./main_thread/decrypt)|       tracks to the
 |    Initializer     |   +-----------------------+       DOM
 |                    |                             +------------------+
 |(./main_thread/init)|            creates          |  Text Displayer  |
 |                    | --------------------------->|(./main_thread/te |
 +--------------------+                             |xt_displayer)     |
        |  ^                                        +------------------+
        |  | Message exchanges                                          ^
        |  |                                                            |
--------|--|------ RxPlayer Core (May run in a WebWorker) --------------|---
        v  |                                                            |
  +---------------------------+         +----------------------------+  |
  |                           | creates |                            |  |
  |      Worker Portal*       |-------->|       Manifest Fetcher     |  |
  |(./core/core_portal/worker)|         | (./core/fetchers/manifest) |  |
  |                           |         |                            |  |
  +---------------------------+         +----------------------------+  |
  (*Only if running in a   |            Load and     |                  |
  WebWorker)               |            refresh the  | Ask to load      |
  Exchange messages with   |            Manifest     | and parse the    |
  the main thread and      |                         | Manifest         |
  process them.            |                         v                  |
                           |        +--------------------+              |   ` Internet
                           |        |                    |   request    |   `    ,,,,,
                           |        |      transport     |--------------+---`-->( CDN )
                   creates |        | (./core/transport) |              |   `    `````
                           |        |                    |<---+         |   `
                           |        +--------------------+     \        |
                           |        Abstract the streaming      \       |
                           |        protocol (e.g. DASH)         \      |
                           |                                      \     |
Stream (./core/stream)     |                                       \    |
+--------------------------|-------------------------------+        \   |
|                          v                               |         \  +
| Create the right        +----------------------------+   |    Ask to\  \
| PeriodStreams depending |      StreamOrchestrator    |   |    load   \  \
| on the current position,|(./core/stream/orchestrator)|   |    and     \  \
| and settings            +----------------------------+   |    parse    \  \
|                          |            |            |     |    segments  \  \
|                          | creates    |            |     |               \  \
|                          |            |            |     |                \  +
|                 (audio)  v    (video) v     (text) v     |                 + |
| Create the right +--------+   +--------+    +--------+ uses+------------+  | |
| AdaptationStream |        |   |        |    |        |---->|SegmentSinks|  | |
| depending on the | Period |-+ | Period |-+  | Period |-+ | |    Store   |  | |
| wanted track     | Stream | | | Stream | |  | Stream | | | |(./core/segm|  | |
| (One per Period  |        | | |        | |  |        | | | |ent_sinks)  |  | |
| and one per type +--------+ | +--------+ |  +--------+ | | +------------+  | |
| of media)         |         (./core/stream/period)     | | Create one      | |
|                   +---------+  +---------+   +---------+ | "sink" per      | |
|                          |            |             |    | type of media   | |
|                          | creates    |             |    |                 | |
|                          |            |             |    |                 | |
|                          |            |             |    |                 | |
|                  (audio) v    (video) v     (text)  v  uses+------------+  | |
|                  +--------+   +--------+    +--------+ --|>|    ARS*    |  | |
| (Adaptation-     |        |   |        |    |        |   | |(./core/adap|  | |
| Stream)          |Adapt...|-+ |Adapt...|-+  |Adapt...|-+ | |tive)       |  | |
| Create the right | Stream | | | Stream | |  | Stream | | | +------------+  | |
| Representation-  |        | | |        | |  |        | | | *Adaptive       | |
| Stream depending +--------+ | +--------+ |  +--------+ | | Representation  | |
| on the current   |        (./core/stream/adaptation)   | | Selector:       | |
| network,         +---------+  +---------+   +----------+ | Find the best   | |
| settings...              |            |            |     | Representation  | |
|                          | creates    |            |     | to play         | |
|                          |            |            |     |                 | |
|                          |            |            |     |                 | |
|                  (audio) v    (video) v     (text) v   uses                | |
|                  +--------+   +--------+    +--------+ --->+-------------+ | |
| (Representation- |        |   |        |    |        |   | |   Segment   | | |
| Stream).         |Repre...|-+ |Repre...|-+  |Repre...|-+ | |   fetcher   |-+ |
| Download and push| Stream | | | Stream | |  | Stream | | | |(./core/fetc |   |
| segments based on|        | | |        | |  |        | | | |hers/segment)|   |
| the current      +--------+ | +--------+ |  +--------+ | | +-------------+   |
| position and      |     (./core/stream/representation)   | Load media        |
| buffer state      +---------+  +---------+   +---------+ | segments          |
|                         |               |              | |                   |
+-------------------------|---------------|--------------|-+                   |
                          |               |              |                     |
                          | push media    |              |        add subtitle |
                          | data          |              |                     |
                          |               |              |                     |
                +---------|---------------|--------------|-------+             |
                |  (audio)v        (video)v        (text)v       |             |
                |  +------------+  +------------+  +-----------+ |             |
 Media sinks on |  | Audio/Video|  | Audio/Video|  |   Text    | |             |
 which media    |  |   Segment  |  |   Segment  |  |  Segment  | |             |
 data to decode |  |    Sink    |  |    Sink    |  |   Sink    | |             |
 is pushed.     |  +------------+  +------------+  +-----------+ |             |
 Also maintain  |        |               |               |       |             |
 an inventory   |  SegmentSink implementations           |       |             |
 and history of |  (./core/segment_sinks/implementations)|       |             |
 pushed media   +--------|---------------|---------------|-------+             |
                         |               |               |                     |
                         | push media    |               |                     |
                         | data          |               |                     |
                         |               |               |                     |
                  (audio)V        (video)V         (text)V                     |
                    +-----------------------+  +-------------------------+     |
  Actually pushes   |      MediaSource      |  |      TextDisplayer      |     |
  audio and video   |       Interface       |  |      Message sender     |-----+
  data to the right |        (./mse)        |  |   (./core/core_portal)  |
  low-level buffers +-----------------------+  +-------------------------+
                                               Small interface
                                               facilitating communication
                                               with current TextDisplayer
                                               implementation
```

For the subdirectories and files in this directory not represented in that
schema:

  - `Compat` (_./compat_): Regroups every functions related to improving
    compatibility with browsers / environments.

  - `errors` (_./errors_): Defines error subclasses, most of all for the API.

  - `experimental` (_./experimental_): Special directory for "experimental" tools
     and features.

  - `features` (_./features_): Special directory allowing feature switching
    (enabling/disallowing features to not include unused code when importing the
    RxPlayer).

  - `manifest` (_./manifest_): Defines a `Manifest` structure and its
    properties, a central structure of the player describing a content.

  - `multithread` (_./multithread_): Global code specific to the multithreaded
    "flavor" of the RxPlayer, that is a specific RxPlayer class which may run
    its main logic in a WebWorker to improve performance.

  - `parsers` (_./parsers_): Various parsers for several formats

  - `tools` (_./tools_): Defines "tools", APIs which are not part of the
    RxPlayer class.

  - `utils` (_./utils_): Define utils function, small functions which can be
    used in several part of the RxPlayer's code.

  - `config.ts` (_./config.ts_): Exports an interface allowing to update the
    RxPlayer's config.

  - `index.ts` (_./index.ts_): Exports the main entry point for the RxPlayer,
    with a default set of features.

  - `log.ts` (_./log.ts_): Exports the main RxPlayer's Logger instance.

  - `minimal.ts` (_./minimal.ts_): Exports the entry point for the minimal
    RxPlayer, which is an RxPlayer without any feature. When relying on this
    build, an application will have to manually add the specific features it
    wants.

 - `multithread_types.ts` (_./multithread_types.ts_): TypeScript types used
   specifically when running the RxPlayer in multithread mode.

 - `public_types.ts` (_./public_types.ts_): List all TypeScript types which are
   part of the API.

 - `worker_entry_point.ts` (_./worker_entry_point.ts_): Entry point for the
   logic of the RxPlayer which will run in the WebWorker (and which will
   have to be loaded separately by the application).
