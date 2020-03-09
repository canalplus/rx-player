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
    - [textTrackMode](#prop-textTrackMode)
    - [textTrackElement](#prop-textTrackElement)
    - [manualBitrateSwitchingMode](#prop-manualBitrateSwitchingMode)
    - [lowLatencyMode](#prop-lowLatencyMode)
    - [supplementaryImageTracks](#prop-supplementaryImageTracks)
    - [hideNativeSubtitle](#prop-hideNativeSubtitle)
    - [networkConfig](#prop-networkConfig)
    - [supplementaryTextTracks (deprecated)](#prop-supplementaryTextTracks)
    - [defaultAudioTrack (deprecated)](#prop-defaultAudioTrack)
    - [defaultTextTrack (deprecated)](#prop-defaultTextTrack)


<a name="overview"></a>
## Overview ####################################################################

This page describes the options given to the ``loadVideo`` method, which is the
method to use to load a new video.

These options take the form of a single objects with multiple properties, like
this:
```js
// Simply loading a DASH MPD
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
This property is mandatory.

Can be either:

  - ``"dash"`` - for DASH contents

  - ``"smooth"`` - for Microsoft Smooth Streaming contents

  - ``"directfile"`` - for loading a video in _DirectFile_ mode, which allows to
    directly play media files (example: ``.mp4`` or ``.webm`` files) without
    using a transport protocol. With that option, you can even play HLS
    contents on multiple browsers (mainly safari and iOS browsers).

    :warning: In that mode, multiple APIs won't have any effect.
    This is documented in the documentation of each concerned method, option or
    event in the API.

  - ``"metaplaylist"`` for [MetaPlaylist](./metaplaylist.md) streams, which are
    a concatenation of multiple smooth and DASH contents

  - `"local"` for [local manifests](./local_manifest.md), which allows to play
    downloaded DASH, Smooth or MetaPlaylist contents (when offline for example).

Example:
```js
// play some dash content
rxPlayer.loadVideo({
  transport: "dash",
  url: https://www.example.com/dash.mpd
})
```


<a name="prop-url"></a>
### url ########################################################################

_type_: ``string|undefined``

For Smooth, DASH or MetaPlaylist contents, the URL to the
[Manifest](../terms.md#manifest) (or equivalent)

For _DirectFile_ mode contents, the URL of the content (the supported contents
depends on the current browser).

This property is mandatory unless a `manifestLoader` is defined in the
[transportOptions](#prop-transportOptions), in which case that callback will be
called instead any time we want to load the Manifest.

Example:
```js
// play some dash content
rxPlayer.loadVideo({
  url: https://www.example.com/dash.mpd,
  transport: "dash"
})
```


<a name="prop-keySystems"></a>
### keySystems #################################################################

_type_: ``Array.<Object>|undefined``

This property is mandatory if the content uses DRM.

It is here that is defined every options relative to the encryption of your
content. There's a lot of configuration possible here. In the case you find
this documentation hard to grasp, we've written a [tutorial on DRM configuration
here](../tutorials/contents_with_DRM.md).

This property is an array of objects with the following properties (only
``type`` and ``getLicense`` are mandatory here):

  - __type__ (``string``): name of the DRM system used. Can be either
    ``"widevine"``, ``"playready"`` or ``clearkey`` or the type (reversed domain
    name) of the keySystem (e.g. ``"com.widevine.alpha"``,
    ``"com.microsoft.playready"`` ...).

  - __getLicense__ (``Function``): Callback which will be triggered everytime a
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
        - reject if an error was encountered.

      Note: We set a 10 seconds timeout by default on this request (configurable
      through the `getLicenseConfig` object).
      If the returned Promise do not resolve or reject under this limit, the
      player will stop with an error.

      In any case, the license provided by this function should be of a
      ``BufferSource`` type (example: an ``Uint8Array`` or an ``ArrayBuffer``).

      Even in case of an error, you can (this is not mandatory) set any of the
      following properties on the rejected value which will be interpreted by
      the RxPlayer:

        - `noRetry` (`Boolean`): If set to `true`, we will throw directly a
          `KEY_LOAD_ERROR` to call `getLicense`. If not set or set to `false`,
          the current retry parameters will be applied (see `getLicenseConfig`)

        - `message` (`string`): If the `message` property is set as a "string",
          this message will be set as the `message` property of the
          corresponding `EncryptedMediaError` (either communicated through an
          `"error"` event if we're not retrying or through a `"warning"` event
          if we're retrying).
          As every other `getLicense`-related errors, this error will have the
          `KEY_LOAD_ERROR` `code` property.

        - `fallbackOnLastTry`: If this getLicense is the last retry (if the
          `noRetry` property is set to `true`, this is always true), we will not
          throw immediately but rather try to fallback on other Representations
          (e.g. qualities) which might have a different decryption key. If no
          Representation is left, we will throw a MediaError with a
          `NO_PLAYABLE_REPRESENTATION` code, as documented [in the errors
          documentation](./errors.md#types-media_error).

          You will receive a `decipherabilityUpdate` event when we fallback from
          a given Representation. You can find documentation on this event [in
          the corresponding chapter of the events
          documentation](./player_events.md#events-decipherabilityUpdate).

          This option is thus only useful for contents depending on multiple
          licenses.

          When fallbacking, we might need to reload the current MediaSource,
          leading to a black screen during a brief instant. When reloading, the
          RxPlayer will have the `"reloading"` [player state](./states.md).
          on most situations, we will however not reload the media source but
          only perform a very little seek (of some milliseconds). you might see
          the stream stutter for a very brief instant at that point.

          On the Edge browser, we found an issue that can arise when this option
          is set if PlayReady is used. This issue can make the player loads the
          content indefinitely.
          Sadly, no work-around has been found for now for this issue. We're
          currently trying to create a reproducible scenario and document that
          issue so it can hopefully be fixed in the future. In the meantime,
          you're encouraged either to use Widevine (only on Chromium-based Edge)
          or to not make use of the `fallBackOnLastTry` option on that browser.

  - __getLicenseConfig__ (`Object|undefined`): Optional configuration for the
    `getLicense` callback. Can contain the following properties:
       - `retry` (`Number`|`undefined`) (default: `2`): number of time
         `getLicense` is retried on error or on timeout before we fail on a
         `KEY_LOAD_ERROR`
       - `timeout` (`Number`|`undefined`) (default: `10000`): timeout, in ms,
         after which we consider the `getLicense` callback to have failed.

         Set it to `-1` to disable any timeout.

  - __serverCertificate__ (``BufferSource|undefined``): Eventual certificate
    used to encrypt messages to the license server.
    If set, we will try to set this certificate on the CDM. If it fails, we will
    still continue to try deciphering the content (albeit a
    [warning](./errors.md) will be emitted in that case with the code
    ``"LICENSE_SERVER_CERTIFICATE_ERROR"``).

  - __persistentLicense__ (``Boolean|undefined``): Set it to ``true`` if you
    want the ability to persist the license for later retrieval.
    In that case, you will also need to set the ``licenseStorage`` attribute to
    be able to persist the license through your preferred method. This is not
    needed for most usecases.

  - __licenseStorage__ (``Object|undefined``): Required only if
    ``persistentLicense`` has been set to ``true``. It's an object containing
    two functions ``load`` and ``save``:
      - ``save``: take into argument an ``Array.<Object>`` which will be the set
        of sessionId to save. No return value needed.
      - ``load``: take no argument and returns the stored ``Array.<Object>``
        (the last given to ``save``) synchronously.

  - __persistentStateRequired__ (``Boolean|undefined``): Set it to ``true`` if
    the chosen CDM should have the ability to persist a license, ``false`` if
    you don't care. This is not needed for most usecases. ``false`` by default.
    You do not have to set it to ``true`` if the ``persistentLicense`` option is
    set.

  - __distinctiveIdentifierRequired__ (``Boolean|undefined``): When set to
    ``true``, the use of
    [Distinctive Indentifier(s)](https://www.w3.org/TR/encrypted-media/#distinctive-identifier)
    or
    [Distinctive Permanent Identifier(s)](https://www.w3.org/TR/encrypted-media/#uses-distinctive-permanent-identifiers)
    will be required. This is not needed for most usecases. ``false`` if you do
    not care. ``false`` by default.

  - __throwOnLicenseExpiration__ (``Boolean|undefined``): `true` by default.

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

  - __fallbackOn__ (`Object`): This advanced option allows to fallback on other
      Representations (e.g. qualities) when one of them has its decription key
      refused.

      This option is thus only useful for contents depending on multiple
      keys.

      This object can have two properties:
        - `keyInternalError`: fallback when the corresponding key has the
          [status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
          `"internal-error"`. We found that most widevine implementation use
          this error when a key is refused.
        - `keyOutputRestricted`: fallback when the corresponding key has the
          [status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
          `"output-restricted"`. This is the proper status for a key refused due
          to output restrictions.

      For most cases where you want to fallback in case of a refused key, we
      recommend setting both properties to `true`.

      You will receive a `decipherabilityUpdate` event when we fallback from
      a given Representation. You can find documentation on this event
      [in the corresponding chapter of the events
      documentation](./player_events.md#events-decipherabilityUpdate).

      When fallbacking, we might need to reload the current MediaSource, leading
      to a black screen during a brief instant. When reloading, the RxPlayer
      will have the `"reloading"` [player state](./states.md).
      on most situations, we will however not reload the media source but only
      perform a very little seek (of some milliseconds). you might see the
      stream twitch for a very brief instant at that point.

      If we have no Representation to fallback to anymore, we will throw a
      MediaError with a `NO_PLAYABLE_REPRESENTATION` code, as documented [in
      the errors documentation](./errors.md#types-media_error).

  - __onKeyStatusesChange__ (``Function|undefined``): Not needed for most
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

    In case of an error, you can set the `message` property on the
    rejected value as a "string". This message will be set as the `message`
    property of the corresponding `EncryptedMediaError` communicated through
    an `"error"` event.
    As every other `onKeyStatusesChange`-related errors, this error will have
    the `KEY_STATUS_CHANGE_ERROR` `code` property.

  - __closeSessionsOnStop__ (``Boolean|undefined``): If set to ``true``, the
    ``MediaKeySession`` created for a content will be immediately closed when
    the content stops its playback. This might be required by your key system
    implementation (most often, it is not).

    If set to ``false`` or not set, the ``MediaKeySession`` can be reused if the
    same content needs to be re-decrypted.

  - __disableMediaKeysAttachmentLock__ (``Boolean|undefined``):
    In regular conditions, we might want to wait for the media element to have
    decryption capabilities (what we call here "MediaKeys attachment") before
    beginning to load the actual content.

    Waiting for that capability validation allows for example to play a content
    which contains both encrypted and unencrypted data on the Chrome browser.

    However, we found that in some peculiar devices (like some set-top boxes)
    this can create a deadlock: the browser sometimes wait for some
    content to be loaded before validating the media element's decryption
    capabilities.

    Because we didn't find a good enough compromise for now, we added the
    `disableMediaKeysAttachmentLock` boolean.
    By setting it to `true`, we won't wait for "MediaKeys attachment" before
    pushing the first content. The downside being that content of mixed
    unencrypted/encrypted data might not be playable with that configuration.

    You can try that property if your encrypted contents seems to load
    indefinitely on peculiar targets.


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

Note: On some browsers, auto-playing a media without user interaction is blocked
due to the browser's policy.
In that case, the player won't be able to play (it will stay in a `"LOADED"`
state) and you will receive a [warning event](./errors.md) containing a
`MEDIA_ERROR` with the code: `MEDIA_ERR_BLOCKED_AUTOPLAY`.
A solution in that case would be to propose to your users an UI element to
trigger the play with an interaction.


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

  - __position__ (``Number``): The starting position, in seconds.

  - __wallClockTime__ (``Number|Date``): The starting wall-clock time (re-scaled
    position from [Manifest](../terms.md#manifest) information to obtain a
    timestamp on live contents), in seconds.
    Useful to use the type of time returned by the ``getWallClockTime`` API for
    live contents. If a Date object is given, it will automatically be converted
    into seconds.

  - __fromFirstPosition__ (``Number``): relative position from the minimum
    possible one, in seconds.
    That is:
      - for dynamic (live) contents, from the beginning of the buffer depth (as
        defined by the Manifest).
      - for non-dynamic (vod) contents, from the position ``0`` (this option
        should be equivalent to ``position``)

  - __fromLastPosition__ (``Number``): relative position from the maximum
    possible one, in seconds. Should be a negative number:
      - for dynamic (e.g. live) contents, it is the difference between the
        starting position and the currently last possible position, as defined
        by the manifest.
      - for VoD contents, it is the difference between the starting position and
        the end position of the content.

  - __percentage__ (``Number``): percentage of the wanted position. ``0`` being
    the minimum position possible (0 for static content, buffer depth for
    dynamic contents) and ``100`` being the maximum position possible
    (``duration`` for VoD content, last currently possible position for dynamic
    contents).


Note: Only one of those properties will be considered, in the same order of
priority they are written here.

If the value set is inferior to the minimum possible position, the minimum
possible position will be used instead. If it is superior to the maximum
possible position, the maximum will be used instead as well.

More information on how the initial position is chosen can be found [in the
specific documentation page on this subject](../infos/initial_position.md).


#### Notes for dynamic contents

For dynamic contents, ``startAt`` could work not as expected:

  - Depending on the type of Manifest, it will be more or less precize to guess
    the current last position of the content. This will mostly affect the
    ``fromLastPosition`` option.

  - If the Manifest does not allow to go far enough in the past (not enough
    buffer, server-side) to respect the position wanted, the maximum buffer
    depth will be used as a starting time instead.

  - If the Manifest does not allow to go far enough in the future to respect the
    position wanted, the current last available position will be used to define
    the starting time instead.


If ``startAt`` is not set on live contents, the time suggested by the Manifest
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
    fromLastPosition: -60 // 1 minute before the end
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
  - performing [Manifest](../terms.md#manifest) and segment requests
  - parsing the Manifest
  - parsing/updating/creating segments

This Object can contain multiple properties. Only those documented here are
considered stable:

  - __minimumManifestUpdateInterval__ (`number|undefined`):

    Set the minimum time, in milliseconds, we have to wait between Manifest
    updates.

    A Manifest may need to be updated in regular intervals (e.g. many DASH
    dynamic contents depend on that behavior).

    The frequency at which we normally update a Manifest depends on multiple
    factors: the information taken from the Manifest, the transport chosen or
    the current playback conditions. You might want to use
    `minimumManifestUpdateInterval` to limit that frequency to a minimum.

    This option is principally useful on some embedded devices where resources
    are scarce. The request and data decompression done at each Manifest update
    might be too heavy for some and reducing the interval at which they are done
    might help.

    Please note however than reducing that frequency can raise the chance of
    rebuffering, as we might be aware of newly generated segments later than we
    would be without that option.

    Example:
    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        minimumManifestUpdateInterval: 5000, // Perform Manifest updates at most
                                             // every 5 seconds
      }
    });
    ```

  - __manifestUpdateUrl__ (`string|undefined`):

    Set a custom Manifest URL for Manifest updates.
    This URL can point to another version of the Manifest with a shorter
    timeshift window, to lighten the CPU, memory and bandwidth impact of
    Manifest updates.

    Example:
    ```js
    rxPlayer.loadVideo({
      transport: "dash",
      url: "https://example.com/full-content.mpd",
      transportOptions: {
        manifestUpdateUrl: "https://example.com/content-with-shorter-window.mpd"
      }
    });
    ```

    When the RxPlayer plays a live content, it may have to refresh frequently
    the Manifest to be aware of where to find new media segments.
    It generally uses the regular Manifest URL when doing so, meaning that the
    information about the whole content is downloaded again.

    This is generally not a problem though: The Manifest is generally short
    enough meaning that this process won't waste much bandwidth memory or
    parsing time.
    However, we found that for huge Manifests (multiple MB uncompressed), this
    behavior could be a problem on some low-end devices (some set-top-boxes,
    chromecasts) where slowdowns can be observed when Manifest refresh are
    taking place.

    The `manifestUpdateUrl` will thus allow an application to provide a second
    URL, specifically used for Manifest updates, which can represent the same
    content with a shorter timeshift window (e.g. using only 5 minutes of
    timeshift window instead of 10 hours for the full Manifest). The content
    will keep its original timeshift window and the RxPlayer will be able to get
    information about new segments at a lower cost.

  - __representationFilter__ (`Function|undefined`):

    Allows to filter out `Representation`s (i.e. media qualities) from the
    Manifest to avoid playing them.

    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        representationFilter(representations, infos) {
          // ...
        }
      }
    });
    ```

    More infos on it can be found [here](./plugins.md#representationFilter).

  - __segmentLoader__ (``Function|undefined``):

    Defines a custom segment loader for when you want to perform the requests
    yourself.
    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        segmentLoader(infos, callbacks) {
          // logic to download a segment
        }
      }
    });
    ```

    More info on it can be found [here](./plugins.md#segmentLoader).

  - __manifestLoader__ (`function|undefined`):

    Defines a custom Manifest loader (allows to set a custom logic for the
    Manifest request).

    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        manifestLoader(url, callbacks) {
          // logic to fetch the Manifest
        }
      }
    });
    ```

    More info on it can be found [here](./plugins.md#manifestLoader).

  - __checkMediaSegmentIntegrity__ (`boolean|undefined`):

    If set to true, the RxPlayer will retry a media segment request if that
    segment seems corrupted.

    If not set or set to false, the RxPlayer might interrupt playback in the
    same situation.

    You can set this option if you suspect the CDN providing your contents to
    sometimes send you incomplete/corrupted segments.

    Example:
    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        checkMediaSegmentIntegrity: true,
      }
    });
    ```

  - __serverSyncInfos__ (`Object|undefined`):

    Allows to provide a time synchronization mechanism between the client and
    the server.

    This value is mainly useful for live DASH contents based on a
    SegmentTemplate scheme without SegmentTimeline elements as those rely on
    having a synchronized clock on the client side.

    The `serverSyncInfos` object contains two keys:

      - `serverTimestamp` (`number`): Unix timestamp of the server at a given
        point in time, in milliseconds.

      - `clientTime` (`number`): Value of the `performance.now()` API at the time
        the `serverTimestamp` value was true. Please note that if your page contains
        multiple worker, the `performance.now()` call should be done on the same
        worker than the one in which loadVideo is called.

        _The `performance.now()` API is used here because it is the main API to
        obtain a monotically increasing clock on the client-side._

    Example:
    ```js
    const timeResponse = await fetch(timeServerURL);
    const clientTime = performance.now();
    const serverTimestamp = await timeResponse.text();
    const serverSyncInfos = { serverTimestamp, clientTime };
    rxPlayer.loadVideo({
      // ...
      transportOptions: { serverSyncInfos }
    })
    ```

    If indicated, we will ignore any time indication on the MPD and only consider
    `serverSyncInfos` to calculate the time on the server side.

    This value is also very useful for low-latency contents, as some of them do not
    indicate any server's time, relying on the client one instead.

    Note that there is a risk of us losing synchronization when leap seconds are
    added/substracted to unix time. However we consider those situations rare enough
    (and the effect should be relatively weak) to let this as is for the moment. For
    a complete explanation, you can look at the [corresponding chapter of the
    low-latency documentation](./low_latency.md#note-time-sync).

  - __aggressiveMode__ (``boolean|undefined``):

    If set to true, we will try to download segments very early, even if we are
    not sure they had time to be completely generated.

    For the moment, this mode has only an effect for all Smooth contents and
    some DASH contents relying on a number-based SegmentTemplate segment
    indexing scheme.

    The upside is that you might have the last segments sooner.
    The downside is that requests for segments which did not had time to
    generate might trigger a `NetworkError`. Depending on your other settings
    (especially the `networkConfig` loadVideo options), those errors might just
    be sent as warnings and the corresponding requests be retried.

    Example:
    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        aggressiveMode: true,
      }
    });
    ```

  - __referenceDateTime__ (`number|undefined`):

    Only useful for live contents. This is the default amount of time, in
    seconds, to add as an offset to a given media content's time, to obtain the
    real live time.

    For example, if the media has it's `0` time corresponding to the 30th of
    January 2010 at midnight, you can set the `referenceDateTime` to `new
    Date(2010-01-30) / 1000`. This value is useful to communicate back to you
    the "live time", for example through the `getWallClockTime` method.

    This will only be taken into account for live contents, and if the Manifest
    / MPD does not already contain an offset (example: an
    "availabilityStartTime" attribute in a DASH MPD).

    Example:
    ```js
    rxPlayer.loadVideo({
      // ...
      transportOptions: {
        referenceDateTime: new Date(2015-05-29) / 1000,
      }
    });
    ```



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


<a name="prop-manualBitrateSwitchingMode"></a>
### manualBitrateSwitchingMode #################################################

_type_: ``string``

_defaults_: ``"seamless"``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

Strategy you want to adopt when updating "manually" the video and audio quality
through respectively the ``setVideoBitrate`` and ``setAudioBitrate`` API while
the content is playing.

There is two possible values:

  - ``"seamless"``: Manual quality updates will be only visible after a little
    time. This gives the advantage of a very smooth "seamless" transition.

    In this mode, you will have the following behavior:
      - there will be no visual "cut" between the previous and new quality
      - parts of the content with a better (or the same) quality won't be
        replaced.
      - parts of the content with a lower quality will be only replaced when the
        better quality is downloaded.

  - ``"direct"``: Manual quality updates will be visible more directly, but with
    a complete reload of the current content. You might encounter a black screen
    while the player go through the ``"RELOADING"`` state [1].

    In this mode, you will have the following behavior:
      - there will be a black screen between the previous and new quality
      - the previous content will be entirely removed
      - you will only have content with the new quality

    [1] More information about the ``"RELOADING"`` state can be found in [the
    player states documentation](./states).


<a name="prop-lowLatencyMode"></a>
### lowLatencyMode #############################################################

_type_: ``Boolean``

_defaults_: ``false``

Allow to play DASH low-latency contents (with Chunk-encoded and
chunk-transferred CMAF segments) with a low latency efficiently.

In the some rare browsers who do not support the `fetch` API (like IE11 or the
BlackBerry browser), we might be more prone to rebuffering in that mode the
first few seconds. If you want to have a better experience on those browsers,
you might want to begin to play further from the live edge in those cases
through the `startAt` option.

More information on playing low-latency DASH contents can be found in the
[corresponding documentation page](./low_latency.md).


<a name="prop-supplementaryImageTracks"></a>
### supplementaryImageTracks ###################################################

_type_: ``Array.<Object>|Object|undefined``
_defaults_: ``[]``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

This option allows to specify information about supplementary image tracks you
might want to add to those already declared in the
[Manifest](../terms.md#manifest).

This only work under the following conditions:

  - the image track is not fragmented

  - the image track can be retrieved by fetching a single URL

  - the image track is in an understood format and enough information has been
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

---

:warning: This option is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

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

Configuration linked to [Manifest](../terms.md#manifest) and segment requests.
This object can take the following properties (all are optional):

  - ``segmentRetry`` (``Number``): Maximum number of times a segment request
    will be retried when an error happen - only on some condition [1].

    Those retry will be done with a progressive delay, to avoid overloading a
    CDN. When this count is reached, the player will stop and throw a fatal
    error.

    Defaults to ``4``.

  - ``manifestRetry`` (``Number``): Maximum number of times a Manifest request
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



<a name="prop-supplementaryTextTracks"></a>
### supplementaryTextTracks ####################################################

---

:warning: This option is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

If you want to use supplementary text tracks not defined in the content itself,
you can use the `TextTrackRenderer`(./TextTrackRenderer.md) tool, which will
also work for Directfile contents.

---

_type_: ``Array.<Object>|Object|undefined``
_defaults_: ``[]``

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---

This option allows to specify information about supplementary text tracks you
might want to add to those already declared in the
[Manifest](../terms.md#manifest).

This only work under the following conditions:

  - the text track is not fragmented

  - the text track can be retrieved by fetching a single URL

  - the text track is in an understood format and enough information has been
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


<a name="prop-defaultAudioTrack"></a>
### defaultAudioTrack ##########################################################

---

:warning: This option is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

Please use the [`preferredAudioTracks` constructor
option](./player_options.md#prop-preferredAudioTracks) or the
[`setPreferredAudioTracks` method](./index.md#meth-setPreferredAudioTracks)
instead.

---

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
or under the form of the language string directly, in which case the
``"audioDescription"`` option is inferred to be false.
```js
// equivalent to the previous example
const defaultAudioTrack = "fra";
```

If the corresponding audio track is not found, the first track defined will be
taken instead.

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---


<a name="prop-defaultTextTrack"></a>
### defaultTextTrack ###########################################################

---

:warning: This option is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

Please use the [`preferredTextTracks` constructor
option](./player_options.md#prop-preferredTextTracks) or the
[`setPreferredTextTracks` method](./index.md#meth-setPreferredTextTracks)
instead.

---

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
or under the form of the language string directly, in which case the
``"closedCaption"`` option is inferred to be false:
```js
// equivalent to the previous example
const defaultTextTrack = "fra";
```

If the corresponding text track is not found, the first track defined will be
taken instead.

---

:warning: This option is not available in _DirectFile_ mode (see [transport
option](#prop-transport)).

---
