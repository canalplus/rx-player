---
id: getPlayerState-api
title: getPlayerState method
sidebar_label: getPlayerState
slug: getPlayerState
---

---

**syntax**: `const state = player.getPlayerState()`

**return value**: `string`

---

Returns the "state" the player is currently in.
Can be either one of those strings:

- `"STOPPED"`: The player is idle. No content is loading nor is loaded.

- `"LOADING"`: The player is loading a new content.
  Most APIs related to the current content are not yet available while the
  content is loading.

- `"LOADED"`: The player has loaded the new content, it is now ready to
  play.
  From this point onward you can use APIs interacting with the current content
  such as `seekTo` or `setAudioTrack`.

- `"PLAYING"`: The player is currently playing the content.

- `"PAUSED"`: The player has paused.

- `"ENDED"`: The player has reached the end of the current content.

- `"BUFFERING"`: the player has reached the end of the buffer and is waiting
  for data to be appended.

- `"SEEKING"`: The player has reached the end of the buffer because a seek
  has been performed, new segments are being loaded.

- `"RELOADING"`: The player needs to reload its current (for example, when
  switching the current video track).
  While this state is active, most API related to the currently playing
  content are not available. This state should be treated like the `LOADING`
  state.

As it is a central part of our API and can be difficult concept to understand,
we have a special [page of documentation on player states](../states.md).

#### Example

```js
switch (player.getPlayerState()) {
  case "STOPPED":
    console.log("No content is/will be playing");
    break;
  case "LOADING":
    console.log("A new content is currently loading");
    break;
  case "LOADED":
    console.log("The new content is loaded and ready to be played");
    break;
  case "PLAYING":
    console.log("The content is currently playing");
    break;
  case "PAUSED":
    console.log("The content is currently paused");
    break;
  case "BUFFERING":
    console.log("The content is buffering new data");
    break;
  case "SEEKING":
    console.log("The content is still seeking, waiting for new data");
    break;
  case "ENDED":
    console.log("The content has reached the end.");
    break;
  case "RELOADING":
    console.log("The content is currently reloading");
    break;
  default:
    console.log("This is impossible (issue material!).");
    break;
}
```
