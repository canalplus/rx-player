# loadVideo options

## Table of Contents

  - [Overview](#overview)
  - [Properties](#prop)
    - [url](#prop-url)
    - [transport](#prop-transport)
    - [transportOptions](#prop-transportOptions)
    - [keySystems](#prop-keySystems)
    - [autoPlay](#prop-autoPlay)
    - [startAt](#prop-startAt)
    - [defaultAudioTrack](#prop-defaultAudioTrack)
    - [defaultTextTrack](#prop-defaultTextTrack)
    - [supplementaryTextTracks](#prop-supplementaryTextTracks)
    - [supplementaryImageTracks](#prop-supplementaryImageTracks)
    - [hideNativeSubtitle](#prop-hideNativeSubtitle)

## <a name="overview"></a>Overview

This page describes the options given to the ``loadVideo`` method, which is the method to use to load a new video.

These options take the form of a single objects with multiple properties, like this:
```js
// Setting the only two mandatory keys for a clear content (without DRM).
// (NOTE: if a transport has already been set on instantiation, it is not
// mandatory here anymore)
const options = {
  url: myManifestUrl,
  transport: "dash"
};

player.loadVideo(options);
```

## <a name="overview"></a>Properties

### <a name="prop-url"></a>url

_type_: ``string|undefined``

Url of the smooth/DASH manifest. This is the only mandatory property if a ``transport`` has been set on instantiation. Else, ``url`` and ``transport`` are the only two needed properties to play a content without DRM.

### <a name="prop-transport"></a>transport

_type_: ``string|undefined``

The transport used for this content. Can be either:
  - ``"dash"`` - for DASH streams
  - ``"smooth"`` - for Microsoft Smooth Streaming streams

This property is mandatory only if no default ``transport`` property was set on instantiation.

### <a name="prop-transportOptions"></a>transportOptions

_type_: ``Object|undefined``

Options concerning the "transport".
That is, the part of the code:
  - performing manifest and segment requests
  - parsing the manifest
  - parsing/updating/creating segments

This Object can contain multiple properties. Only those documented here are considered stable:
  - ``segmentLoader`` (``Function``): defines a custom segment loader. More info on it can be found [here](./plugins.md#segmentLoader).

### <a name="prop-keySystems"></a>keySystems

_type_: ``Array.<Object>|undefined``

This property is mandatory if the content uses DRM.

This property is an array of objects with the following properties (only ``type`` and ``getLicense`` are mandatory here):
  - ``type`` (``string``): the type of keySystem used (e.g. ``"widevine"``, ``"playready"`` ...)

  - ``getLicense`` (``Function``): Callback which will be triggered everytime a message is sent by the Content Decryption Module (CDM), usually to fetch/renew the license.

    Gets two arguments when called:
      1. the message (``Uint8Array``): The message, formatted to an Array of bytes.
      2. the messageType (``string``): String describing the type of message received. There is only 4 possible message types, all defined in [the w3c specification](https://www.w3.org/TR/encrypted-media/#dom-mediakeymessagetype).

      This function should return either synchronously the license, or a Promise which:
      - resolves if the license was fetched, with the licence in argument

      - reject if an error was encountered

      In any case, the license provided by this function should be of a ``BufferSource`` type (example: an ``Uint8Array`` or an ``ArrayBuffer``).

      Note: We set a 10 seconds timeout on this request. If the returned Promise do not resolve or reject under this limit, the player will stop with an error. If this limit is problematic for you, please open an issue.

  - ``serverCertificate`` (``BufferSource|undefined``): Eventual certificate used to encrypt messages to the license server.
    If set, we will try to set this certificate on the CDM. If it fails, we will still continue (albeit a warning will be emitted) to try deciphering the stream (the getLicense API will be triggered etc.).

  - ``persistentLicense`` (``Boolean|undefined``)

  - ``licenseStorage`` (``Object|undefined``): Required if ``persistentLicense`` has been set to ``true``. It's an object containing two functions ``load`` and ``save``.

  - ``persistentStateRequired`` (``Boolean|undefined``)

  - ``distinctiveIdentifierRequired`` (``Boolean|undefined``): When set to ``true``, the use of [Distinctive Indentifier(s)](https://www.w3.org/TR/encrypted-media/#distinctive-identifier) or [Distinctive Permanent Identifier(s)](https://www.w3.org/TR/encrypted-media/#uses-distinctive-permanent-identifiers) will be required. This is not needed for most usecases.

  - ``onKeyStatusesChange``: (``Function|undefined``)

#### Example

Example of a simple DRM configuration for widevine and playready DRMs:
```js
player.loadVideo({
  url: manifestURL,
  transport: "dash", // or "smooth"
  keySystems: [{
    type: "widevine",
    getLicense(challenge) {
      return ajaxPromise(widevineLicenseServer, challenge);
    }
  }, {
    type: "playready",
    getLicense(challenge) {
      return ajaxPromise(playreadyLicenseServer, challenge);
    }
  }]
})
```

### <a name="prop-autoPlay"></a>autoPlay

_type_: ``Array.<Boolean>|undefined``

_defaults_: ``false``

If set to ``true``, the video will play immediately after being loaded.

The player state will also go consecutively from ``"LOADED"`` to ``"PLAYING"``.

### <a name="prop-startAt"></a>startAt

_type_: ``Object|undefined``

``startAt`` allows to define a starting position in the played content whether it is a live content or not.

This option is only defining the starting position, not the beginning of the content. The user will then be able to navigate anywhere in the content through the ``seekTo`` API.

If defined, this property must be an object containing a single key. This key can be either:
  - ``position`` (``Number``): The starting position, in seconds.
  - ``wallClockTime`` (``Number|Date``): The starting wall-clock time (re-scaled position from manifest informations to obtain a timestamp on live contents), in seconds. Useful to use the type of time returned by the ``getWallClockTime`` API for live contents. If a Date object is given, it will automatically be converted into seconds.
  - ``fromFirstPosition`` (``Number``): relative position from the minimum possible one, in seconds.
    That is:
      - for live contents, from the beginning of the buffer depth (as defined by the manifest).
      - for non-live contents, from the position ``0`` (this option should be equivalent to ``position``)
  - ``fromLastPosition`` (``Number``): relative position from the maximum possible one, in seconds. Should be a negative number:
      - for live contents, it is the difference between the starting position and the live edge (as defined by the manifest)
      - for non-live contents, it is the difference between the starting position and the end position of the content.
  - ``percentage`` (``Number``): percentage of the wanted position. ``0`` being the minimum position possible (0 for static content, buffer depth for live contents) and ``100`` being the maximum position possible (``duration`` for static content, live edge for live contents).

Note: Only one of those properties will be considered, in the same order of priority they are written here.

If the value set is inferior to the minimum possible position, the minimum possible position will be used instead. If it is superior to the maximum possible position, the maximum will be used instead as well.

#### Notes for live contents

For live contents, ``startAt`` could work not as expected:
  - Depending on the type of manifest, it will be more or less precize to guess the live edge of the content. This will mostly affect the ``fromLastPosition`` option.
  - If the manifest does not allow to go far enough in the past (not enough buffer, server-side) to respect the position wanted, the maximum buffer depth will be used as a starting time instead.
  - If the manifest does not allow to go far enough in the future (live edge sooner) to respect the position wanted, the live edge will be used to define the starting time instead.

If ``startAt`` is not set on live contents, the time suggested by the manifest will be considered. If it is also not set, the initial position will be based on the real live edge.

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

### <a name="prop-defaultAudioTrack"></a>defaultAudioTrack

_type_: ``Object|string|undefined``

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
or under the form of the language string directly, in which case the ``"audioDescription"`` option is inferred to be false.

Note that this option can also be set in the constructor. If both set in the constructor and for ``loadVideo``, the ``loadVideo`` option will be used.

### <a name="prop-defaultTextTrack"></a>defaultTextTrack

_type_: ``Object|string|undefined``

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
or under the form of the language string directly, in which case the ``"closedCaption"`` option is inferred to be false.

Note that this option can also be set in the constructor. If both set in the constructor and for ``loadVideo``, the ``loadVideo`` option will be used.

### <a name="prop-supplementaryTextTracks"></a>supplementaryTextTracks

_type_: ``Array.<Object>|Object|undefined``
_defaults_: ``[]``

This option allows to specify informations about supplementary text tracks you might want to
add to those already declared in the manifest.

This only work under the following conditions:
  - the text track is not fragmented
  - the text track can be retrieved by fetching a single URL
  - the text track is in an understood format and enough informations has been given to infer it.

Each of those can have the following properties:
```js
const supplementaryTextTracks = [{
  url: textTrackURL, // {string} The url on which the complete text track can be
                     // obtained

  language: "eng", // {string} The language the text track is in
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)

  closedCaption: false // {Boolean} Whether the text track is a closed caption
                       // for the hard of hearing

  mimeType: "application/mp4", // {string} A mimeType used to describe
                               // the text format.

  codecs: "stpp"               // {string|undefined} Depending on the mimeType,
                               // you might need to add codec information.
                               // Here the mimeType is too generic, the codec
                               // helps us understand this is ttml in an mp4
                               // container
}];
```

### <a name="prop-supplementaryImageTracks"></a>supplementaryImageTracks

_type_: ``Array.<Object>|Object|undefined``
_defaults_: ``[]``

This option allows to specify informations about supplementary image tracks you might want to
add to those already declared in the manifest.

This only work under the following conditions:
  - the image track is not fragmented
  - the image track can be retrieved by fetching a single URL
  - the image track is in an understood format and enough informations has been given to infer it.

Each of those can have the following properties:
```js
const supplementaryImageTracks = [{
  url: ImageTrackURL, // {string} The url on which the complete image track can
                      // be obtained

  mimeType: "application/bif", // {string} A mimeType used to describe
                               // the image format.
}];
```

### <a name="prop-hideNativeSubtitle"></a>hideNativeSubtitle

_type_: ``Array.<Boolean>|undefined``
_defaults_: ``false``

If set to ``true``, the eventual <track> element will be put on mode ``hidden`` when added to the video element, so it won't actually display the subtitles the rx-player add to it.

This has an effect only if:
  - a text track is currently active
  - the text track format is understood by the rx-player

This option can be useful if you want to set your own logic to display the video subtitles. In that case, you can just use the <track> element (``getNativeTextTrack`` method or ``nativeTextTrackChange`` event) and its events.
