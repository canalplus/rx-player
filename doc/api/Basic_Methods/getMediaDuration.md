# getMediaDuration

## Description

Returns the duration of the current content as taken from the media element.

<div class="note">
This duration is in fact the maximum position possible for the
content. As such, for contents not starting at the position 0, this value will
not be equal to the difference between the maximum and minimum possible
position, as would normally be expected from a property named "duration".
</div>

## Syntax

```js
const duration = player.getMediaDuration();
```

  - **return value** `number`: Current content duration, as taken from the
    media element.

## Example

```js
const pos = player.getPosition();
const dur = player.getMediaDuration();

console.log(`current position: ${pos} / ${dur}`);
```
