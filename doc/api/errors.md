# Player errors and warnings ###################################################


## Table of Contents ###########################################################

- [Overview](#overview)
- [Structure of an Error](#structure)
- [Types](#types)
    - [NETWORK_ERROR](#types-network_error)
    - [MEDIA_ERROR](#types-media_error)
    - [ENCRYPTED_MEDIA_ERROR](#types-encrypted_media_error)
    - [OTHER_ERROR](#types-other_error)
- [Codes](#codes)



<a name="overview"></a>
## Overview ####################################################################

Various errors can be triggered when playing a media content. Those can happen
when:
  - The network is unreachable
  - The codecs are not supported
  - We have no mean to decrypt the data
  - ...

Some errors can be fatal to content playback in which case they will stop the
player, others act more as warnings and are more along the line of a minor
problem notification.

You can know if a fatal error interrupted your playback by:

  - adding an event listener to the ``"error"`` event (see the [player events
    documentation](./player_events.md)). This event listener will take the error
    directly in argument.

  - calling the ``getError`` API if the current state is ``STOPPED``. If
    different from ``null``, it means that a fatal error happened (see the
    [documentation for getError](./index.md#meth-getError)).


You can also be warned of any non-fatal error by:

  - adding an event listener to the ``"warning"`` event (see the [player events
    documentation](./player_events.md)). The event listener will take the
    non-fatal error directly in argument.

All of those are in essence ``Error`` instances with added informations.

Those supplementary informations are described in this page.


<a name="structure"></a>
## Structure of an Error #######################################################

Each of RxPlayer's error objects have at least those properties:

  - ``type`` (``string``): A large category for the error
    (e.g. ``NETWORK_ERROR``, ``ENCRYPTED_MEDIA_ERROR`` ...)

  - ``code`` (``string``): A set identification "code" for the error encountered

  - ``message`` (``string``): A displayable, human-readable, summary of the
    error.

  - ``fatal`` (``boolean``): If true, the error was fatal. Meaning that the
    playback was interrupted by it




<a name="types"></a>
## Types #######################################################################

The types are the different strings you can have as the ``type`` property of an
error.

This chapter provides an exhaustive list of the possible type of error
encountered.


<a name="types-network_error"></a>
### NETWORK_ERROR ##############################################################

A NetworkError is any Network-related error (HTTP 404, request timeout...), they
all have a ``type`` property equal to ``"NETWORK_ERROR"``.

#### codes #####################################################################

A NetworkError can only have the following code (``code`` property):

  - ``"PIPELINE_LOAD_ERROR"``: the manifest or segment request failed.

#### more informations #########################################################

A NetworkError provide much more infos than this code.

Among its properties, you have:

  - ``url`` (``string``): The url the request has been on

  - ``xhr`` (``XMLHttpRequest``): The xhr associated with the request

  - ``status`` (``Number``): Shortcut to the status code of the xhr.

  - ``errorType`` (``string``): Further precision about what went wrong.

    This string can either be:
      - ``"TIMEOUT"``: The request timeouted.
      - ``"ERROR_EVENT"``: The XMLHttpRequest has sent an error event
      - ``"PARSE_ERROR"``: No data could have been extracted from this request
      - ``"ERROR_HTTP_CODE"``: The request finished with a status code not in
        the 2xx range.



<a name="types-media_error"></a>
### MEDIA_ERROR ################################################################

Error related to the media itself. It can both come from the player itself
(manifest parsing) or from the browser itself (content playback).

They all have a ``type`` property equal to ``"MEDIA_ERROR"``.

#### codes #####################################################################

A MediaError can have the following codes (``code`` property):

  - ``"BUFFER_APPEND_ERROR"``: A media segment could not have been added to the
    corresponding SourceBuffer. This often happens with malformed segments.

  - ``"BUFFER_FULL_ERROR"``: The needed segment could not have been added
    because the SourceBuffer was full.

  - ``"BUFFER_TYPE_UNKNOWN"``: The type of buffer considered (e.g. "audio" /
    "video" / "text") has no SourceBuffer implementation in your build.

  - ``"MANIFEST_INCOMPATIBLE_CODECS_ERROR"``: An "Adaptation" (DASH's
    AdaptationSet or Smooth's StreamIndex) has none of its "Representations"
    (read quality) in a supported codec.

  - ``"MANIFEST_PARSE_ERROR"``: Generic error to signal than the Manifest could
    not be parsed.

  - ``"MANIFEST_UNSUPPORTED_ADAPTATION_TYPE"``: One of the "Adaptation" (DASH's
    AdaptationSet or Smooth's StreamIndex) has a type (e.g. "audio", "text" or
    "video" which is not understood by the RxPlayer).

  - ``"MEDIA_ERR_ABORTED"``: A crucial browser-side fetching operation was
    aborted.

  - ``"MEDIA_ERR_DECODE"``: A pushed segment/media could not be decoded by the
    browser. This happens most-of-all with malformed segments.

  - ``"MEDIA_ERR_NETWORK"``: A browser-side request failed.

  - ``"MEDIA_ERR_SRC_NOT_SUPPORTED"``: The media associated to the video element
    is not valid.

  - ``"MEDIA_ERR_UNKNOWN"``: Media error impossible to characterize.

  - ``"MEDIA_KEYS_NOT_SUPPORTED"``: The current browser has no MediaKeys
    implementation and the content is encrypted.

  - ``"MEDIA_SOURCE_NOT_SUPPORTED"``: No known MediaSource API is supported by
    your browser and we need to create one.

  - ``"MEDIA_STARTING_TIME_NOT_FOUND"``: The provided or calculated starting
    time was not found in the corresponding media.



<a name="types-encrypted_media_error"></a>
### ENCRYPTED_MEDIA_ERROR ######################################################

Those errors are linked to the Encrypted Media Extensions. They concern various
DRM-related problems.

They all have a ``type`` property equal to ``"ENCRYPTED_MEDIA_ERROR"``.

#### codes #####################################################################

An EncryptedMediaError can have the following codes (``code`` property):

  - ``"INCOMPATIBLE_KEYSYSTEMS"``: None of the provided key systems was
    compatible with the current browser.

  - ``"INVALID_ENCRYPTED_EVENT"``: An encountered ``encrypted`` event was not
    valid.

  - ``"INVALID_KEY_SYSTEM"``: One of the given key system was not accepted by
      the RxPlayer.

  - ``"KEY_ERROR"``: The ``MediaKeySession`` emitted an error.

  - ``"KEY_GENERATE_REQUEST_ERROR"``: An error happened when calling the
    ``generateRequest`` API to generate a challenge.

  - ``"KEY_LOAD_ERROR"``: An error was returned by the code fetching the
    license.

  - ``"KEY_LOAD_TIMEOUT"``: The request for fetching the license had a duration
    of more than 10 seconds.

  - ``"KEY_STATUS_CHANGE_ERROR"``: An error was detected when the
    ``MediaKeySession`` emitted a keyStatuseschange event (e.g. the key
    became ``"expired"``).

  - ``"KEY_UPDATE_ERROR"``: An error was detected after a message (like a
    license was given to the CDM).

  - ``"LICENSE_SERVER_CERTIFICATE_ERROR"``: The server certificate of a
    ``MediaKeys`` could not be set.

  - ``"MEDIA_IS_ENCRYPTED_ERROR"``: The media is encrypted and no key system
    was given to the RxPlayer's APIs.



<a name="types-other_error"></a>
### OTHER_ERROR ################################################################

Those errors are various other errors which does not belong to other types.

They all have a ``type`` property equal to ``"OTHER_ERROR"``.

#### codes #####################################################################

An OtherError can have the following codes (``code`` property):

  - ``"PIPELINE_LOAD_ERROR"``: The manifest or segment request failed and the
    request has been done through a given callback (i.e. not the RxPlayer's
    XMLHttpRequest implementation).

  - ``"PIPELINE_PARSE_ERROR"``: The RxPlayer's manifest or segment parsing logic
    failed. This is most likely due to a malformed manifest or segment.

  - ``"NONE"``: The error cannot be characterized.
