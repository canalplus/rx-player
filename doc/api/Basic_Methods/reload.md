# reload

## Description

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

  If no reload position is defined, start playback at the last playback
  position.

- _autoPlay_ (`boolean | undefined`): If set to `true`, the reloaded content
  will automatically play after being `"LOADED"`.

  If set to `false`, it will stay in the `"LOADED"` state (and paused) once
  loaded, without automatically played.

  If unset or set to `undefined`, the content will automatically play if the
  content was playing the last time it was played and stay in the `"LOADED"`
  state (and paused) if it was paused last time it was played.

Note that despite this method's name, the player will not go through the
`RELOADING` state while reloading the content but through the regular `LOADING`
state - as if `loadVideo` was called on that same content again.

<div class="note">
On some browsers, auto-playing a media without user interaction is blocked
due to the browser's policy.
<br>
<br>
In that case, the player won't be able to play (it will stay in a `LOADED`
state) and you will receive a <a href="../Player_Errors.md">warning event</a>
containing a `MEDIA_ERROR` with the code: `MEDIA_ERR_BLOCKED_AUTOPLAY`.
<br>
<br>
A solution in that case would be to propose to your users an UI element to
trigger the play with an interaction.
</div>

## Syntax

```js
// without options
player.reload();

// or with options
player.reload(options)`
```

  - **arguments**:

    1. _options_ (optional) `Object | undefined`: Optional requirements, e.g. at
       which position the player should reload.

## Example

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
