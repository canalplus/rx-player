# Player states

The player state, that you can obtain either with the
[`getPlayerState`](./Basic_Methods/getPlayerState.md) method or through the
[`playerStateChange`](./Player_Events.md#playerstatechange)
[player event](./Player_Events.md), is a central part of our API: it is from
this value that you will know:

- when a new content finished loading
- when the content is paused to build buffer
- when the content is ended
- as a generality, in what "state" is the player currently

As such, it is important this concept is understood when developping with the
rx-player, which is exactly the point of this page.

## List of possible states

Today the player can have one of these 10 possible states:

- `STOPPED`
- `LOADING`
- `LOADED`
- `PLAYING`
- `PAUSED`
- `BUFFERING`
- `FREEZING`
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

When the player encounters an [error](./Player_Errors.md), it will also stop
and switch
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

If the `autoPlay` [loadVideo option](./Loading_a_Content.md#autoplay) has been
set to true, the state will then switch to `PLAYING` directly. Else, the player
will usually be paused and stay in the `LOADED` state (there is some edge
cases, see the "Possible state transitions" chapter for more information).

### The PLAYING state

Indicates that the player is currently playing the content.

### The PAUSED state

Indicates that the player is currently paused in the content.

### The BUFFERING state

The player is paused because it needs to build buffer.

TThe player cannot play the content despite having enough data, due to an
unknown reason.

The player will not play until it gets out of this state.

### The FREEZING state

TThe player cannot play the content despite having enough data, due to an
unknown reason.

This state might be due to either:
  - poor performance
  - an issue with the current device
  - the key of an encrypted content not being loaded soon enough

The player will not play until it gets out of this state.

In most of those cases, the RxPlayer will be able to continue playback by itself,
after some time.
As such, most `FREEZING` cases can be treated exactly like a `BUFFERING` state.

### The SEEKING state

The content is paused because it needs to build buffer after seeking in the
content (this can be seen as a special `BUFFERING` case).

The player will not play until it gets out of this state.

### The ENDED state

The player reached the end of the content.
It should now be paused at the last frame if a video content is available
at this time and this state acts like what you can expect from HTML5 playback:

- when seeking when the content is ended, you will be paused (even if you
  were playing before)

- after calling `play`, you will play back from the beginning

### The RELOADING state

This state indicates that the player needs to "re-load" then content.

In those cases, we need to stop and reload the content on the browser-side, due
to browser limitation.

While this state is active, multiple player API are unavailable:

- you cannot play or pause
- you cannot seek
- you cannot obtain the last playing position or the content duration

This is why we sometime recommend to manage this state as if it was the
`LOADING` state (where those APIs - and other - are also not available).

However, the player won't go to the `LOADED` state after `RELOADING`, you will
instead know that it had finished reloading simply when it goes out of this
state (see the "Possible state transitions" chapter for more information).
