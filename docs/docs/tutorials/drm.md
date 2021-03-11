---
id: drm-tutorials
title: Playing contents with DRMs
sidebar_label: Playing contents with DRMs
slug: playing-contents-with-drms
---

# Tutorial: Playing contents with DRMs

Because different applications and different devices can work completely
differently when it comes to DRM, and because it is a complex feature, we have
a large API allowing to manage it.

This tutorial page is specifically there to help you navigate through this API.

We will begin from the simplest of use cases to dive into the more complex ones.

We recommend you to read the [quick start tutorial](./quick_start.md) first if
you haven't, to have a general grasp on how to basically run a content.

## Playing a simple encrypted content

To be able to play a simple encrypted content, we will need at least two
parameters:

1. `type`: the name of the "key system" you want to use.
2. `getLicense`: the license-fetching logic

This chapter will explain both and provide examples on how to load a video with
both of these properties.

### The key system

The key system, also known as "DRM name", will designate which Content
Decryption Module (or CDM) to use. You might have heard of "Widevine",
"PlayReady" or "FairPlay", that's the name what we want to know: which system
you want to use.

Which of them you want to use depend on several factors, among which:

- what the content allows
- what the content right holder wants
- what you/your company wants
- what the browser can do

In the RxPlayer's API, we more especially expect the whole "reverse domain name"
for that key systems (e.g. `com.widevine.alpha` or `com.microsoft.playready`).

We also have shortcuts for Widevine or PlayReady, where you can just tell us
respectively `widevine` or `playready` as the key system and we will try
several corresponding reverse domain names.

In any case, you can ask for several key systems, even including ones that are
not available in the current browser. Those will be detected and automatically
filtered out.

```js
rxPlayer.loadVideo({
  // ...
  keySystems: [
    {
      type: "com.widevine.alpha",
      // ...
    },
    {
      type: "com.microsoft.playready",
      // ...
    },
  ],
});
```

### The license-fetching logic

The second needed argument is a callback allowing to fetch the content license.

An encrypted content will need one or several keys to be able to decrypt a
content. Those keys are contained in one or several license files.

Those files usually need to be downloaded from a license server.

As that logic sometimes depends on your application (i.e. you might want to
add authentification to that request to know which user made that request), the
RxPlayer team made the choice to let you write your logic entirely.

This logic takes the form of a callback named `getLicense`.

This function is in fact triggered everytime a message is sent by the Content
Decryption Module (what is sometimes known as "Widevine" or "PlayReady"), which
is usually a request to fetch or renew the license.

It gets two arguments when called:

