# Tutorial: Building a custom player UI

The RxPlayer does not impose any user interface. You can keep the browser's native media
controls, or you can build your own controls by combining the RxPlayer API with regular
HTML elements.

This tutorial shows a simple custom interface with:

- a play / pause button
- a seek bar
- a volume slider
- a loading indicator
- a current time and duration display
- basic error handling

If you have not done so already, you may want to read the
[quick start tutorial](./Quick_Start.md) first.

## Starting from a minimal page

Let's start with a `<video>` element and a few controls:

```html
<div id="video-container">
  <video id="video"></video>
  <div id="loading-indicator" aria-label="Loading"></div>
</div>

<div id="player-controls">
  <button id="play-pause" type="button" disabled>Pause</button>

  <span id="current-time">0:00</span>
  <input id="seek-bar" type="range" min="0" max="0" step="0.1" value="0" disabled />
  <span id="duration">0:00</span>

  <input id="volume" type="range" min="0" max="1" step="0.05" value="1" />
</div>
```

The exact HTML structure is not important. What matters is that your application keeps a
reference to each element it wants to update. We will add a few CSS rules later to keep
the video area stable and display the loading indicator as a spinner.

## Instantiating the player

The player is still created in the same way as in the quick start tutorial:

```js
import RxPlayer from "rx-player";

const videoElement = document.getElementById("video");
const player = new RxPlayer({ videoElement });

const playPauseButton = document.getElementById("play-pause");
const seekBar = document.getElementById("seek-bar");
const volumeSlider = document.getElementById("volume");
const currentTimeElement = document.getElementById("current-time");
const durationElement = document.getElementById("duration");
const loadingIndicator = document.getElementById("loading-indicator");
```

## Loading a content

You can load the content normally with `loadVideo`.

```js
player.loadVideo({
  url: "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd",
  transport: "dash",
  autoPlay: true,
});
```

You can read more about loading options in the
[loadVideo documentation](../../api/Loading_a_Content.md).

## Reacting to player states

