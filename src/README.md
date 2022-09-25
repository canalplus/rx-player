# RxPlayer Architecture documentation ##########################################

## Preliminary notes ###########################################################

You will find the architecture documentation alongside the code it documents,
as `README.md` files (like this one).


## Global architecture #########################################################

To better understand the player's architecture, you can find below a
(simplified!) schema of it:

```
                                                                  +---------------------+
                                                                  | ---> Call / request |
                                                                  +---------------------+

               +---------------------------------------------+              ,,,,,,,
               |                                             |             (  CDN  )
               |               Application/UI                |              ```````
               |                                             |                 ^
               +---------------------------------------------+                 |
                          |                                                    |
                          |                                                    |
-----RxPlayer-------------|----------------------------------------------------|----------
                          |                                                    |
                          |
                          |
                          |
                          |
+-------------------------|------  Main (./main)  --------------------------------+
|                         |                           Code destined to run in the |
|                         V       Front-facing API    same environment/thread than|           |
|    +-------------------------------------------+    the final UI                |           |
|    |                Public API                 |                           |    |
|    |               (./main/api)                |                    +----------------+ |
|    +-------------------------------------------+                    |                | |
| +--------------------+    |      |                  +-------------> |   transports   | |
| | TrackChoiceManager | <--+      |                  |               | (./transports) | |
| |    (./main/api)    |           |                  |               |                | |
| +--------------------+           |                  |               +----------------+ |
|  Facilitate track                V                  |       Abstract the streaming ^   |
|  switching for           +---------------+          |       protocol               |   |
|  the API                 |               |          |                              |   |
| +----------------+       |               |         +--------------------------+    |   |
| |    Content     |       |     Init      | ------> |                          |    |   |
| |   Decryptor    | <---- | (./main/init) |         |     Manifest Fetcher     |    |   |
| |(./main/decrypt)|       |               |         |(./core/fetchers/manifest)|    |   |
| |                |       |               |         |                          |    |   |
| +----------------+       +---------------+         +--------------------------+    |   |
| Negotiate content               |    Initialize     Load and refresh the Manifest  |   |
| decryption                      |    playback and                                  |   |
|                                 |    create/connect                                |   |
|                                 |    modules                                       |   |
|                                 |                                                      |
+---------------------------------|------------------------------------------------------+
                                  |
                                  |
+-------------------------------- |Worker (./worker)  -----------------------------------+
                                                       Core code able to run in a
                                                       WebWorker if needed - to limit
                                                       being blocked by the UI and
                                                       vice-versa.
                            WorkerGateway
                            (./worker/gateway)

Stream (./worker/stream)         |                                                    |
+--------------------------------|-------------------------------+                    |
|                                V                               |                    |
|  Create the right         +-------------------------------+    |                    |
|  PeriodStreams depending  |       StreamOrchestrator      |    |                    |
|  on the current position, | (./worker/stream/orchestrator)  |    |                    |
|  and settings             +-------------------------------+    |                    |
|                            |            |              |       |                    |
|                            |            |              |       |                    |
|                            |            |              |       |                    |
|                  (audio)   v    (video) V       (text) v       |                    |
| Create the right +----------+   +----------+    +----------+   |  +--------------+  |
| AdaptationStream |          |   |          |    |          |----> |SegmentBuffers|  |
| depending on the |  Period  |-+ |  Period  |-+  |  Period  |-+ |  |    Store     |  |
| wanted track     |  Stream  | | |  Stream  | |  |  Stream  | | |  |(./worker/segmen|  |
| (One per Period  |          | | |          | |  |          | | |  |t_buffers)    |  |
| and one per type +----------+ | +----------+ |  +----------+ | |  +--------------+  |
| of media)         |         (./worker/stream/period)           | |  Create one buffer |
|                   +-----------+  +-----------+   +-----------+ |  per type of media |
|                          |              |              |       |                    |
|                          |              |              |       |                    |
|                          |              |              |       |                    |
|                          |              |              |       |                    |
|                  (audio) v      (video) V       (text) v       |  +--------------+  |
|                  +----------+   +----------+    +----------+ ---> |              |  |
| Create the right |          |   |          |    |          |   |  |     ARS*     |  |
| Representation-  |Adaptation|-+ |Adaptation|-+  |Adaptation|-+ |  |(./worker/adapti|  |
| Stream depending |  Stream  | | |  Stream  | |  |  Stream  | | |  |ve)           |  |
| on the current   |          | | |          | |  |          | | |  +--------------+  |
| network,         +----------+ | +----------+ |  +----------+ | |   *Adaptive        |
| settings...       |        (./worker/stream/adaptation)        | |   Representation   |
|                   +-----------+  +-----------+   +-----------+ |   Selector:        |
|                          |              |              |       |   Find the best    |
|                          |              |              |       |   Representation   |
|                          |              |              |       |   to play          |
|                          |              |              |       |                    |
|                  (audio) v      (video) V       (text) v       |                    |
|                  +----------+   +----------+    +----------+ ----> +------------+   |
| (Representation- |          |   |          |    |          |   |   |   Segment   | -+
| Stream).         |Represe...|-+ |Represe...|-+  |Represe...|-+ |   |   fetcher   |
| Download and push|  Stream  | | |  Stream  | |  |  Stream  | | |   |(./worker/fetch|
| segments based on|          | | |          | |  |          | | |   |ers/segment) |
| the current      +----------+ | +----------+ |  +----------+ | |   +-------------+
| position and      |     (./worker/stream/representation)       | |   Load media segments
| buffer state      +-----------+  +-----------+   +-----------+ |
|                         |               |              |       |
+-------------------------|---------------|--------------|-------+
                          |               |              |
                +---------|---------------|--------------|-------+
                |  (audio)V        (video)V              V       |
                |  +------------+  +------------+  +-----------+ |
 Media buffers  |  | Audio/Video|  | Audio/Video|  |   Text    | |
 on which media |  |   Segment  |  |   Segment  |  |  Segment  | |
 data to decode |  |   Buffer   |  |   Buffer   |  |  Buffer   | |
 is pushed, so  |  +------------+  +------------+  +-----------+ |
 it can be      |                                                |
 decoded at the |  SegmentBuffer implementations                 |
 right time     |  (./core/segment_buffers/implementations)      |
                +------------------------------------------------+
```

For the directories not represented in that schema:

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

  - `parsers` (_./parsers_): Various parsers for several formats

  - `tools` (_./tools_): Defines "tools", APIs which are not part of the
    RxPlayer class.

  - `typings` (_./typings_): Define TypeScript typings.

  - `utils` (_./utils_): Define utils function, small functions which can be
    used in several part of the RxPlayer's code.
