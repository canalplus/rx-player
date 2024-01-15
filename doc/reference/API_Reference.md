# API reference

## Overview

This is the API reference which presents every RxPlayer API in a single page.

The point of this page is to provide an easier-to-navigate page than the [API
documentation](../api/Overview.md) for when you're already familiar with it.

API are splitted here in multiple categories depending on if they are
properties, methods, events and so on.


## Constructor

  - [`new RxPlayer()`](../api/Creating_a_Player.md#instantiation):
    Create a new RxPlayer.


## Constructor options

  - [`videoElement`](../api/Creating_a_Player.md#videoElement): specifies the
    media element on which the content will play.

  - [`baseBandwidth`](../api/Creating_a_Player.md#basebandwidth):
    Base value for the bandwidth calculated by the RxPlayer.

  - [`wantedBufferAhead`](../api/Creating_a_Player.md#wantedbufferahead):
    Set the default buffering goal.

  - [`maxBufferAhead`](../api/Creating_a_Player.md#maxbufferahead):
    Set the default maximum kept buffer ahead of the current position, in seconds.

  - [`maxBufferBehind`](../api/Creating_a_Player.md#maxbufferbehind):
    Set the default maximum kept buffer before the current position, in seconds.

  - [`maxVideoBufferSize`](../api/Creating_a_Player.md#maxvideobuffersize):
    Set the default maximum size the video buffer can take in the memory, in
    kilobytes (kb).

  - [`videoResolutionLimit`](../api/Creating_a_Player.md#videoresolutionlimit):
    Limit the maximum video resolution according to the element's or screen's
    resolution.

  - [`throttleVideoBitrateWhenHidden`](../api/Creating_a_Player.md#throttlevideobitratewhenhidden):
    Limit the maximum video bitrate when the current video is hidden to the
    user.


## `loadVideo` options

  - [`transport`](../api/Loading_a_Content.md#transport): The adaptive streaming
    technology (e.g. "dash", "smooth" etc.) used.

  - [`url`](../api/Loading_a_Content.md#url): URL to the content (e.g. DASH's
    MPD, Smooth's Manifest etc.)

  - [`keySystems`](../api/Decryption_Options.md#loadvideo_%60keysystems%60_options):
    DRM configuration for the content.

    - [`keySystems[].type`](../api/Decryption_Options.md#type): Name of the
      DRM technology wanted.

    - [`keySystems[].getLicense`](../api/Decryption_Options.md#getlicense):
      Logic to fetch the license.

    - [`keySystems[].getLicenseConfig`](../api/Decryption_Options.md#getlicenseconfig):
      Supplementary configuration linked to the `getLicense` function.

    - [`keySystems[].serverCertificate`](../api/Decryption_Options.md#servercertificate):
      Eventual certificate encrypting exchanges between the CDM and license
      server.

    - [`keySystems[].persistentLicenseConfig`](../api/Decryption_Options.md#persistentLicenseConfig):
      Allows to ask for the DRM session to persist the license.

    - [`keySystems[].onKeyExpiration`](../api/Decryption_Options.md#onkeyexpiration):
      Behavior when a key has an `"expired"` status.

    - [`keySystems[].onKeyOutputRestricted`](../api/Decryption_Options.md#onkeyoutputrestricted):
      Behavior when a key has an `"output-restricted"` status.

    - [`keySystems[].onKeyInternalError`](../api/Decryption_Options.md#onkeyinternalerror):
      Behavior when a key has an `"internal-error"` status.

    - [`keySystems[].maxSessionCacheSize`](../api/Decryption_Options.md#maxsessioncachesize):
      Maximum number of DRM sessions cached by the RxPlayer.

    - [`keySystems[].closeSessionsOnStop`](../api/Decryption_Options.md#closesessionsonstop):
      Closes DRM sessions when the content stops.

    - [`keySystems[].singleLicensePer`](../api/Decryption_Options.md#singlelicenseper):
      Allows to use a single `getLicense` call for keys linked to multiple
      qualities.

    - [`keySystems[].disableMediaKeysAttachmentLock`](../api/Decryption_Options.md#disablemediakeysattachmentlock):
      Disable a lock that may cause the RxPlayer to deadlock on encrypted
      contents on some peculiar devices.

    - [`keySystems[].distinctiveIdentifier`](../api/Decryption_Options.md#distinctiveidentifier):
      Allows the configuration of the [Distinctive
      Indentifier(s)](https://www.w3.org/TR/encrypted-media/#distinctive-identifier)
      property.

    - [`keySystems[].persistentState`](../api/Decryption_Options.md#persistentstate):
      Allows the configuration of the [persistentState](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-persistentstate)
      property.

    - [`keySystems[].audioCapabilitiesConfig`](../api/Decryption_Options.md#videocapabilitiesconfigaudiocapabilitiesconfig):
      Allows the configuration of the [`audioCapabilities`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-audiocapabilities)
      property.

    - [`keySystems[].videoCapabilitiesConfig`](../api/Decryption_Options.md#videocapabilitiesconfigaudiocapabilitiesconfig):
      Allows the configuration of the [`videoCapabilities`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-videocapabilities)
      property.


  - [`autoPlay`](../api/Loading_a_Content.md#autoplay):
    Allows to automatically play after a content is loaded.

  - [`startAt`](../api/Loading_a_Content.md#startat):
    Define the position at which the RxPlayer should start.

  - [`requestConfig`](../api/Loading_a_Content.md#requestconfig):
    Configuration linked to the Manifest and segment requests.

    - [`requestConfig.segment.maxRetry`](../api/Loading_a_Content.md#requestconfig):
      Maximum number of retries when a segment request fails.

    - [`requestConfig.segment.timeout`](../api/Loading_a_Content.md#requestconfig):
      Timeout after which segment requests are aborted.

    - [`requestConfig.manifest.maxRetry`](../api/Loading_a_Content.md#requestconfig):
      Maximum number of retries when a Manifest request fails.

    - [`requestConfig.manifest.timeout`](../api/Loading_a_Content.md#requestconfig):
      Timeout after which manifest requests are aborted.

  - [`textTrackMode`](../api/Loading_a_Content.md#texttrackmode):
    The way in which the text tracks should be displayed.

  - [`textTrackElement`](../api/Loading_a_Content.md#texttrackelement):
    `HTMLElement` in which text tracks should be displayed.

  - [`minimumManifestUpdateInterval`](../api/Loading_a_Content.md#minimummanifestupdateinterval):
    Allows to limit the frequency of Manifest updates.

  - [`initialManifest`](../api/Loading_a_Content.md#initialmanifest):
    Allows to provide an initial Manifest to speed-up the content loading

  - [`manifestUpdateUrl`](../api/Loading_a_Content.md#manifestupdateurl):
    Provide another URL, potentially to a shorter Manifest, used only for
    Manifest updates

  - [`representationFilter`](../api/Loading_a_Content.md#representationfilter):
    Filter out qualities from the Manifest based on its characteristics.

  - [`segmentLoader`](../api/Loading_a_Content.md#segmentloader):
    Provide a custom logic to fetch segments.

  - [`manifestLoader`](../api/Loading_a_Content.md#manifestloader):
    Provide a custom logic to fetch the Manifest.

  - [`onCodecSwitch`](../api/Loading_a_Content.md#oncodecswitch):
    Behavior when the codec changes between incompatible ones.

  - [`defaultAudioTrackSwitchingMode`](../api/Loading_a_Content.md#defaultaudiotrackswitchingmode):
    Default behavior when switching the audio track.

  - [`lowLatencyMode`](../api/Loading_a_Content.md#lowlatencymode):
    Allows to play low-latency contents efficiently.

  - [`enableFastSwitching`](../api/Loading_a_Content.md#enablefastswitching):
    Enable or disable an optimization replacing segments of poor quality with
    segments of a better quality.

  - [`checkMediaSegmentIntegrity`](../api/Loading_a_Content.md#checkmediasegmentintegrity):
    Enable supplementary checks to retry a request if a segment appears
    corrupted.

  - [`serverSyncInfos`](../api/Loading_a_Content.md#serversyncinfos):
    Provide time synchronization mechanism between the client and server.

  - [`referenceDateTime`](../api/Loading_a_Content.md#referencedatetime):
    Default offset to add to the segment's time to obtain a live time. This is
    in most cases not needed.


## Static methods

  - [`addFeatures`](../api/RxPlayer_Features.md):
    Add features to the RxPlayer (e.g.: multithreading, offline playback etc.).

## Methods

  - [`loadVideo`](../api/Loading_a_Content.md): Load a content.

  - [`getPlayerState`](../api/Basic_Methods/getPlayerState.md): Get the current
    player's state.

  - [`addEventListener`](../api/Basic_Methods/addEventListener.md): Add a
    listener to one of the RxPlayer's event.

  - [`removeEventListener`](../api/Basic_Methods/removeEventListener.md): Remove
    a listener to one of the RxPlayer's event.

  - [`play`](../api/Basic_Methods/play.md): Resume paused content.

  - [`pause`](../api/Basic_Methods/pause.md): Pause the current content.

  - [`stop`](../api/Basic_Methods/stop.md): Stop playing the current content.

  - [`getPosition`](../api/Basic_Methods/getPosition.md): Get the current
    playback condition.

  - [`getWallClockTime`](../api/Basic_Methods/getWallClockTime.md): Get the
    current playback condition offseted to be relative to the the current date.

  - [`seekTo`](../api/Basic_Methods/seekTo.md): Seek in the current content.

  - [`getMinimumPosition`](../api/Basic_Methods/getMinimumPosition.md): Get the
    minimum seekable position.

  - [`getMaximumPosition`](../api/Basic_Methods/getMaximumPosition.md): Get the
    maximum seekable position.

  - [`getMediaDuration`](../api/Basic_Methods/getMediaDuration.md): Get the
    duration linked to the media element.

  - [`getError`](../api/Basic_Methods/getError.md): Returns the current "fatal"
    error.

  - [`getVideoElement`](../api/Basic_Methods/getVideoElement.md): Returns the
    media element linked to the RxPlayer.

  - [`dispose`](../api/Basic_Methods/dispose.md): Dispose of most resources
    taken by the RxPlayer.

  - [`reload`](../api/Basic_Methods/reload.md): Reload the last loade content as
    fast as possible.

  - [`getAvailablePeriods`](../api/Basic_Methods/getAvailablePeriods.md): Returns
    the list of available Periods for the current content.

  - [`getCurrentPeriod`](../api/Basic_Methods/getCurrentPeriod.md): Returns
    information on the Period being currently played.

  - [`getAudioTrack`](../api/Track_Selection/getAudioTrack.md): Get information on
    the current audio track.

  - [`getTextTrack`](../api/Track_Selection/getTextTrack.md): Get information on
    the current text track.

  - [`getVideoTrack`](../api/Track_Selection/getVideoTrack.md): Get information on
    the current video track.

  - [`getAvailableAudioTracks`](../api/Track_Selection/getAvailableAudioTracks.md):
    Get information on all the available audio tracks.

  - [`getAvailableTextTracks`](../api/Track_Selection/getAvailableTextTracks.md):
    Get information on all the available text tracks.

  - [`getAvailableVideoTracks`](../api/Track_Selection/getAvailableVideoTracks.md):
    Get information on all the available video tracks.

  - [`setAudioTrack`](../api/Track_Selection/setAudioTrack.md):
    Set the current audio track.

  - [`setTextTrack`](../api/Track_Selection/setTextTrack.md):
    Set the current text track.

  - [`setVideoTrack`](../api/Track_Selection/setVideoTrack.md):
    Set the current video track.

  - [`disableTextTrack`](../api/Track_Selection/disableTextTrack.md):
    Disable the current text track.

  - [`disableVideoTrack`](../api/Track_Selection/disableVideoTrack.md):
    Disable the current video track.

  - [`getVideoRepresentation`](../api/Representation_Selection/getVideoRepresentation.md):
    Returns the currently-loading video Representation.

  - [`getAudioRepresentation`](../api/Representation_Selection/getAudioRepresentation.md):
    Returns the currently-loading audio Representation.

  - [`lockVideoRepresentations`](../api/Representation_Selection/lockAudioVideoRepresentations.md):
    Select video Representations (a.k.a. qualities) that should the only one
    being played.

  - [`lockAudioRepresentations`](../api/Representation_Selection/lockAudioVideoRepresentations.md):
    Select audio Representations (a.k.a. qualities) that should the only one
    being played.

  - [`unlockVideoRepresentations`](../api/Representation_Selection/unlockAudioVideoRepresentations.md):
    Disable a lock previously set with `lockVideoRepresentations`.

  - [`unlockAudioRepresentations`](../api/Representation_Selection/unlockAudioVideoRepresentations.md):
    Disable a lock previously set with `lockAudioRepresentations`.

  - [`getLockedVideoRepresentations`](../api/Representation_Selection/lockAudioVideoRepresentations.md):
    Get the list of currently "locked" video Representations (a.k.a. qualities).

  - [`getLockedAudioRepresentations`](../api/Representation_Selection/lockAudioVideoRepresentations.md):
    Get the list of currently "locked" audio Representations (a.k.a. qualities).

  - [`unlockVideoRepresentations`](../api/Representation_Selection/lockAudioVideoRepresentations.md):
    Deactivate potential pending video Representations (a.k.a. qualities) lock,
    thus re-allowing any Representation to being played.

  - [`unlockAudioRepresentations`](../api/Representation_Selection/lockAudioVideoRepresentations.md):
    Deactivate potential pending audio Representations (a.k.a. qualities) lock,
    thus re-allowing any Representation to being played.

  - [`isTrickModeEnabled`](../api/Track_Selection/isTrickModeEnabled.md):
    Returns `true` if trick mode tracks are currently enabled by default.

  - [`setPlaybackRate`](../api/Speed_Control/setPlaybackRate.md):
    Update the speed at which the content is played.

  - [`getPlaybackRate`](../api/Speed_Control/getPlaybackRate.md):
    Read the speed at which the content is played.

  - [`areTrickModeTracksEnabled`](../api/Speed_Control/areTrickModeTracksEnabled.md):
    Indicates if the tricmode tracks are active by default.

  - [`setVolume`](../api/Volume_Control/setVolume.md):
    Update the audio volume.

  - [`getVolume`](../api/Volume_Control/getVolume.md):
    Get the current audio volume.

  - [`mute`](../api/Volume_Control/mute.md):
    Mute the audio volume.

  - [`isMute`](../api/Volume_Control/isMute.md):
    Return `true` if the audio volume is set to `0`.

  - [`unMute`](../api/Volume_Control/unMute.md):
    Restore the volume as it was before it was muted.

  - [`setWantedBufferAhead`](../api/Buffer_Control/setWantedBufferAhead.md):
    Update the buffering goal, in seconds.

  - [`getWantedBufferAhead`](../api/Buffer_Control/getWantedBufferAhead.md):
    Get the current buffering goal, in seconds

  - [`setMaxBufferBehind`](../api/Buffer_Control/setMaxBufferBehind.md):
    Remove automatically old media data.

  - [`getMaxBufferBehind`](../api/Buffer_Control/getMaxBufferBehind.md):
    Get the current maximum kept buffer behind the current position, in seconds.

  - [`setMaxBufferAhead`](../api/Buffer_Control/setMaxBufferAhead.md):
    Remove automatically media data too far ahead.

  - [`getMaxBufferAhead`](../api/Buffer_Control/getMaxBufferAhead.md):
    Get the current maximum kept buffer ahead of the current position, in seconds.

  - [`setMaxVideoBufferSize`](../api/Buffer_Control/setMaxVideoBufferSize.md):
    Set the maximum memory the video buffer can take up in the memory, in
    kilobytes.

  - [`getMaxVideoBufferSize`](../api/Buffer_Control/getMaxVideoBufferSize.md):
    Get the maximum memory the video buffer can take up in the memory, in
    kilobytes.

  - [`updateContentUrls`](../api/Playback_Information/updateContentUrls.md):
    Update URL(s) of the content currently being played.

  - [`isLive`](../api/Playback_Information/isLive.md):
    Returns `true` if the content is a "live" content.

  - [`getKeySystemConfiguration`](../api/Playback_Information/getKeySystemConfiguration.md):
    Returns information on the key system currently attached to the
    HTMLMediaElement linked to the RxPlayer.

  - [`getCurrentBufferGap`](../api/Playback_Information/getCurrentBufferGap.md):
    Returns in seconds the difference between the current position and the end
    of the current media time range.

  - [`getContentUrls`](../api/Playback_Information/getContentUrls.md):
    Get URLs of the currently-played content.

  - [`isBuffering`](../api/Playback_Information/isBuffering.md):
    Returns `true` if the player is buffering.

  - [`isPaused`](../api/Playback_Information/isPaused.md):
    Returns `true` if the `<video>` element is paused.

  - [`isContentLoaded`](../api/Playback_Information/isContentLoaded.md):
    Returns `true` if a content is loaded.

  - [`getLastStoredContentPosition`](../api/Playback_Information/getLastStoredContentPosition.md):
    Returns the last stored content position, in seconds.

  - [`createDebugElement`](../api/Miscellaneous/Debug_Element.md):
    Display a RxPlayer-specialized debugging element.

## Static Properties

  - [`version`](../api/Static_Properties.md#version):
    The current version of the RxPlayer.

  - [`LogLevel`](../api/Static_Properties.md#loglevel):
    Update the verbosity of the RxPlayer logger.

  - [`ErrorTypes`](../api/Static_Properties.md#errortypes):
    All Error types that can be encountered.

  - [`ErrorCodes`](../api/Static_Properties.md#errorcodes):
    All Error codes that can be encountered.

## Events

  - [`playerStateChange`](../api/Player_Events.md#playerstatechange):
    The current state of the player has changed.

  - [`error`](../api/Player_Events.md#error):
    A fatal error happened.

  - [`warning`](../api/Player_Events.md#warning):
    A non-fatal error happened.

  - [`positionUpdate`](../api/Player_Events.md#positionupdate):
    Regular event about the current position evolving.

  - [`seeking`](../api/Player_Events.md#seeking):
    A seek operation began.

  - [`seeked`](../api/Player_Events.md#seeked):
    A seek operation ended.

  - [`availableAudioTracksChange`](../api/Player_Events.md#availableaudiotrackschange):
    The list of available audio tracks changed.

  - [`availableVideoTracksChange`](../api/Player_Events.md#availablevideotrackschange):
    The list of available video tracks changed.

  - [`availableTextTracksChange`](../api/Player_Events.md#availabletexttrackschange):
    The list of available text tracks changed.

  - [`audioTrackChange`](../api/Player_Events.md#audiotrackchange):
    The current audio track changed.

  - [`videoTrackChange`](../api/Player_Events.md#videotrackchange):
    The current video track changed.

  - [`textTrackChange`](../api/Player_Events.md#texttrackchange):
    The current text track changed.

  - [`periodChange`](../api/Player_Events.md#periodchange):
    A new Period begins.

  - [`newAvailablePeriods`](../api/Player_Events.md#newavailableperiods):
    New Periods associated to the current content are known. It is also now
    possible to change their respective tracks and qualities.

  - [`volumeChange`](../api/Player_Events.md#volumechange):
    Characteristics of the currently set volume changed.

  - [`brokenRepresentationsLock`](../api/Player_Events.md#brokenrepresentationslock):
    Representations previously being locked was automatically unlocked by the
    RxPlayer.

  - [`autoTrackSwitch`](../api/Player_Events.md#autotrackswitch):
    A track previously set was automatically changed by the RxPlayer.

  - [`decipherabilityUpdate`](../api/Player_Events.md#decipherabilityupdate):
    A Representation's decipherability status has been updated.

  - [`play`](../api/Player_Events.md#play):
    Emitted when playback is no longer consider paused.

  - [`pause`](../api/Player_Events.md#pause):
    Emitted when playback is now consider paused.

  - [`inbandEvents`](../api/Player_Events.md#inbandevents):
    Events in the media have been encountered.

  - [`streamEvent`](../api/Player_Events.md#streamevent):
    A "stream event" just started.

  - [`streamEventSkip`](../api/Player_Events.md#streameventskip):
    A "stream event" was just skipped.

## Error types

  - [`NETWORK_ERROR`](../api/Player_Errors.md#network_error):
    A network-related error.

  - [`MEDIA_ERROR`](../api/Player_Errors.md#media_error):
    A media-related error.

  - [`ENCRYPTED_MEDIA_ERROR`](../api/Player_Errors.md#encrypted_media_error):
    An error related to media decryption.

  - [`OTHER_ERROR`](../api/Player_Errors.md#other_error):
    Another non-categorized error.

## Tools

  - [`TextTrackRenderer`](../api/Tools/TextTrackRenderer.md):
    Render external text tracks on top of the video.

  - [`VideoThumbnailLoader`](../api/Tools/VideoThumbnailLoader.md):
    Display seeking preview thumbnails from trick mode video tracks.

  - [`StringUtils`](../api/Tools/StringUtils.md):
    Various string conversion utils.

  - [`parseBifThumbnails`](../api/Tools/parseBifThumbnails.md):
    Parse thumbnails in the "BIF" format.

  - [`MediaCapabilitiesProber`](../api/Tools/MediaCapabilitiesProber.md):
    Tool to probe several media-related browser APIs.

  - [`createMetaplaylist`](../api/Tools/createMetaplaylist.md):
    Generate a MetaPlaylist content.
