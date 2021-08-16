---
id: player_states
title: Player states
sidebar_label: Player States
slug: states
---

The player state, that you can obtain either with the
[`getPlayerState`](./basicMethods/getPlayerState.md) method or through the
[`playerStateChange`](./events.md#playerstatechange)
[player event](./events.md), is a central part of our API: it is from
this value that you will know:

- when a new content finished loading
- when the content is paused to build buffer
- when the content is ended
- as a generality, in what "state" is the player currently

As such, it is important this concept is understood when developping with the
rx-player, which is exactly the point of this page.

## List of possible states

Today the player can have one of these 9 possible states:

- `STOPPED`
- `LOADING`
- `LOADED`
- `PLAYING`
- `PAUSED`
- `BUFFERING`
- `SEEKING`
- `ENDED`
- `RELOADING`

### The STOPPED state

`STOPPED` is the default state of the player. It indicates that no content is
playing.

To simplify state exploitation, `STOPPED` is also emitted as a transition state
when loading a new content while another one was currently loaded (or loading).
That way, you can just listen to the `STOPPED` state to know when the current
content is not loaded anymore.

When the player encounters an [error](./errors.md), it will also stop and switch
to the `STOPPED` state.

### The LOADING state

The `LOADING` state indicates that a new content is currently loading.
It appears only after the `STOPPED` state.

That means that the player is currently downloading enough of the content to be
able to play it.

While this state is active, most of the content-related APIs (like
`setAudioTrack`) are not available. You have to wait for the `LOADED` state for
that.

### The LOADED state

`LOADED` appears only after a `LOADING` state, and indicates that the current
content can now be played.

From this point onward, most of the content-related APIs (like `setAudioTrack`)
are now available.

If the `autoPlay` [loadVideo option](./basicMethods/loadVideo.md) has been set to
true, the state will then switch to `PLAYING` directly. Else, the player will
usually be paused and stay in the `LOADED` state (there is some edge cases, see
the "Possible state transitions" chapter for more information).

### The PLAYING state

Indicates that the player is currently playing the content.

### The PAUSED state

Indicates that the player is currently paused in the content.

### The BUFFERING state

The content is paused because it needs to build buffer.

The player will not play until it gets out of this state.

### The SEEKING state

The content is paused because it needs to build buffer after seeking in the
content (this can be seen as a special `BUFFERING` case).

The player will not play until it gets out of this state.

### The ENDED state

The player reached the end of the content.

If the `stopAtEnd` [player option](./player_options.md) has been set to
`true` or not set, the player will immediately stop the content. In that case,
the `ENDED` state can be considered like the `STOPPED` state - in terms of what
you can do.

Else, it should now be paused at the last frame if a video content is available
at this time and this state acts like what you can expect from HTML5 playback:

- when seeking when the content is ended, you will be paused (even if you
  were playing before)

- after calling `play`, you will play back from the beginning

### The RELOADING state

This state indicates that the player needs to "re-load" then content.

This can happen for different reasons:

- When you switch the video track for another one, when the previous one was
  currently decoding.

- When you update manually the audio and video bitrate through respectively
  the `setAudioBitrate` and `setVideoBitrate` APIs
  (Only if you set the `manualBitrateSwitchingMode` loadVideo option to
  `"direct"`).

In those cases, we need to stop and reload the content on the browser-side, due
to browser limitation.

While this state is active, multiple player API are unavailable:

- you cannot play or pause
- you cannot seek
- you cannot obtain the position or duration
- you cannot get or switch the available video, text or audio tracks.
- you cannot get or switch the available video or audio bitrates.

This is why we sometime recommend to manage this state as if it was the
`LOADING` state (where those APIs - and other - are also not available).

However, the player won't go to the `LOADED` state after `RELOADING`, you will
instead know that it had finished reloading simply when it goes out of this
state (see the "Possible state transitions" chapter for more information).

## Possible state transitions

The player goes from one state to another during runtime but those changes does
not happen at random. There is actually possible state transitions (like from
`STOPPED` to `LOADING`) and impossible ones (like from `LOADING` to `SEEKING`).

We will list here every possible state transitions.
_Note that we can never have two times the same state consecutively._

### From `STOPPED`

- `LOADING`: a new content begin to load

### From `LOADING`

- `LOADED`: the loading content was loaded succesfully and can now be played
  (most of the content-related APIs can also be used from this point)

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to load the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError`](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

### From `LOADED`

- `PLAYING`: The content started to play.

- `SEEKING`: A user seeked in the content.

- `ENDED`: You are at the end of the content.
  Calling [`play`](./basicMethods/play.md) will play back from the beginning.

- `RELOADING`: The content needs to be reloaded.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to play the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError`](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

### From `PLAYING`

- `PAUSED`: The content is paused.

- `SEEKING`: A user seeked in the content.

- `BUFFERING`: The player needs to pause to download content.

- `ENDED`: You are at the end of the content.
  Calling [`play`](./basicMethods/play.md) will play back from the beginning.

- `RELOADING`: The content needs to be reloaded.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to play the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError`](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

### From `PAUSED`

- `PLAYING`: The content plays (is un-paused).

- `SEEKING`: A user seeked in the content.

- `BUFFERING`: The player needs to pause to download content.

- `ENDED`: You are at the end of the content.
  Calling [`play`](./basicMethods/play.md) will play back from the beginning.

- `RELOADING`: The content needs to be reloaded.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to play the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError`](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

### From `BUFFERING`

- `PLAYING`: The content plays (and finished buffering)

- `PAUSED`: The content is paused (and finished buffering)

- `ENDED`: You are at the end of the content.
  Calling [`play`](./basicMethods/play.md) will play back from the beginning.

- `RELOADING`: The content needs to be reloaded.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to play the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError`](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

### From `SEEKING`

- `PLAYING`: The content plays (and finished to seek)

- `PAUSED`: The content is paused (and finished to seek)

- `ENDED`: You are at the end of the content.
  Calling [`play`](./basicMethods/play.md) will play back from the beginning.

- `RELOADING`: The content needs to be reloaded.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to play the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError`](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

From `ENDED` if the `stopAtEnd` [player option](./player_options.md) has been
set to `true` or not set:

- `STOPPED`: Only state transition possible here. Happens if either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.

From `ENDED` if the `stopAtEnd` [player option](./player_options.md) has been
set to `false`:

- `PLAYING`: The `play` method was called.
  The content plays back from the beginning.

- `PAUSED`: A user seeked into a part of the content already-downloaded.
  The content is paused after the seek, regardless of if you were paused
  before reaching the `ENDED` state.

- `SEEKING`: A user seeked in the content.

- `RELOADING`: The content needs to be reloaded.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to play the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError` method](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).

### From `RELOADING`

- `PLAYING`: The content finished to reload and was not paused before
  reloading.

- `PAUSED`: The content finished to reload and was paused before
  reloading.

- `ENDED`: The content finished to reload and you are at the end of the
  content.
  Calling [`play`](./basicMethods/play.md) will play back from the beginning.

- `STOPPED`: Either:
  - You stopped the current through the [stop](./basicMethods/stop.md) method.
  - You are loading a new content.
  - An error happened which made it impossible to reload the content.
    The corresponding [error](./errors.md) can be found either through the
    [`getError` method](./basicMethods/getError.md) method or through the
    [`playerStateChange`](./events.md#playerstatechange)
    [player event](./events.md).
