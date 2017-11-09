# Changelog

## Unreleased

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
