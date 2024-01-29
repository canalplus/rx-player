# Creating a RxPlayer

## Instantiation

Instantiating a new RxPlayer is necessary before being able to load a content. Doing so is
straightforward:

```js
import RxPlayer from "rx-player";
const player = new RxPlayer(options);
```

## Player options

Player options are options given to the player on instantiation.

It's an object with multiple properties. None of them are mandatory. For most usecase
though, you might want to set at least the associated media element via the `videoElement`
property.

### videoElement

_type_: `HTMLMediaElement|undefined`

The media element the player will use.

Note that despite what its name suggests, this can be a `<video>` or an `<audio>` element.

```js
// Instantiate the player with the first video element in the DOM
const player = new Player({
  videoElement: document.getElementsByTagName("VIDEO")[0],
});
```

If not defined, a `<video>` element will be created without being inserted in the
document. You will have to do it yourself through the `getVideoElement` method to add it
yourself:

```js
const player = new Player();

const videoElement = player.getVideoElement();
document.body.appendChild(videoElement);
```

### baseBandwidth

_type_: `Number|undefined`

_defaults_: `0`

The initial value used for bandwidth calculations, in bits per seconds.

The RxPlayer will base itself on this value initially before estimating it itself. You can
set this value either if you have a rough-enough idea of the user's current bandwidth
and/or if you prefer to start loading specific media qualities initially.

For example, to set an initial bandwidth of 700 kilobits per seconds, you can set:

```js
const player = new Player({
  baseBandwidth: 700000,
});
```

<div class="warning">
This option will have no effect for contents loaded in <i>Directfile</i>
mode (see <a href="./Loading_a_Content.md#transport">loadVideo options</a>).
</div>

### wantedBufferAhead

_type_: `Number|undefined`

_defaults_: `30`

Set the default buffering goal, as a duration ahead of the current position, in seconds.

Once this size of buffer is reached, the player won't try to download new segments
anymore.

<div class="warning">
This option will have no effect for contents loaded in <i>Directfile</i>
mode (see <a href="./Loading_a_Content.md#transport">loadVideo options</a>).
</div>

### maxVideoBufferSize

_type_: `Number|undefined`

_defaults_: `Infinity`

Set the maximum size the video buffer can take in the memory, in kilobytes (kb). Once this
value is reached, the player won't try to download new video segments anymore. The limit
is approximative as it's based on internal estimation.

<div class="warning">
The internal checks of the RxPlayer is based on an estimation of what the RxPlayer think
is currently buffered and an estimation of the size of the next segments.
</div>

<div class="warning">
This option will have no effects if we didn't buffer at least <b>MIN_BUFFER_LENGTH</b>
<i>( defaults at 5sec )</i>
</div>

<div class="warning">
This option will have no effect for contents loaded in <i>Directfile</i>
mode (see <a href="./Loading_a_Content.md#transport">loadVideo options</a>).
</div>

### maxBufferAhead

_type_: `Number|undefined`

_defaults_: `Infinity`

Set the maximum kept buffer ahead of the current position, in seconds.

Everything superior to that limit (`currentPosition + maxBufferAhead`) will be
automatically garbage collected.

This feature is not necessary as the browser should by default correctly remove old
segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint of the
player, you might want to set this limit.

Its default value, `Infinity`, will remove this limit and just let the browser do this job
instead.

The minimum value between this one and the one returned by `getWantedBufferAhead` will be
considered when downloading new segments.

<div class="warning">
Bear in mind that a too-low configuration there (e.g. inferior to
`10`) might prevent the browser to play the content at all.
</div>

You can update that limit at any time through the
[setMaxBufferAhead](./Buffer_Control/setMaxBufferAhead.md) method.

<div class="warning">
This option will have no effect for contents loaded in <i>Directfile</i>
mode (see <a href="./Loading_a_Content.md#transport">loadVideo options</a>).
</div>

### maxBufferBehind

_type_: `Number|undefined`

_defaults_: `Infinity`

Set the maximum kept buffer before the current position, in seconds.

Everything before that limit (`currentPosition - maxBufferBehind`) will be automatically
garbage collected.

This feature is not necessary as the browser should by default correctly remove old
segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint of the
player, you might want to set this limit.

Its default value, `Infinity`, will remove this limit and just let the browser do this job
instead.

You can update that limit at any time through the
[setMaxBufferBehind](./Buffer_Control/setMaxBufferBehind.md) method.

<div class="warning">
This option will have no effect for contents loaded in <i>Directfile</i>
mode (see <a href="./Loading_a_Content.md#transport">loadVideo options</a>).
</div>

### videoResolutionLimit

_type_: `string`

_defaults_: `"none"`

This option allows to throttle the played video resolution according to either the
`videoElement`'s resolution or to the screen resolution, thus preventing to unnecessarily
waste bandwidth to load a video quality that won't be able to be properly displayed
anyway.

This option can have the following values:

- `"videoElement"`: The loaded video Representation will be throttled according to the
  given `videoElement`'s dimensions. Meaning that the RxPlayer won't be trying to play
  higher qualities whose resolutions should not be discernible, with an exception when the
  picture-in-picture mode is enabled in which case the resolution limit is compared to the
  picture-in-picture window instead.

- `"screen"`: The loaded video Representation will be throttled according to the screen's
  dimensions. Simply written, the RxPlayer won't try to play Representation with a
  resolution higher than the screen resolution with the exception of the immediately
  superior resolution if no Representation has the same resolution than the screen.

  You might prefer this value over `"videoElement"` to stay ready when and if the user
  decides to enter a "fullscreen mode".

- `"none"`: No such limit on the video Representation's resolution will be automatically
  applied.

<div class="warning">
This option will have no effect for contents loaded in <i>Directfile</i>
mode (see <a href="./Loading_a_Content.md#transport">loadVideo options</a>).
</div>

### throttleVideoBitrateWhenHidden

_type_: `Boolean`

_defaults_: `false`

The player has a specific feature which throttle the video to the minimum bitrate when the
current video element is considered hidden (e.g. the containing page is hidden and the
Picture-In-Picture mode is disabled) for more than a minute.

To activate this feature, set it to `true`.

```js
const player = Player({
  throttleVideoBitrateWhenHidden: true,
});
```

<div class="warning">
This option will have no effect for contents loaded :

- In <i>DirectFile</i> mode (see <a href="./Loading_a_Content.md#transport">loadVideo
  options</a>).
- On Firefox browsers (version >= 67) : We can't know if the Picture-In-Picture feature or
  window is enabled. Thus we can't rely on document hiddenness attributes, as the video
  may be visible, through the PIP window.

</div>
