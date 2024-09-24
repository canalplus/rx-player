# getMaximumPosition

## Description

Returns the maximum seekable player position in seconds on the current loaded media.

Returns `null` if no content is currently loaded.

This is useful for live contents, where this position might be updated continously as new
content is generated.

Please bear in mind that seeking exactly at the maximum position is rarely a good idea:

- for VoD contents, the playback will end
- for live contents, the player will then need to wait until it can build enough buffer.

As such, we advise to remove a few seconds from that position when seeking.

Note that this is potentially different from the live position returned by
[`getLivePosition`](./getLivePosition.md), which is the method to call to know which media
position is intented to correspond to live content.

## Syntax

```js
const maximumPosition = player.getMaximumPosition();
```

- **return value** `number|null`: Maximum seekable position. `null` if no content is
  currently loaded.

## Example

```js
// seeking 5 seconds before the last available position
player.seekTo({
  position: player.getMaximumPosition() - 5,
});
```
