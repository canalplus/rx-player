# MetaPlaylist #################################################################

The MetaPlaylist principle and usage is defined [here](../api/metaplaylist.md).


## How the original Manifest files are considered ##############################

To play a MetaPlaylist content, each manifest it depends on has to be
downloaded and parsed through their original logic (a `MPD` through DASH's
logic and a Smooth Manifest through Smooth's logic).

We then merge each of these Manifest, to construct an internal
[manifest object](./manifest.md) with the same structure and properties than we
would have with a DASH or Smooth manifest.

The trick is to consider each of those original Manifest as different Periods
(like DASH Periods). Each Period is concatenated one after the other with the
time information anounced in the MetaPlaylist file. If an original Manifest
already has multiple Periods, each of them are also processed as different
Period so that no feature from the original content is lost.



## How about the segments ######################################################

The exploitation of segment metadata is even trickier.

In `DASH` or `Smooth`, the URL of each segment could be constructed from the
starting time of each of those segments.

The problem here is that a `MetaPlaylist` player has to mutate those to place
them at the position indicated in the MetaPlaylist's JSON instead.

To simplify everything, we choose to rely on a simple but effective wrapper on
top of the original transport protocol.

When the core logic of the player wants to load a segment from the network, that
wrapper translate back the data as if we're just playing the original content at
its original position.
How it works: the wrapper removes a specific time offset from the wanted
segment's metadata, before contacting the transport's logic.

When giving back the segment to the core logic of the player, the wrapper first
update those loaded segment with the wanted position data.
How it works: the wrapper adds back the time offset it previously substracted
from the wanted segment's metadata before giving it back to the core logic.

To illustrate, it kind of goes like this:

```
+----------------+ 1. Ask for segments infos from t to t+n  +--------------+
|                | ---------------------------------------> |              |
|                |                                          |              |
|                | <--------------------------------------- |              |
|                |  4. Gives segment infos asked (offseted) |              |
|                |                                          |              |
|      CORE      |                                          | METAPLAYLIST |
|                |                                          |              |
|                | 5. Ask to download segment (offseted)    |              |
|                | ---------------------------------------> |              |
|                |                                          |              |
|                | <--------------------------------------- |              |
+----------------+              8. Gives segment (offseted) +--------------+
                                                             | ^     |  ^
                                                             | |     |  |
                                                             | |     |  |
   +------------+   2. get segment infos from t-offset to t+n-offset |  |
   | +-------+  | <------------------------------------------+ |     |  |
   | |       |  |                                              |     |  |
   | |  HLS  |  |                                              |     |  |
   | |       |  |  3. Gives segment infos asked                |     |  |
   | +-------+  | ---------------------------------------------+     |  |
   | +-------+  |                                                    |  |
   | |       |  |                                                    |  |
   | |  HSS  |  |                                                    |  |
   | |       |  |                                                    |  |
   | +-------+  |                                                    |  |
   | +--------+ |  6. Ask to download non-offseted (normal) segments |  |
   | |        | | <--------------------------------------------------+  |
   | |  DASH  | |                                                       |
   | |        | |  7. Gives normal segment                              |
   | +--------+ | ------------------------------------------------------+
   +------------+
```

To make sure the segment is pushed at the right moment and doesn't overlap other
contents, we make heavy use of some specific `SourceBuffer` properties:
  - the `timestampOffset` property allows to set a specific offset
  - `appendWindowStart` allows to limit the starting time of the pushed segment
  - `appendWindowEnd` allows to limit the ending time of the pushed segment
