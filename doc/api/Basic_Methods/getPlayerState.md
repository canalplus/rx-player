# getPlayerState

## Description

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

- `"FREEZING"`: The player cannot play the content despite having enough data,
  due to an unknown reason.
  In most of those cases, the RxPlayer will be able to continue playback by
  itself, after some time.
  As such, most `FREEZING` cases can be treated exactly like a `BUFFERING`
  state.

- `"SEEKING"`: The player has reached the end of the buffer because a seek
  has been performed, new segments are being loaded.

- `"RELOADING"`: The player needs to reload its current (for example, when
  switching the current video track).
  While this state is active, most API related to the currently playing
  content are not available. This state should be treated like the `LOADING`
  state.

As it is a central part of our API and can be difficult concept to understand,
we have a special [page of documentation on player states](../Player_States.md).

## Syntax

```js
const state = player.getPlayerState();
```
  - **return value** `string`:  The current state of the player.

## Example

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
    console.log("The player is currently playing");
    break;
  case "PAUSED":
    console.log("The player is currently paused");
    break;
  case "BUFFERING":
    console.log("The player is paused while buffering new data");
    break;
  case "FREEZING":
    console.log("The player is frozen");
    break;
  case "SEEKING":
    console.log("The player is still seeking, waiting for new data");
    break;
  case "ENDED":
    console.log("The player has reached the end of the content.");
    break;
  case "RELOADING":
    console.log("The player is currently reloading the content");
    break;
  default:
    console.log("This is impossible!");
    break;
}
```
