# Decryption Options

## Overview

The RxPlayer has a lot of decryption-related options that you can give when
calling the `loadVideo` method, [itself described in the previous documentation
page](./Loading_a_Content.md).

This page will desribe most of them.

In the case you find this documentation hard to grasp, we've written a [tutorial
on DRM configuration here](../Getting_Started/Tutorials/Content_with_DRM.md).


## loadVideo `keySystems` options

`keySystems` is a `loadVideo` option allowing to communicate your
decryption-related preferences.

It takes the form of an array of objects, themselves potentially containing
any of the properties described here.

Each object in the `keySystems` array will describe decryption configuration,
from the most preferred (the one you wish to be apply) to the least preferred
(the fallback configurations).

That way, the RxPlayer will first try to apply the configuration linked to the
first object. If it fails, it will try the second and so on. If all
configurations fail, the RxPlayer will stop playback with an
`ENCRYPTED_MEDIA_ERROR` with the `INCOMPATIBLE_KEYSYSTEMS` code (see [error
documentation](./Player_Errors.md)).

Mostly, the `type` and `getLicense` properties are usually mandatory for
encrypted contents. Depending on your situation you might also want to set other
options.


### type

_type_: `string`

Name of the DRM system used. Can be either one of:

  - `"widevine"`
  - `"playready"`
  - `"clearkey"`

For more specific (or just different ones), the full reverse domain name of
the key system can be used instead, for example:

  - `"com.widevine.alpha"`,
  - `"com.microsoft.playready.hardware"`
  - `"com.apple.fps.1_0"`
  - etc.

#### Example

```js
rxPlayer.loadVideo({
  // ...
  keySystems: [
    {
      type: "com.microsoft.playready.recommendation",
      // ...
    }
    // ...
  ]
});
```

### getLicense

_type_: `Function`

Callback which will be triggered everytime a message is sent by the Content
Decryption Module (CDM), usually to fetch/renew the license.