1. message (`Uint8Array`): The "message"
2. messageType (`string`): String describing the type of message received.
   There is only 4 possible message types, all defined in [the w3c
   specification](https://www.w3.org/TR/encrypted-media/#dom-mediakeymessagetype).

In most cases, this function is triggered for license requests.
You're encouraged to read what the `messageType` can be, but don't be scared by
it, you'll most likely never need to check it.

What you will most likely need to do, is simply sending the first argument,
`message`, to the license server to fetch the license. That message generally
contains information about the license you want to fetch.

You will then need to return a Promise, which resolves with the license in an
ArrayBuffer or Uint8Array form.
If you don't want to communicate a license based on this message, you can just
return `null` or a Promise resolving with `null`.

Here is an example of a valid and simple getLicense implementation:

```js
function getLicense(challenge) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", LICENSE_SERVER_URL, true);
    xhr.onerror = (err) => {
      reject(err);
    };
    xhr.onload = (evt) => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const license = evt.target.response;
        resolve(license);
      } else {
        const error = new Error(
          "getLicense's request finished with a " + `${xhr.status} HTTP error`
        );
        reject(error);
      }
    };
    xhr.responseType = "arraybuffer";
    xhr.send(challenge);
  });
}
```

### Example with both properties

Now that all that has been explained here's an example to play a simple
encrypted DASH content with either PlayReady or Widevine.

```js
// We will use the same logic for both PlayReady and Widevine
function getLicense(challenge) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", LICENSE_SERVER_URL, true);
    xhr.onerror = (err) => {
      reject(err);
    };
    xhr.onload = (evt) => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const license = evt.target.response;
        resolve(license);
      } else {
        const error = new Error(
          "getLicense's request finished with a " + `${xhr.status} HTTP error`
        );
        reject(error);
      }
    };
    xhr.responseType = "arraybuffer";
    xhr.send(challenge);
  });
}

rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
    },
    {
      type: "playready",
      getLicense,
    },
  ],
});
```

This code is sufficient for a majority of encrypted contents.

## More control over the license-fetching logic

There's a lot of things that can go wrong during the license request:

- The user could be temporarly disconnected
- The license server might be down
- The license server might refuse to deliver a license based on your rights
- The license server might refuse to deliver a license based on your CDM
  capabilities
- And like any request a lot of other errors can happen

From this, you could want to have a different behavior based on what happened:

- When a user is temporarly disconnected, you could chose to retry
  indefinitely (the RxPlayer retry after a delay to not overload the client or
  the server).
- When the license server is down, you might want to fail directly.
- When the license server refuse to deliver a license based on your rights,
  you might want to throw an explicit error message that you will be able to
  display.
- If there's a problem with your CDM capabilities, you might want to just
  fallback to another media quality with a different license.

All of this is possible with more advanced APIs that we will see in this
chapter.

### getLicenseConfig

`getLicenseConfig` is an object allowing to configure two parameters:

- `retry`, which will set the maximum number of retry.
  When setting `1`, for example, we will try two times the request: A first
  original time and one retry.

  You can decide to by default retry indefinitely by setting it to `Infinity`
  (yes, that's a valid number [in JS and some other
  languages](https://en.wikipedia.org/wiki/IEEE_754)). Don't worry, you will
  still be able to retry less time on some other events (explained in
  the `getLicense error configuration` chapter).

- `timeout`, which is the maximum time in milliseconds the RxPlayer will wait
  until it considers a `getLicense` call to have failed.
  By default it is set to `10000` (10 seconds). You can set it to `-1` to
  disable any timeout.

For example, for infinite retry and no timeout, you can set:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      getLicenseConfig: {
        retry: Infinity,
        timeout: -1,
      },
    },
    // ...
  ],
});
```

### getLicense error configuration

`getLicenseConfig` handle general configurations about every `getLicense` calls,
but you can also have more specific configuration when a specific license
request fails.

This is done thanks to the rejected Promise returned by `getLicense`.
You can reject an error (or just an object), with the following properties:

- `noRetry`: when set to `true`, the `getLicense` call will not be retried.

- `message`: a custom message string we will communicate through a warning or
  error event (depending if we will retry or not the call)

- `fallbackOnLastTry`: When set to `true` and if we are doing or last
  try or retry (to be sure you can set `noRetry` to true), we will try to
  fallback to another quality, which might have a different license.

  This is only useful for contents which have a different license depending on
  the quality (for example having different rights for 4k video content than
  for 480p video content). It is also only useful if the license server can
  refuse to deliver a license for a particular quality but accept for another
  quality.

Here is an example showcasing all of those properties:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense(challenge) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", LICENSE_SERVER_URL, true);
          xhr.onerror = (err) => {
            // Keep retrying on XHR errors.
            // Instanciating an Error like that automatically set the
            // message attribute to this Error's message. That way, the
            // linked "error" or "warning" event sent by the RxPlayer
            // will have the same message.
            const error = new Error("Request error: " + err.toString());
            reject(err);
          };
          xhr.onload = (evt) => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const license = evt.target.response;
              resolve(license);
            } else if (xhr.status >= 500 && xhr.status < 600) {
              // Directly fails + fallbacks on a server error
              const error = new Error(
                "The license server had a problem and" +
                  ` responded with ${xhr.status} HTTP ` +
                  "error. We will now fallback to another" +
                  "quality."
              );
              error.noRetry = true;
              error.fallbackOnLastTry = true;
              reject(error);
            } else {
              // else continue to retry
              const error = new Error(
                "getLicense's request finished with a " +
                  `${xhr.status} HTTP error`
              );
              reject(error);
            }
          };
          xhr.responseType = "arraybuffer";
          xhr.send(challenge);
        });
      },
      getLicenseConfig: {
        retry: Infinity,
        timeout: -1,
      },
    },
    // ...
  ],
});
```

## Contents with multiple keys

### Why and how

One of the issues arising with DRM is that not all devices, Operating systems or
web browsers can provide a high level of guarantee that a content will be
protected against unauthorized usages (such as illegal copy).
In other words, some devices, OS or browsers might provide more guarantees than
other.

That's the main reason why there's sometime a compromise to have between
accessibility of a content (the number of the people able to view it) and this
guarantee.

To be able to provide the best of both worlds, a content right holder might ask
for a higher protection guarantee for higher video qualities.

