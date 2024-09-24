# mute

## Description

Mute the volume.

Basically set the volume to 0 while keeping in memory the previous volume to reset it at
the next `unMute` call.

As the volume is not dependent on a single content (it is persistent), this method can
also be called when no content is playing.

## Syntax

```js
player.mute();
```

## Example

```js
// mute the current volume
player.mute();
```
