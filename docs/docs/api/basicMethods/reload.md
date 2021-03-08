---
id: reload-api
title: reload method
sidebar_label: reload
slug: reload
---

---

**syntax**: `player.reload()` / `player.reload(options)`

**arguments**:

- _options_ (`Object | undefined`): Optional requirements, e.g. at which
  position the player should reload.

---

Re-load the last loaded content as fast as possible.

This API can be called at any time after a content has been loaded (the LOADED
state has been reached), even if the player has been stopped since and even if
it was due to a fatal error.

The user may need to call this API in several cases. For example, it may be used
in case of an error that will not reproduce or inversely when the error is
consistent at a certain playback time (e.g. due to a specific chunk defect).

The options argument is an object containing :

- _reloadAt_ (`Object | undefined`): The object contain directives about
  the starting playback position :
  - _relative_ (`string | undefined`) : start playback relatively from the
    last playback position (last played position before entering into STOPPED or
    ENDED state).
  - _position_ (`string`|`undefined`) : absolute position at which we should
    start playback

If no reload position is defined, start playback at the last playback position.

Note that despite this method's name, the player will not go through the
`RELOADING` state while reloading the content but through the regular `LOADING`
state - as if `loadVideo` was called on that same content again.

#### Example

```js
player.addEventListener("error", (error) => {
  if (error.code === "BUFFER_APPEND_ERROR") {
    // Try to reload after the last playback position, in case of defectuous
    // media content at current time.
    player.reload({ reloadAt: { relative: +5 } });
  } else {
    // Try to reload at the last playback position
    player.reload();
  }
});
```
