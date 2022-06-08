# RxPlayer Architecture documentation ##########################################

## Preliminary notes ###########################################################

You will find the architecture documentation alongside the code it documents,
as `README.md` files (like this one).


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
                          | ~                          +---------------------+ |
                          V ~     Front-facing API     | ---> Call / request | |
     +-------------------------------------------+     | ~~~> Send events    | |
     |                Public API                 |     +---------------------+ |
     |               (./core/api)                |                      +----------------+
     +-------------------------------------------+                      |                |
 +--------------------+    |      | ^                  +--------------> |   transports   |
 | TrackChoiceManager | <--+      | ~                  | +~~~~~~~~~~~~~ | (./transports) |
 |    (./core/api)    |           | ~                  | ~              |                |
 +--------------------+           | ~                  | ~              +----------------+
  Facilitate track                V ~                  | ~     Abstract the streaming ^ ~
  switching for           +---------------+            | ~     protocol               | ~
  the API                 |               |            | V                            | ~
 +----------------+       |               |         +--------------------------+      | ~
 |    Content     |       |     Init      | ------> |                          |      | ~
 |   Decryptor    | <---- | (./core/init) | <~~~~~~ |     Manifest Fetcher     |      | ~
 |(./core/decrypt)| ~~~~> |               |         |(./core/fetchers/manifest)|      | ~
 |                |       |               |         |                          |      | ~
 +----------------+       +---------------+         +--------------------------+      | ~
 Negotiate content               | ^  Initialize     Load and refresh the Manifest    | ~
 decryption                      | ~  playback and                                    | ~
                                 | ~  create/connect                                  | ~
                                 | ~  modules                                         | ~
Stream (./core/stream)           | ~                                                  | ~
+--------------------------------|-~-----------------------------+                    | ~
|                                V ~                             |                    | ~
|  Create the right         +-------------------------------+    |                    | ~
|  PeriodStreams depending  |       StreamOrchestrator      |    |                    | ~
|  on the current position, | (./core/stream/orchestrator)  |    |                    | ~
|  and settings             +-------------------------------+    |                    | ~
|                            | ^          | ^            | ^     |                    | ~
|                            | ~          | ~            | ~     |                    | ~
|                            | ~          | ~            | ~     |                    | ~
|                  (audio)   v ~  (video) V ~     (text) v ~     |                    | ~
| Create the right +----------+   +----------+    +----------+   |  +--------------+  | ~
| AdaptationStream |          |   |          |    |          |----> |SegmentBuffers|  | ~
| depending on the |  Period  |-+ |  Period  |-+  |  Period  |-+ |  |    Store     |  | ~
| wanted track     |  Stream  | | |  Stream  | |  |  Stream  | | |  |(./core/segmen|  | ~
| (One per Period  |          | | |          | |  |          | | |  |t_buffers)    |  | ~
| and one per type +----------+ | +----------+ |  +----------+ | |  +--------------+  | ~
| of media)         |         (./core/stream/period)           | |  Create one buffer | ~
|                   +-----------+  +-----------+   +-----------+ |  per type of media | ~
|                          | ^            | ^            | ^     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                          | ~            | ~            | ~     |                    | ~
|                  (audio) v ~    (video) V ~     (text) v ~     |  +--------------+  | ~
|                  +----------+   +----------+    +----------+ ---> |              |  | ~
| Create the right |          |   |          |    |          | <~~~ |     ARS*     |  | ~
| Representation-  |Adaptation|-+ |Adaptation|-+  |Adaptation|-+ |  |(./core/adapti|  | ~
| Stream depending |  Stream  | | |  Stream  | |  |  Stream  | | |  |ve)           |  | ~
| on the current   |          | | |          | |  |          | | |  +--------------+  | ~
| network,         +----------+ | +----------+ |  +----------+ | |   *Adaptive        | ~
| settings...       |        (./core/stream/adaptation)        | |   Representation   | ~
|                   +-----------+  +-----------+   +-----------+ |   Selector:        | ~
|                          | ^            | ^            | ^     |   Find the best    | ~
|                          | ~            | ~            | ~     |   Representation   | ~
|                          | ~            | ~            | ~     |   to play          | ~
|                          | ~            | ~            | ~     |                    | ~
|                  (audio) v ~    (video) V ~     (text) v ~     |                    | ~
|                  +----------+   +----------+    +----------+ ----> +------------+   | ~
| (Representation- |          |   |          |    |          | <~~~~ |   Segment   | -+ ~
| Stream).         |Represe...|-+ |Represe...|-+  |Represe...|-+ |   |   fetcher   | <~~+
| Download and push|  Stream  | | |  Stream  | |  |  Stream  | | |   |(./core/fetch|
| segments based on|          | | |          | |  |          | | |   |ers/segment) |
| the current      +----------+ | +----------+ |  +----------+ | |   +-------------+
| position and      |     (./core/stream/representation)       | |   Load media segments
| buffer state      +-----------+  +-----------+   +-----------+ |
|                                                                |
+----------------------------------------------------------------+
```

For the directories not represented in that schema:

  - `Compat` (_./compat_): Regroups every functions related to improving
    compatibility with browsers / environments.

  - `errors` (_./errors_): Define error subclasses, most of all for the API.

  - `experimental` (_./experimental_): Special directory for "experimental" tools
     and features.

  - `features` (_./features_): Special directory allowing feature switching
    (enabling/disallowing features to not include unused code when importing the
    RxPlayer).

  - `manifest` (_./manifest_): Defines a `Manifest` structure and its
    properties, a central structure of the player describing a content.

  - `parsers` (_./parsers_): Various parsers for several formats

  - `tools` (_./tools_): Define "tools", APIs which are not part of the RxPlayer
    class.

  - `typings` (_./typings_): Define TypeScript typings.

  - `utils` (_./utils_): Define utils function, small functions which can be
    used in several part of the RxPlayer's code.
