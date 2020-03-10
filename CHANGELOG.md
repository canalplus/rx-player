# Changelog

## v3.19.0 (2020/03/11)

### Features

  - dash: handle multiple URL per segment anounced through multiple BaseURL elements in the MPD
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


## v3.18.0 (2020/01/30)

### Features

  - directfile: support most audio tracks API when playing a directfile content
  - directfile: support most text tracks API when playing a directfile content
  - directfile: support most video tracks API when playing a directfile content
  - api: add `seeking` and `seeked` events which anounce the beginning and end of a seek, even when seeking to an already buffered part
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


## v3.17.1 (2019/12/20)

### Bug fixes

  - dash/metaplaylist: fix infinite rebuffering issue when refreshing multi-Period contents under specific conditions
  - buffer: be less aggressive when garbage collecting subtitles (if the maxBufferAhead/maxBufferBehind options are set) to avoid useful subtitles being removed
  - directfile/compat: for directfile contents, trigger directly the LOADED state on iOS/iPad/iPod browsers as those are not preloaded there

### Other improvements

  - demo: display clickable "play" button on the video element when autoplay is blocked due to browser policies - to help users unlock the situation
  - demo: add "Other" key system to allow specifying a custom key system in the demo page


## v3.17.0 (2019/12/09)

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
 - dash: avoid requesting an inexistant segment when downloading a multi-Period DASH content with a number-based SegmentTemplate with the `agressiveMode` option set to `true`
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



## v3.16.1 (2019/10/03)

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
  - dash: Be more tolerant of differences between a segment's time anounced by the Manifest and the reality to avoid multiple cases of segment re-downloading
  - dash: Guess initialization range for segments defined in a SegmentBase without an Initialization element
  - dash: Throw better error when a sidx with a reference_type `1` is encountered
  - api: Throw a better error when setting a `preferredAudioTracks` or `preferredTextTracks` value in the wrong format
  - demo: Allow to export and share demo links with custom contents
  - demo: Fix video track switching in the demo page
  - demo: Fix spinner not hiding when playing on very specific conditions
  - demo: reset playback rate before loading a content


## v3.16.0 (2019/09/16)

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


## v3.15.1 (2019/08/07)

### Bug fixes

  - api: fix `networkConfig.segmentRetry` `loadVideo` option. Due to a typo, it was forced to the default value (4)
  - api/abr: when the `throttleVideoBitrateWhenHidden` option is set to true, wait 60 seconds (as documented) after the page is hidden before switching to a lower bitrate
  - dash: fix segment indexing for SegmentList-based MPD with a period start different than 0

### Other improvements

  - dash/smooth: check if the segment should still be available before retrying it (avoid unnecessary HTTP 404 errors)
  - dash/smooth: the Manifest can now be refreshed due to unexpected 404 HTTP errors on a segment request (only on particular conditions)
  - dash: better handle segments overlapping multiple periods by using the data that is only within the concerned Period's bounds
  - demo: authorize to play stored contents with an HTTP Manifest in the HTTPS demo


## v3.15.0 (2019/07/24)

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


## v3.14.0 (2019/06/26)

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


## v3.13.0 (2019/05/15)

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


## v3.12.0 (2019/04/10)

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


## v3.11.1 (2019/03/11)

### Bug fixes

  - npm: publish package again. An error in the previous release led to some files missing on npm


## v3.11.0 (2019/03/07)

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


## v3.10.3 (2019/01/30)

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


## v3.10.2 (2019/01/08)

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


## v3.10.1 (2019/01/03)

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


## v3.10.0 (2018/12/11)

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


## v3.9.3 (2018/11/23)

### Bug fixes

  - compat: fix `undefined Object.values function` issue happening in some older browsers (mainly encountered in IE11 and old webkit versions)
  - compat: remove side-effects relative to DRM on Safari
  - tools: fix issue about an undefined Array.prototype.find method in some older browsers when calling mediaCapabilitiesProber.getCompatibleDRMConfigurations (mainly encountered in IE11)

### Other improvements

  - eme: activate MediaKeys caching on Edge
  - compat: add in our validation process a ban of methods and functions unavailable in older browsers
  - tests/smooth: reinforce our Smooth Streaming integration tests


## v3.9.2 (2018/11/14)

### Bug fixes

  - smooth: authorize empty tracks ("StreamIndex") in Smooth manifests


## v3.9.1 (2018/11/13)

### Bug fixes

  - smooth: fix issue preventing emergency manifest updates
  - dash: fix timeout for minimumUpdatePeriod in cases where the time at which the manifest was last requested is not known (like when setting a customManifestLoader argument)

### Other improvements

  - smooth: keep supplementary segment information when updating the manifest
  - smooth: when updating segment information, perform garbage-collection of those concerning unreachable segments


## v3.9.0 (2018/11/08)

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


## v3.8.1 (2018/10/17)

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


## v3.8.0 (2018/10/11)

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


## v3.7.0 (2018/09/21)

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


