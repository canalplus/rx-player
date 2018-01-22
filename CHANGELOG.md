# Changelog

## v2.4.1 (2018/01/22)

## v2.4.0 (2017/11/23)

### Bug Fixes

  - smooth: allows smooth Manifests for non-live contents to begin at a timestamp != 0

### Added

  - eme: add closeSessionsOnStop to the keySystems option

### Bug Fixes

  - eme: fix EME problems on Edge when playing multiple crypted streams with the same instance

## v2.3.2 (2017/07/25)

### Bug Fixes

  - eme: update EME workflow to improve support (especially chromebooks)

## v2.3.1 (2017/07/10)

### Bug Fixes

  - buffer: improve buffer ranges "bookeeping" logic to avoid re-downloading the same segments

## v2.3.0 (2017/07/07)

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

## v2.2.1 (2017/06/27)

### Bug fixes

  - adaptive: fix width limitation bug. Impacted limitVideoWidth + setMaxVideoBitrate APIs

## v2.2.0 (2017/06/19)

### Added

  - position: add maximumBufferPosition to the positionUpdate event's payload to replace the previous "liveGap" from currentTimeChange event

### Bug fixes

  - upgrade to rxjs 5.4.1 to escape memory leak
  - position: "liveGap" from currentTimeChange event now means the difference to the maximum "bufferisable" position to keep compatibility with the old API

## v2.1.3 (2017/06/15)

### Bug fixes

  - api: fix timeFragment.start handling

## v2.1.2 (2017/06/14)

### Bug fixes

  - stream: the BUFFER_APPEND_ERROR error, happening when a SourceBuffer.appendBuffer failed for an unknown reason, is now a fatal error for audio/video segments
  - eme: fix rxjs timeout management which prevented from playing DRM-protected contents
  - api: add securities to avoid useless errors to be thrown when the player (already) encounter an error
  - position: fix bug which prevented to seek at the beginning of the content with the new api
  - position: fix typo which prevented to perform absolute seeks with the new api
  - buffer: automatically seek if there is discontinuity in a live stream
  - adaptive: take the lowest bitrate (instead of the initial/default one) when the player is not displayed/too small

## v2.1.1 (2017/06/02)

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

## v2.1.0 (2017/05/29)

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

## v2.0.0-alpha1 (2016/02/09)

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

## v1.4.0 (2016/01/26)

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

## v1.3.1 (2015/10/14)

### Bug fixes

- smooth: fix parseBoolean causing isLive to be always true

## v1.3.0 (2015/10/14)

### Added

- eme: license persistency support
- timings: add progress sampling
- compat: add firefox workaround for autoplay

## v1.2.1 (2015/09/23)

### Bug fixes

- stream: do not stall on loadedmetadata event

## v1.2.0 (2015/09/23)

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

## v1.1.0 (2015/08/14)

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

## v1.0.0 (2015/06/16)

Initial public release.