For example, it might ask that a 4k video content of a given film should be much
harder to "pirate" than the 240p version of the same film.
In return, the 240p version can be watched by a lot more people on a lot of
different devices.

To achieve that, one of the solution on the content-side is to have different
decryption keys depending on the quality chosen.
There's then two main strategies:

1. Every keys are in the same license. A player will thus do only one
   license request for the whole content and the keys inside will be
   individually refused or accepted.

2. There is one or several keys per licenses, in several licenses. That way,
   a player might ask a different license when switching the current
   quality.

There's pros and cons to both, but let's not go too far into that!

Let's start from the principle that our content is under one of those two cases
here and let's find out what we have to do to handle it.

### The strategy adopted by the RxPlayer

When playing a content, the RxPlayer by default stops and throws an error as
soon as either a key is refused or as the license fetching logic (the
`getLicense` function) fails (after enough retries).

When playing a content with multiple keys, you might instead not care that much
if a key is refused or if the license-fetching logic fails.
What you can just do is to remove the quality for which we could not obtain a
key and to instead fallback on another, decipherable, quality.

That's exactly what the RxPlayer does, when the right options are set:

1. when it detects a quality to be un-decipherable, it first emit a
   `decipherabilityUpdate` event through its API, to signal to an application
   which qualities have been blacklisted.

2. it automatically removes from the current media buffer the data linked to
   the un-decipherable quality and put it in a black list: we will not load
   this quality for the current content anymore.

3. it switches to another, hopefully decipherable, quality.

Let's now talk about the API.

### fallbackOnLastTry

This option was already explained in a previous chapter. Basically, it is a
boolean you can set to `true` when rejecting an error from the `getLicense`
callback. When set and if it was the last `getLicense` try or retry, the
RxPlayer will stop to play every quality sharing the same "protection
initialization data".
What that last part really means is a little complex, but it generally means
that every qualities sharing the same license file will be considered as
un-decipherable.

For more information and an example on how to use it, you can go back on the
concerned previous part of this tutorial.

Please note that this option does not concern every errors linked to a refused
key. It only concerns issues when the license server refuse to deliver a
license.
On most cases you will also need the API documented in the next part,
`fallbackOn`.

### fallbackOn

Where `fallbackOnLastTry` really is about the failure of a license request, the
`fallbackOn` is about the refused keys themselves.

As an example, the Content Decryption Module in the browser might decide that
your current device cannot provide a high enough guarantee that the content
cannot be copied. It might thus refuse to use one of the decryption key found in
a license, especially the one needed for the higher content qualities.

The `fallbackOn` object allows to fallback when this happens.
There is two possible sub-properties in it:

- `keyInternalError`: fallback when the corresponding key has the
  [status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
  `"internal-error"`. We found that most widevine implementation use
  this error when a key is refused.
- `keyOutputRestricted`: fallback when the corresponding key has the
  [status](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
  `"output-restricted"`. This is the proper status for a key refused due
  to output restrictions.

Both are booleans, and for the moment we recommend to set both to true in most
cases.

For people on embedded devices with specific key systems, you can look a little
more into what [MediaKeyStatus](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)
is set when a key is refused, and just set one of both.

Here is an example:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      fallbackOn: {
        keyInternalError: true,
        keyOutputRestricted: true,
      },
    },
  ],
});
```

### decipherabilityUpdate event

When the RxPlayer detects a quality to be un-decipherable (which can only
happens when one of the properties explained here is set), it sends a
`decipherabilityUpdate` event.

This event allows an application to know that some key or license could not be
used by the RxPlayer.

The application could then infer that other contents from the same right holders
will have the same issues.
In that case, an optimization is possible by using the `representationFilter`
API which is part of the `transportOptions` `loadVideo` option, [documented here](../api/basicMethods/loadVideo.md#transportoptions). By using this API,
we can filter out un-decipherable quality to avoid downloading them in the
first place.

## Server certificate

The "server Certificate" is a certificate allowing to encrypt messages coming
from the Content Decryption module to the license server. They can be required
by some key system as a supplementary security mechanism.

Thankfully, an application is not obligated to set one, even if one is needed.
If not set, the Content Decryption Module will download it itself by using the
same route than a license request (the `getLicense` callback will be called).

This means however, that we have to perform two round-trips to the license
server instead of one:

1. one to fetch the "server certificate".
2. the other to fetch the license.

To avoid the first round-trip, it is possible for an application to directly
indicate what the `serverCertificate` is when calling loadVideo.

This is done through the `serverCertificate` property, in `keySystems`:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      serverCertificate,
    },
  ],
});
```

