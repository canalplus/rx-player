# setVolume

## Description

Set the current volume, from 0 (no sound) to 1 (the maximum sound level).

Note that the volume set here is persisted even when loading another content.
As such, this method can also be called when no content is currently playing.

## Syntax

```js
player.setVolume(volume);
```

 - **arguments**:

   1. _volume_ `number`: Volume from 0 to 1.


## Example

```js
// set the full volume
player.setVolume(1);
```