## v3.6.1 (2018/09/03)

### Bug fixes

  - directfile: send ``LOADED`` event again for directfile contents - thanks @Fnatte
  - dash: don't merge "main" AdaptationSet if they are not of a video type
  - eme: fix bug which prevented the ``closeSessionsOnStop`` keySystem option to work properly
  - typescript: export types compatible with project references


### Other improvements

  - directfile/tests: add basic directfile integration tests
  - build: update to Babel 7
  - rxjs: update to RxJS 6.3.1


## v3.6.0 (2018/08/24)

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


## v3.5.2 (2018/08/06)

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


## v3.5.1 (2018/07/11)

### Bug fixes

  - parsers: fix wrong computation of segment time in template index
  - abr: get concerned request in starvation mode

## v3.5.0 (2018/07/03)

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


## v3.4.1 (2018/05/31)

### Bug fixes

  - buffer: fix several bugs happening when calling ``endOfStream`` to announce the end of the current content. Especially prevalent on Chrome.
  - net: use redirected URL as a base for further requests when the manifest request led to a HTTP redirect.
  - vtt/srt: ignore silently (do not throw) when an unknown block has been detected in a vtt or srt file
  - vtt/srt: support styling spans (like b, i and u XML tags) spanning multiple lines
  - api: ``getAvailableTextTracks`` and ``getAvailableAudioTracks`` now always return an array (and never null) as anounced in the API documentation
  - api: set default log level to ``"NONE"`` instead of ``"INFO"``
  - misc: remove development-only code from the non-minified code

### Other improvements

  - misc: move some dev dependencies from ``dependencies`` to ``devDependencies`` in ``package.json``


## v3.4.0 (2018/05/17)

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


## v3.3.2 (2018/04/17)

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


## v3.3.1 (2018/03/13)

### Bug Fixes

 - misc: fix missing browser API on IE11
 - buffer: end correctly streams which experienced a custom sourcebuffer (text/image) crash

### Other improvements

 - tools: support development on windows


## v3.3.0 (2018/03/05)

### Added

  - api: add directfile API to allow the playback of files natively managed by the browser

### Bug Fixes

 - api: fix player state when seeking after the video ended
 - text/api: fix getTextTrack API which could return the current audio track instead
 - text: clean-up custom HTML text track SourceBuffer's buffered when the text track is disabled


## v3.2.0 (2018/02/23)

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


## v3.1.0 (2018/01/30)

### Added

  - api: add ``networkConfig`` to ``loadVideo`` options
  - eme: add ``closeSessionsOnStop`` to the ``keySystems`` ``loadVideo`` option

### Bug Fixes

  - dash: fix Range request ranges for representations based on a SegmentList index
  - smooth: allows smooth Manifests for non-live contents to begin at a timestamp != 0


## v3.0.7 (2018/01/19)

### Bug fixes

  - eme: fix bug which prevented to play encrypted contents on IE11


## v3.0.6 (2018/01/11)

### Bug Fixes

  - buffer: fix issue which could led to multiple video or audio segments being downloaded at the same time
  - dash/text: support MPD AdaptationSet with a "caption" Role as text Adaptations
  - dash/text: remove offset set for subtitles on live contents, which led to unsynchronized subtitles
  - dash: fix issue which could led to segments being re-downloaded too much in a SegmentTemplate scheme

### Other improvements

  - demo: set "html" textTrackMode by default to have a better stylization of closed captions.


## v3.0.5 (2017/12/11)

### Bug Fixes

  - eme: consider unknown errors (e.g. errors coming from the user of the library) as fatal eme errors


## v3.0.4 (2017/12/05)

### Bug Fixes

  - text/webvtt: authorize header options without parsing them
  - text/webvtt: authorize timestamps without hours

### Other improvements

  - misc: remove multiple unneeded assertions in DEV mode
  - misc: update DEV mode default debug level from DEBUG to INFO


## v3.0.3 (2017/11/24)

### Bug Fixes

  - text/ttml: apply correctly a style if directly set on an attribute
  - eme: load new video even if the last EME clean-up failed

### Other improvements

  - misc: set better work arround for typescript issue [20104](https://github.com/Microsoft/TypeScript/issues/20104) to make building npm scripts usable again
  - tools: update the update-version npm script
  - demo: ``npm run start`` and ``npm run standalone`` now build the rx-player in the "development" environment
  - tools: add more logs in DEBUG mode


## v3.0.2 (2017/11/17)

### Bug Fixes

  - misc: work around typescript issue [20104](https://github.com/Microsoft/TypeScript/issues/20104) temporarly to launch in Chrome in HTTP


## v3.0.1 (2017/11/17)

### Bug Fixes

  - abr: adopt a less agressive strategy to avoid re-bufferings
  - smooth: avoid most of the manifest refresh requests

### Other improvements

  - Switch codebase to TypeScript
  - Add Travis CI


## v3.0.0 (2017/11/10)

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