The `serverCertificate` has to either be in an `ArrayBuffer` form or a
`TypedArray` (i.e. `Uint8Array`, `Uint16Array` etc.)

## Persistent licenses

A persistent license allows to store a license for it to be available even when
a user quits the current page or restarts its computer. It can be used even if
the user is offline.

After loading a persistent license, it is automatically stored on the browser's
side, but the RxPlayer still has to store an ID to be able to retrieve the right
session when reloading the same content later.
Because of that, persistent-license management comes in two part in the RxPlayer
API (as usual here, those should be set in `keySystems`):

1. You'll have to set the `persistentLicense` boolean to `true`

2. You'll have to provide a license storage mechanism and set it as the
   `licenseStorage` property.

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      persistentLicense: true,
      licenseStorage,
    },
  ],
});
```

### licenseStorage property

The `licenseStorage` property is an object allowing the RxPlayer to load and
saved stored IDs.

It needs to contain two functions:

- `save`: Which sould store the argument given. The argument will be an array
  of Objects.
- `load`: Called without any argument, it has to return what was given to the
  last `save` call. Any return value which is not an Array will be ignored
  (example: when `save` has never been called).

This API can very simply be implemented with the
[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
browser API:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      persistentLicense: true,
      licenseStorage: {
        save(data) {
          localStorage.setItem("RxPlayer-licenseStorage", JSON.stringify(data));
        },
        load() {
          const item = localStorage.getItem("RxPlayer-licenseStorage");
          return item === null ? [] : JSON.parse(item);
        },
      },
    },
  ],
});
```

Do not be scared about security implications, the data saved is not secret and
does not help to identify a user.

You can also use every storage API at your disposition (some embedded devices
might have their own).

As a nice bonus, you can note that the data given is perfectly "serializable"
through the JSON.stringify browser API. This means that, as the example shown
above, you can call `JSON.stringify` on that data and retrieve it through a
`JSON.parse` call.

This is very useful for storage APIs which cannot store JavaScript objects.

## Playback issues related to DRMs

The configuration example which finishes the last chapter should work in most
cases, but you might encounter very specific issues on some devices.

### Issues with fallbacking with the Edge browser and PlayReady

We sometimes encountered a bug which makes the player loads indefinitely when
fallbacking from an undecipherable quality, if done through the
`fallbackOnLastTry` option. This was only constated on the Edge browser and
appears to be a browser or CDM bug.

Sadly, no work-around has been found for now for this issue. We're currently
trying to create a reproducible scenario and document that issue so it can
hopefully be fixed in the future. In the meantime, you're encouraged either to
use Widevine (only on Chromium-based Edge) or to not make use of the
`fallBackOnLastTry` option on that browser.

### The Player do not download any segment when playing encrypted contents

This is probably due to an issue we encountered several time on embedded
devices.

Basically, this behavior is due to a deadlock, where the RxPlayer is waiting for
the CDM logic to be initialized to download segments but the CDM logic wait for
the opposite: it will only initialize itself once segments have been downloaded.

The RxPlayer is waiting for the CDM initialization for a very specific usage:
playing a mix of unencrypted and encrypted data. We detected that on some Chrome
versions we could not play encrypted data if we first played unencrypted data
without the CDM logic in place.

Fortunately, this usage is for very specific cases and you most likely won't
need it (or even if you will, you most likely will not encounter that problem).

You can completely remove that deadlock with a property called
`disableMediaKeysAttachmentLock`. Like other properties introduced here, you
should put it in the `keySystems` object of `loadVideo`, like such:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      disableMediaKeysAttachmentLock: true,
    },
    {
      type: "playready",
      getLicense,
      disableMediaKeysAttachmentLock: true,
    },
  ],
});
```

### After two or several loadVideo calls the RxPlayer refuses to play

There's a chance that you're encountering another issue we found on embedded
devices.

By default, the RxPlayer maintains a cache containing the last loaded licenses.
This allows to quickly switch to already-played contents, an important
improvement when playing live contents for example.
Rest assured, our cache size is not infinite, and as such it should work on most
devices.

However, we found that on some devices, this logic can be problematic, and it
will just refuse to add a license at a given point.

You can add a property which will flush that cache anytime the content changes,
called `closeSessionsOnStop`.

Like other properties introduced here, you should put it in the `keySystems`
object of `loadVideo`, like such:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      closeSessionsOnStop: true,
    },
    {
      type: "playready",
      getLicense,
      closeSessionsOnStop: true,
    },
  ],
});
```
