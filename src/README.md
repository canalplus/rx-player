# RxPlayer Architecture documentation

## Preliminary notes

You will find the architecture documentation alongside the code it documents, as
`README.md` files (like this one).

## Global architecture

The RxPlayer may either run in a multithreaded "mode" or a monothreaded one depending on
how it is configured. To easily allow for both, files containing its main logic are
principally organized between two directories:

- `./main_thread` contains code that will always run in the main JS thread regardless of
  the RxPlayer's current mode.

- `./core` contains code that may either run in a separate Worker thread (in the
  multithreaded mode) or in main thread (in monothreaded mode).

There are also several other files and directories those two may depend on.

To better understand the player's architecture, you can find below a simplified schema for
it:

``````
               +---------------------------------------------+
               |                                             |
               |               Application/UI                |
               |                                             |
               +---------------------------------------------+
                         |
                         | call the RxPlayer API
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
   |  ^                                             +------------------+
   |  | Message exchanges                                          ^
   |  |                                                            |
---|--|----------- RxPlayer Core (May run in a WebWorker) ---------|---
   |  |                                                            |
   |  |  (*Only if running in a WebWorker)                         +----+
   |  |  Exchange messages with the main                                |
   V  |  thread and process them.                                       |
  +---------------------------+         +----------------------------+  |
  |                           | creates |                            |  |
  |        Worker Main*       |-------->|       Manifest Fetcher     |  |
  |   (./core/main/worker)    |         | (./core/fetchers/manifest) |  |
  |                           |         |                            |  |
  +---------------------------+         +----------------------------+  |
     | Creates             |            Load and     |                  |
     V                     |            refresh the  | Ask to load      |
   +-------------------+   |            Manifest     | and parse the    |
   |                   |   | creates                 | Manifest         |
   | CMCD data builder |   |                         v                  |
   |  (./core/cmcd)    |   |        +--------------------+              |   ` Internet
   |                   |   |        |                    |   request    |   `    ,,,,,
   +-------------------+   |        |      transport     |--------------+---`-->( CDN )
   Perform data collection |        |    (./transport)   |              |   `    `````
   for the "Common Media   |        |                    |<---+         |   `
   Client Data" (CMCD)     |        +--------------------+     \        |
   scheme.                 |        Abstract the streaming      \       |
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
| Stream).         |Repre...|-+ |Repre...|-+  |Repre...|-+ | |    Queue    |-+ |
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
  data to the right |        (./mse)        |  |      (./core/main)      |
  low-level buffers +-----------------------+  +-------------------------+
                                               Small interface
                                               facilitating communication
                                               with current TextDisplayer
                                               implementation
``````

For the subdirectories and files in this directory not represented in that schema:

- `Compat` (_./compat_): Regroups every functions related to improving compatibility with
  browsers / environments.

- `errors` (_./errors_): Defines error subclasses, most of all for the API.

- `experimental` (_./experimental_): Special directory for "experimental" tools and
  features.

- `features` (_./features_): Special directory allowing feature switching
  (enabling/disallowing features to not include unused code when importing the RxPlayer).

- `manifest` (_./manifest_): Defines a `Manifest` structure and its properties, a central
  structure of the player describing a content.

- `PlaybackObserver` (./playback_observer): Defines `PlaybackObserver` instances, used by
  many modules to obtain playback-related properties (such as the playing position, the
  current playback speed etc.).

- `parsers` (_./parsers_): Various parsers for several formats

- `tools` (_./tools_): Defines "tools", APIs which are not part of the RxPlayer class.

- `utils` (_./utils_): Define utils function, small functions which can be used in several
  part of the RxPlayer's code.

- `config.ts` (_./config.ts_): Exports an interface allowing to update the RxPlayer's
  config.

- `index.ts` (_./index.ts_): Exports the main entry point for the RxPlayer, with a default
  set of features.

- `log.ts` (_./log.ts_): Exports the main RxPlayer's Logger instance.

- `minimal.ts` (_./minimal.ts_): Exports the entry point for the minimal RxPlayer, which
  is an RxPlayer without any feature. When relying on this build, an application will have
  to manually add the specific features it wants.

- `multithread_types.ts` (_./multithread_types.ts_): TypeScript types used specifically
  when running the RxPlayer in multithread mode.

- `public_types.ts` (_./public_types.ts_): List all TypeScript types which are part of the
  API.

- `worker_entry_point.ts` (_./worker_entry_point.ts_): Entry point for the logic of the
  RxPlayer which will run in the WebWorker (and which will have to be loaded separately by
  the application).

## Multithread, Monothread and Directfile code paths

There are actually three different main "code paths" that may be run, depending on the
current content played.

The previous schema mostly illustrated the most complex code path of the three (the
"multithread mode"). Yet, to be more exact we need to separate those three cases:

1. For "directfile" contents (contents directly decodable by the browser, e.g. mp4 files
   or HLS playlists on Safari), the code path is the simplest and follows something like
   this:

   ```
                  +---------------------------------------------+
                  |               Application/UI                |
                  +---------------------------------------------+
                            |
                            | call RxPlayer API
                            |
   -------------------------|--- RxPlayer Main Thread ----------------------------
                            |
        Front-facing API    v
        +---------------------------------------+      +-------------------------+
        |               Public API              | uses | MediaElementTracksStore |
        |          (./main_thread/api)          |----->|(./main_thread/tracks_sto|
        +---------------------------------------+      |re)                      |
                            |                          +-------------------------+
        Manage playback of  | creates                  Handle track switching
        a "directfile"      |                          using directly the media
        content             V                          element's API (`audioTracks`,
        +---------------------------------------+      `textTracks` etc.)
        |       DirectfileContentInitializer    |
        |          (./main_thread/init)         |
        +---------------------------------------+
                            |
                            V
                           ... Some other RxPlayer modules
                               (All running in main thread)
   ```

   As you can see, everything runs in main thread, a specialized module called the
   `DirectfileContentInitializer` is called by the API to start-up such contents and a
   specialized `MediaElementTracksStore` is handling tracks specifically for directfile
   contents (as they are handled differently than for other code paths, here trough API
   exposed by the browser).

2. A second code path, we may call the "monothreaded code path" apply for non-directfile
   contents (so, contents which rely on the MSE API instead) loaded in monothreaded mode,
   which is the default.

   It is much closer to the schema of the previous chapter:

   ```
                  +---------------------------------------------+
                  |               Application/UI                |
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
                            |                        +--------------------+
                            |                        Facilitate track switching
        Manage playback of  | creates                for the API
        contents relying    |
        on a MediaSource,   |
        all in main thread  v
        +---------------------------------------+
        |      MediaSourceContentInitializer    | ----> ... Some other RxPlayer
        |          (./main_thread/init)         |           modules not in ./core
        +---------------------------------------+
                                |
        Actually load and parse |
        the right manifest and  | creates
        media segments          |
        (here in main thread)   V
        +--------------------------------------+
        |              Core modules            |
        |                (./core)              |
        +--------------------------------------+
   ```

   As you can see, the part of `./main_thread/init` run by the API is this time different
   (`MediaSourceContentInitializer`) and the track handling also goes to a differently
   named `TracksStore` when compared to directfile contents.

   I also summarized all core modules into a single block, you can refer to the previous
   chapter to have some examples of what they are (you can look at modules in the `./core`
   directory in that schema - or at the `./core` directory itself).

3. A third code path, the "multithreaded code path" apply for non-directfile contents (so,
   contents which rely on MSE API instead) loaded in "multithread mode" (which has to be
   explicitely enabled by the application).

   Here you get all the complexity of the previous chapter, with two threads running. To
   repeat the schema than the one used for the other code paths here, you would have
   something like:

   ```
                  +---------------------------------------------+
                  |               Application/UI                |
                  +---------------------------------------------+
                            |
                            | call RxPlayer API
                            |
   -------------------------|----- RxPlayer Main Thread ---------------------------
                            |
        Front-facing API    v
        +---------------------------------------+    +--------------------+
        |               Public API              |uses|     TracksStore    |
        |          (./main_thread/api)          |--->|(./main_thread/track|
        +---------------------------------------+    |s_store)            |
                            |                        +--------------------+
                            |                        Facilitate track switching
        Manage playback of  | creates                for the API
        contents relying    |
        on a MediaSource,   |
        in multiple threads v
        +---------------------------------------+
        |      MultiThreadContentInitializer    | ----> ... Some other RxPlayer
        |          (./main_thread/init)         |           modules not in ./core
        +---------------------------------------+
                                |  ^
                                |  | postMessage exchanges
                                |  |
        ------------------------|--|- RxPlayer WebWorker --------------------------
                                |  |
        Actually load and parse |  |
        the right manifest and  |  |
        media segments          |  |
        (here in a Worker)      V  |
        +--+--------------------------------+--+
        |  |            Worker Main         |  |
        |  |        (./core/main/worker)    |  |
        |  +--------------------------------+  |
        |              Core modules            |
        |                (./core)              |
        +--------------------------------------+
   ```

   This time, the part of `./main_thread/init` run by the API is the
   `MultiThreadContentInitializer` and the track handling also goes through the
   `TracksStore`, like for the monothreaded code path.

   The main difference however is that now all core modules are running completely in a
   WebWorker, meaning in another thread. It is the role of the
   `MultiThreadContentInitializer` to send message to it and to process most of the
   messages the WebWorker sends back.

   Because this time, the core also has to reception and send backs messages from and to
   the main thread, there's a supplementary core module involved than on the "monothreaded
   code path", the "Worker Main". It then however relies on the exact same other core
   modules than for the "monothreaded code path".