Gets two arguments when called:

  1. the message (`Uint8Array`): The message, formatted to an Array of
     bytes.
  2. the messageType (`string`): String describing the type of message
     received.
     There is only 4 possible message types, all defined in [the w3c
     specification](https://www.w3.org/TR/encrypted-media/#dom-mediakeymessagetype).

This function should return either synchronously the license, `null` to not
set a license for this `message` event or a Promise which should either:

  - resolve if the license was fetched, with the licence in argument
  - resolve with `null` if you do not want to set a license for this
  `message` event
  - reject if an error was encountered.

Note: We set a 10 seconds timeout by default on this request (configurable
through the `keySystems[].getLicenseConfig` object).
If the returned Promise do not resolve or reject under this limit, the
RxPlayer will stop with an error.

In any case, if a license is provided by this function it should be under a
`BufferSource` type (example: an `Uint8Array` or an `ArrayBuffer`).

If this callback throws or rejects, the RxPlayer will either:

  - retry if new retry attempts can be done according to the parameters
    given as `getLicenseConfig` and if the `noRetry` property of the last
    rejected/throwed value was not set to `true`.

    In that case an error with the `KEY_LOAD_ERROR` code will still be
    emitted through a `warning` event to indicate that this attempt as
    failed.

  - stop playback, emitting an `error` event with the `KEY_LOAD_ERROR` code,
    if no attempt is left to be done (or if the `noRetry` property of the
    last throwed/rejected error was set to `true`) AND if the
    `fallbackOnLastTry` property on the last throwed/rejected error was not
    set to `true`.

  - try to fallback to a different `Representation` (a.k.a. media profile)
    if no attempt is left to be done (or if the `noRetry` property of the
    last throwed/rejected error was set to `true`) AND if the
    `fallbackOnLastTry` property on the last throwed/rejected error WAS
    set to `true`.

    In that case an error with the `KEY_LOAD_ERROR` code will still be
    emitted through a `warning` event to indicate that this attempt as
    failed.

    If we have no Representation to fallback to anymore, we will throw a
    MediaError with a `NO_PLAYABLE_REPRESENTATION` code, as documented [in
    the errors documentation](./Player_Errors.md#types-media_error).

If the `getLicense` call throws/rejects, you can add any of the following
properties (none are mandatory) to configure the behavior of the RxPlayer
relative to that failure:
  - `noRetry` (`Boolean`): If set to `true`, we won't make another attempt
    to call `getLicense`. Its failure
    `getLicense` another time.
    This will result in: trigger a fallback to other
    Representations (and a `KEY_LOAD_ERROR` warning being sent) or th
    will throw directly a `KEY_LOAD_ERROR`.
    the current retry parameters will be applied (see `getLicenseConfig`)

  - `message` (`string`): If the `message` property is set as a "string",
    this message will be set as the `message` property of the
    corresponding `EncryptedMediaError` (either communicated through an
    `"error"` event if we're not retrying or through a `"warning"` event
    if we're retrying).
    As every other `getLicense`-related errors, this error will have the
    `KEY_LOAD_ERROR` `code` property.

  - `fallbackOnLastTry` (`boolean`): If this getLicense is the last retry
    (if the `noRetry` property is set to `true`, this is always true), we
    will not throw immediately but rather try to fallback on other
    Representations (e.g. qualities) which might have a different decryption
    key. If no Representation is left, we will throw a MediaError with a
    `NO_PLAYABLE_REPRESENTATION` code, as documented [in the errors
    documentation](./Player_Errors.md#types-media_error).

    You will receive a `decipherabilityUpdate` event when we fallback from
    a given Representation. You can find documentation on this event [in
    the corresponding chapter of the events
    documentation](../api/Player_Events.md#decipherabilityupdate).

    This option is thus only useful for contents depending on multiple
    licenses.

    When fallbacking, we might need to reload the current MediaSource,
    leading to a black screen during a brief instant. When reloading, the
    RxPlayer will have the `"RELOADING"` [player state](./Player_States.md).
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


### getLicenseConfig

_type_: `Object | undefined`

Optional configuration for the `keySystems[].getLicense` callback.

Can contain the following properties:

  - `retry` (`Number`|`undefined`) (default: `2`): number of time
    `getLicense` is retried on error or on timeout before we fail on a
    `KEY_LOAD_ERROR`

  - `timeout` (`Number`|`undefined`) (default: `10000`): timeout, in milliseconds
    after which we consider the `getLicense` callback to have failed.

    Set it to `-1` to disable any timeout.


### serverCertificate

_type_: `BufferSource | undefined`

Eventual certificate used to encrypt messages to the license server.

If set, we will try to set this certificate on the CDM. If it fails, we will
still continue to try deciphering the content (albeit a
[warning](./Player_Errors.md) will be emitted in that case with the code
`"LICENSE_SERVER_CERTIFICATE_ERROR"`).


### persistentLicense

_type_: `Boolean | undefined`

Set it to `true` if you want the ability to persist the license for later
retrieval.

In that case, you will also need to set the `licenseStorage` attribute to
be able to persist the license through your preferred method.

Note that not all licenses can be persisted, this is dependent both on the
loaded licenses and on the Content Decryption Module used in the browser.


### licenseStorage

_type_: `Object | undefined`

Required only if `persistentLicense` has been set to `true`.

This is an object containing the following properties:

  - `save` (`Function`): function which takes into argument an
    `Array.<Object>` which will contain information on all the DRM
    sessions the RxPlayer currently needs to save.
    No return value is needed.

  - `load` (`Function`): Function which takes no argument and returns the
     last stored `Array.<Object>` (the last one given to `save`).

  - `disableRetroCompatibility` (`boolean`): If set to `true` the RxPlayer
    might not be able to load licenses persisted through an older RxPlayer
    version. This will allow to unlock some optimizations, for example to
    allow a faster loading of the current content.

    We recommend setting that option to `true` if retrieving persisted
    licenses through older versions are not that warning to you.


### fallbackOn

_type_: `Object | undefined`

This advanced option allows to fallback on other Representations (a.k.a.) when
one of them has its decription key refused.

This option is thus only useful for contents depending on multiple keys.

This object can have the following properties:

  - `keyInternalError`: fallback when the corresponding key has the
    [`"internal-error"`
    status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus).

    We found that most widevine implementation use this status to signal
    that a key is refused.

  - `keyOutputRestricted`: fallback when the corresponding key has the
    [`"output-restricted"`
    status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus).

    This is the proper status for a key refused due to output restrictions.

For most cases where you want to fallback in case of a refused key, we
recommend setting both properties to `true`.

You will receive a `decipherabilityUpdate` event when we fallback from
a given Representation. You can find documentation on this event
[in the corresponding chapter of the events
documentation](../api/Player_Events.md#decipherabilityupdate).

When fallbacking, we might need to reload the current MediaSource, leading
to a black screen during a brief instant. When reloading, the RxPlayer
will have the `"RELOADING"` [player state](./Player_States.md).

If we have no Representation to fallback to anymore, we will throw a
MediaError with a `NO_PLAYABLE_REPRESENTATION` code, as documented [in
the errors documentation](./Player_Errors.md#types-media_error).


### maxSessionCacheSize

_type_: `number | undefined`

The RxPlayer maintains a cache of recently opened `MediaKeySession` (and
consequently of recently fetched licenses) as an optimization measure.

That way, loading a content whose license had already been fetched won't
necessitate a new license request, leading to shorter loading times and less
requests.

The size of this cache is usually kept relatively low (in the 10s) by the
player.
We found out however that some devices have an even lower limit for the
number of `MediaKeySession` that can be created at the same time.

The `maxSessionCacheSize` option allows to configure the maximum number of
`MediaKeySession` that should be kept "alive" at the same time. Any
supplementary older `MediaKeySession` will be closed, at least when the time
comes to create a new one.


### closeSessionsOnStop

_type_: `Boolean | undefined`

If set to `true`, the `MediaKeySession` created for a content will be
immediately closed when the content stops its playback.

This might be required by your key system implementation (most often, it is
not).

If set to `false` or not set, the `MediaKeySession` can be reused if the
same content needs to be re-decrypted.

If you want to set this property because the current device has a limited
number of `MediaKeySession` that can be created at the same time, prefer
using `maxSessionCacheSize` instead.


### singleLicensePer

_type_: `string | undefined`

Allows to use optimally a single license for multiple decryption keys.

Can be set to the following values:

  - `"init-data"`: This is the default value.
    Under that behavior, the RxPlayer will try to fetch a new license any
    time it encounters an unknown encryption initialization data in the
    current content.

    This usually means that a license will be fetched any time a new
    decryption key is encountered, which is the most sensible thing to
    do in most cases.

  - `"content"`: Only fetch a single license for the whole content, even
    if the content has multiple keys.

    Under that behavior, only a single license will be fetched, with a
    "challenge" generated from the first encryption initialization data
    encountered.

    Not only that, all Representations (qualities) whose key was not present
    in the license will be fallbacked from[1], meaning that they won't be
    played anymore.

  - `"periods"`: Each license fetched will be assumed to be for a group
    of [Periods](../Getting_Started/Glossary.md#period).

    That is, the RxPlayer will assume that any license fetched:

      - will contain all the compatible keys for the Period of the
        Representation for which the license request was done.

        That is, if the license request was done for a Representation in the
        second Period, the license fetched will be assumed to contain all
        compatible keys linked to the second Period.

        This means that all expected keys which are absent will be considered as
        not compatible - thus their corresponding Representation will be
        fallbacked from[1]).

      - may contain all compatible keys for some other Periods (or all other
        Periods).

        The rule here is that as long as the license contain at least one
        decryption key linked to a Representation of any other Period, the
        RxPlayer will assume that the license server returned all compatible
        keys for that Period. Any other key linked to that Period but absent
        from the license will considered as not compatible - and thus their
        corresponding Representation will be fallbacked from[1].

    This option allows to avoid doing too much license requests (compared to the
    default "init-data" mode) for contents encrypted with multiple keys, but
    also may be preferable to the "content" mode in any of the following
    situations:

      - You don't know all upcoming keys in advance.

        Here you can just communicate them by groups of Periods

      - The devices on which the RxPlayer will play are not able to store all
        keys needed for a single content at once

        Here you can just provide a limited number of keys, linked to a limited
        number of Periods.

[1] _Note that while fallbacking, it is possible that the player goes into
the `"RELOADING"` state (during which the video will disappear and many
APIs will become unavailable). More information about the `"RELOADING"`
state can be found in [the player states documentation](./Player_States.md)._

You can set this option as an optimization (to only perform a single
license requests instead of many while playing contents encrypted with
multiple keys) but only if the corresponding optimizations have also
been performed on the side of the license server (to return a license
for every keys even if one for a single key was asked for).

### disableMediaKeysAttachmentLock

_type_: `Boolean | undefined`

In regular conditions, we might want to wait for the media element to have
decryption capabilities (what we call here "MediaKeys attachment") before
beginning to load the actual content.

Waiting for that capability validation first allows for example to play a
content which contains both encrypted and unencrypted data on Chrome and
Chromium-derived browsers.

However, we found that on some peculiar devices (like some set-top boxes)
this can create a deadlock: the browser might wait for some content to be
loaded before validating the media element's decryption capabilities.

Because we didn't find a good enough compromise for now, we added the
`disableMediaKeysAttachmentLock` boolean.
By setting it to `true`, we won't wait for "MediaKeys attachment" before
pushing the first content. The downside being that content of mixed
unencrypted/encrypted data might not be playable with that configuration.

You can try that property if your encrypted contents seems to be loading
indefinitely on some peculiar targets.


### distinctiveIdentifierRequired

_type_: `Boolean | undefined`

When set to `true`, the use of
[Distinctive Indentifier(s)](https://www.w3.org/TR/encrypted-media/#distinctive-identifier)
or
[Distinctive Permanent Identifier(s)](https://www.w3.org/TR/encrypted-media/#uses-distinctive-permanent-identifiers)
will be required.

This is not needed for most use cases.


### persistentStateRequired

_type_: `Boolean | undefined`

Set it to `true` if the chosen CDM should have the ability to persist state.

This includes session data and any other type of state, but does not include
[distinctive
identifiers](https://www.w3.org/TR/2017/REC-encrypted-media-20170918/#distinctive-identifier),
for which there's another `keySystems` option, `distinctiveIdentifierRequired`.

If the `persistentLicense` `keySystems` option has been set to `true`,
setting this value to `true` is redundant and therefore unnecessary (as
exploiting persistent licenses already necessitate the ability to persist
session state).

This is very rarely needed.


### throwOnLicenseExpiration

_type_: `Boolean | undefined`

`true` by default.

If set to `true` or not set, the playback will be interrupted as soon as one
of the current licenses expires. In that situation, you will be warned with
an [`error` event](./Player_Errors.md) with, as a payload, an error with the code
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


### onKeyStatusesChange

_type_: `Function | undefined`

Callback triggered each time one of the key's
[status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
is updated except for the following statuses and conditions (in which cases
the RxPlayer throws instead):

  - `expired` if (and only if) `keySystems[].throwOnLicenseExpiration` is
    not set to `false`
  - `internal-error` if (and only if)
    `keySystems[].fallbackOn.keyInternalError` is not set set to `true`

This option is very rarely needed (if ever).

Takes 2 arguments:

  1. The keystatuseschange event `{Event}`
  2. The session associated with the event `{MediaKeySession}`

Like `getLicense`, this function should return a promise which either
emits a license or `null` (for no license) when resolved.
It can also return directly the license or `null` if it can be done
synchronously.

In the case this callback throws or rejects, the playback will stop and an
`"error"` event will be sent with a `KEY_STATUS_CHANGE_ERROR` `code`
property.
You can set the `message` property on the rejected/thrown value as a
`string`. In this case, that string will be used as the error message of
the `KEY_STATUS_CHANGE_ERROR` error (and used at its `message` property).


## Example

Example of a simple DRM configuration for widevine and playready DRMs:

```js
player.loadVideo({
  url: manifestURL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense(challenge) {
        // ajaxPromise is here an AJAX implementation doing a POST request on the
        // widevineLicenseServer with the challenge in its body.
        return ajaxPromise(widevineLicenseServer, challenge);
      },
    },
    {
      type: "playready",
      getLicense(challenge) {
        // idem
        // Note: you may need to format the challenge before doing the request
        // depending on the server configuration.
        return ajaxPromise(playreadyLicenseServer, challenge);
      },
    },
  ],
});
```
