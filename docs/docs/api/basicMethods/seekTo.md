---
id: seekTo-api
title: seekTo method
sidebar_label: seekTo
slug: seekTo
---

---

**syntax**: `player.seekTo(position)`

**arguments**:

- _position_ (`Object|Number`): The position you want to seek to.

---

Seek in the current content (i.e. change the current position).

The argument can be an object with a single `Number` property, either:

- `relative`: seek relatively to the current position

- `position`: seek to the given absolute position (equivalent to `player.getVideoElement().currentTime = newPosition`)

- `wallClockTime`: seek to the given wallClock position, as returned by
  `getWallClockTime`.

The argument can also just be a `Number` property, which will have the same
effect than the `position` property (absolute position).

Seeking should only be done when a content is loaded (i.e. the player isn't
in the `STOPPED`, `LOADING` or `RELOADING` state).

The seek operation will start as soon as possible, in almost every cases
directly after this method is called.

You will know when the seek is being performed and has been performed
respectively by listening to the `seeking` and `seeked` player events (see the
[player events page](../events.md)). While seeking, the RxPlayer might
also switch to the `SEEKING` state.

#### Examples

```js
// seeking to 54 seconds from the start of the content
player.seekTo({ position: 54 });

// equivalent to just:
player.seekTo(54);

// seeking 5 seconds after the current position
player.seekTo({ relative: 5 });

// seeking 5 seconds before the current position
player.seekTo({ relative: -5 });

// seeking to live content
player.seekTo({ wallClockTime: Date.now() / 1000 });
```
