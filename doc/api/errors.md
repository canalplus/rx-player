# Player errors and warnings

## Table of Contents

- [Overview](#overview)
- [Structure of an Error](#structure)
- [Types](#types)
    - [NETWORK_ERROR](#types-NETWORK_ERROR)
    - [MEDIA_ERROR](#types-MEDIA_ERROR)
    - [ENCRYPTED_MEDIA_ERROR](#types-ENCRYPTED_MEDIA_ERROR)
    - [INDEX_ERROR](#types-INDEX_ERROR)
    - [OTHER_ERROR](#types-OTHER_ERROR)
- [Codes](#codes)

## <a name="overview"></a>Overview

Various errors can happen when playing a media content:
  - The network is unreachable
  - The codecs are not supported
  - We have no mean to decrypt the date
  - ...

Some errors can be fatal to content playback and will stop the player, other can be managed.

You can know which fatal error interrupted your playback either by:
  - adding an event listener to the ``"error"`` event (see the [player events documentation](./player_events.md)).
  - calling the ``getError`` API if the current state is ``STOPPED``. If different from ``null``, it means that a fatal error happened (see the [documentation for getError](./index.md#meth-getError)).

You can also know any non-fatal error as they happen by:
  - adding an event listener to the ``"warning"`` event (see the [player events documentation](./player_events.md)).

All of those will return a JavaScript ``Error`` instance, with added informations described in this page.

## <a name="structure"></a>Structure of an Error

Each error linked to playback has at least those properties:
  - ``type`` (``string``): A large category for the error (e.g. ``NETWORK_ERROR``, ``ENCRYPTED_MEDIA_ERROR`` ...)
  - ``code`` (``string``): A set identification "code" for the error encountered
  - ``message`` (``string``): A displayable summary of the error. Human-readable.

The same ``code`` can be associated with multiple ``type`` values.

## <a name="types"></a>Types

The types are the different strings you can have as the ``type`` property of an error. Here is the exhaustive list of them:

### <a name="types-network_error"></a>NETWORK_ERROR

Network-related error (timeout, bad http code).

To give more informations about the problem, those error have a `reason` attribuwith the following properties:
  - ``url`` (``string``): The url the request has been on
  - ``xhr`` (``XMLHttpRequest``): The xhr associated with the request
  - ``status`` (``Number``): Shortcut to the status code of the xhr.
  - ``type`` (``string``): A sub-category for the request error.

    Those sub-categories can either be:
      - ``"TIMEOUT"``: the request timeouted
      - ``"ERROR_EVENT"``: the xhr emitted an ``"error"`` event.
      - ``"ERROR_HTTP_CODE"``: The xhr finished on a HTTP code not in the 200 range.
      - ``"PARSE_ERROR"``: We had a problem while immediately parsing the response.

### <a name="types-media_error"></a>MEDIA_ERROR

Error related to the media itself. It can both come from the player itself (manifest parsing) or from the browser itself (content playback).

### <a name="types-encrypted_media_error"></a>ENCRYPTED_MEDIA_ERROR

Those errors are linked to the Encrypted Media Extensions. They concern various DRM-related problems

### <a name="types-index_error"></a>INDEX_ERROR

Those errors are specific to the index, which is the place in the manifest describing how to access wanted segments.

The different possible problems are not being able to parse this index or asking for segment which are either after or before the limits of it.

### <a name="types"-other_error></a>OTHER_ERROR

Those errors are:
  - a fallback for non-categorized errors
  - pipelines error which are not related to requests

## <a name="codes"></a>Codes

The codes are the string you can have as a ``code`` property in a playback error. Here is a list of them:
  - ``"PIPELINE_RESOLVE_ERROR"``
  - ``"PIPELINE_LOAD_ERROR"``
  - ``"PIPELINE_PARSING_ERROR"``
  - ``"MANIFEST_PARSE_ERROR"``
  - ``"MANIFEST_INCOMPATIBLE_CODECS_ERROR"``
  - ``"LICENSE_SERVER_CERTIFICATE_ERROR"``
  - ``"MEDIA_IS_ENCRYPTED_ERROR"``
  - ``"KEY_ERROR"``
  - ``"KEY_STATUS_CHANGE_ERROR"``
  - ``"KEY_UPDATE_ERROR"``
  - ``"KEY_LOAD_ERROR"``
  - ``"KEY_LOAD_TIMEOUT"``
  - ``"INCOMPATIBLE_KEYSYSTEMS"``
  - ``"BUFFER_APPEND_ERROR"``
  - ``"BUFFER_FULL_ERROR"``
  - ``"BUFFER_INDEX_ERROR"``
  - ``"BUFFER_TYPE_UNKNOWN"``
  - ``"MEDIA_ERR_ABORTED"``
  - ``"MEDIA_ERR_NETWORK"``
  - ``"MEDIA_ERR_DECODE"``
  - ``"MEDIA_ERR_SRC_NOT_SUPPORTED"``
  - ``"MEDIA_SOURCE_NOT_SUPPORTED"``
  - ``"MEDIA_KEYS_NOT_SUPPORTED"``
  - ``"OUT_OF_INDEX_ERROR"``
  - ``"UNKNOWN_INDEX"``
