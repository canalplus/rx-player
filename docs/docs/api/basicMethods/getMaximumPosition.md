---
id: getMaximumPosition-api
title: getMaximumPosition method
sidebar_label: getMaximumPosition
slug: getMaximumPosition
---

---

**syntax**: `const maximumPosition = player.getMaximumPosition()`

**return value**: `Number|null`

---

Returns the maximum seekable player position.
Returns `null` if no content is loaded.

This is useful for live contents, where this position might be updated
continously as new content is generated.
This method allows thus to seek directly at the live edge of the content.

Please bear in mind that seeking exactly at the maximum position is rarely a
good idea:

- for VoD contents, the playback will end
- for live contents, the player will then need to wait until it can build
  enough buffer.

As such, we advise to remove a few seconds from that position when seeking.

#### Example

```js
// seeking 5 seconds before the end (or the live edge for live contents)
player.seekTo({
  position: player.getMaximumPosition() - 5,
});
```