The [`playerStateChange` event](../../api/Player_Events.md#playerstatechange) lets you
know when the player is loading, playing, paused, buffering or stopped.

This event is generally the right place to enable or disable controls (depending on
whether a content is loaded) or to show a spinner (when loading data or freezing
in-place).

```js
player.addEventListener("playerStateChange", (state) => {
  // NOTE: an equivalent `player.isContentLoaded()` method also exists
  const isContentLoaded =
    state !== "STOPPED" && state !== "LOADING" && state !== "RELOADING";

  playPauseButton.disabled = !isContentLoaded;
  seekBar.disabled = !isContentLoaded;
  const isWaitingForData =
    state === "LOADING" ||
    state === "RELOADING" ||
    state === "BUFFERING" ||
    state === "SEEKING" ||
    state === "FREEZING";
  loadingIndicator.hidden = !isWaitingForData;
});
```

The complete list of possible states is documented in the
[player states documentation](../../api/Player_States.md).

## Play and pause

For the play / pause button label itself, the [`play`](../../api/Player_Events.md#play)
and [`pause`](../../api/Player_Events.md#pause) events are more precise because they
follow whether the media element is actually considered paused. The state is not
appropriate for this because states like BUFFERING could happen both when playing or in
pause.

```js
player.addEventListener("play", () => {
  playPauseButton.textContent = "Pause";
});

player.addEventListener("pause", () => {
  playPauseButton.textContent = "Play";
});
```

You can call [`play`](../../api/Basic_Methods/play.md) and
[`pause`](../../api/Basic_Methods/pause.md) from your own button.

```js
playPauseButton.addEventListener("click", () => {
  if (player.isPaused()) {
    // `play` can fail, for example because the browser's autoplay policy blocks
    // it. As a consequence, it is safer to handle the returned Promise:
    player.play().catch((error) => {
      console.error("Could not start playback", error);
    });
  } else {
    player.pause();
  }
});
```

## Updating the seek bar

The [`positionUpdate` event](../../api/Player_Events.md#positionupdate) gives you the
current position, the duration and other timing information.

For a VoD content, you can use `position` and `duration` directly:

```js
player.addEventListener("positionUpdate", ({ position, duration }) => {
  currentTimeElement.textContent = formatTime(position);

  if (Number.isFinite(duration)) {
    durationElement.textContent = formatTime(duration);
    seekBar.max = String(duration);
  }

  seekBar.value = String(position);
});
```

You may alternatively want to update the bar at your wanted pace instead, by setting your
own interval and using `getPosition()`, `getMediaDuration()` methods.

For live contents, the seekable range can move over time. You can rely on
[`getMinimumPosition`](../../api/Basic_Methods/getMinimumPosition.md) and
[`getMaximumPosition`](../../api/Basic_Methods/getMaximumPosition.md) when you need to
display the current seekable window:

```js
player.addEventListener("positionUpdate", ({ position, duration }) => {
  currentTimeElement.textContent = formatTime(position);

  const minimumPosition = player.getMinimumPosition();
  const maximumPosition = player.getMaximumPosition();

  if (minimumPosition !== null && maximumPosition !== null) {
    seekBar.min = String(minimumPosition);
    seekBar.max = String(maximumPosition);
    durationElement.textContent = player.isLive() ? "Live" : formatTime(duration);
  }

  seekBar.value = String(position);
});
```

Here is a small formatting helper:

```js
function formatTime(timeInSeconds) {
  if (!Number.isFinite(timeInSeconds)) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.floor(timeInSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
```

## Seeking

To seek, call [`seekTo`](../../api/Basic_Methods/seekTo.md) with the wanted position in
seconds.

```js
seekBar.addEventListener("input", () => {
  currentTimeElement.textContent = formatTime(Number(seekBar.value));
});

seekBar.addEventListener("change", () => {
  player.seekTo({ position: Number(seekBar.value) });
});
```

The `"input"` listener updates the displayed time while the user moves the slider. The
`"change"` listener performs the actual seek once the user validates the new position.

If you prefer seeking continuously while the slider is moved, you can call `seekTo` from
the `"input"` listener instead. This can be useful, but it can also trigger many seek
operations in a short time.

## Volume control

Volume does not require a content to be loaded. You can call
[`setVolume`](../../api/Volume_Control/setVolume.md) directly from your slider:

```js
volumeSlider.addEventListener("input", () => {
  player.setVolume(Number(volumeSlider.value));
});
```

You can also use the [`mute`](../../api/Volume_Control/mute.md),
[`unMute`](../../api/Volume_Control/unMute.md) and
[`isMute`](../../api/Volume_Control/isMute.md) APIs if your interface has a mute button.

## Handling errors and warnings

A custom UI should at least listen to fatal errors:

```js
player.addEventListener("error", (error) => {
  playPauseButton.disabled = true;
  seekBar.disabled = true;
  loadingIndicator.hidden = true;

  console.error("The content stopped with an error", error);
});
```

You can also listen to `"warning"` events. Those are non-fatal issues: the current content
can still continue playing, but you may want to log them for diagnostics.

```js
player.addEventListener("warning", (error) => {
  console.warn("A non-fatal playback issue happened", error);
});
```

More information is available in the
[player errors documentation](../../api/Player_Errors.md).

## Adding minimal styling

The player logic above works without CSS. For a more usable page, you can add just enough
styling to keep a stable video area and display the loading indicator as a spinner:

```css
#video-container {
  position: relative;
  background: black;
  max-width: 800px;
  aspect-ratio: 16 / 9;
}

#video {
  width: 100%;
  height: 100%;
  display: block;
}

#loading-indicator {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.35);
}

#loading-indicator[hidden] {
  display: none;
}

#loading-indicator::before {
  content: "";
  width: 32px;
  height: 32px;
  border: 4px solid rgba(255, 255, 255, 0.35);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

#player-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  max-width: 800px;
  margin-top: 1rem;
}

#seek-bar {
  flex: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

## Complete example

Here is the whole JavaScript code:

```js
import RxPlayer from "rx-player";

const videoElement = document.getElementById("video");
const player = new RxPlayer({ videoElement });

const playPauseButton = document.getElementById("play-pause");
const seekBar = document.getElementById("seek-bar");
const volumeSlider = document.getElementById("volume");
const currentTimeElement = document.getElementById("current-time");
const durationElement = document.getElementById("duration");
const loadingIndicator = document.getElementById("loading-indicator");

player.addEventListener("playerStateChange", (state) => {
  const contentCanBeControlled =
    state !== "STOPPED" && state !== "LOADING" && state !== "RELOADING";

  playPauseButton.disabled = !contentCanBeControlled;
  seekBar.disabled = !contentCanBeControlled;
  const isWaitingForData =
    state === "LOADING" ||
    state === "RELOADING" ||
    state === "BUFFERING" ||
    state === "SEEKING" ||
    state === "FREEZING";
  loadingIndicator.hidden = !isWaitingForData;
});

player.addEventListener("play", () => {
  playPauseButton.textContent = "Pause";
});

player.addEventListener("pause", () => {
  playPauseButton.textContent = "Play";
});

player.addEventListener("positionUpdate", ({ position, duration }) => {
  currentTimeElement.textContent = formatTime(position);

  const minimumPosition = player.getMinimumPosition();
  const maximumPosition = player.getMaximumPosition();

  if (minimumPosition !== null && maximumPosition !== null) {
    seekBar.min = String(minimumPosition);
    seekBar.max = String(maximumPosition);
    durationElement.textContent = player.isLive() ? "Live" : formatTime(duration);
  }

  seekBar.value = String(position);
});

player.addEventListener("error", (error) => {
  playPauseButton.disabled = true;
  seekBar.disabled = true;
  loadingIndicator.hidden = true;

  console.error("The content stopped with an error", error);
});

player.addEventListener("warning", (error) => {
  console.warn("A non-fatal playback issue happened", error);
});

playPauseButton.addEventListener("click", () => {
  if (player.isPaused()) {
    player.play().catch((error) => {
      console.error("Could not start playback", error);
    });
  } else {
    player.pause();
  }
});

seekBar.addEventListener("input", () => {
  currentTimeElement.textContent = formatTime(Number(seekBar.value));
});

seekBar.addEventListener("change", () => {
  player.seekTo({ position: Number(seekBar.value) });
});

volumeSlider.addEventListener("input", () => {
  player.setVolume(Number(volumeSlider.value));
});

player.loadVideo({
  url: "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd",
  transport: "dash",
  autoPlay: true,
});

function formatTime(timeInSeconds) {
  if (!Number.isFinite(timeInSeconds)) {
    return "0:00";
  }

  const totalSeconds = Math.max(0, Math.floor(timeInSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
```

## Going further

From this point, you can add more advanced controls by relying on the rest of the API:

- audio, video and text track menus, explained in the
  [track selection tutorial](./Selecting_a_Track.md)
- DRM options, explained in the [DRM tutorial](./Content_with_DRM.md)
- debug information, through the
  [`createDebugElement`](../../api/Playback_Information/createDebugElement.md) API
- buffer control, through APIs such as
  [`setWantedBufferAhead`](../../api/Buffer_Control/setWantedBufferAhead.md)
