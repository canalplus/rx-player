# RxPlayer methods

## Removed methods

### `getAvailableAudioBitrates` / `getAvailableVideoBitrates`

### `getVideoBitrate` / `getAudioBitrate`

### `setAudioBitrate` / `setVideoBitrate` / `getManualAudioBitrate` / `setManualAudioBitrate`

### `setMinAudioBitrate` / `setMinVideoBitrate` / `getMinAudioBitrate` / `setMinAudioBitrate`

### `setMaxAudioBitrate` / `setMaxVideoBitrate` / `getMaxAudioBitrate` / `setMaxAudioBitrate`

### `getPreferredAudioTracks` / `getPreferredVideoTracks` / `getPreferredTextTracks`

### `setPreferredAudioTracks` / `setPreferredVideoTracks` / `setPreferredTextTracks`

### `getVideoPlayedTime`

### `getVideoLoadedTime`

### `getManifest`

### `getCurrentAdaptations`

### `getCurrentRepresentations`

### `isFullscreen` / `setFullscreen` / `exitFullscreen`

  - Remove deprecated fullscreen related APIs (methods: `isFullscreen`, `setFullscreen`, `exitFullscreen`, event: `fullscreenChange`) as a a UI is much more adapted to that task and can also bring with it things like a progress bar or HTML text tracks

### `getNativeTextTrack`

### `getImageTrackData`
  - Remove image-related API: `supplementaryImageTracks` `loadVideo` option, `imageTrackUpdate` event, `getImageTrackData` method. Those are better handled by an application. The `parseBifThumbnails` tool is still available.


## Renamed

### `getUrl`

### `getVideoDuration`

### `getVideoBufferGap`


## Updated

## `getPlayerState`

  - Create `"FREEZING"` player state for cases where the playback position is currently not advancing due to an unknown reason, to separate it from regular `"BUFFERING"`. [#1146]
  - The `RELOADING` player state (gettable  through the `getPlayerState` and `playerStateChange` API) can now happen at any time to unlock playback.

### `getAvailableVideoTracks` / `getVideoTrack`

  - A Representation's `frameRate` is now always a number - in terms of frame per seconds - instead of a string.
  - `Representations` (in methods: `getAvailableVideoTracks`, `getVideoTrack`, `representationFilter`, `getAvailableAudioTracks`, `getAudioTrack` and events: `audioTrackChange` and `videoTrackChange`) can have an `undefined` bitrate

### `getAvailableAudioTracks` / `getAudioTrack`

  - `Representations` (in methods: `getAvailableVideoTracks`, `getVideoTrack`, `representationFilter`, `getAvailableAudioTracks`, `getAudioTrack` and events: `audioTrackChange` and `videoTrackChange`) can have an `undefined` bitrate
