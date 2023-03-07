# Changelog

## v4.0.0-alpha.2022110300 (2022-11-03)

### Changed

  - Create `"FREEZING"` player state for cases where the playback position is currently not advancing due to an unknown reason, to separate it from regular `"BUFFERING"`. [#1146]
  - The `RELOADING` player state (gettable  through the `getPlayerState` and `playerStateChange` API) can now happen at any time to unlock playback.
  - Remove bitrate API: `getAvailableVideoBitrates`, `getAvailableAudioBitrates`, `setAudioBitrate`, `setVideoBitrate`, `getAudioBitrate`, `getVideoBitrate` in profit of the Representations lock APIs [#1144]
  - Remove max bitrate API: `setMaxVideoBitrate`, `setMaxAudioBitrate`, `getMaxVideoBitrate` and `getMaxAudioBitrate` methods as well as the `maxVideoBitrate` and `maxAudioBitrate` options in profit of the Representations lock APIs
  - Remove min bitrate API: `setMinVideoBitrate`, `setMinAudioBitrate`, `getMinVideoBitrate` and `getMinAudioBitrate` methods as well as the `minVideoBitrate` and `minAudioBitrate` options in profit of the Representations lock APIs
  - Remove track preferences API (methods: `getPreferredAudioTracks`, `getPreferredVideoTracks`, `setPreferredAudioTracks` and `setPreferredVideoTracks`, types: `IAudioTrackPreference`, `ITextTrackPreference` and `IVideoTrackPreference`) in profit of the new tracks API
  - Remove `getManualVideoBitrate` and `getManualAudioBitrate` in profit of the new Representations lock APIs
  - Replace `initialAudioBitrate` and `initialVideoBitrate` constructor options with a single `baseBandwidth` option, which better translates what this option is actually doing and allows for future optimizations on our side. [#1155]
  - Rename `audioTrackSwitchingMode` loadVideo option into `defaultAudioTrackSwitchingMode` [#1030]
  - Remove `manualBitrateSwitchingMode` loadVideo option to instead rely on the `switchingMode` property of each `lockVideoRepresentations` and `lockAudioRepresentations` calls. [#1030]
  - Remove `audioBitrateChange` and `videoBitrateChange` events in profit of the new `audioRepresentationChange` and `videoRepresentationChange` events
  - Remove `availableAudioBitratesChange` and `availableVideoBitratesChange` events. Those are less needed with the new Representations lock API and can be mostly replicated through the `audioTrackChange` and `videoTrackChange` events
  - "Flatten" the `transportOptions` loadVideo options by putting all its inner properties directly at the top level of loadVideo options, to simplify its documentation and discoverability [#1149]
  - Rename `networkConfig` into `requestConfig` and re-organize its inner properties to pave the way for future request-related APIs.
  - Remove `stopAtEnd` `loadVideo` option and don't automatically stop when reaching the end by default. This behavior can be counter-intuitive and can be very easily implemented by the application.
  - Remove `decipherabilityUpdate` event as it appeared to be not easily exploitable and exposed internal logic too much [#1168]
  - Remove `getUrl` method in profit of the more powerful `getContentUrls`
  - Remove methods: `getManifest`, `getCurrentAdaptations` and `getCurrentRepresentations`, as they reveal the RxPlayer's internals too much
  - The `"smooth"` transport now needs to be communicated the URL of the Manifest directly (previously, it was possible to redirect it to a XML or JSON file first due to Canal+ legacy reasons).
  - Remove the `supplementaryTextTracks` loadVideo option. You can use the `TextTrackRenderer` tool if you wish to diplay external subtitles on top of your content.
  - Rename `maximumBufferTime` in `positionUpdate` events to `maximumPosition`
  - Remove `getVideoPlayedTime` and `getVideoLoadedTime` methods. Their names was very confusing and can be re-implemented relatively easily using the media element's buffered property.
  - Rename `getVideoDuration` to `getMediaDuration`, to avoid confusion with the video track's duration.
  - Rename `getVideoBufferGap` to `getCurrentBufferGap, to avoid confusion with the "buffer gap" specific to the video track.
  - Remove image-related API: `supplementaryImageTracks` `loadVideo` option, `imageTrackUpdate` event, `getImageTrackData` method. Those are better handled by an application. The `parseBifThumbnails` tool is still available.
  - Replace `keySystems[].licenseStorage` `keySystems` option (for a `loadVideo` call) by the better-named `persistentLicenseConfig`. The `persistentLicense` boolean (also a `keySystems` option) has also been removed because it was redundant with it) [#1147]
  - Remove `persistentStateRequired` API, in profit of the more powerful `persistentState` API [#1148]
  - Remove `distinctiveIdentifierRequired` API, in profit of the more powerful `distinctiveIdentifier` API [#1148]
  - Remove `keySystems[].onKeyStatusesChange` API as it seems to never be used [#1148]
  - Remove `keySystems[].throwOnLicenseExpiration` API as it can now be fully replaced by the `keySystems[].onKeyExpiration` option
  - Remove `aggressiveMode` from the `transportOptions` `loadVideo` option
  - Remove deprecated `throttleWhenHidden` player option in profit of `throttleVideoBitrateWhenHidden`
  - Change payload of `periodChange` events, so they emit only core properties related to a `Period`.
  - Change arguments given to a `transportOptions.segmentLoader` function (the `loadVideo` option): it now doesn't give the full `Manifest`, `Period`, `Adaptation`, `Representation` and `ISegment` structures in arguments but only core properties from it [#995]
  - Custom `manifestLoader` function added to what was previously the `loadVideo`'s `transportOptions` option now set an object as argument (with an `url`property), to let us bring improvements on it in the future [#995]
  - A Representation's `frameRate` is now always a number - in terms of frame per seconds - instead of a string.
  - `Representations` (in methods: `getAvailableVideoTracks`, `getVideoTrack`, `representationFilter`, `getAvailableAudioTracks`, `getAudioTrack` and events: `audioTrackChange` and `videoTrackChange`) can have an `undefined` bitrate
  - Remove deprecated fullscreen related APIs (methods: `isFullscreen`, `setFullscreen`, `exitFullscreen`, event: `fullscreenChange`) as a a UI is much more adapted to that task and can also bring with it things like a progress bar or HTML text tracks
  - Remove deprecated `getNativeTextTrack` method. If advanced features are wanted, it's better to just use the HTML text track API
  - Remove deprecated `nativeTextTracksChange` event. Same reason than for `getNativeTextTrack`
  - Remove deprecated `hideNativeSubtitles` from `loadVideo` options. Same reason than for `getNativeTextTrack`
  - Remove `xhr` property from a `NetworkError`. Doing so stop us from using the fetch API
  - Remove deprecated `defaultAudioTrack` and `defaultTextTrack`in profit of new track APIs
  - Remove `bitrateEstimationChange` event as it is poorly understood (it's not always close to the expected bandwidth) and has a very complex relationship with the chosen quality.
  - Remove the notion of environment variables linked to personalized builds (e.g. RXP_DASH) in profit of the minimal RxPlayer.
  - Rename `IPersistentSessionStorage` type to `IPersistentLicenseConfig` [#1147]
  - Remove undocumented `audioRobustnesses` and `videoRobustnesses` properties of the `keySystems` option of `loadVideo` calls, as more powerful solutions now exist: respectively `audioCapabilitiesConfig` and `videoCapabilitiesConfig` [#1148]
  - Remove public types `ISupplementaryTextTrackOption` and `ISupplementaryImageTrackOption`. Those are the types respectively for `supplementaryTextTracks` and `supplementaryImageTracks` which have been removed
  - Remove public types `IBitrateEstimate` as no API depend on it anymore.
  - Remove public types `IManifest`, `IPeriod`, `IAdaptation`, `IRepresentation`, `IRepresentationInfos`, `IBifThumbnail`, `IBifObject` and `IExposedSegment` as no API depend on them anymore.
  - Remove public types `IDefaultAudioTrackOption` and `IDefaultTextTrackOption`. Those are the types respectively for `defaultAudioTrack` and `defaultTextTrack` `loadVideo` options which have been removed
  - Stop officially supporting the Internet Explorer 11 browser

### Features

  - `setAudioTrack`, `setVideoTrack` and `setTextTrack` now may take an object in argument, with the track's id set as a `trackId` property, to allow new features
  - Add `switchingMode` optional property to `setVideoTrack` and `setAudioTrack`, to configure the way in which the RxPlayer switches between the previous and new track
  - Add optional `periodId` property to `setAudioTrack`, `setVideoTrack` and `setTextTrack`, to allow setting the track of another, future or past, Period.
  - `getAvailableAudioTracks`, `getAvailableTextTracks`, `getAvailableVideoTracks`, `getAudioTrack`, `getTextTrack` and `getVideoTrack` can now optionally take a `periodId` argument to retrieve track information on a specific Period, different than the current one.
  - `disableTextTrack`, and`disableVideoTrack` can now optionally take a `periodId` argument to disable a track for a specific Period
  - Add optional `lockedRepresentations` property to  `setAudioTrack` and `setVideoTrack`, to only filter some allowed Representations (i.e. qualities) after switching to the wanted track.
  - Add `getCurrentPeriod` method to retrieve information on the Period currently played
  - Add `getAvailablePeriods` method to retrieve information on all Periods on which a track or Representation choice can be made
  - Add `lockVideoRepresentations`, `lockAudioRepresentations`, `getLockedVideoRepresentations`, `getLockedAudioRepresentations`, `unlockVideoRepresentations` and `unlockAudioRepresentations` methods to allow a complex selection of Representations that are currently allowed to play.
  - Add `getVideoRepresentation` and `getAudioRepresentation` method to retrieve information on the currently loaded representations [#1144]
  - Add `audioRepresentationChange` and `videoRepresentationChange` events to be notified when the currently-loaded Representation for the current Period changes.
  - Add `getContentUrls` allowing to retrieve the one or several known URLs through which the current Manifest or content is reachable.
  - Add `newAvailablePeriods` event to signal new Period on which a track and/or Representation choice can be made
  - Add `brokenRepresentationsLock` event for when a Representations lock could not be respected anymore
  - Add `trackUpdate` event for when a track has been updated for any type and Period
  - Add  `distinctiveIdentifier` property in the `keySystems` option (given to the `loadVideo` method) to have full control over the MediaKeySystemConfiguration of the same name in the chosen key system [#1148]
  - Add  `persistentState`  property in the `keySystems` option (given to the `loadVideo` method) to have full control over the MediaKeySystemConfiguration of the same name in the chosen key system [#1148]
  - Add `audioCapabilitiesConfig` and `videoCapabilitiesConfig` properties in the `keySystems` option (given to the `loadVideo` method)  to allow advanced configuration of respectively the "audioCapabilities" and "videoCapabilities" in the asked MediaKeySystemConfiguration [#1148]
  - Add `ISegmentLoaderContext` public type for the first argument of the `segmentLoader` API
  - Add `IRepresentationFilterRepresentation` public type for the first argument of the `representationFilter` API
  - Add `IRepresentationContext` public type for the second argument of the `representationFilter` API
  - Add `IManifestLoaderInfo` public type for the first argument of the `manifestLoader` API
  - Add `IPeriodChangeEvent` public type to define the properties send through a `periodChange` event
  - Add `IPeriod` public type to define a Period object returned by methods like `getAvailablePeriods` or `getCurrentPeriod`
  - Add `IVideoTrackSwitchingMode` public type to define the type of the `switchingMode` property optionally given to `setAudioTrack`
  - Add `IAudioRepresentationsSwitchingMode` public type to define the type of the `switchingMode` property optionally given to `lockAudioRepresentations`
  - Add `IVideoRepresentationsSwitchingMode` public type to define the type of the `switchingMode` property optionally given to `lockAudioRepresentations`
  - Add `IBrokenRepresentationsLockContext` public type to define the type sent as a payload of the `brokenRepresentationsLock` event
  - Add `ITrackUpdateEventPayload` public type to define the type sent as a payload of the `trackUpdate` event
  - Add `ILockedVideoRepresentationsSettings` public type to define the object that should be given to the new `lockVideoRepresentation` method
  - Add `ILockedAudioRepresentationsSettings` public type to define the object that should be given to the new `lockAudioRepresentation` method
  - Add `IAudioTrackSetting` public type to define the object that may be given to the `setAudioTrack` method
  - Add `IVideoTrackSetting` public type to define the object that may be given to the `setVideoTrack` method
  - Add `ITextTrackSetting` public type to define the object that may be given to the `setTextTrack` method


## v3.30.0 (2023-03-07)

### Features

  - Add `updateContentUrls` API, allowing to update the Manifest's URL during playback [#1182]
  - DASH: implement forced-subtitles, adding the `forced` property to the audio tracks API and selecting by default a forced text track linked to the audio track's language if present [#1187]
  - DRM: add the `getKeySystemConfiguration` method to the RxPlayer [#1202]
  - add experimental `DEBUG_ELEMENT` feature and `createDebugElement` method to render a default debugging HTML element [#1200]

### Deprecated

  - Deprecate the `getVideoLoadedTime` method which can be easily replaced (see Deprecated method documentation)
  - Deprecate the `getVideoPlayedTime` method which can be easily replaced (see Deprecated method documentation)
  - Deprecate the `transportOptions.aggressiveMode` option
  - DRM: Deprecate the `keySystems[].onKeyStatusesChange` callback as no good use case was found for it.

### Bug fixes

  - Fix segment requesting error when playing a DASH content without an url and without BaseURL elements [#1192]
  - API: Stop sending events if the content is stopped due to a side-effect of one of the event handler [#1197]
  - text-tracks/ttml: fix inconsistent line spacing when resizing the `textTrackElement` [#1191]
  - DRM: Fix race condition leading to a JS error instead of a `NO_PLAYABLE_REPRESENTATION` [#1201]
  - DRM/Compat: Renew MediaKeys at each `loadVideo` on all WebOS (LG TV) platforms to work around issues [#1188]

### Other improvements

  - DASH: better detect closed captions [#1187]
  - DASH: handle `endNumber` DASH attribute [#1186]
  - DASH: Do not merge AdaptationSet with role "main" anymore [#1214]
  - DASH: parse `transferCharacteristics` property in the MPD to better detect hdr [#1212]
  - Support encrypted contents on Panasonic 2019 TVs [#1226]
  - Better handle SourceBuffer's QuotaExceededError, responsible for `MediaError` with the `BUFFER_FULL_ERROR` code [#1221]
  - API: send available...TracksChange events in the very unlikely scenario where tracks are added after a manifest update [#1197]
  - Completely remove RxJS dependency from the RxPlayer's source code [#1193]
  - DRM: Request PR recommendation when PlayReady is asked and try default recommendation robustnesses [#1189]


## v3.29.0 (2022-11-16)

### Features

  - add `networkConfig.segmentRequestTimeout` and `networkConfig.manifestRequestTimeout` options to loadVideo to configure the timeout of respectively segment and manifest requests [#1156]
  - add `timeout` property to the first argument communicated to a `segmentLoader` (from `loadVideo`'s `transportOptions`) [#1156]
  - add `timeout` property to a new third argument communicated to a `manifestLoader` (from `loadVideo`'s `transportOptions`) [#1156]
  - DRM: add `keySystems[].onKeyExpiration` to `loadVideo` options to configure the behavior the RxPlayer should have on key expiration [#1157]
  - DRM: add `keyStatuses` property to an `EncryptedMediaError` with the `KEY_STATUS_CHANGE_ERROR` code to communicate which key id and key statuses caused issues. [#1157]

### Deprecated

  - DRM: Deprecate `keySystems[].throwOnLicenseExpiration` `loadVideo` option as this boolean can be replaced with more customizability by the new `keySystems[].onKeyExpiration` `loadVideo` option [#1157]

### Bug fixes

  - Directfile: Fix long-running issues with rare "directfile" contents and some browsers/platforms (seen on Chrome PC and PlayStation 5) where playback would stay in `LOADING` state indefinitely despite playing [#1174]
  - DRM: Fix undocumented `keySystems[].videoRobustnesses` `loadVideo` option. `audioRobustnesses` was previously used even for video capabilities [#1171]
  - Compat/Directfile: Fix an issue with WebOS (LG TVs) when playing multiple directfile contents with the `stopAtEnd` player option set to `true` [#1154]
  - Compat/DRM: Fix infinite loading on WebOS (LG TVs) 2021 and 2022 when loading more than once an encrypted content by resetting decryption capabilities each time [#1175]
  - Compat: To work around an issue on WebOS (LG TVs), also specify a request timeout manually through a `setTimeout` call when XMLHttpRequests are created for Manifest and segment requests [#1152]
  - Compat/Directfile: Fix an issue on Tizen (Samsung TVs) where playing directfile contents could randomly lead to not having audio [#1170]
  - Compat: Fix issue with Tizen (Samsung TVs) where starting playback on a discontinuity could lead to infinite rebuffering [#1140, #1176]
  - Compat/Directfile: For `"directfile"` contents, also consider `AudioTrack` with a `description` (without an "s") as audio-description audio tracks to work-around what seems to be a Safari typo [#1160]
  - DRM: When using persistent licenses, create new MediaKeySession when `load` resolves with `false`, instead of relying the same, to fix issues with such persistent sessions if the browser cleaned it up [#1139]
  - Only call "MediaSource.endOfStream" once, the most visible side-effect should have been repeated logs [#1163]

### Other improvements

  - DASH: Improve multi-CDN configurations, by smartly selecting the right CDN depending on past status [#1165]
  - Allow reverse playback use cases by not skipping gaps and most discontinuities when the playback rate has been set to `0` or a negative value [#1138]
  - In the experimental "local" transport, add `incomingRanges` property to signal the time ranges of remaining data, allowing better discontinuity handling and duration estimates for sill-loading dowloaded contents [#1151]
  - Only send, through `"warning"` events, one `EncryptedMediaError` with a `KEY_STATUS_CHANGE_ERROR` code when multiple ones arises at the same time [#1157]


## v3.28.0 (2022-07-12)

### Features

  - Add `label` to audio, video and text track APIs (such as `getAvailableAudioTracks`) which gives a human-readable description of the corresponding track, if available in the Manifest [#1105, #1109]
  - Automatically set the LogLevel to `"DEBUG"` if a global `__RX_PLAYER_DEBUG_MODE__` constant is set to `true`, to simplify debugging [#1115]

### Bug fixes

  - Use the first **compatible** codec of the current AdaptationSet when creating a SourceBuffer [#1094]
  - DASH/DRM: Fix potential infinite rebuffering when a KID is not announced in the MPD [#1113]
  - DRM: Fix quality fallback when loading a content whose license has been cached under an extended `singleLicensePer` setting and when starting (and staying) with a quality whose key id is not in it [#1133]
  - DASH: Avoid infinite loop due to rounding errors while parsing multi-Periods MPDs [#1111, #1110]
  - After a `RELOADING` state, stay in `PAUSED` if the media element was paused synchronously before the side-effect which triggered the reloading (usually coming from the API) was perform [#1132]
  - Fix issue with `maxVideoBufferSize` setting which could lead to too much data being buffered [#1125]
  - Prevent possibility of requests loops and infinite rebuffering when a pushed segment is always completely and immediately garbage collected by the browser [#1123]
  - DASH: Fix potential rare memory leak when stopping the content after it has reloaded at least once [#1135]
  - Directfile: Properly announce the audio track's `audioDescription` accessibility attribute in directfile mode on Safari [#1136]
  - DASH: Fix issues that could arise if a segment is calculated to start at a negative position [#1122]
  - DASH: Fix possibility of wrong segments being requested when a SegmentTimeline in a given Period (whose Period@end is set) had an S@r set to `-1` at its end [#1098]
  - DASH: If the first `<S>` has its S@t attribute not set, make as if it is set to `0` [#1118]

### Other improvements

  - TTML: Add support for percent based thickness for textOutline in TTML Subtitles [#1108]
  - Improve TypeScript's language servers auto import feature with the RxPlayer by better redirecting to the exported type [#1126]
  - If seeking after the last potential position, load last segments before ending [#1097]
  - The duration set on the media element is now only relative to the current chosen tracks (it was previously relative to all potential track). This allows to seek later when switching e.g. to a longer video track [#1102]
  - Errors coming from an HTMLMediaElement now have the browser's error message if it exists [#1112]
  - TTML: Better handle EBU-TT subtitles by handling the `tt` XML namespace in our TTML parser [#1131]
  - DRM: Information on persisted DRM sessions are now automatically updated to their last version when possible [#1096]
  - Only log values which are relatively inexpensive to stringify to reduce the difference between debugging sessions and what is usually seen in production [#1116]


## v3.27.0 (2022-03-31)

### Features

  - Add a `maxVideoBufferSize` constructor option and `{get,set}MaxVideoBufferSize` methods to limit the size of loaded video data buffered at the same time [#1041, #1054]
  - DRM: Add a `"periods"` mode to the `keySystems[].singleLicensePer` `loadVideo` option, allowing to obtain decryption license for groups of Periods allowing a compromise between optimization, features and compatibility [#1028, #1061]
  - Add a `"reload"` `audioTrackSwitchingMode` to work-around rare compatibility issues when switching audio tracks [#1089]

### Bug fixes

  - subtitles: Fix rare issue where subtitles could be skipped due to a rounding error [#1064]
  - DASH: fix issue where the wrong segments would be requested on $Number$-based MPD with a SegmentTimeline older than the `timeShiftBufferDepth` [#1052, #1060]
  - directfile: disable all audio tracks before enabling one to work-around Safari issue on MacOS Monterey [#1067]
  - avoid performing a small seek when changing the audio track [#1080]
  - api: allow switching to RELOADING state synchronously after LOADED [#1083]
  - Safari Mobile: Improve decryption support on Safari mobile by relying on the vendored `WebKitMediaKeys` API [#1072]
  - DASH: Fix issue which prevented the integrity check of most MP4 DASH segments when `transportOptions.checkMediaSegmentIntegrity` was set to `true`
  - avoid unnecessary warning logs when loading some initialization segments [#1049]
  - TypeScript: Add forgotten TypeScript types in the exposed segment and manifest loader APIs [#1057]
  - DRM: Avoid decryption issues when a license is persisted in a `singleLicensePer` `"init-data"` mode but loaded in a `"content"` mode [#1031, #1042]
  - DRM: Totally avoid the theoretical possibility of leaking MediaKeySessions when a `generateRequest` or `load` call takes multiple seconds [#1093]

### Other improvements

  - DASH: always consider that the non-last Period is finished when it contains SegmentTimeline elements [#1047]
  - add better buffer cleaning logic on a browser's `QuotaExceededError` to better handle memory limitations [#1065]
  - DASH: Prioritize selectionPriority attribute over a "main" Role when ordering AdaptationSets [#1082]
  - directfile/Safari: use the `getStartDate` method in `getWallClockTime`, `seekTo` and the `positionUpdate` event when available to obtain true offseted "wall-clock" times when playing HLS contents on Safari [#1055]
  - DRM: Improve DRM Session caches performance when `singleLicensePer` is set to `"content"`
  - DRM: Stop retrying closing MediaKeySessions multiple times when it fails, instead doing it only once when it should work [#1093]
  - TypeScript: Add IBitrateEstimate, IPositionUpdate and IPlayerState types to the exported types [#1084]
  - Remove dependency on pinkie's promise ponyfill [#1058, #1090]
  - tests: add performance tests, to better catch and avoid performance regressions [#1053, #1062]
  - DRM: Refactor DRM logic for better maintainability. DRM-linked logs are now prefixed by `DRM:` instead of `EME:` like previously [#1042]


## v3.26.2 (2022-01-11)

### Bug fixes

 - API: re-switch to SEEKING state instead of BUFFERING when seeking to already-buffered data [#1015]
 - DASH: provide default startNumber attribute for number-based SegmentTemplate indexes with a SegmentTimeline [#1009]
 - TTML (subtitles): interpret percentages as relative to the computed cell size and not as the percentage of the inherited font size in the page [#1013]
 - subtitles: Work-around recent Chrome issue where the content of a native `<track>` element would still be visible despite being removed from the DOM (issue only reproducible in the `"native"` `textTrackMode`) [#1039]
 - API: Fix rare issue happening when switching rapidly between Representations, which led to multiple APIs such as `getAvailableVideoBitrate` or `getAvailableAudioTracks` returning either incorrect or empty results [#1018]
 - Improve prevention of rare segment-loading loops by fixing an issue with the clean-up of the short-term buffer history we maintain [#1045]

### Other improvements

  - DASH-LL: Improve adaptive bitrate logic on low-latency contents by implementing a specific algorithm for those [#1025, #1036]
  - DASH-LL: Improve handling of $Time$-based DASH-LL contents [#1020]
  - DASH: Support UTCTiming element with the `urn:mpeg:dash:utc:http-xsdate:2014` scheme [#1021]
  - DOC: Important refactoring of the RxPlayer API documentation to improve readability, discoverability and to add search capability to it [#1016]
  - DASH: handle ContentProtection elements that have been defined at the Representation-level (and not at the AdaptationSet-level, as defined by the DASH-IF IOP) [#1027]
  - DASH: Be resilient when the resource behind an UTCTiming element leads to an error (usually due to an HTTP-related issue) - instead of failing with an error like now [#1026]
  - Better estimate the duration of ISOBMFF segments with multiple moof boxes [#1037]
  - EME: Add hex-encoded key id to the `KEY_STATUS_CHANGE_ERROR` error message so we can know which key we're talking about when debugging [#1033]
  - dev/scripts: for the "modular" (a.k.a. minimal) RxPlayer build now rely on TypeScript's const enums, instead of uglily using sed, to replace compile-time constants. [#1014]
  - dev/scripts: remove reliance on environment variables when running the RxPlayer build scripts [#1004]
  - dev/scripts: add esbuild devdependency and add "s" script to allow faster checks for RxPlayer developpers [#1003]
  - CI: Rely on Github actions instead of Travis for most CI-related matters [#1046]
  - code/refacto: replace central `Clock` concept (Observable bringing media-related updates to the RxPlayer at a regular pace) by a more flexible `PlaybackObserver` class [#1002]


## v3.26.1 (2021-09-14)

### Bug fixes

  - ttml: Do not throw if a TTML subtitles file doesn't contain any `<body>` tag, just ignore it [#993]
  - Auto-detect when playback is unexplicably frozen and try to unlock it through a small seek [#982]
  - Properly send `available{Audio,Video}BitratesChange` event for multi-Period contents [#983]
  - DASH/MetaPlaylist/Local: fix rare infinite rebuffering issue which could happen when changing or disabling the track of a future Period [#1000]
  - compat: Prevent rare segment-loading loops by automatically detecting when segments are garbage collected by the browser immediately after being pushed [#987, #990]
  - compat/DRM: In some Safari versions, communicating a license as a JS `ArrayBuffer` could throw, this is now fixed [#974]
  - DASH_WASM: Don't stop with a fatal error if an expected ISO8601 duration value is empty in the MPD
  - DASH_WASM: Parse `<Event>` elements which contain an XML namespace defined outside that element [#981]
  - DASH_WASM: Drastically reduce wasm compilation time and file size [#980]

### Other improvements

  - Request initialization segment and the first media segments at the same time when possible, potentially reducing loading times [#973]
  - Remove cached segment request detection in the adaptive logic, as it is sensible to false positives, leading to a poor bitrate in some short contents [#977]
  - Export more needed types through the `rx-player/types` path [#972, #976]
  - demo: Expose some player options in the demo page [#999]
  - dev: Rewrite build logic from bash to node.js to improve its maintainability
  - dev: Replace internal `info` script by more helpful and interactive `list` script [#991]
  - dev/code: Forbid the usage of TypeScript's type `any` in most of the RxPlayer's code - performing runtime type-checking in some cases (in DEV mode only) [#994]
  - dev/code: Remove RxJS from the transports code [#962]


## v3.26.0 (2021-06-10)

### Features

  - Add HDR information through the `hdrInfo` property on video Representation/tracks as returned by APIs such as `getVideoTrack`, `getAvailableVideoTracks`, the `videoTrackChange` event, `getManifest`, `getCurrentAdaptations` and `getCurrentRepresentations` [#946]
  - Add the `DASH_WASM` experimental feature, allowing faster MPD parsing using WebAssembly [#937]
  - Add the experimental `VideoThumbnailLoader` tool, which uses "trickmodes" DASH AdaptationSet to generate thumbnails [#647]
  - Add `preferTrickModeTracks` option to `setPlaybackRate`, to switch on or off trickmode tracks when available on the Manifest [#940]
  - Add `areTrickModeTracksEnabled` method to indicate whether the RxPlayer is using trickmode tracks in priority [#940]
  - Add `trickModeTracks` and `isTrickModeTrack` properties to video tracks as returned by the `getVideoTrack` and `getAvailableVideoTracks` method and by the `videoTrackChange` event [#940]
  - Add `maxSessionCacheSize` `keySystems` option, to configure the maximum number of decryption sessions that can be kept alive at the same time in a cache [#938]
  - The `manifestLoader` callback defined in `transportOptions` can now ask for a request to be retried [#964]
  - `initialManifest` now accepts the Manifest as an `ArrayBuffer` [#937]
  - The `manifestLoader` callback defined in `transportOptions` can now send the Manifest as an `ArrayBuffer` [#937]

### Bug fixes

  - DASH: don't ignore new EventStream elements that weren't in the previous MPD update for a given Period [#956]
  - DASH: fix fatal error linked to the `duration` of the `MediaSource` happening when playing a multi-Period live DASH content whose previous (before updating) last Period's segments had been fully generated and fully pushed. [#952]
  - DASH: Avoid loading plain-text subtitles in a loop when playing before the first cue starts or after the last cue ends [#945, #948]
  - DASH: Avoid loading plain-text subtitles in a loop when the `transportOptions.checkMediaSegmentIntegrity` is set to `true` [#947]
  - DASH: avoid ending a dynamic stream if new Periods may be added later to the MPD [#959]
  - DASH: avoid unnecessarily refresh a MPD based on SegmentList elements when they don't perfectly align with the pushed data [#963]

### Other improvements

  - Improve `audioTrackSwitchingMode` `"direct"` mode by avoiding unnecessary reloading cases [#872, #887, #943]
  - When seeking after the end of an ended content, actually seek just a little before to avoid subtle issues [#941]
  - DASH: limit the postponment of a Manifest refresh due to poor MPD-parsing performance to 6-times the "regular" delay (not impacted by `tansportOptions.minimumManifestUpdateInterval`) [#958]
  - DASH: Avoid loading two times a segment instead of once when that segment is not anounced in the MPD through a SegmentBase, SegmentList nor SegmentTemplate element but just through the Representation's BaseURL. [#949]
  - Update used RxJS version to 7.0.0, which might bring with it a smaller size and better performances [#954]
  - demo: remove Chart.js dependency (we found that its new API documentation and errors were too impenetrable) and replace the "Buffer Size" chart by a homemade one. [#955, #957]


## v3.24.0 (2021-04-01)

### Features

  - Add `inbandEvent` event for when an event is encountered in a media segment [#892]
  - DRM: Add `singleLicensePer` `keySystems` option to be able to signal in advance that the current content has a single license, even if it has multiple encryption keys [#863, #904]
  - DRM: Add `keySystems[].licenseStorage.disableRetroCompatibility` boolean to unlock optimizations when compatibility with EME sessions persisted in older RxPlayer versions is not important [#919]

### Bug fixes

  - DASH: Fix rounding error that could cause infinite buffering issues when going from a DASH Period to the next [#897, #899]
  - DRM: Always pass on server certificate before any challenge is generated. Contents with multiple licenses previously could lead to the latter being done before the former. [#895]
  - DRM: Fix possible leaks of MediaKeySessions if closed at the wrong time [#920]
  - Fix issue making sudden and acute fall in bandwidth not being considered soon enough [#906]
  - On some devices when `maxBufferAhead` is set, avoid removing the initially loaded data if done before the initial seek could be performed [#907]
  - Avoid cases of infinite rebuffering on Tizen 4 by avoiding pushing segments "on top of others" too close to the current position [#925]
  - Avoid seeking issues on Tizen by not seeking over discontinuities that will be already handled by the browser [#922]
  - Fix initial seek on Tizen (Samsung TVs) on live contents by setting a much lower duration (to work-around a Tizen overflow) [#914]
  - DASH: Consider multiple defined `<Accessibility>` tags for a single AdaptationSet [#903]
  - Fix error that could be thrown on Safari when calling the `getStatusForHDCP` method from the experimental `MediaCapabilitiesProber` tool [#927]

### Other improvements

  - Avoid to push on top of the current position if there's already a segment there as it can provoke minor decoding issues on some devices [#925]
  - Update video element's duration if the content duration changes [#917]
  - DASH: Improve loading time with encrypted contents by only using the encrypted initialization data found in the Manifest when found in it [#911, #919]
  - Record redirections made on a `manifestUpdateUrl` to request directly the right URL on next update. [#929]
  - Improve loading time when a `serverCertificate` is given by calling the `setServerCertificate` API earlier [#895]
  - Improve loading time when switching contents by fetching the Manifest at the same time the previous content is cleaned-up [#894]
  - Improve loading time on some CPU-constrained devices by not running unnecessary playback checks on the "progress" HTMLMediaElement event anymore [#893]
  - DASH: Consider DASH audio AdaptationSet with a "urn:mpeg:dash:role:2011" schemeIdUri and a "description" role as `audioDescription` tracks [#903]
  - Warn through the logger when the autoplay attribute is enabled on the media element but not on RxPlayer [#924]
  - Avoid switching to a SEEKING state if the seek operation was performed inside the RxPlayer's code [#872, #887]
  - DRM: Wait up to 100 milliseconds after a persistent MediaKeySession has been loaded to wait for possibly late `keyStatuses` updates [#928]
  - DRM: Only store persistent MediaKeySession once at least one key is known [#926]
  - DRM: Reconsider Representations that have been fallbacked from if they become decipherable [#905]
  - DRM: Lower the maximum size of the MediaKeySession cache from 50 to 15 to improve compatibility, even more now that license with multiple keys are properly handled
  - Doc: Move architecture documentation closer to the code it documents [#764, #900]
  - Doc: add "Quick links" to the top of the API documentation [#909]


## v3.23.1 (2021-02-01)

### Bug fixes

  - Fix support of encrypted contents on Safari (v3.23.0 regression)


## v3.23.0 (2021-02-01)

### Features

  - Add the `reload` method to be able to re-load the last loaded content as fast as possible (e.g. after fatal errors) [#859, #867]
  - Add `onCodecSwitch` loadVideo option, to select a strategy when a new incompatible codec is encountered [#856]
  - Emit `DISCONTINUITY_ENCOUNTERED` warnings when a discontinuity has been seeked over [#862]
  - Add minAudioBitrate and minVideoBitrate constructor options and the {set,get}Minimum{Audio,Video}Bitrate methods to define the minimum quality reachable through adaptive streaming [#876]

### Bug fixes

  - Fix impossibility to fallback to another Representation (with the `keySystems[].fallbackOn` `loadVideo` options) when a decryption key has been found to be non-usable [#889]
  - Fix DRM-related events being sent twice in a row instead of just once [#850]
  - Stop and throw `MANIFEST_PARSE_ERROR` error again when either audio or video has only unsupported codecs (instead of just playing the other type) [#864]
  - Avoid re-downloading a segment that ends a lot before its expected end [#846]
  - In "native" `textTrackMode`, avoid requesting text segments in a loop [#878]
  - Disable effects of `throttleVideoBitrateWhenHidden`, `limitVideoWidth` and `throttleVideoBitrate` player options on Firefox >= 67 due to how Picture in Picture mode is currently handled in them [#874]
  - Work-around race condition in old Chromium versions where loading a persistent MediaKeySession led to no key statuses right away [#847]

### Other improvements

  - Skip over most audio or video discontinuities in the stream, even those not announced in the Manifest [#862]
  - When track or bitrate switching lead to a reload, seek back a consistent number of milliseconds to give back context [#848]
  - Don't call `setServerCertificate` API when `keySystems[].serverCertificate` option is set to `null` [#849]
  - On the rare platforms where an undefined initialization data type can be received on encrypted events, retry `generateRequest` with a default "cenc" value if the first one fails due to it being empty [#870]
  - Re-add debug logs logging the principal media properties at each clock tick [#844]
  - Use TextEncoder and TextDecoder interfaces when available to speed-up string conversions [#843, #875]
  - Throw a better error when no EME API is found
  - Reduce default bundles size by switching to webpack 5 to generate them
  - tests: Add conformance tests on the initial seek to help debugging related issues on new platforms [#873]
  - lint/code: Use eslint code linter even for the TypeScript code [#842]


## v3.22.0 (2020-11-17)

### Features

  - Add `audioTrackSwitchingMode` `loadVideo` option to allow different strategies when switching between audio tracks [#801, #806]
  - Add `enableFastSwitching` `loadVideo` option to enable or disable optimizations doing segment replacement in the browser's buffer [#779, #780]
  - Add `initialManifest` `loadVideo` option to provide the Manifest to the RxPlayer when it has already been loaded [#807]
  - tools: Add `StringUtils` utilitary functions to tools to convert bytes to strings and the other way around [#809]
  - tools: The `TextTrackRenderer` tool is not experimental anymore: it now has a stable API [#810]
  - experimental/local-manifest: The RxPlayer now (only) plays the new `"0.2"` format version of the "LocalManifest" (in the experimental `"local"` transport) [#810]

### Bug fixes

  - directfile: Fix impossibility to play an encrypted content in directfile mode (regression brought in v3.21.1) [#827, #830]
  - subtitles: Display multiple cues with overlapping times [#829]
  - smooth: Fix minimum position in a Smooth live content when fewer segments than the dvr window length are available [#826]
  - dash/metaplaylist: Fix possible playback issues on multi-Period contents, where segments from multiple Periods overlap [#837]
  - Fix very rare race condition which triggered a "setting priority of null" error after synchronous segment requests were done [#817]
  - local-manifest: LocalManifest that transition from not finished to finished while playing now end properly [#818]
  - local-manifest: Fix and clarify the duration and maximum position reported for a playing LocalManifest [#818]
  - compatibility/drm: On some webkit-based browsers, do not require the use of a server certificate for DRM if the key system used is not FairPlay [#833]
  - drm: Properly update to a different server certificate on the MediaKeys or remove it if needed [#835]
  - drm: throw MEDIA_IS_ENCRYPTED_ERROR again when playing an encrypted event without either the `EME` feature, EME APIs or a `keySystems` option [#841]

### Other improvements

  - subtitles/ttml: Apply default position to TTML subtitles in `"html"` `textTrackMode` when no style is found [#815]
  - subtitles/ttml: Set default text color to white to TTML subtitles in `"html"` textTrackMode [#832]
  - drm: Avoid re-setting a server certificate we know has already been pushed to improve loading performance [#824, #835]
  - dash: Always prefer a "main" AdaptationSet when hesitating between multiple ones [#828]
  - dash: Improve minimum position precision for dynamic DASH contents when less segments are available than what would be guessed from the timeShiftBufferDepth [#826]
  - drm/logs: Better log why a MediaKeySession is not considered as "usable" [#822]
  - drm/logs: Be more verbose with DRM-related logs, even at lower logger levels [#821]
  - tests/conformance: Add "conformance tests", to quickly test the capabilities of new devices and targets [#814]
  - code: avoid circular dependency in `src/features` in original typescript source files [#805]
  - demo: Fix default position for the video track select element in the demo to always be at the currently selected video track [#813]
  - demo/code: Better integrate the RxPlayer to the demo: through a simple import, instead of adding a script tag for the bundled version [#811]
  - dev: Remove all enforced git-hooks (on pre-commit and pre-push) [#808]


## v3.21.1 (2020-09-21)

### Bug fixes

  - compatibility/drm: make switching the current `MediaKeys` work on most platforms by re-ordering browser API calls [#766, #744]
  - compatibility/drm: in Edge and IE11, fix behavior which could lead to not fallbacking from a non-decryptable quality due to a badly parsed key ID [#790]
  - dash: when a Representation depends on multiple SegmentTemplate at the same time, merge all corresponding information instead of just relying on the last one [#767, #768]
  - smooth: skip discontinuity when seeking in the middle of one when playing a smooth content [#792]
  - api: fix `getUrl` and the minimum position calculation after playing for some time a live content with a set `manifestUpdateUrl` [#775, #776]
  - drm/subtitles: better handle UTF-8 and UTF-16 characters in an encrypted initialization data or in subtitles [#791]
  - requests: still retry all the other segment's URLs when a non-retryable error happen on the request for one of them [#798]
  - dash: fix infinite rebuffering when playing multi-Period DASH contents for some time with a `manifestUpdateUrl` set [#797]

### Other improvements

  - improve seek latency in some rare cases where we could profit from cancelling a request for a needed segment [#752, #769]
  - requests: only download an initialization segment when media segments for that Representation are needed [#773]
  - requests: avoid unnecessary segment requests when segments loaded don't exactly align with what is expected if contiguous segments exist [#772, #771]
  - better time quality switches to avoid having to re-download segments in the new quality [#781, #782, #783]
  - adaptive: limit bandwidth oscillations when the buffer level is low by choosing a lower bitrate by default and limiting fall in bandwidth when in "starvation mode" [#796]
  - compatibility/drm: filter out badly-formed CENC PSSH when found, if some well-formed exist [#788]
  - isobmff: support rare but possible occurence where an ISOBMFF box size is stored on 8 bytes [#784]
  - logs: when logs are set to `"DEBUG"`, now regularly print visual representations of which segments live currently in the buffer(s) [#795]
  - demo: change separator in the demo's generated links from "\" to "!" to not change its form when percent-encoded [#758, #759]
  - project: better document changes in changelog and release notes, mostly by linking to related issues and PRs
  - code: rename "Buffer" module to "Stream" in the code, documentation and logs to better reflect what that code does [#793]
  - tests: add "global" unit tests for a more a module-oriented testing strategy (when compared to our existing function-oriented unit tests) to our EME (DRM) related code [#753]


## v3.21.0 (2020-06-17)

### Features

  - api/events: add `"streamEvent"` event for when a DASH EventStream's event is reached
  - api/events: add `"streamEventSkip"` event for when a DASH EventStream's event is "skipped"
  - types/events: add `IStreamEvent` and `IStreamEventData` - which define the payload emitted by both a `"streamEvent"` and `"streamEventSkip"` events to the exported types
  - api/tracks: add second argument to `setPreferredAudioTracks`, `setPreferredTextTracks` and `setPreferredVideoTracks` to be able to also apply them to the currently loaded Periods / content
  - text/webvtt: parse settings attributes of WebVTT subtitles when in HTML mode
  - api/tracks: add codec information to `getAvailableAudioTracks` and `getAudioTrack`

### Bug fixes

  - dash: do not reduce the minimum position when using the `manifestUpdateUrl` `transportOptions` in `loadVideo`
  - local-manifest: consider `language` property from a "local" Manifest
  - local-manifest: refresh the Manifest even if we dont have a Manifest URL, as is often the case when playing locally-stored contents
  - local-manifest: allow the "expired" property of a local-manifest to be updated
  - compat/eme/fairplay: for fairplay contents, better format the initialization data given to the CDM. The previous behavior could lead to invalid license requests
  - eme: re-allow serialization into a JSON string of the persisted session data, as presented in the DRM tutorial
  - compat/low-latency: fix compilation of async/await when playing low-latency contents with the default bundled builds
  - eme: ensure that the previous MediaKeySystemAccess used had `persistentState` to "required" when a new content needs it to be
  - eme: fix `closeSessionsOnStop` `keySystems` option actually not removing any MediaKeySession when stopping a content (v3.20.1 regression).

### Other improvements

  - dash: emit minor errors arising when parsing the DASH MPD through warning events (whose payload will be an error with the `PIPELINE_PARSE_ERROR` code)
  - dash: consider AdaptationSet@selectionPriority in our initial track choice if the user preferences lead to multiple compatible tracks
  - misc: do not download video segments when playing on an "audio" element.
  - eme: replace the MediaKeySession's cache entry based on the least recently used instead of on the least recently created to improve cache effectiveness.
  - eme/persistent sessions: Limit the maximum of stored persistent MediaKeySessions to 1000 to avoid the storage to grow indefinitely (higher than that, the least-recently used will be evicted)


## v3.20.1 (2020-05-06)

### Bug fixes

  - eme: fix `OTHER_ERROR` issue arising when loading a new encrypted media when a previous since-disposed instance of the RxPlayer played encrypted contents on the same media element
  - eme: fix `OTHER_ERROR` issue arising on Internet Explorer 11 when playing more than one encrypted content
  - eme: fix issue where more than 50 active MediaKeySessions at the same time could lead to infinite rebuffering when playing back a previous content with multiple encryption keys
  - directfile: for directfile contents, don't reset to the preferred audio, text or video track when the track list changes
  - eme: remove any possibility of collision in the storage of EME initialization data. The previous behavior could theorically lead some initialization data to be ignored.
  - eme: fix typo which conflated an EME "internal-error" key status and an "output-restricted" one.


## v3.20.0 (2020-04-22)

### Features

  - api: add `disableVideoTrack` method
  - api: add the `preferredVideoTrack` constructor option and `setPreferredVideoTracks` / `getPreferredVideoTracks` methods to set a video track preference (or to start with the video track disabled).
  - api: add optional `codec` property to preferred audio tracks APIs, allowing applications to communicate a codec preference.
  - api: make the `language` and `audioDescription` properties in `preferredAudioTracks`' objects optional.
  - api: add `signInterpreted` to `getVideoTrack` and `getAvailableVideoTracks` return objects to know when a track contains sign language interpretation

### Deprecated

  - api: deprecate the `getManifest()` method
  - api: deprecate the `getCurrentAdaptations()` method
  - api: deprecate the `getCurrentRepresentations()` method

### Bug fixes

  - compat/eme: Set proper EME Safari implementation, to play contents with DRM on it without issues
  - compat/directfile/iOS: On Safari iOS, fix auto-play warnings when a directfile content is played with the `playsinline` attribute set.
  - directfile: In Directfile mode, always disable the current text track when a `null` is encountered in the preferredTextTracks array

### Other improvements

  - abr: ignore requests that may have directly hit the cache in our adaptive logic
  - dash/perf: improve parsing efficiency for very large MPDs, at the expense of a very small risk of de-synchronization. Mechanisms still allow for regular re-synchronization.


## v3.19.0 (2020-03-11)

### Features

  - dash: handle multiple URL per segment announced through multiple BaseURL elements in the MPD
  - dash/smooth/metaplaylist: add `manifestUpdateUrl` to loadVideo's `transportOptions` to provide a shorter version of the Manifest, used for more resource-efficient Manifest updates
  - tools/createMetaplaylist: add the experimental `createMetaplaylist` tool, which allows to generate Metaplaylist contents from given Manifests
  - tools/TextTrackRenderer: add the optional `language` property to the `setTextTrack` method of the experimental `TextTrackRenderer` tool as it could be needed when parsing SAMI subtitles
  - types: export IAvailableAudioTrack, IAvailableTextTrack and IAvailableVideoTrack types
  - types: export IAudioTrack, ITextTrack and IVideoTrack types

### Bug fixes

  - dash/smooth: fix segment url resolution when there is query parameters in the Manifest URL and/or segment path, themselves containing "/" characters
  - local-manifest: fix videoElement's duration and `getVideoDuration` for contents in the experimental `local` transport
  - tools/parseBifThumbnails: do not return an un-displayable ArrayBuffer of the whole thing in each `image` property in the experimental `parseBifThumbnails` function

### Other improvements

  - compat: avoid pushing a segment on top of the current position in Safari, as it can sometime lead to green macro-blocks
  - dash: add multiple performance improvements related to MPD parsing on embedded devices
  - dash/smooth/metaplaylist/local: refresh less often the Manifest when parsing it takes too much time to improve performance
  - smooth: filter unsupported video and audio QualityLevels when parsing a Smooth Manifest
  - build: greatly reduce the time needed to produce a modular build through the `npm run build:modular` script
  - build: remove Object.assign dependency


## v3.18.0 (2020-01-30)

### Features

  - directfile: support most audio tracks API when playing a directfile content
  - directfile: support most text tracks API when playing a directfile content
  - directfile: support most video tracks API when playing a directfile content
  - api: add `seeking` and `seeked` events which announce the beginning and end of a seek, even when seeking to an already buffered part
  - subtitles/ttml: handle styles inheriting other styles in TTML subtitles
  - local-manifest: add experimental `local` transport to allow the playback of downloaded contents (even when offline)
  - tools: add the experimental `TextTrackRenderer` tool to be able to add a custom text track to any content
  - tools: add the experimental `parseBifThumbnails` tool to easily parse thumbnails in the BIF format

### Deprecated

  - api: deprecate the `supplementaryTextTracks` loadVideo option in profit of the external TextTrackRenderer tool
  - api: aeprecate the `supplementaryImageTracks` loadVideo option in profit of the external parseBifThumbnails tool
  - api: deprecate the `getImageTrackData` method in profit of the external `parseBifThumbnails` tool
  - api: deprecate the `imageTrackUpdate` event in profit of the external `parseBifThumbnails` tool
  - api: deprecate `hideNativeSubtitles` (officially)

### Bug fixes

  - subtitles/ttml: Correctly handle alpha information in the rgba values included in a TTML file
  - images/bif: fix sometimes incorrect "ts" value on thumbnails returned by the `getImageTrackData` method and the `imageTrackUpdate` event

### Other improvements

  - node: allow the RxPlayer to be imported from Node.js for server-side-rendering
  - images/bif: throw a better error when an invalid BIF file is received
  - api: be more "generous" with player events by ditching the deep-equal npm module due to package size and some edge-case behavior
  - demo: avoid re-rendering multiple ui components when unnecessary


## v3.17.1 (2019-12-20)

### Bug fixes

  - dash/metaplaylist: fix infinite rebuffering issue when refreshing multi-Period contents under specific conditions
  - buffer: be less aggressive when garbage collecting subtitles (if the maxBufferAhead/maxBufferBehind options are set) to avoid useful subtitles being removed
  - directfile/compat: for directfile contents, trigger directly the LOADED state on iOS/iPad/iPod browsers as those are not preloaded there

### Other improvements

  - demo: display clickable "play" button on the video element when autoplay is blocked due to browser policies - to help users unlock the situation
  - demo: add "Other" key system to allow specifying a custom key system in the demo page


## v3.17.0 (2019-12-09)

### Features

 - eme/api: add keySystems.fallbackOn property to `loadVideo` to allow fallbacking to other qualities when encountering various key errors
 - eme/api: allow to set `fallbackOnLastTry` on a `getLicense` Error to be able to fallback on other qualities when a license request is on error
 - eme/api: add `NO_PLAYABLE_REPRESENTATION` `MediaError` for when every video or audio quality cannot be played
 - manifest/api: add `decipherable` property to a Representation object
 - api: add `decipherabilityUpdate` event triggered when a Representation's decipherability status is updated
 - languages/api: add `dub` boolean to audio tracks (through `getAudioTrack` and `getAvailableAudioTracks`) to tell if this is a dubbed track
 - languages/ttml: with TTML subtitles, support length relative to the Computed Cell Size for `tts:fontSize`, `tts:padding`, `tts:extent`, `tts:origin` and `tts:lineHeight`
 - transports/api: add `checkMediaSegmentIntegrity` `transportOptions` to automatically retry media segments which appear corrupted
 - transports/api: add `minimumManifestUpdateInterval` `transportOptions` to limit the Manifest update frequency
 - transports/api: add "progress" callback to a custom segmentLoader to improve adaptive streaming when an external segment loader is used

### Bug fixes

 - dash/metaplaylist: download the first segment of a new Period when the last downloaded segment from the previous Period ends after that segment ends
 - smooth/metaplaylist: consider `serverSyncInfos` `transportOptions` for Smooth and MetaPlaylist contents
 - buffers: completely clean a previous audio/text track from the SourceBuffer when switching to a different audio/text track
 - dash: avoid requesting an inexistent segment when downloading a multi-Period DASH content with a number-based SegmentTemplate with the `agressiveMode` option set to `true`
 - eme: do not wait for a previous invalid MediaKeySession to be closed before re-creating a valid one for the same content, to work around a widevine issue
 - eme: avoid race condition issue arising when multiple init data are received before the MediaKeys have been attached to the media element
 - dash: do not consider "trickmodes" AdaptationSet as directly playable video tracks
 - directfile: begin directly at the end (instead of the beginning) when setting a `startAt` loadVideo option with a `fromLastPosition` property set to `0` on directfile contents
 - metaplaylist: fix playback for non-live MetaPlaylist contents not starting at a `0` time

### Other improvements

 - abr: better estimate a lower bitrate after a sudden fall in bandwidth
 - dash/low-latency: properly use @availabilityTimeOffset when playing a low-latency DASH content
 - code: use only strict boolean expressions in the code (do not rely on falsy or truthy values anymore).
 - demo: add buffer content graphs to the demo page to vizualize exactly what have been buffered
 - demo: improve accessibility of the demo page for the english-speaking visually impaired
 - misc: replace uglifyJS by terser for minification purposes



## v3.16.1 (2019-10-03)

### Bug fixes

  - dash: update timeshiftBufferDepth considered when refreshing the MPD
  - dash: fix infinite rebuffering issue when refreshing a Multi-Period MPD with the oldest Periods removed
  - api: go to `"SEEKING"` state instead of `"BUFFERING"` when seeking while the player is in the "BUFFERING" state
  - api: Avoid reinitializing the video, audio and text track choice after a `"RELOADING"` state
  - api: When going back to a Period on which `disableTextTracks` was called, keep the text track disabled even if different `preferredTextTracks` are set
  - smooth: Replace ``{CustomAttributes}`` token in a segment URL
  - dash: load the last segment of a Period when it is declared in a SegmentTemplate (with no SegmentTimeline) and when its end is exactly equal to the end of the Period

### Other improvements

  - dash/metaplaylist: be more tolerant with the appendWindows set as the previous behavior could lead to infinite rebuffering and segments re-downloading
  - dash/metaplaylist/smooth: Better handle discontinuities in a VoD content
  - dash/metaplaylist: Handle discontinuities between DASH Periods and between MetaPlaylist contents
  - dash/smooth: Avoid requesting multiple time the last segment when the duration given in the Manifest are inexact
  - smooth: Skip without throwing Manifest's StreamIndex with an unrecognized type
  - dash: Improve prediction of when to update a dynamic MPD with xlinks
  - dash: Be more tolerant of differences between a segment's time announced by the Manifest and the reality to avoid multiple cases of segment re-downloading
  - dash: Guess initialization range for segments defined in a SegmentBase without an Initialization element
  - dash: Throw better error when a sidx with a reference_type `1` is encountered
  - api: Throw a better error when setting a `preferredAudioTracks` or `preferredTextTracks` value in the wrong format
  - demo: Allow to export and share demo links with custom contents
  - demo: Fix video track switching in the demo page
  - demo: Fix spinner not hiding when playing on very specific conditions
  - demo: reset playback rate before loading a content


## v3.16.0 (2019-09-16)

### Features

  - dash: add `lowLatencyMode` `loadVideo` option to play low-latency DASH contents with chunk-encoded CMAF and chunked transfer encoding close to the live edge efficiently
  - metaplaylist: add the experimental `metaplaylist` transport, which allows to smoothly play a concatenation of multiple contents
  - api: add `serverSyncInfos` to `transportOptions` (`loadVideo` option)
  - errors: add `code` property to a `NetworkError` indicating the corresponding HTTP status

### Bug fixes

  - dash: fix minimum time calculation for Multi-Period MPDs with SegmentTemplate segment indexes but no SegmentTimeline
  - dash: play static MPD not declaring any segment for a time of 0 seconds at the minimum possible time by default
  - dash: fix maximum position calculation for live Multi-Period contents where the currently generated period is not the last one declared in the MPD

### Other improvements

  - api: authorize to set no `url` to `loadVideo` if the `manifestLoader` `transportOption` is set
  - smooth: the `aggressiveMode` option now only allows requests for segments which had time to at least begin to be generated to avoid too much HTTP 412
  - dash: the `aggressiveMode` now also have an effect for some SegmentTemplate DASH contents (download segments even if they're not finished)
  - code: add pre-commit and pre-push git hooks to automate checking and facilitate bisecting
  - dash: better handle live Multi-Period contents where the currently broadcasted period is not the last one declared in the MPD
  - dash: better infer the end of a Period if the start of the next one is defined
  - api: always start live contents at the live edge if one is defined and not just before the last available segments
  - ci: run integration tests with Travis and appveyor again


## v3.15.1 (2019-08-07)

### Bug fixes

  - api: fix `networkConfig.segmentRetry` `loadVideo` option. Due to a typo, it was forced to the default value (4)
  - api/abr: when the `throttleVideoBitrateWhenHidden` option is set to true, wait 60 seconds (as documented) after the page is hidden before switching to a lower bitrate
  - dash: fix segment indexing for SegmentList-based MPD with a period start different than 0

### Other improvements

  - dash/smooth: check if the segment should still be available before retrying it (avoid unnecessary HTTP 404 errors)
  - dash/smooth: the Manifest can now be refreshed due to unexpected 404 HTTP errors on a segment request (only on particular conditions)
  - dash: better handle segments overlapping multiple periods by using the data that is only within the concerned Period's bounds
  - demo: authorize to play stored contents with an HTTP Manifest in the HTTPS demo


## v3.15.0 (2019-07-24)

### Features

  - eme: add `getLicenseConfig` property to the `keySystems` `loadVideo` option, to be able to have much more control over getLicense's behavior
  - eme: add `noRetry` to `getLicense` errors to abort retries when the licence request fails
  - eme: add `message` to `getLicense` and `onKeyStatusesChange` errors to allow custom errors when the license request fails
  - eme: add a new `ENCRYPTED_MEDIA_ERROR` with the code `CREATE_MEDIA_KEYS_ERROR` for when we cannot create a MediaKeys instance (seen on some Android devices).

### Bug fixes

  - api: avoid sending {audio,video...}BitrateChange with a `-1` value when starting to play a content
  - api/abr: a call to `setAudioBitrate` or `setVideoBitrate` could be ignored for a content if it was still loading. This is now fixed.
  - api/abr: a call to `setMaxAutoBitrate` or `setMaxVideoBitrate` could be ignored for a content if it was still loading. This is now fixed.
  - dash: fix maximum position calculation when refreshing a live MPD with a UTCTiming element and no SegmentTimeline.
  - dash/smooth: a MPD/Manifest request failing could still be retried when loading another content
  - eme/compat: on Safari, depend on WebKitMediaKeys even if MediaKeys is defined because of differences of implementations
  - pipelines: always send `PIPELINE_LOAD_ERROR` warnings when a segment request or a Manifest request is retried
  - errors: replace undocumented `PIPELINE_RESOLVE_ERROR` code into the proper documented `PIPELINE_LOAD_ERROR` code
  - errors: replace undocumented `PIPELINE_PARSING_ERROR` code into the proper documented `PIPELINE_PARSE_ERROR` code
  - errors: add to the `ErrorCodes` static property the previously forgotten `NONE`, `INVALID_KEY_SYSTEM` and `INVALID_ENCRYPTED_EVENT` codes.

### Other improvements

  - abr: make use of another adaptive algorithm, buffer-based, when enough buffer has been built.
  - demo: allow the user to save custom contents to local storage to be able to reuse them when the page is refreshed
  - eme: throw a better error in `onKeyStatusesChange` if the Promise is rejected without an Error
  - errors: refactore error management to better correlate the `fatal` boolean to a playback stop and to better ensure a documented error is always thrown
  - scripts: make our build script compatible with MacOS (handle BSD sed)


## v3.14.0 (2019-06-26)

### Features

  - api/abr: add `throttleVideoBitrateWhenHidden` which unlike `throttleWhenHidden` does not throttle the video bitrate if the media element is in picture-in-picture mode

### Deprecated

  - api/abr: deprecate `throttleWhenHidden` in profit of `throttleVideoBitrateWhenHidden` which has a better API definition for some edge cases

### Bug fixes

  - api/abr: `limitVideoWidth` now also considers if the video is in picture-in-picture mode
  - buffer: better prevent the `BUFFER_FULL_ERROR` `MediaError` on some memory-constrained devices
  - dash: consider the buffer depth as infinite (until `availabilityStartTime`) if the `timeShiftBufferDepth` is not set
  - smooth: consider the buffer depth as infinite if the `DVRWindowLength` is not set or set to 0
  - init: start live contents that just began (less than 10 seconds ago) at the minimum position instead of throwing a STARTING_TIME_NOT_FOUND MEDIA_ERROR.
  - tests: use web server (local by default) instead of stubbed XHRs to serve tests contents to our integration and memory tests


## v3.13.0 (2019-05-15)

### Features

  - eme: add `disableMediaKeysAttachmentLock` key system option to bypass a deadlock (with possible tradeoffs) when playing encrypted contents on some peculiar devices

### Bug fixes

  - dash/smooth: never rely on Date.now when calculating time differences to avoid issues when the user adjusts the system clock while playing a live content
  - eme: throw a better error (avoid `toString is not a function` messages) for a `KEY_LOAD_ERROR` when the `getLicense` function provided fails without a proper error
  - api: fix rare situation with DASH multi-period contents where we reported no available bitrate, Adaptation nor Representation when switching to another Period.

### Other improvements

  - eme: add other default contentTypes when calling requestMediaKeySystemAccess to improve device support
  - demo: update the demo UI
  - code: change indentation style of a big chunk of the code to increase readability


## v3.12.0 (2019-04-10)

### Features

  - dash: add UTCTiming support
  - smooth: add `aggressiveMode` transportOption to requests segments in advance
  - dash/smooth: add `referenceDateTime` transportOption to set a default reference time for live contents

### Bug fixes

  - buffer: work around firefox bug leading to infinite rebuffering when seeking many times in a content

### Other improvements

  - dash/smooth: add optional `url`, `sendingTime` and `receivingTime` properties in the response given by manifestLoader transportOption
  - misc: deploy documentation pages and demos from our previous versions
  - misc: add new RxPlayer logo to README.md and the demo


## v3.11.1 (2019-03-11)

### Bug fixes

  - npm: publish package again. An error in the previous release led to some files missing on npm


## v3.11.0 (2019-03-07)

### Features

  - languages/api: add `preferredAudioTracks` and `preferredTextTracks` player options
  - languages/api: add `setPreferredAudioTracks`, `getPreferredAudioTracks`, `setPreferredTextTracks` and `getPreferredTextTracks` methods
  - languages/api: add `availableAudioTracksChange`, `availableTextTracksChange` and `availableVideoTracksChange` events
  - abr/api: add `availableAudioBitratesChange` and `availableVideoBitratesChange` events
  - eme: allow playback of mixed encrypted and unencrypted contents on Chrome
  - types: export the new `IAudioTrackPreference` and `ITextTrackPreference` types

### Deprecated

  - languages/api: deprecate the `defaultAudioTrack` `loadVideo` option in favor of the `preferredAudioTracks` player option.
  - languages/api: deprecate the `defaultTextTrack` `loadVideo` option in favor of the `preferredTextTracks` player option.

### Bug fixes

  - dash: fix `minimumUpdatePeriod` management for DASH contents
  - smooth: better prevent 412 HTTP errors for smooth streaming contents
  - subtitles: ensure subtitles are not visible in Firefox when disabling them in the `"native"` textTrack mode.
  - errors: avoid sending multiple `MEDIA_TIME_BEFORE_MANIFEST` or `MEDIA_TIME_AFTER_MANIFEST` warnings instead of just one
  - api: fix (deprecated) option `hideNativeSubtitles`

### Other improvements

  - errors: set a readable error message for every error and warnings thrown
  - tools/mediaCapabilitiesProber: set logs about unimportant missing APIs as debug-level instead of warn-level
  - types: provide type safety to `addEventListener` and `removeEventListener`


## v3.10.3 (2019-01-30)

### Bug fixes

 - dash/api: fix ``getMinimumPosition`` for MPDs with an availabilityStartTime superior to unix epoch
 - smooth: be more tolerant on downloaded segments (accept ISOBMFF with boxes in any order)
 - buffers/abr: fix issue infrequently leading to a delay in quality changes
 - buffers: improve synchronisation to the SourceBuffer's buffer to avoid cases where the same segment could be downloaded multiple times
 - subtitles: fix bug in the clean-up logic of subtitles in the `"html"` texttrack mode that would lead to removed subtitles still being displayed
 - pipelines: retry a segment request with a backoff instead of stopping when receiving a HTTP 412
 - compat/subtitles: work-around firefox issue in the `"native"` texttrack mode to ensure track cues are removed when the content is stopped
 - subtitles/webvtt: support default classes in the WebVTT specification
 - subtitles/webvtt: multiple styles for the same element are now merged into one (instead of considering only the last one)
 - subtitles/webvtt: fix styling issues when both styles applied globally and styles applied on a selector are defined
 - subtitles/webvtt: do not remove whitespaces in styles to keep a sane formatting for some complex values

### Other improvements

  - dash: warn through logs when fields are not in the expected format
  - drm: throw more explicative error messages when DRM are not supported in the current target
  - dash/smooth: get more precize duration from ISOBMFF by better handling the default duration taken from the tfhd box
  - tests: continue unit test coverage improvements (from 22% in the ``v3.10.2`` to 33.6%)
  - demo: fix initial text-track selection


## v3.10.2 (2019-01-08)

### Bug fixes

  - dash/smooth: fix manifest updates for some DASH contents (SegmentTimeline without SegmentTemplate) and for some Smooth usages
  - compat/drm: adopt a new strategy for malfunctioning CENC PSSH on Edge by moving them at the end of the initialization data
  - dash/smooth: update deprecated Manifest.adaptations property when updating the manifest


## Other improvements

  - dash: refresh the MPD less often
  - dash/smooth: improve precision of `getMaximumPosition` when the Manifest is updated
  - tests: use the Jest library for unit tests
  - tests: add a lot of unit tests to sensitive code (from a coverage of 13% in the v3.10.1 to 22% in the v3.10.2)
  - npm: reduce size of the npm package


## v3.10.1 (2019-01-03)

### Bug fixes

  - abr: always consider the last quality estimation
  - drm: work-arround Edge bug where the browser does not accept a valid CENC PSSH (DRM-related information in an ISOBMFF)
  - dash: handle `S` nodes (segments) with an @r attribute at `-1` in an MPD
  - dash: handle `SegmentTimeline` which have as a first `S` node (segment) an undefined @t attribute in an MPD
  - dash: Representation.index.getLastPosition() for SegmentBase-based DASH Representations now returns the end of the last segment (it returned the start of the last segment before)
  - dash/smooth: throw better error (`MANIFEST_PARSE_ERROR`) if none of the audio or video tracks of a content can be played (e.g. none have supported codecs)

### Other improvements

  - manifest: better infer the minimum time of a Manifest
  - code: refresh code architecture (rename and move modules, remove some dependencies...)
  - tests: add coverage reports for both unit and "integration" tests, to check where tests are lacking and better pin down our hot-spots
  - tests: add appveyor countinous integration service for unit tests


## v3.10.0 (2018-12-11)

### Features

  - dash: Manage xlinks in "onLoad" resolution model
  - dash: Implement AdaptationSet switching by merging similar and switchable AdaptationSet into a single track
  - compat: add ``MEDIA_ERR_METADATA_NOT_LOADED`` warning, triggered when the browser has issues with loading the initial data (only seen on the Samsung mobile browser in directfile mode)
  - compat: add ``MEDIA_ERR_PLAY_NOT_ALLOWED`` warning, triggered when the application tries to ``play`` but the current browser doesn't allow it (often due to autoplay policy)
  - api: the ``play`` API now returns a Promise, mirroring the original browser's ``play`` API

### Deprecated

  - api: The ``xhr`` property from a `NetworkError` is now deprecated

### Bug fixes

  - compat/smooth: fix fatal error `BUFFER_APPEND_ERROR` happening on some HSS contents with Edge
  - dash/smooth: never refresh the manifest if its content is not dynamic
  - dash/smooth: use new URL if the initial manifest request is redirected (again :/ - thanks @fnatte)
  - api: do not go out of the ``LOADING`` state if the metadata could not be fetched (even if the browser tells us otherwise) - to work around Samsung Browser bug
  - api: avoid going out of the ``LOADED`` state until the initial seek is done and metadata is fetched
  - compat: use Promise ponyfill to improve IE11 compatibility with the MediaCapabilitiesProber and some EME functionalities
  - api: translate most IETF language tags into  corresponding ISO639-3 codes for the `normalizedLanguage` property -  given from APIs such as `getAvailableAudioTracks`
  - tools: fix ``mediaCapabilitiesProber.getCompatibleDRMConfigurations`` experimental tool on Safari
  - api: filter out duplicates in ``getAvailableVideoBitrates`` and ``getAvailableAudioBitrates``

### Other improvements

  - dash: better infer unknown Period durations
  - dash: better manage overlapping Periods by giving more importance to the last chronological one
  - memory: clean-up ``Adaptation`` and ``Representation`` information on Periods which are not considered anymore
  - log: warn through our logs every time a warning event is sent by the API
  - demo: authorize DRMs in IE11 or Safari when in HTTP in the demo page
  - demo: fix time indication for non-live contents


## v3.9.3 (2018-11-23)

### Bug fixes

  - compat: fix `undefined Object.values function` issue happening in some older browsers (mainly encountered in IE11 and old webkit versions)
  - compat: remove side-effects relative to DRM on Safari
  - tools: fix issue about an undefined Array.prototype.find method in some older browsers when calling mediaCapabilitiesProber.getCompatibleDRMConfigurations (mainly encountered in IE11)

### Other improvements

  - eme: activate MediaKeys caching on Edge
  - compat: add in our validation process a ban of methods and functions unavailable in older browsers
  - tests/smooth: reinforce our Smooth Streaming integration tests


## v3.9.2 (2018-11-14)

### Bug fixes

  - smooth: authorize empty tracks ("StreamIndex") in Smooth manifests


## v3.9.1 (2018-11-13)

### Bug fixes

  - smooth: fix issue preventing emergency manifest updates
  - dash: fix timeout for minimumUpdatePeriod in cases where the time at which the manifest was last requested is not known (like when setting a customManifestLoader argument)

### Other improvements

  - smooth: keep supplementary segment information when updating the manifest
  - smooth: when updating segment information, perform garbage-collection of those concerning unreachable segments


## v3.9.0 (2018-11-08)

### Features

 - dash: consider ``minimumUpdatePeriod`` attribute in MPDs
 - buffer: add codec-switching for browsers supporting the `SourceBuffer.prototype.changeType` API
 - dash/smooth: accept and parse segments with a "stpp.ttml.im1t" codec (TTML IMSC1 in MP4)

### Bug fixes

  - smooth: fix calculations of the initial time, duration and minimum position for HSS VOD contents not starting at a '0' time
  - buffer: fix priority updates for segment requests
  - dash: calculate VOD duration from the last period if undefined in the MPD's root
  - dash: remove possibility of obtaining two periods with the same id
  - typings: make `manualBitrateSwitchingMode` ``loadVideo`` option an optional TypeScript typing (thanks @fnatte again!)

### Other improvements

  - abr: do not always cancel pending requests when switching to a new bitrate
  - abr: re-estimate the bandwidth immediately after each request
  - buffer: remove automatic garbage-collection of the "image" source-buffer (its rules should be more complex than those in place)
  - tools/mediaCapabilitiesProber: Make ``getCompatibleDRMConfigurations`` work under IE11 and old webkit versions
  - tools/mediaCapabilitiesProber: Add a multitude of bug fixes to the experimental mediaCapabilitiesProber
  - package: divide by more than 2 the size of our package published in `npm` (thanks @necccc)
  - tests: add memory tests to detect memory leaks
  - demo: add 'favicon' to the demo page


## v3.8.1 (2018-10-17)

### Bug fixes

  - abr: fix memory leak in ABR Management
  - eme: avoid re-attaching a server certificate at each encrypted event

### Other improvements

 - buffer: lower the "paddings" applied to the video buffer when raising the quality
 - abr: when pratical, avoid relying on the "Content-Length" header to protect against miscalculations when downloading from misconfigured servers
 - abr: lower the minimum number of bytes we wait to download before we evaluate the bandwidth
 - abr: use performance.now instead of Date.now for better precision
 - module: move express from the dependencies to the devDependencies
 - demo: fix standalone demo and add possibility to launch it via HTTPS


## v3.8.0 (2018-10-11)

### Features

  - api/dash/smooth: add representationFilter API to prevent Representations (i.e. media qualities) from being played
  - api/buffer: add ``manualBitrateSwitchingMode`` option to allow a direct representation switch when calling ``setVideoBitrate`` and ``setAudioBitrate``
  - api/buffer: emit a ``MEDIA_TIME_BEFORE_MANIFEST`` warning when the wanted time is before what is announced in the manifest
  - api/buffer: emit a ``MEDIA_TIME_AFTER_MANIFEST`` warning when the wanted time is after what is announced in the manifest

### Bug fixes

  - remove export of undeclared ``ICompatVTTCue`` from modular build

### Other improvements

  - buffer: to avoid taking too much memory, regularly clean-up text and image buffer 5 hours ahead/behind the current position (customizable)
  - demo: add HTTPS capabilities on local full demo
  - rxjs: update rxjs to 6.3.3
  - typescript: update typescript to 3.1.2


## v3.7.0 (2018-09-21)

### Features

  - eme: add ``throwOnLicenseExpiration`` boolean to ``keySystems``  (``loadVideo`` option) to allow better expiration management
  - eme: in the ``getLicense`` property of ``keySystems``  (``loadVideo`` option), it is now possible to resolve with ``null`` to avoid a license update.
  - eme: in the ``onKeyStatusesChange`` property of ``keySystems``  (``loadVideo`` option), it is now possible to resolve with ``null`` to avoid a license update.
  - tools: replace experimental tool ``mediaCapabilitiesProber.isDRMSupported`` by the more useful ``mediaCapabilitiesProber.getCompatibleDRMConfigurations``

### Deprecated

  - smooth: giving a WSX URL instead of the Manifest URL for a smooth content is now deprecated.
  - smooth: giving a _publishing point definition_ URL (.isml) instead of the Manifest URL for a smooth content is now deprecated.
  - smooth: giving a _Smooth Streaming server manifest_ URL (.ism) instead of the Manifest URL for a smooth content is now deprecated.

### Bug fixes

  - api: switch state to "ENDED" if seeking to the end while the player is in the "LOADED" state.
  - api: switch state to "SEEKING" if seeking in the content while the player is in the "LOADED" state.
  - dash: consider multiple `Role` nodes for an AdaptationSet.
  - typescript: fix typings error when an application build us without the ``skipLibCheck`` TypeScript option enabled.
  - smooth: fix Manifest URL generation when a ".ism" or a ".isml" URL is given.
  - doc: document deprecation of the ``adaptations`` property returned from a ``Manifest`` object (as returned from the ``getManifest`` method).

### Other improvements

  - doc: add quick start tutorial.
  - doc: add player states documentation.
  - demo: add possibility to play encrypted contents.
  - demo: update demo page.
  - tests: consolidate our integration tests.


## v3.6.1 (2018-09-03)

### Bug fixes

  - directfile: send ``LOADED`` event again for directfile contents - thanks @Fnatte
  - dash: don't merge "main" AdaptationSet if they are not of a video type
  - eme: fix bug which prevented the ``closeSessionsOnStop`` keySystem option to work properly
  - typescript: export types compatible with project references


### Other improvements

  - directfile/tests: add basic directfile integration tests
  - build: update to Babel 7
  - rxjs: update to RxJS 6.3.1


## v3.6.0 (2018-08-24)

### Features
  - api: add video track switching
  - dash: add webm support
  - api: Emit warning if autoPlay is blocked on the current browser
  - api: add ``getAvailableVideoTracks`` method to retrieve every video tracks
  - api: add ``getVideoTrack`` method to get the active video track
  - api: add ``setVideoTrack`` method to switch the video track
  - api: add ``videoTrackChange`` event to know when a video track has been switched
  - api: add ``RELOADING`` event for cases where the player needs to reload (such as during a video track switch)

### Deprecated

  - api: the method ``isFullscreen`` has been deprecated
  - api: the method ``setFullscreen`` has been deprecated
  - api: the method ``exitFullscreen`` has been deprecated
  - api: the method ``getNativeTextTrack`` has been deprecated
  - api: the event ``fullscreenChange`` has been deprecated
  - api: the event ``nativeTextTrackChange`` has been deprecated

### Bug Fixes

  - ttml: display forbidden characters (such as ">") in a ``"native"`` ``textTrackMode``
  - ttml: process ``xml:space`` even if it is not defined at the top level
  - buffer: perform a better clean-up of previous media in a SourceBuffer when switching audio or text track
  - manifest/dash: throw a MANIFEST_PARSE_ERROR when no AdaptationSet of a given type in a Period is in a compatible codec

### Other improvements

  - types: export and document main typings used internally such as ILoadVideoOptions (the loadVideo argument)
  - misc: log every fatal errors
  - misc: remove dumb npm inclusion as a project dependency
  - doc: improve architecture documentation


## v3.5.2 (2018-08-06)

### Bug fixes

- dash: Manage presentationTimeOffset completely (allow advanced multi-period configurations)
- dash: Fix Adaptations bug when the first DASH adaptation was a "main" one
- smooth: Remove the limitation of a minimum bitrate in Smooth Streaming
- dash: Fix condition which prevented to play audio-only live DASH streams

### Other improvements

- typescript: add typescript declaration files
- abr: update ABR mechanisms when the estimated bandtwidth fall suddenly
- api: warn in the log when the browser reject a wanted autoplay
- drm: Add keyId information to the internal Manifest structure
- typescript: update typescript to v3.0.1


## v3.5.1 (2018-07-11)

### Bug fixes

  - parsers: fix wrong computation of segment time in template index
  - abr: get concerned request in starvation mode

## v3.5.0 (2018-07-03)

### Added

  - tools: add ``mediaCapabilitiesProber`` tool as an experimental tool
  - builds: add minimal import with feature selection (allowing cleaner feature switching or lazy-loading)
  - dash: allow multiple "main" adaptation
  - api: add static ``version`` property to the RxPlayer API

### Bug fixes

  - vtt: fix ``line`` setting for vtt tracks in ``"native"`` textTrackMode
  - dash: always play "main" adaptation first
  - misc: don't interfere with a client's RxJS implementation by switching to RxJS 6
  - dash: presentationTimeOffset doesn't have an influence on requested segment anymore
  - smooth/dash: throw a ``"MANIFEST_PARSE_ERROR"`` if no audio and video adaptations/StreamIndex are available in the current content

### Other improvements

  - builds: Reduce size of the builds
  - builds: use uglifyJS instead of Closure-compiler
  - builds: update to typescript 2.9
  - rxjs: update to RxJS version 6 (v6.2.1)
  - code: set complete URL in segment's media property
  - demo: add time indicator on the progress bar
  - demo: update fullscreen mode to also display the text track element
  - misc: moved demo server scripts to the respective demo directories
  - misc: moved manifest parsers to the ``src/parsers`` directory
  - misc: moved scripts from ``./tools`` to ``./scripts``
  - misc: moved webpack configs to the root of the project


## v3.4.1 (2018-05-31)

### Bug fixes

  - buffer: fix several bugs happening when calling ``endOfStream`` to announce the end of the current content. Especially prevalent on Chrome.
  - net: use redirected URL as a base for further requests when the manifest request led to a HTTP redirect.
  - vtt/srt: ignore silently (do not throw) when an unknown block has been detected in a vtt or srt file
  - vtt/srt: support styling spans (like b, i and u XML tags) spanning multiple lines
  - api: ``getAvailableTextTracks`` and ``getAvailableAudioTracks`` now always return an array (and never null) as announced in the API documentation
  - api: set default log level to ``"NONE"`` instead of ``"INFO"``
  - misc: remove development-only code from the non-minified code

### Other improvements

  - misc: move some dev dependencies from ``dependencies`` to ``devDependencies`` in ``package.json``


## v3.4.0 (2018-05-17)

### Added

  - eme: allow multiple licenses per content
  - eme: allow different MediaKeys to be attached on multiple media elements

### Bug fixes

  - eme: limit simultaneous loaded MediaKeySession to 50 by default (configurable)
  - source-buffer: clean properly the text SourceBuffer on deactivation
  - buffer: perform discontinuity seeks only for native source buffers

### Other improvements

  - doc: generate documentation pages
  - misc: add sonarqube quality pass
  - code: set a clearer private state for the API
  - tools: update to webpack v4.8.3
  - tools: update to typescript v2.8.3


## v3.3.2 (2018-04-17)

### Bug Fixes

  - api: emit SEEKING state instead of BUFFERING when the user seeks to an unbuffered part just after resuming playback
  - api: work around bug found in old versions of Chrome where the ENDED state would never be triggered at the end of the stream
  - api/language: fix bug where an audio or text language would not be switched to on certain conditions in live contents
  - smooth: fix frequent manifest refreshing happening immediately when changing audio/text language
  - eme/error: fix reason string and error message for KEY_STATUS_CHANGE_ERROR

### Other improvements

  - buffer: update download queue immediately when seeking to an already-buffered part, to always prioritize needed segments
  - buffer: schedule segments per level of priority to lower some buffering/seeking/loading time
  - demo: fix "Big Buck Bunny WEBM"'s URL


## v3.3.1 (2018-03-13)

### Bug Fixes

 - misc: fix missing browser API on IE11
 - buffer: end correctly streams which experienced a custom sourcebuffer (text/image) crash

### Other improvements

 - tools: support development on windows


## v3.3.0 (2018-03-05)

### Added

  - api: add directfile API to allow the playback of files natively managed by the browser

### Bug Fixes

 - api: fix player state when seeking after the video ended
 - text/api: fix getTextTrack API which could return the current audio track instead
 - text: clean-up custom HTML text track SourceBuffer's buffered when the text track is disabled


## v3.2.0 (2018-02-23)

### Added

  - dash: Handle multi-periods DASH manifests
  - api: add ``periodChange`` event
  - api: add ``stopAtEnd`` option to the constructor, to deactivate automatic content un-loading when it ends
  - api: add ``manifestLoader`` to the ``transportOptions`` of a ``loadVideo`` call

### Bug Fixes

  - stream: call ``endOfStream`` for better end detection and to allow the Chrome browser to display the last frames of a video
  - buffer: always play the last possible milliseconds of a content (removed END_OF_PLAY config attribute)
  - eme: workaround a bug found on Chrome where setting a ``keySystems`` option in ``loadVideo`` would always throw on HTTP (not HTTPS) pages.
  - vtt: fix WebVTT parsing when the last line of a WebVTT file is not a new line
  - dash: ignore availabilityStartTime settings for a static MPD
  - buffer: ignore segments for a duration inferior to the MINIMUM_SEGMENT_SIZE (200ms by default) to avoid infinite re-downloading

### Other improvements

  - update RxJS to v5.5.6
  - update TypeScript to v2.7.2


## v3.1.0 (2018-01-30)

### Added

  - api: add ``networkConfig`` to ``loadVideo`` options
  - eme: add ``closeSessionsOnStop`` to the ``keySystems`` ``loadVideo`` option

### Bug Fixes

  - dash: fix Range request ranges for representations based on a SegmentList index
  - smooth: allows smooth Manifests for non-live contents to begin at a timestamp != 0


## v3.0.7 (2018-01-19)

### Bug fixes

  - eme: fix bug which prevented to play encrypted contents on IE11


## v3.0.6 (2018-01-11)

### Bug Fixes

  - buffer: fix issue which could led to multiple video or audio segments being downloaded at the same time
  - dash/text: support MPD AdaptationSet with a "caption" Role as text Adaptations
  - dash/text: remove offset set for subtitles on live contents, which led to unsynchronized subtitles
  - dash: fix issue which could led to segments being re-downloaded too much in a SegmentTemplate scheme

### Other improvements

  - demo: set "html" textTrackMode by default to have a better stylization of closed captions.


## v3.0.5 (2017-12-11)

### Bug Fixes

  - eme: consider unknown errors (e.g. errors coming from the user of the library) as fatal eme errors


## v3.0.4 (2017-12-05)

### Bug Fixes

  - text/webvtt: authorize header options without parsing them
  - text/webvtt: authorize timestamps without hours

### Other improvements

  - misc: remove multiple unneeded assertions in DEV mode
  - misc: update DEV mode default debug level from DEBUG to INFO


## v3.0.3 (2017-11-24)

### Bug Fixes

  - text/ttml: apply correctly a style if directly set on an attribute
  - eme: load new video even if the last EME clean-up failed

### Other improvements

  - misc: set better work arround for typescript issue [20104](https://github.com/Microsoft/TypeScript/issues/20104) to make building npm scripts usable again
  - tools: update the update-version npm script
  - demo: ``npm run start`` and ``npm run standalone`` now build the rx-player in the "development" environment
  - tools: add more logs in DEBUG mode


## v3.0.2 (2017-11-17)

### Bug Fixes

  - misc: work around typescript issue [20104](https://github.com/Microsoft/TypeScript/issues/20104) temporarly to launch in Chrome in HTTP


## v3.0.1 (2017-11-17)

### Bug Fixes

  - abr: adopt a less agressive strategy to avoid re-bufferings
  - smooth: avoid most of the manifest refresh requests

### Other improvements

  - Switch codebase to TypeScript
  - Add Travis CI


## v3.0.0 (2017-11-10)

### Added

  - misc: add possibility to do custom builds through environment variables, to remove unwanted features from minified code.
  - languages: add support for segmented VTT subtitles
  - languages/dash: add support for plain text TTML, SAMI, SRT, VTT and MP4-embedded VTT subtitles in DASH manifests
  - languages/smooth: add support for MP4-embedded VTT subtitles in Smooth manifests
  - languages: add possibility to show fragmented or not TTML, SAMI, SRT and VTT text tracks in a <track> element, even for browser that do not support the VTTCue API
  - languages: add possibility to show TTML, SRT, VTT and SAMI text tracks in HTML tags for richer stylisation.
  - api: add ``textTrackElement`` option to ``loadVideo``
  - api: add ``textTrackMode`` option to ``loadVideo``
  - api: add ``nativeTextTracksChange`` event
  - eme: it is now possible to directly set the reverse domain name of the wanted key system in the ``type`` property of ``loadVideo``'s ``keySystems`` option.
  - api: add property ``percentage`` to the ``startAt`` argument of ``loadVideo``.
  - abr: add ``bitrateEstimationChange`` event
  - api: add ``LogLevel`` static property
  - api: a Date object can now be given to the ``loadVideo`` argument ``startAt.wallClockTime``. It will be automatically converted into seconds.
  - languages: add ``normalizedLanguage`` property in manifest-related-APIs to expose the ISO 639-3 language code of the audio and text tracks
  - languages: add ``normalized`` property in language-related-API to expose the ISO 639-3 language code of the audio and text tracks
  - loadVideo: add ``codecs`` property to supplementaryTextTracks
  - api: add ``wantedBufferAhead`` constructor option
  - api: add ``maxBufferAhead`` constructor option
  - api: add ``maxBufferBehind`` constructor option
  - api: add ``getVideoBufferGap`` method
  - api: add ``isMute`` method
  - api: add ``getManualAudioBitrate`` method
  - api: add ``getManualVideoBitrate`` method
  - config: add a global config file (src/config.js) to easily tweak the player behavior

### Changed

  - languages: switch from ISO 639-2 to ISO 639-3 language codes in various APIs
  - languages: the ``language`` property returned by language and manifest related APIs now reflect the exact language as set in the manifest
  - api: ``setVideoBitrate`` can now be called even when no content is playing
  - api: ``setAudioBitrate`` can now be called even when no content is playing
  - api: ``setVideoBitrate`` can now be called even when no video track has the exact same bitrate
  - api: ``setAudioBitrate`` can now be called even when no audio track has the exact same bitrate
  - api: giving a number to ``seekTo`` now has the same effect than setting a position option in argument (``seekTo({ position }) === seekTo(position)``)
  - api: ``getUrl`` now do not throw if no content is playing
  - api: ``isLive`` now do not throw if no content is playing
  - api: ``loadVideo`` does not return anything anymore
  - api: private (undocumented) variables have been isolated on a player instance to a ``_priv`` object.
  - api: the constructor option ``throttleWhenHidden`` is now set to false by default
  - api: the constructor option ``limitVideoWidth`` is now set to false by default

### Removed

  - api: remove ``defaultAudioTrack`` constructor option
  - api: remove ``defaultTextTrack`` constructor option
  - api: remove ``transportOptions`` constructor option
  - api: remove ``transport`` constructor option
  - api: remove ``nativeTextTrackChange`` event in favor of ``nativeTextTracksChange`` event (notice the "s")
  - api: remove ``goToStart`` method
  - api: remove ``getStartTime`` method
  - api: remove ``getEndTime`` method
  - api: remove ``toggleDebug`` method
  - api: remove ``hideDebug`` method
  - api: remove ``showDebug`` method
  - api: remove ``getDebug`` method
  - api: remove ``getImageTrack`` method
  - api: remove ``setVideoBufferSize`` method in favor of ``setWantedBufferAhead`` method
  - api: remove ``getVideoBufferSize`` method in favor of ``getWantedBufferAhead`` method
  - api: remove ``setAudioBufferSize`` method in favor of ``setWantedBufferAhead`` method
  - api: remove ``getAudioBufferSize`` method in favor of ``getWantedBufferAhead`` method
  - api: remove ``maximumBufferTime`` property from ``positionUpdate`` events
  - api: remove ``getCurrentTime`` method
  - api: remove ``asObservable`` method
  - api: remove ``loadVideo`` option ``manifests`` in favor of ``url`` and ``keySystems`` options
  - api: remove ``loadVideo`` option ``subtitles`` in favor of ``supplementaryTextTracks`` option
  - api: remove ``loadVideo`` option ``images`` in favor of ``supplementaryImageTracks`` option
  - api: remove constructor option ``initVideoBitrate`` in favor of ``initialVideoBitrate`` option
  - api: remove constructor option ``initAudioBitrate`` in favor of ``initialVideoBitrate`` option
  - api: remove constructor option ``defaultLanguage`` in favor of ``defaultAudioTrack`` option
  - api: remove constructor option ``defaultSubtitle`` in favor of ``defaultTextTrack`` option
  - position: remove ``subtitleChange`` event
  - position: remove ``languageChange`` event
  - position: remove ``progress`` event
  - position: remove ``currentTimeChange`` event in favor of ``positionUpdate`` event
  - adaptive: remove ``getMetrics`` method
  - adaptive: remove ``getAverageBitrates`` method
  - adaptive: remove ``getVideoMaxBitrate`` method in favor of ``getMaxVideoBitrate`` method
  - adaptive: remove ``getAudioMaxBitrate`` method in favor of ``getMaxAudioBitrate`` method
  - errors: remove static method ``getErrorTypes`` in favor of the static property ``errorTypes``
  - errors: remove static method ``getErrorCodes`` in favor of the static property ``errorCodes``
  - languages: remove ``normalizeLanguageCode`` method
  - languages: remove ``getAvailableLanguages`` method
  - languages: remove ``getAvailableSubtitles`` method
  - languages: remove ``isLanguageAvailable`` method
  - languages: remove ``isSubtitleAvailable`` method
  - languages: remove ``getLanguage`` method
  - languages: remove ``getSubtitle`` method
  - languages: remove ``setLanguage`` method
  - languages: remove ``setSubtitle`` method

### Bug Fixes:

  - dash: fix bug that prevented to play most dash contents with SegmentTemplate-based manifests
  - dash: it's now possible to play SegmentTimeline-based contents with a numbering scheme
  - dash/text: calculate the text track time offset for dynamic DASH contents (prevented most text tracks from live DASH contents to be displayed)
  - eme: fix EME issues when loading multiple videos in IE/Edge
  - api: The state of the player when ready to play with autoPlay === false is now ``"LOADED"`` and not ``"PAUSED"``
  - api: fix infinite loading bug when a new content is synchronously launched as soon as the previous one is ended or fell on error
  - dash: allow absolute BaseURL in Periods
  - languages: avoid excessive re-downloads if a ``supplementaryTextTracks`` is provided and either a ``maxBufferBehind`` or a ``maxBufferAhead`` is set.
  - eme: the ``reason`` for the eme error ``KEY_STATUS_CHANGE_ERROR`` is now correctly filled in
  - eme: do not set widevine robustnesses for non-widevine key systems
  - languages: fix bug which led the text buffer to _crash_ when the ``wantedBufferBehind`` option is set
  - languages: fix bug which led to TextTracks chunks being re-downloaded multiple times
  - speed: fix playback rate bug when setting it while the player is stalled
  - smooth: fix "fallback" callback in the segmentLoader API for smooth contents.
  - smooth: fix some minor risks of infinite rebuffering for live contents, when the isobmff's tfrf box is not well parsed.
  - buffer: avoid infinite player rebuffering when the manifest is not exactly aligned with the real duration of the content
  - buffer: avoid multiple causes of infinite player rebuffering by managing segment garbage collection
  - languages: getAudioTrack now always returns the currently set audio track
  - languages: getTextTrack now always returns the currently set text track

### Other improvements

  - manifest: improve manifest refreshing logic, by not downloading it when unnecessary
  - smooth: begin to play arround 10s before the live edge instead of 20 seconds for smooth contents
  - network: the backoff algorithm has been refactored for better network error resilience
  - adaptive: improved ABR management to provide a better, faster and more stable bandwidth estimation
  - adaptive: add strategies for abrupt changes of bandwidth to avoid excessive re-buffering on network fluctuations
  - adaptive: the adaptive algorithm now take into account the current playback rate
  - doc: added file architecture documentation
  - tests: fixed and added integration tests
  - demo: the demo now manages most languages defined by in the ISO 639-3 standard


## v2.3.2 (2017-07-25)

### Bug Fixes

  - eme: update EME workflow to improve support (especially chromebooks)


## v2.3.1 (2017-07-10)

### Bug Fixes

  - buffer: improve buffer ranges "bookeeping" logic to avoid re-downloading the same segments


## v2.3.0 (2017-07-07)

### Added

  - eme: add audioRobustnesses to loadVideo's keySystems argument (/!\ undocumented API - can break without official notice)
  - eme: add videoRobustnesses to loadVideo's keySystems argument (/!\ undocumented API - can break without official notice)
  - eme: add serverCertificate to loadVideo's keySystems argument
  - buffer: add {set,get}MaxBufferAhead methods
  - buffer: add {set,get}MaxBufferBehind methods
  - buffer: add {set,get}WantedBufferAhead methods replacing the deprecated buffer size methods

### Deprecated

  - setVideoBufferSize has been deprecated in favor of setWantedBufferAhead
  - getVideoBufferSize has been deprecated in favor of getWantedBufferAhead
  - setAudioBufferSize has been deprecated in favor of setWantedBufferAhead
  - getAudioBufferSize has been deprecated in favor of getWantedBufferAhead

### Bug Fixes

  - buffer: avoid some infinite re-buffering by re-calculating buffer ranges at every tick
  - eme: add eme support for some legacy browser without video or audio capabilities
  - general: add support for older browsers (which does not support array.prototype.{find,findIndex,includes})
  - general: use Object.assign ponyfill instead of the previous polyfill to avoid malicious interferences with other codebases


## v2.2.1 (2017-06-27)

### Bug fixes

  - adaptive: fix width limitation bug. Impacted limitVideoWidth + setMaxVideoBitrate APIs


## v2.2.0 (2017-06-19)

### Added

  - position: add maximumBufferPosition to the positionUpdate event's payload to replace the previous "liveGap" from currentTimeChange event

### Bug fixes

  - upgrade to rxjs 5.4.1 to escape memory leak
  - position: "liveGap" from currentTimeChange event now means the difference to the maximum "bufferisable" position to keep compatibility with the old API


## v2.1.3 (2017-06-15)

### Bug fixes

  - api: fix timeFragment.start handling


## v2.1.2 (2017-06-14)

### Bug fixes

  - stream: the BUFFER_APPEND_ERROR error, happening when a SourceBuffer.appendBuffer failed for an unknown reason, is now a fatal error for audio/video segments
  - eme: fix rxjs timeout management which prevented from playing DRM-protected contents
  - api: add securities to avoid useless errors to be thrown when the player (already) encounter an error
  - position: fix bug which prevented to seek at the beginning of the content with the new api
  - position: fix typo which prevented to perform absolute seeks with the new api
  - buffer: automatically seek if there is discontinuity in a live stream
  - adaptive: take the lowest bitrate (instead of the initial/default one) when the player is not displayed/too small


## v2.1.1 (2017-06-02)

### Bug fixes

  - hotfix: fixed rxjs imports
  - hotfix: the player can now be imported through a commonjs require
  - hotfix: the player could not play if the video element's width was too short
  - manifest: segment id were not always the same on a segmentLoader and on the API calls.
  - adaptive: setVideoBitrate now throw a more meaningful error if no content is playing
  - adaptive: setAudioBitrate now throw a more meaningful error if no content is playing
  - language: setSubtitle now throw a more meaningful error if no content is playing
  - language: setLanguage now throw a more meaningful error if no content is playing
  - language: isLanguageAvailable do not throw and return false if no content is playing
  - language: isSubtitleAvailable do not throw and return false if no content is playing

### Other improvements

  - api: deprecated api now only warn once
  - tests: integration tests have been added
  - manifest: the manifest object and the management of its index has been refactored for future improvements


## v2.1.0 (2017-05-29)

### Added

- images/dash: add BIF support in DASH MPD
- subtitles/smooth: add support for closed captions in smooth manifest
- subtitles: add closed caption support in supplementaryTextTracks loadVideo arguments
- position: add getMinimumPosition and getMaximumPosition methods
- position: add startAt loadVideo argument (replace the timeFragment API)
- position: add positionUpdate event
- images: add getImageTrackData method
- images: add imageTrackUpdate event
- position: add possibility to use relative, absolute and wall-clock time on seekTo API
- transport: add segmentLoader transportOption for constructor and loadVideo API
- api: add setMaxAudioBitrate and setMaxVideoBitrate method
- api: add exitFullscreen method
- api: add ErrorTypes and ErrorCodes static properties
- api: add getPosition method
- api: add getWallClockTime method
- manifest: add getCurrentRepresentations method
- manifest: add getCurrentAdaptations method
- api: add throttleWhenHidden option to constructor (to disable throttling when the current page is hidden for an extended time)
- api: add limitVideoWidth option to constructor (to disable throttling to match the video element's width)
- api: add initialAudioBitrate and initialVideoBitrate to constructor's options
- api: add defaultTextTrack and defaultAudioTrack  to loadVideo and constructor's options
- languages: add getAvailableAudioTracks method with audio description support
- languages: add getAvailableTextTracks method with closed caption support
- languages: add getAudioTrack method with audio description support
- languages: add getTextTrack method with closed caption support
- languages: add setAudioTrack method with audio description support
- languages: add setTextTrack method with closed caption support
- audiotrack/dash: add audio description support in DASH MPD
- subtitles/dash: add closed captions support in DASH MPD
- subtitles/dash: add subtitles support in DASH MPD (only ttml for now)

### Deprecated

- position: the timeFragment API is deprecated (loadVideo's timeFragment argument, getStartTime, getEndTime and goToStart)
- api: currentTimeChange event is replaced by the positionUpdate event
- api: progress event is deprecated and not replaced
- api: getImageTrack is replaced by the imageTrackUpdate event
- api: loadVideo parameter subtitles is replaced by supplementaryTextTracks
- api: loadVideo parameter images is replaced by supplementaryImageTracks
- api: getVideoMaxBitrate is replaced by getMaxVideoBitrate
- api: getAudioMaxBitrate is replaced by getMaxAudioBitrate
- api: toggleDebug is deprecated and not replaced
- api: hideDebug is deprecated and not replaced
- api: showDebug is deprecated and not replaced
- api: getDebug is deprecated and not replaced
- api: asObservable is deprecated and not replaced
- api: getAverageBitrates is deprecated and not replaced
- api: getMetrics is deprecated and not replaced
- position: using seekTo with a Number argument is deprecated.
- position: getCurrentTime is deprecated in favor of getWallClockTime
- api: setVideoMaxBitrate is replaced by setMaxVideoBitrate
- api: setAudioMaxBitrate is replaced by setMaxAudioBitrate
- api: using setFullscreen(false) is replaced by exitFullscreen
- api: getErrorTypes method has been deprecated in favor of the ErrorTypes property
- api: getErrorCodes method has been deprecated in favor of the ErrorCodes property
- languages: initAudioBitrate option in constructor is deprecated in favor of initialAudioBitrate
- languages: initVideoBitrate option in constructor is deprecated in favor of initialVideoBitrate
- languages: defaultSubtitle option in constructor and loadVideo is deprecated in favor of defaultTextTrack
- languages: defaultLanguage option in constructor and loadVideo is deprecated in favor of defaultAudioTrack
- languages: getAvailableLanguages is deprecated in favor of getAvailableAudioTracks
- languages: getAvailableSubtitles is deprecated in favor of getAvailableTextTracks
- languages: getLanguage is deprecated in favor of getAudioTrack
- languages: getSubtitle is deprecated in favor of getTextTrack
- languages: isLanguageAvailable is deprecated and not replaced
- languages: isSubtitleAvailable is deprecated and not replaced
- languages: setLanguage is deprecated in favor of setAudioTrack
- languages: setSubtitle is deprecated in favor of setTextTrack

### Bug fixes

- adaptive: fix a bug where it was impossible to switch between multiple videos representations with the same width
- languages: fix bug where the user could switch to a closed caption track unknowngly
- languages: fix bug where the user could switch to an audio description track unknowngly
- manifest: improved and documented getManifest's return value
- manifest: defined and documented a generic manifest object structure (slowly replacing the old object).
- images: image playlists are now not re-fetched if the request failed (no retry)
- dash: lowered security time raising the startup time for SegmentTemplate-based contents
- api: getLanguage/getSubtitle returns now the language of the last chunk received, not the last set
- manifest: fixed manifest-refreshing logic (mainly for live contents)
- dash: fixed support for dash SegmentTimeline-based contents
- api: differentiate unset default languages from empty strings
- languages: handle undefined languages (to an empty string)
- api: allow the player to be instanciated with no option
- mp4: fix minor bugs with isobmff parsing
- images: keep externally-given BIF track when the manifest is refreshed
- timings: fix timeFragment arguments RegExp
- subtitles: fix webVTT management for unsupported user agents
- timings: fix calculation of the position and duration for non-dynamic contetns

### Other improvements

- documentation: The API documentation has been completely rewritten
- manifest: The DASH manifest handling has been refactored
- smooth: Smooth index handling has been completely separated from the DASH logic
- tests: fix and re-wrote unit tests
- documentation: Code documentation has been added
- demo: The Demo has been completely rewritten
- demo: The bundle has been removed from the code committed.


## v2.0.0-alpha1 (2016-02-09)

- RxJS: use RxJS5.beta1
- Promise: remove es6-promise dependency and stop relying completely
  on promises

- eme: improve IE11 and Edge support on EME
- smooth: activate patch in place on non IE targets for less memory allocation
- player: deprecate directFile api and skip MediaSource assert for directfile
- player: clone array for getAvailableBitrates methods
- player: fix when no adaptation or no representation
- player: record subtitle state as empty string
- buffer: start with buffer infos to cache infos asap
- stream: start stalling system after having first metadata
- refacto: clean pipelined objects and POO where needed

- lint: add new rules (no-var, prefer-const, enforce brackets)


## v1.4.0 (2016-01-26)

### Added

- buffer: add garbage collector
- player: emit currentTimeChange synchronously
- player: add {defaultLanguage,defaultSubtitle} api
- log: warn to info for some logs

### Bug fixes

- player: fix getAvailable* for direct files
- player: fix subtle race on loadedmetadata after retry
- eme: remove compat code for old chrome versions with eme flags
- eme: always ask for temporary session type
- eme: fix template error message
- eme: improve persistent license support and compat
- smooth: fix index timeline if no duration

Demo
----

- allow to pass query parameters


## v1.3.1 (2015-10-14)

### Bug fixes

- smooth: fix parseBoolean causing isLive to be always true


## v1.3.0 (2015-10-14)

### Added

- eme: license persistency support
- timings: add progress sampling
- compat: add firefox workaround for autoplay


## v1.2.1 (2015-09-23)

### Bug fixes

- stream: do not stall on loadedmetadata event


## v1.2.0 (2015-09-23)

This release introduces the use of ES6 classes for all modules that
depends on a sort of class hierarchy. It comes with an upgrade of
RxJSv3.1.1.

We also started using eslint as our main linter instead of jshint.

### Added

- smooth: customizable parser (7b50ce9)
- smooth: add application/smil as SAMI content-type (e0aa2bb)
- improve video start time by ticking on loadedmetadata (27bd43c)
- dash: incremental id from adaptations/representations (c24fecb)
- stream: discontinuity check on each stalled tick (3a5b796)


### Bug fixes

- fix missing new on Promise (4679632)
- compat: fix IE11 compat for setMediaKeys (2ccb11f)
- player: fix synchronous dispose on loadVideo (dc79bd1)
- pipelines: fix audio/video init segment caches (ea3422f)
- stream: remove initial seek hack (ae0ac23)
- player: fix getVideoLoaded/PlayedTime (63bf304)
- player: fix getUrl (577ce87)
- manifest: enforce id setting to parsers (927d275)


## v1.1.0 (2015-08-14)

### Added

- smoothstreaming transport support
- api for initial aubio/video bitrate choice
- simplify WebVTT support and implementation
- allow percentage values on start/end time values

### Bug fixes

- fix local buffer representation out-of-sync with native ones
- fix no retry for > 500 http codes
- fix no MediaKeySession reuse on Chrome
- fix quota error with MediaKeys attached to multiple video elements on Chrome


## v1.0.0 (2015-06-16)

Initial public release.
