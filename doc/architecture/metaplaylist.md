# MetaPlaylist #################################################################

The MetaPlaylist principle and usage is defined [here](../api/metaplaylist.md).

## About manifest

To build a metaplaylist, each original manifest is downloader and parsed, so periods could be extracted. From these periods and from manifest attributes, a new [manifest object](./manifest.md) is built, with the same structure and properties than with DASH and Smooth manifest.

The _timeShiftBufferDepth_ attribute is provided in MetaPlaylist, as it should be defined from user's need (prevent from seeking before start of content, possibility for viewer to start over contents from playlist, etc.).
The _avaibilityStartTime_ is 0.
_suggestedPresentationDelay_, _maxSegmentDuration_ and _minBufferTime_ are the minimum corresponding values from contents. 

## About segments

For each segment from periods, MetaPlaylist implies:
- Segment time has, in the timeline point of view, an offset. However, it must be requested with the correct name, as the server provides original segments. (e.g. Segment has time 20, offset is 1656145656, name pattern is segment_$Time$.mp4. Real segment name still is segment_20.mp4). Segments times are offsetted in _core_'s point of view, while they are not in _net_ logic:

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

- In each mp4 segment, there must be a tfdt box that defines the start time of video or audio content. Segment must be patched in order to apply an offset to the start time. If the segment is not patched, data will be bufferized in original timeline boudaries.
