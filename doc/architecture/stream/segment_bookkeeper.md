# SegmentBookkeeper

## Overview

The SegmentBookkeeper is a class which registers informations about every segments currently present in a SourceBuffer. The RxPlayer's Stream creates one of them for each SourceBuffer created.

This helps Buffers to avoid re-downloading segments unnecessarily and know when old one have been garbage collected.

For example, we do not need to download a segment in any of the following cases:
  - The same segment is already completely present in the SourceBuffer
  - The same segment is partially present in the SourceBuffer (read: a part has been removed or garbage collected), but enough is still there for what we want to play
  - Another segment is in the SourceBuffer at the wanted time, but it is the same content in a better or samey quality

On the contrary, we need to download the segment in the following cases:
  - No segment has been pushed at the given time
  - A segment has been pushed, but at a lower quality than what we currently want
  - A segment has been pushed at a sufficient quality, but we miss to much of it for our needs (too much has been garbage collected, removed or the segment is just too short).
  - A segment has been pushed but is not exactly the content we want (example: it is in another language)

Thanks to the SegmentBookkeeper, we can infer on which situation we are at any time.

## Implementation

The SegmentBookkeeper is merely a "Store", meaning it will just store and process the data you give to it, without searching for the information itself.

It contains in its state an array, the _inventory_, which stores every segments which should be present in the SourceBuffer in a chronological order.

To construct this inventory, two methods can be used:
  - one to add informations about a new segment, which should have been pushed to the SourceBuffer
  - one to synchronize the currently pushed segments with what the real SourceBuffer says it has buffered

After calling the synchronization one, you should be able to tell which parts of which segments are currently _living_ in your SourceBuffer.
