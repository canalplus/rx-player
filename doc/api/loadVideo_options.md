# loadVideo options ############################################################


## Table of Contents ###########################################################

  - [Overview](#overview)
  - [Properties](#prop)
    - [transport](#prop-transport)
    - [url](#prop-url)
    - [keySystems](#prop-keySystems)
    - [autoPlay](#prop-autoPlay)
    - [startAt](#prop-startAt)
    - [transportOptions](#prop-transportOptions)
    - [defaultAudioTrack](#prop-defaultAudioTrack)
    - [defaultTextTrack](#prop-defaultTextTrack)
    - [textTrackMode](#prop-textTrackMode)
    - [textTrackElement](#prop-textTrackElement)
    - [supplementaryTextTracks](#prop-supplementaryTextTracks)
    - [supplementaryImageTracks](#prop-supplementaryImageTracks)
    - [hideNativeSubtitle](#prop-hideNativeSubtitle)
    - [networkConfig](#prop-networkConfig)



<a name="overview"></a>
## Overview ####################################################################

This page describes the options given to the ``loadVideo`` method, which is the
method to use to load a new video.

These options take the form of a single objects with multiple properties, like
this:
```js
// Setting the only two mandatory keys for a clear content (without DRM).
const options = {
  transport: "dash",
  url: myManifestUrl
};

player.loadVideo(options);
```



<a name="prop"></a>
## Properties ##################################################################


<a name="prop-transport"></a>
### transport ##################################################################

_type_: ``string|undefined``

The transport protocol used for this content.

Can be either:

  - ``"dash"`` - for DASH streams

  - ``"smooth"`` - for Microsoft Smooth Streaming streams

  - ``"directfile"`` - for loading a video in _DirectFile_ mode, which allows to
    directly play media files (example: ``.mp4`` or ``.webm`` files) without
    using a transport protocol.

    :warning: In that mode, multiple APIs won't have any effect.
    This is documented in the documentation of each concerned method, option or
    event in the API.

This property is mandatory.


<a name="prop-url"></a>
### url ########################################################################

_type_: ``string|undefined``

For Smooth or DASH contents, the URL to the manifest.

For _DirectFile_ mode contents, the URL of the content (the supported contents
depends on the current browser).

This property is mandatory.


<a name="prop-keySystems"></a>
### keySystems #################################################################

_type_: ``Array.<Object>|undefined``

This property is mandatory if the content uses DRM.
It is here that is defined every options relative to the encryption of your
content.

This property is an array of objects with the following properties (only
``type`` and ``getLicense`` are mandatory here):

  - ``type`` (``string``): name of the DRM system used. Can be either
    ``"widevine"``, ``"playready"`` or ``clearkey`` or the type (reversed domain
    name) of the keySystem (e.g. ``"com.widevine.alpha"``,
    ``"com.microsoft.playready"`` ...).

  - ``getLicense`` (``Function``): Callback which will be triggered everytime a
    message is sent by the Content Decryption Module (CDM), usually to
    fetch/renew the license.

    Gets two arguments when called:
      1. the message (``Uint8Array``): The message, formatted to an Array of
         bytes.
      2. the messageType (``string``): String describing the type of message
         received.
         There is only 4 possible message types, all defined in [the w3c
         specification](https://www.w3.org/TR/encrypted-media/#dom-mediakeymessagetype).

      This function should return either synchronously the license, `null` to
      not set a license for this `message` event or a Promise which should
      either:
        - resolves if the license was fetched, with the licence in argument
        - resolve with ``null`` if you do not want to set a license for this
          `message` event
        - reject if an error was encountered

      In any case, the license provided by this function should be of a
      ``BufferSource`` type (example: an ``Uint8Array`` or an ``ArrayBuffer``).

      Note: We set a 10 seconds timeout on this request. If the returned Promise
      do not resolve or reject under this limit, the player will stop with an
      error. If this limit is problematic for you, please open an issue.

  - ``serverCertificate`` (``BufferSource|undefined``): Eventual certificate
    used to encrypt messages to the license server.
    If set, we will try to set this certificate on the CDM. If it fails, we will
    still continue to try deciphering the stream (albeit a
    [warning](./errors.md) will be emitted in that case with the code
    ``"LICENSE_SERVER_CERTIFICATE_ERROR"``).

  - ``persistentLicense`` (``Boolean|undefined``): Set it to ``true`` if you
    want the ability to persist the license for later retrieval.
    In that case, you will also need to set the ``licenseStorage`` attribute to
    be able to persist the license through your preferred method. This is not
    needed for most usecases.

  - ``licenseStorage`` (``Object|undefined``): Required only if
    ``persistentLicense`` has been set to ``true``. It's an object containing
    two functions ``load`` and ``save``:
      - ``save``: take into argument an ``Array.<Object>`` which will be the set
        of sessionId to save. No return value needed.
      - ``load``: take no argument and returns the stored ``Array.<Object>``
        (the last given to ``save``) synchronously.

  - ``persistentStateRequired`` (``Boolean|undefined``): Set it to ``true`` if
    the chosen CDM should have the ability to persist a license, ``false`` if
    you don't care. This is not needed for most usecases. ``false`` by default.
    You do not have to set it to ``true`` if the ``persistentLicense`` option is
    set.

  - ``distinctiveIdentifierRequired`` (``Boolean|undefined``): When set to
    ``true``, the use of
    [Distinctive Indentifier(s)](https://www.w3.org/TR/encrypted-media/#distinctive-identifier)
    or
    [Distinctive Permanent Identifier(s)](https://www.w3.org/TR/encrypted-media/#uses-distinctive-permanent-identifiers)
    will be required. This is not needed for most usecases. ``false`` if you do
    not care. ``false`` by default.

  - ``throwOnLicenseExpiration`` (``Boolean|undefined``): `true` by default.

    If set to `true` or not set, the playback will be interrupted as soon as one
    of the current licenses expires. In that situation, you will be warned with
    an [``error`` event](./errors.md) with, as a payload, an error with the code
    `KEY_STATUS_CHANGE_ERROR`.

    If set to `false`, the playback of the current content will not be
    interrupted even if one of the current licenses is expired. It might however
    stop decoding in that situation.
    It's then up to you to update the problematic license, usually through the
    usual `getLicense` callback.

    You may want to set this value to `false` if a session expiration leads to
    a license renewal.
    In that case, content may continue to play once the license has been
    updated.

  - ``onKeyStatusesChange``: (``Function|undefined``): Not needed for most
    usecases.

    Triggered each time the key statuses of the current session
    changes, except for the following statuses (which throws immediately):
      - ``expired`` if (and only if) `throwOnLicenseExpiration` is not set to
        `false`
      - `internal-error`

    Takes 2 arguments:
    1. The keystatuseschange event ``{Event}``
    2. The session associated with the event ``{MediaKeySession}``

    Like ``getLicense``, this function should return a promise which emit a
    license or `null` (for no license) when resolved. It can also return
    directly the license or `null` if it can be done synchronously.

  - ``closeSessionsOnStop`` (``Boolean|undefined``): If set to ``true``, the
    ``MediaKeySession`` created for a content will be immediately closed when the
    content stops its playback. This might be required by your key system
    implementation (most often, it is not).

    If set to ``false`` or not set, the ``MediaKeySession`` can be reused if the
    same content needs to be re-decrypted.

#### Example

Example of a simple DRM configuration for widevine and playready DRMs:
```js
player.loadVideo({
  url: manifestURL,
  transport: "dash",
  keySystems: [{
    type: "widevine",
    getLicense(challenge) {
      // ajaxPromise is here an AJAX implementation doing a POST request on the
      // widevineLicenseServer with the challenge in its body.
      return ajaxPromise(widevineLicenseServer, challenge);
    }
  }, {
    type: "playready",
    getLicense(challenge) {
      // idem
      // Note: you may need to format the challenge before doing the request
      // depending on the server configuration.
      return ajaxPromise(playreadyLicenseServer, challenge);
    }
  }]
})
```


<a name="prop-autoPlay"></a>
### autoPlay ###################################################################

_type_: ``Boolean|undefined``

_defaults_: ``false``

If set to ``true``, the video will play immediately after being loaded.


<a name="prop-startAt"></a>
### startAt ####################################################################

_type_: ``Object|undefined``

``startAt`` allows to define a starting position in the played content whether
it is a live content or not.

This option is only defining the starting position, not the beginning of the
content. The user will then be able to navigate anywhere in the content through
the ``seekTo`` API.

If defined, this property must be an object containing a single key. This key
can be either:

  - ``position`` (``Number``): The starting position, in seconds.

  - ``wallClockTime`` (``Number|Date``): The starting wall-clock time (re-scaled
    position from manifest informations to obtain a timestamp on live contents),
    in seconds. Useful to use the type of time returned by the
    ``getWallClockTime`` API for live contents. If a Date object is given, it
    will automatically be converted into seconds.

  - ``fromFirstPosition`` (``Number``): relative position from the minimum
    possible one, in seconds.
    That is:
      - for live contents, from the beginning of the buffer depth (as defined
        by the manifest).
      - for non-live contents, from the position ``0`` (this option should be
        equivalent to ``position``)

  - ``fromLastPosition`` (``Number``): relative position from the maximum
    possible one, in seconds. Should be a negative number:
      - for live contents, it is the difference between the starting position
        and the live edge (as defined by the manifest)
      - for non-live contents, it is the difference between the starting
        position and the end position of the content.

  - ``percentage`` (``Number``): percentage of the wanted position. ``0`` being
    the minimum position possible (0 for static content, buffer depth for live
    contents) and ``100`` being the maximum position possible (``duration`` for
    static content, live edge for live contents).


Note: Only one of those properties will be considered, in the same order of
priority they are written here.

If the value set is inferior to the minimum possible position, the minimum
possible position will be used instead. If it is superior to the maximum
possible position, the maximum will be used instead as well.

#### Notes for live contents
For live contents, ``startAt`` could work not as expected:

  - Depending on the type of manifest, it will be more or less precize to guess
    the live edge of the content. This will mostly affect the
    ``fromLastPosition`` option.

  - If the manifest does not allow to go far enough in the past (not enough
    buffer, server-side) to respect the position wanted, the maximum buffer
    depth will be used as a starting time instead.

  - If the manifest does not allow to go far enough in the future (live edge
    sooner) to respect the position wanted, the live edge will be used to define
    the starting time instead.


If ``startAt`` is not set on live contents, the time suggested by the manifest
will be considered. If it is also not set, the initial position will be based on
the real live edge.

#### Example
```js
// using position
player.loadVideo({
  // ...
  startAt: {
    position: 10 // start at position == 10 (in seconds)
  }
});

// using wall-clock time
player.loadVideo({
  // ...
  startAt: {
    wallClockTime: Date.now() / 1000 - 60 // 1 minute before what's broadcasted
                                          // now
  }
});

// using fromFirstPosition
player.loadVideo({
  // ...
  startAt: {
    fromFirstPosition: 30 // 30 seconds after the beginning of the buffer
  }
})

// using fromLastPosition
player.loadVideo({
  // ...
  startAt: {
    fromLastPosition: -60 // 1 minute before the end (before the live edge
                          // for live contents)
  }
})
```


<a name="prop-transportOptions"></a>
### transportOptions ###########################################################

_type_: ``Object|undefined``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

Options concerning the "transport".

That is, the part of the code:
  - performing manifest and segment requests
  - parsing the manifest
  - parsing/updating/creating segments

This Object can contain multiple properties. Only those documented here are
considered stable:

  - ``segmentLoader`` (``Function``): defines a custom segment loader. More info
    on it can be found [here](./plugins.md#segmentLoader).

  - ``manifestLoader`` (``Function``): defines a custom manifest loader. More
    info on it can be found [here](./plugins.md#manifestLoader).

  - ``representationFilter`` (``Function``): defines a custom representation filter. More
    info on it can be found [here](./plugins.md#representationFilter).



<a name="prop-defaultAudioTrack"></a>
### defaultAudioTrack ##########################################################

_type_: ``Object|string|undefined``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

The starting default audio track.

This can be under the form of an object with the following properties:
```js
const defaultAudioTrack = {
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  audioDescription: false // {Boolean} Whether the audio track should be an
                          // audio description for the visually impaired
};
```
or under the form of the language string directly, in which case the
``"audioDescription"`` option is inferred to be false.
```js
// equivalent to the previous example
const defaultAudioTrack = "fra";
```

If the corresponding audio track is not found, the first track defined will be
taken instead.


<a name="prop-defaultTextTrack"></a>
### defaultTextTrack ###########################################################

_type_: ``Object|string|undefined``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

The starting default text track.

This can be under the form of an object with the following properties:
```js
const defaultTextTrack = {
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
};
```
or under the form of the language string directly, in which case the
``"closedCaption"`` option is inferred to be false:
```js
// equivalent to the previous example
const defaultTextTrack = "fra";
```

If the corresponding text track is not found, the first track defined will be
taken instead.


<a name="prop-textTrackMode"></a>
### textTrackMode ##############################################################

_type_: ``string``

_defaults_: ``"native"``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

This option allows to specify how the text tracks should be displayed.

There is two possible values:
  - ``"native"``
  - ``"html"``

In the default ``"native"`` mode, a ``<track>`` element will be created on the
video and the subtitles will be displayed by it, with a minimal style.
There is no action on your side, the subtitles will be correctly displayed at
the right time.

In ``"html"`` mode, the text tracks will be displayed on a specific HTML
element. This mode allows us to do much more stylisation, such as the one
defined by TTML styling attributes or SAMI's CSS. It is particularly useful to
correctly manage complex closed captions (with multiple colors, positionning
etc.).
With this mode, you will need to provide a wrapper HTML element with the
[textTrackElement option](#prop-textTrackElement).

All text track formats supported in ``"native"`` mode also work in ``"html"``
mode.

More infos on supported text tracks can be found in the [text track
documentation](./text_tracks.md).


<a name="prop-textTrackElement"></a>
### textTrackElement ###########################################################

_type_: ``HTMLElement``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

``textTrackElement`` is only required and used if you provided a ``"html"``
[textTrackMode](#prop-textTrackMode).

This property will be the element on which text tracks will be set, as child
elements, at the right time. We expect that this element is the exact same size
than the media element it applies to (this allows us to properly place the
subtitles position without polling where the video is in your UI).
You can however re-size or update the style of it as you wish, to better suit
your UI needs.


<a name="prop-supplementaryTextTracks"></a>
### supplementaryTextTracks ####################################################

_type_: ``Array.<Object>|Object|undefined``
_defaults_: ``[]``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

This option allows to specify informations about supplementary text tracks you
might want to add to those already declared in the manifest.

This only work under the following conditions:

  - the text track is not fragmented

  - the text track can be retrieved by fetching a single URL

  - the text track is in an understood format and enough informations has been
    given to infer it.

Each of those can have the following properties:
```js
const supplementaryTextTracks = [{
  url: textTrackURL, // {string} The url on which the complete text track can be
                     // obtained

  language: "eng", // {string} The language the text track is in
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)

                   // Note for SAMI subtitles:
                   // For SAMI subtitles, you have to provide the same language
                   // string than the one indicated in the CSS and p elements.
                   // It usually follows the ISO639-ISO3166 naming conventions
                   // (e.g. en-US or fr-FR).
                   // If we cannot find the provided language in the downloaded
                   // SAMI text track, it won't be displayed.

  closedCaption: false // {Boolean} Whether the text track is a closed caption
                       // for the hard of hearing

  mimeType: "application/mp4", // {string} A mimeType used to describe
                               // the text format. Can be "application/mp4" when
                               // encapsulated in an mp4 file. In that case, the
                               // "codecs" argument will be needed.

  codecs: "stpp"               // {string|undefined} Depending on the mimeType,
                               // you might need to add codec information.
                               // Here the mimeType is too generic, the codec
                               // helps us understand this is ttml in an mp4
                               // container
}];
```

To know which type of formats are supported and how to add them, you can read
the [text track documentation](./text_tracks.md).


<a name="prop-supplementaryImageTracks"></a>
### supplementaryImageTracks ###################################################

_type_: ``Array.<Object>|Object|undefined``
_defaults_: ``[]``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

This option allows to specify informations about supplementary image tracks you
might want to add to those already declared in the manifest.

This only work under the following conditions:

  - the image track is not fragmented

  - the image track can be retrieved by fetching a single URL

  - the image track is in an understood format and enough informations has been
    given to infer it.


Each of those can have the following properties:
```js
const supplementaryImageTracks = [{
  url: ImageTrackURL, // {string} The url on which the complete image track can
                      // be obtained

  mimeType: "application/bif", // {string} A mimeType used to describe
                               // the image format.
}];
```


<a name="prop-hideNativeSubtitle"></a>
### hideNativeSubtitle #########################################################

_type_: ``Boolean``

_defaults_: ``false``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

If set to ``true``, the eventual <track> element will be put on mode ``hidden``
when added to the video element, so it won't actually display the subtitles the
rx-player add to it.

This has an effect only if:

  - the current ``textTrackMode`` is equal to ``"native"`` (see [textTrackMode
    option](#prop-textTrackMode))

  - a text track is currently active

  - the text track format is understood by the rx-player



<a name="prop-networkConfig"></a>
### networkConfig ##############################################################

_type_: ``Object``

_defaults_: ``{}``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

Configuration linked to manifest and segment requests. This object can take the
following properties (all are optional):

  - ``segmentRetry`` (``Number``): Maximum number of times a segment request
    will be retried when an error happen - only on some condition [1].

    Those retry will be done with a progressive delay, to avoid overloading a
    CDN. When this count is reached, the player will stop and throw a fatal
    error.

    Defaults to ``4``.

  - ``manifestRetry`` (``Number``): Maximum number of times a manifest request
    will be retried when a request error happen - only on some condition [1].
    Defaults to ``4``.

    Those retry will be done with a progressive delay, to avoid overloading a
    CDN. When this count is reached, the player will stop and throw a fatal
    error.

    Defaults to ``4``.

  - ``offlineRetry`` (``Number``): Maximum number of times a request will be
    retried when the request fails because the user is offline.

    Those retry will be done with a progressive delay, to avoid overloading the
    user's ressources. When this count is reached, the player will stop and
    throw a fatal error.

    Defaults to ``Infinity``.

[1] To retry a request, one of the following condition should be met:

  - The request failed because of a ``404`` HTTP code

  - The request failed because of an HTTP code in the ``500`` family

  - The request failed because of a timeout

  - the request failed because of an unknown XHR error (might be a
    parsing/interface error)
