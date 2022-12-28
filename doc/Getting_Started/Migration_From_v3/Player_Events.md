
### `playerStateChange`

  - Create `"FREEZING"` player state for cases where the playback position is currently not advancing due to an unknown reason, to separate it from regular `"BUFFERING"`. [#1146]

  - The `RELOADING` player state (gettable  through the `getPlayerState` and `playerStateChange` API) can now happen at any time to unlock playback.


### `audioBitrateChange` / `videoBitrateChange`

  - Remove `audioBitrateChange` and `videoBitrateChange` events in profit of the new `audioRepresentationChange` and `videoRepresentationChange` events


###  `availableAudioBitratesChange` / `availableVideoBitratesChange`

  - Remove `availableAudioBitratesChange` and `availableVideoBitratesChange` events. Those are less needed with the new Representations lock API and can be mostly replicated through the `audioTrackChange` and `videoTrackChange` events


### `decipherabilityUpdate

  - Remove `decipherabilityUpdate` event as it appeared to be not easily exploitable and exposed internal logic too much [#1168]


### `positionUpdate`

  - Rename `maximumBufferTime` in `positionUpdate` events to `maximumPosition`


### `periodChange`

  - Change payload of `periodChange` events, so they emit only core properties related to a `Period`.

j
### `fullscreenChange`

  - Remove deprecated fullscreen related APIs (methods: `isFullscreen`, `setFullscreen`, `exitFullscreen`, event: `fullscreenChange`) as a a UI is much more adapted to that task and can also bring with it things like a progress bar or HTML text tracks


### `nativeTextTracksChange`

  - Remove deprecated `nativeTextTracksChange` event. Same reason than for `getNativeTextTrack`


### `bitrateEstimationChange`

  - Remove `bitrateEstimationChange` event as it is poorly understood (it's not always close to the expected bandwidth) and has a very complex relationship with the chosen quality.


### `imageTrackUpdate`

  - Remove image-related API: `supplementaryImageTracks` `loadVideo` option, `imageTrackUpdate` event, `getImageTrackData` method. Those are better handled by an application. The `parseBifThumbnails` tool is still available.
