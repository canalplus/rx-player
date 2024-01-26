# getLivePosition

## Description

Returns the position in seconds in the current media corresponding to live
content.

Returns `null` if no content is currently loaded or if the current content is
not considered a live content.

Returns `undefined` if we cannot know the position corresponding to live
content currently.

Note that the live position is technically different than the maximum position
returned by [`getMaximumPosition`](./getMaximumPosition.md):

- `getMaximumPosition` returns the maximum position with content that may be
  loaded. It may be further than the live position if future content is
  already available (e.g. ad breaks already present in a Manifest) or may
  be sooner if the live position is not yet available.

- `getLivePosition` just gives the information on the position which is
  intended to correspond to the live content.

## Syntax

```js
const livePosition = player.getLivePosition();
```

- **return value** `number|null|undefined`: position for the live content, in
  seconds.
  `null` if no content is loaded or if the current loaded content is
  not considered as a live content.
  `undefined` if that live position is currently unknown.

## Example

```js
// playing 5 seconds before the live
player.seekTo({
  position: player.getLivePosition() - 5,
});
```
