# Migration from v3: Constructor Options

Constructor options are options given when instantiating a new RxPlayer.

Several have been removed, they will all be listed in this page.

## Removed options

### `limitVideoWidth`

The `limitVideoWidth` option has been removed.

Instead, a more complete [`videoResolutionLimit`](../../api/Creating_a_Player.md)
constructor option exists, allowing either to limit the width to the media element - so
roughly similar to `limitVideoWidth` - or even to the screen resolution, if you want to be
ready with a higher resolution in case the user enables fullscreen mode.

To replace `limitVideoWidth`, you can write:

```js
const rxPlayer = new RxPlayer({
  // ...
  videoResolutionLimit: "videoElement",
});
```

### `initialAudioBitrate` / `initialVideoBitrate`

Both the `initialAudioBitrate` and `initialVideoBitrate` constructor options were replaced
by a now single `baseBandwidth` option which apply to both.

### `stopAtEnd`

The `stopAtEnd` constructor option has been removed and the RxPlayer now doesn't stop at
the end of the content by default.

If you relied on this property, it was probably to set it to `false` which is now the
default behavior - thus it doesn't need to be replaced by anything.

If you previously set this property to `true` or didn't set this property however, you
might want to explicitly stop the content when the `"ENDED"` player state is reached:

```js
rxPlayer.addEventListener("playerStateChange", (state) => {
  if (state === "ENDED") {
    rxPlayer.stop();
  }
});
```

### `preferredAudioTrack` / `preferredTextTracks` / `preferredVideoTracks`

All preferences options and methods have been removed in profit of the more powerful track
API.

The migration for those has its own documentation page:
[Track Preferences](./Preferences.md).

### `minAudioBitrate` / `minVideoBitrate` / `maxAudioBitrate` / `maxVideoBitrate`

All bitrate selection options and methods have been removed in profit of the new locked
Representations API.

The migration for those has its own documentation page:
[Bitrate Selection](./Bitrate_Selection.md).

### `throttleWhenHidden`

The deprecated `throttleWhenHidden` option has been removed.

It can probably be completely replaced by the
[`throttleVideoBitrateWhenHidden` `loadVideo` option](../../api/Creating_a_Player.md#throttlevideobitratewhenhidden),
the only difference is that the latter will not decrease the video bitrate if the video is
still visible through a picture in picture element.
