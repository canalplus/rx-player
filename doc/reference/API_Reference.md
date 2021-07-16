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

  - [`initialVideoBitrate`](../api/Creating_a_Player.md#initialvideobitrate):
    Ceil value for the initial video bitrate wanted.

  - [`initialAudioBitrate`](../api/Creating_a_Player.md#initialaudiobitrate):
    Ceil value for the initial audio bitrate wanted.

  - [`minVideoBitrate`](../api/Creating_a_Player.md#minvideobitrate):
    Minimum video bitrate reachable through adaptive streaming.

  - [`minAudioBitrate`](../api/Creating_a_Player.md#minaudiobitrate):
    Minimum audio bitrate reachable through adaptive streaming.

  - [`maxVideoBitrate`](../api/Creating_a_Player.md#maxvideobitrate):
    Maximum video bitrate reachable through adaptive streaming.

  - [`maxAudioBitrate`](../api/Creating_a_Player.md#maxaudiobitrate):
    Maximum audio bitrate reachable through adaptive streaming.

  - [`wantedBufferAhead`](../api/Creating_a_Player.md#wantedbufferahead):
    Set the default buffering goal.

  - [`preferredAudioTracks`](../api/Creating_a_Player.md#preferredaudiotracks):
    Set default audio tracks preferences based on tracks characteristics.

  - [`preferredTextTracks`](../api/Creating_a_Player.md#preferredtexttracks):
    Set default text tracks preferences based on tracks characteristics.

  - [`preferredVideoTracks`](../api/Creating_a_Player.md#preferredvideotracks):
    Set default video tracks preferences based on tracks characteristics.

  - [`maxBufferAhead`](../api/Creating_a_Player.md#maxbufferahead):
    Set the default maximum kept buffer ahead of the current position, in seconds.

  - [`maxBufferBehind`](../api/Creating_a_Player.md#maxbufferbehind):
    Set the default maximum kept buffer before the current position, in seconds.

  - [`maxVideoBufferSize`](../api/Creating_a_Player.md#maxvideobuffersize):
    Set the default maximum size the video buffer can take in the memory, in
    kilobytes (kb).

  - [`limitVideoWidth`](../api/Creating_a_Player.md#limitvideowidth):
    Limit the maximum video width according to the video element's current width.

  - [`throttleVideoBitrateWhenHidden`](../api/Creating_a_Player.md#throttlevideobitratewhenhidden):
    Limit the maximum video bitrate when the current video is hidden to the
    user.

  - [`throttleWhenHidden`](../api/Creating_a_Player.md#throttlewhenhidden):
    [Deprecated] Limit the maximum video bitrate when the current video is
    hidden to the user.

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

    - [`keySystems[].persistentLicense`](../api/Decryption_Options.md#persistentlicense):
      Allows to ask for the DRM session to persist the license.

    - [`keySystems[].licenseStorage`](../api/Decryption_Options.md#licensestorage):
      Allows to ask for the DRM session to persist the license.

    - [`keySystems[].fallbackOn`](../api/Decryption_Options.md#fallbackon):
      Allows to fallback to another quality when a key is refused.

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

    - [`keySystems[].distinctiveIdentifierRequired`](../api/Decryption_Options.md#distinctiveidentifierrequired):
      Allows the configuration of the [Distinctive
      Indentifier(s)](https://www.w3.org/TR/encrypted-media/#distinctive-identifier)
      property.

    - [`keySystems[].persistentStateRequired`](../api/Decryption_Options.md#persistentstaterequired):
      Allows the configuration of the [persistentState](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-persistentstate)
      property.

    - [`keySystems[].throwOnLicenseExpiration`](../api/Decryption_Options.md#throwonlicenseexpiration):
      Allows to stop or not when the current license has expired.

    - [`keySystems[].onKeyStatusesChange`](../api/Decryption_Options.md#onkeystatuseschange):
      Callback triggered when on of the key's [status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
      is updated.

  - [`autoPlay`](../api/Loading_a_Content.md#autoplay):
    Allows to automatically play after a content is loaded.

  - [`startAt`](../api/Loading_a_Content.md#startat):
    Define the position at which the RxPlayer should start.

  - [`transportOptions`](../api/Loading_a_Content.md#transportoptions):
    Options relative to the current "transport".

    - [`transportOptions.minimumManifestUpdateInterval`](../api/Loading_a_Content.md#transportoptions):
      Allows to limit the frequency of Manifest updates.

    - [`transportOptions.initialManifest`](../api/Loading_a_Content.md#transportoptions):
      Allows to provide an initial Manifest to speed-up the content loading

    - [`transportOptions.manifestUpdateUrl`](../api/Loading_a_Content.md#transportoptions):
      Provide another URL, potentially to a shorter Manifest, used only for
      Manifest updates

    - [`transportOptions.representationFilter`](../api/Loading_a_Content.md#transportoptions):
      Filter out qualities from the Manifest based on its characteristics.

    - [`transportOptions.segmentLoader`](../api/Loading_a_Content.md#transportoptions):
      Provide a custom logic to fetch segments.

    - [`transportOptions.manifestLoader`](../api/Loading_a_Content.md#transportoptions):
      Provide a custom logic to fetch the Manifest.

    - [`transportOptions.checkMediaSegmentIntegrity`](../api/Loading_a_Content.md#transportoptions):
      Enable supplementary checks to retry a request if a segment appears
      corrupted.

    - [`transportOptions.serverSyncInfos`](../api/Loading_a_Content.md#transportoptions):
      Provide time synchronization mechanism between the client and server.

    - [`transportOptions.aggressiveMode`](../api/Loading_a_Content.md#transportoptions):
      Allows to ask to download the segments early.

    - [`transportOptions.referenceDateTime`](../api/Loading_a_Content.md#transportoptions):
      Default offset to add to the segment's time to obtain a live time. This is
      in most cases not needed.

  - [`textTrackMode`](../api/Loading_a_Content.md#texttrackmode):
    The way in which the text tracks should be displayed.

  - [`textTrackElement`](../api/Loading_a_Content.md#texttrackelement):
    `HTMLElement` in which text tracks should be displayed.

  - [`audioTrackSwitchingMode`](../api/Loading_a_Content.md#audiotrackswitchingmode):
    Behavior when switching the audio track.

  - [`manualBitrateSwitchingMode`](../api/Loading_a_Content.md#manualbitrateswitchingmode):
    Behavior when switching manually the video or audio quality.

  - [`onCodecSwitch`](../api/Loading_a_Content.md#oncodecswitch):
    Behavior when the codec changes between incompatible ones.

  - [`lowLatencyMode`](../api/Loading_a_Content.md#lowlatencymode):
    Allows to play low-latency contents efficiently.

  - [`networkConfig`](../api/Loading_a_Content.md#networkconfig):
    Configuration linked to the Manifest and segment requests.

    - [`networkConfig.segmentRetry`](../api/Loading_a_Content.md#networkconfig):
      Maximum number of retries when a segment request fails.

    - [`networkConfig.manifestRetry`](../api/Loading_a_Content.md#networkconfig):
      Maximum number of retries when a Manifest request fails.

    - [`networkConfig.offlineRetry`](../api/Loading_a_Content.md#networkconfig):
      Maximum number of retries when a Manifest or segment request fails due to
      the user being offline.

  - [`enableFastSwitching`](../api/Loading_a_Content.md#enablefastswitching):
    Enable or disable an optimization replacing segments of poor quality with
    segments of a better quality.

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

  - [`getMediaElement`](../api/Basic_Methods/getMediaElement.md): Returns the
    media element linked to the RxPlayer.

  - [`dispose`](../api/Basic_Methods/dispose.md): Dispose of most resources
    taken by the RxPlayer.

  - [`reload`](../api/Basic_Methods/reload.md): Reload the last loade content as
    fast as possible.

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

  - [`setPreferredAudioTracks`](../api/Track_Selection/setPreferredAudioTracks.md):
    Update the current audio tracks preferences.

  - [`setPreferredTextTracks`](../api/Track_Selection/setPreferredTextTracks.md):
    Update the current text tracks preferences.

  - [`setPreferredVideoTracks`](../api/Track_Selection/setPreferredVideoTracks.md):
    Update the current video tracks preferences.

  - [`getPreferredAudioTracks`](../api/Track_Selection/getPreferredAudioTracks.md):
    Return the current audio tracks preferences.

  - [`getPreferredTextTracks`](../api/Track_Selection/getPreferredTextTracks.md):
    Return the current text tracks preferences.

  - [`getPreferredVideoTracks`](../api/Track_Selection/getPreferredVideoTracks.md):
    Return the current video tracks preferences.

  - [`isTrickModeEnabled`](../api/Track_Selection/isTrickModeEnabled.md):
    Returns `true` if trick mode tracks are currently enabled by default.

  - [`getVideoBitrate`](../api/Bitrate_Selection/getVideoBitrate.md):
    Returns the bitrate of the current video quality.

  - [`getAudioBitrate`](../api/Bitrate_Selection/getAudioBitrate.md):
    Returns the bitrate of the current audio quality.

  - [`getAvailableVideoBitrates`](../api/Bitrate_Selection/getAvailableVideoBitrates.md):
    Returns all available bitrates for the current video track.

  - [`getAvailableAudioBitrates`](../api/Bitrate_Selection/getAvailableAudioBitrates.md):
    Returns all available bitrates for the current audio track.

  - [`setVideoBitrate`](../api/Bitrate_Selection/setVideoBitrate.md):
    Set the bitrate for the current video track.

  - [`setAudioBitrate`](../api/Bitrate_Selection/setAudioBitrate.md):
    Set the bitrate for the current audio track.

  - [`getManualVideoBitrate`](../api/Bitrate_Selection/getManualVideoBitrate.md):
    Returns the last video bitrate manually set.

  - [`getManualAudioBitrate`](../api/Bitrate_Selection/getManualAudioBitrate.md):
    Returns the last audio bitrate manually set.

  - [`setMinVideoBitrate`](../api/Bitrate_Selection/setMinVideoBitrate.md):
    Set the minimum video bitrate reachable through adaptive streaming.

  - [`setMinAudioBitrate`](../api/Bitrate_Selection/setMinAudioBitrate.md):
    Set the minimum audio bitrate reachable through adaptive streaming.

  - [`setMaxVideoBitrate`](../api/Bitrate_Selection/setMaxVideoBitrate.md):
    Set the maximum video bitrate reachable through adaptive streaming.

  - [`setMaxAudioBitrate`](../api/Bitrate_Selection/setMaxAudioBitrate.md):
    Set the maximum audio bitrate reachable through adaptive streaming.

  - [`getMinVideoBitrate`](../api/Bitrate_Selection/getMinVideoBitrate.md):
    Returns the minimum video bitrate reachable through adaptive streaming.

  - [`getMinAudioBitrate`](../api/Bitrate_Selection/getMinAudioBitrate.md):
    Returns the minimum audio bitrate reachable through adaptive streaming.

  - [`getMaxVideoBitrate`](../api/Bitrate_Selection/getMaxVideoBitrate.md):
    Returns the maximum video bitrate reachable through adaptive streaming.

  - [`getMaxAudioBitrate`](../api/Bitrate_Selection/getMaxAudioBitrate.md):
    Returns the maximum audio bitrate reachable through adaptive streaming.

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

  - [`getCurrentBufferGap`](../api/Buffer_Information/getCurrentBufferGap.md):
    Returns in seconds the difference between the current position and the end
    of the current media time range.

  - [`getUrl`](../api/Content_Information/getUrl.md):
    Get URL of the currently-played content.

  - [`isLive`](../api/Content_Information/isLive.md):
    Returns `true` if the content is a "live" content.

  - [`getCurrentKeySystem`](../api/Content_Information/getCurrentKeySystem.md):
    Returns the name of the current key system.

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

  - [`availableAudioBitratesChange`](../api/Player_Events.md#availableaudiobitrateschange):
    The list of available audio bitrates changed.

  - [`availableVideoBitratesChange`](../api/Player_Events.md#availablevideobitrateschange):
    The list of available video bitrates changed.

  - [`audioBitrateChange`](../api/Player_Events.md#audiobitratechange):
    The current audio bitrate changed.

  - [`videoBitrateChange`](../api/Player_Events.md#videobitratechange):
    The current video track changed.

  - [`bitrateEstimationChange`](../api/Player_Events.md#bitrateestimationchange):
    A new bitrate estimate is available.

  - [`periodChange`](../api/Player_Events.md#periodchange):
    A new Period begins.

  - [`decipherabilityUpdate`](../api/Player_Events.md#decipherabilityupdate):
    A Representation's decipherability status has been updated.

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
