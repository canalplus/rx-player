# Switching from version 2.x.x to 3.x.x

The ``3.0.0`` release brought multiple breaking changes that may impact your codebase if you were based on a ``2.x.x`` version (or inferior) previously.

Those breaking changes are mainly here to bring new features and simplify the player maintenance. This file enumerates each one of those changes and propose alternatives.

The simplest way of switching here would be to:
  1. Check the _General changes_ chapter
  2. Check the constructor options you use (_constructor options_ chapter)
  3. Check the way you use the ``loadVideo`` method (_loadVideo_ chapter)
  4. Replace every method listed in the _Removed methods_ chapter you use in your codebase
  5. Make sure that the methods listed in the _Changed methods_ chapter are correctly used now
  6. Replace events listed in _Removed events_
  7. Check events you use listed in _Changed events_

If you were only using documented APIs and you follow this, you'll be ready to completely switch to a ``3.x.x`` release !

If you don't know if you were using documented APIs, you can still check if the options, methods and events you use now are documented in the [new API](./api/index.md). Now, most non-documented (private) APIs begin by the string ``_priv_``, to simplify this process.

## Table of Contents

- [General changes](#general)
    - [Features disabled by default](#general-feat)
    - [Normalized language codes](#general-lang)
- [Constructor options](#cons)
    - [defaultLanguage](#cons-defaultLanguage)
    - [defaultSubtitle](#cons-defaultSubtitle)
    - [initVideoBitrate / initAudioBitrate](#cons-initVideoBitrate)
    - [defaultAudioTrack](#cons-defaultAudioTrack)
    - [defaultTextTrack](#cons-defaultTextTrack)
    - [transport](#cons-transport)
    - [transportOptions](#cons-transportOptions)
- [loadVideo](#load)
    - [Return value](#load-return)
    - [defaultLanguage parameter](#load-defaultLanguage)
    - [defaultLanguage parameter](#load-defaultSubtitle)
    - [images parameter](#load-images)
    - [subtitles parameter](#load-subtitles)
    - [timeFragment parameter](#load-timeFragment)
    - [manifests parameter](#load-manifests)
- [Removed methods](#rem)
    - [getVideoMaxBitrate / getAudioMaxBitrate / setVideoMaxBitrate / setAudioMaxBitrate](#rem-setVideoMaxBitrate)
    - [setVideoBufferSize / setAudioBufferSize / getVideoBufferSize / getAudioBufferSize](#rem-setVideoBufferSize)
    - [asObservable](#rem-asObservable)
    - [getAvailableLanguages](#rem-getAvailableLanguages)
    - [getAvailableSubtitles](#rem-getAvailableSubtitles)
    - [getAverageBitrates](#rem-getAverageBitrates)
    - [getCurrentTime](#rem-getCurrentTime)
    - [getDebug / showDebug / hideDebug / toggleDebug](#rem-getDebug)
    - [getEndTime](#rem-getEndTime)
    - [getErrorCodes](#rem-static-error-codes)
    - [getErrorTypes](#rem-static-error-types)
    - [getImageTrack](#rem-getImageTrack)
    - [getLanguage](#rem-getLanguage)
    - [getMetrics](#rem-getMetrics)
    - [getStartTime](#rem-getStartTime)
    - [getSubtitle](#rem-getSubtitle)
    - [goToStart](#rem-goToStart)
    - [isLanguageAvailable / isSubtitleAvailable](#rem-isLanguageAvailable)
    - [normalizeLanguageCode](#rem-normalizeLanguageCode)
    - [setLanguage](#rem-setLanguage)
    - [setSubtitle](#rem-setSubtitle)
- [Changed methods](#chan)
    - [seekTo](#chan-seekTo)
    - [setVideoBitrate / setAudioBitrate](#chan-setVideoBitrate)
    - [getUrl](#chan-getUrl)
    - [isLive](#chan-isLive)
- [Removed events](#remev)
    - [currentTimeChange](#remev-currentTimeChange)
    - [progress](#remev-progress)
    - [languageChange](#remev-languageChange)
    - [subtitleChange](#remev-subtitleChange)
    - [nativeTextTrackChange](#remev-nativeTextTrackChange)
- [Changed events](#chanev)
    - [positionUpdate](#chanev-positionUpdate)

## <a name="general"></a>General Changes

### <a name="general-feat"></a>Features disabled by default

#### What Changed

Two features, previously activated by default, are now disabled by default.

Those features are:
  1. The automatic limitation of the video track to filter those with a width superior to the current video element's width.
  2. The automatic throttle on the audio and video bitrates set when the page is hidden for more than one minute.

If you want to activate the feature 1, you have to set the ``limitVideoWidth`` boolean to ``true`` in the constructor's option. For the feature 2, it is the ``throttleWhenHidden`` constructor's option you will have to set to ``true``.

If you had set them to ``false`` to disable them before, you can now safely remove those options from the constructor argument.

If you don't know what to do with them, you might want to disable both features (by not setting them on the constructor). They only are optimizations for specific usecases.

#### Examples

```js
// In the previous version
player = new RxPlayer();

// becomes
player = new RxPlayer({
  limitVideoWidth: true,
  throttleWhenHidden: true
});
```

```js
// In the previous version
player = new RxPlayer({
  limitVideoWidth: false,
  throttleWhenHidden: false
});

// becomes
player = new RxPlayer();
```

### <a name="general-lang"></a>Normalized language codes

#### What Changed

Previously, every language set in the manifest went through a translation step to be translated into an ISO 639-2 language code.

This led the following APIs:
  - ``getAvailableAudioTracks``
  - ``getAvailableTextTracks``
  - ``getAudioTrack``
  - ``getTextTrack``
  - ``getManifest``
  - ``getCurrentAdaptations``

To not reflect exactly the language as set in the manifest (just one of the ISO 639-2 translation of it). For example, ``"fra"`` was translated to ``"fre"`` (even though both are valid ISO 639-2 language codes for the same language).

Because this behavior hide the true language value and ISO 639-2 language codes have synonyms, we decided to:
  1. switch to ISO 639-3 language codes instead. This standard has more languages and does not have synonyms.
  2. keep both the information of what is set in the manifest and the result of our ISO 639-3 translation in two different properties

Now, the tracks returned by:
  - ``getAvailableAudioTracks``
  - ``getAvailableTextTracks``
  - ``getAudioTrack``
  - ``getTextTrack``

Will:
  1. keep the ``language`` property, though this time it is the exact same one than set in the manifest
  2. will also have a ``normalized`` property, which is the ISO 639-3 translation attempt. If the translation attempt fails (no corresponding ISO 639-3 language code is found), ``normalized`` will equal the value of ``language``.

Likewise for the adaptations with a language set returned by:
  - ``getManifest``
  - ``getCurrentAdaptations``

They will have both a ``language`` and a ``normalizedLanguage`` property, which follow the same rule.

#### Difference between the previous and new language codes used

In most cases, if you were manually checking language codes in your codebase you could just replace here the key ``language`` with its normalized counterpart (either ``normalized`` or ``normalizedLanguage`` depending on the API you're using, see previous chapter).

However, while switching from ISO 639-2 to ISO 639-3, some language codes have changed (all were synonyms in ISO 639-2):
  - ``"alb"`` became ``"sqi"`` (for Albanian)
  - ``"arm"`` became ``"hye"`` (for Armenian)
  - ``"baq"`` became ``"eus"`` (for Basque)
  - ``"bur"`` became ``"mya"`` (for Burmese)
  - ``"chi"`` became ``"zho"`` (for Chinese)
  - ``"dut"`` became ``"nld"`` (for Dutch, Flemish)
  - ``"fre"`` became ``"fra"`` (for French)
  - ``"geo"`` became ``"kat"`` (for Georgian)
  - ``"ice"`` became ``"isl"`` (for Icelandic)
  - ``"mac"`` became ``"mkd"`` (for Macedonian)
  - ``"mao"`` became ``"mri"`` (for Maori)
  - ``"may"`` became ``"msa"`` (for Malay)

#### Example
```js
console.log(player.getAvailableAudioTrack());

// For a manifest with two audiotracks: "fr" and "en" without audio description

// -- in the old version --:
const oldVersionResult = [
  {
    language: "fre", // translated from "fr"
    audioDescription: false,
    id: "audio_1"
  },
  {
    language: "eng", // translated from "en"
    audioDescription: false,
    id: "audio_2"
  }
];

// -- became --:
const result = [
  {
    language: "fr", // stays the same than in the manifest
    normalized: "fra", // translated from "fr"
                       // (notice that it's not "fre" like before)
    audioDescription: false,
    id: "audio_1"
  },
  {
    language: "en", // stays the same than in the manifest
    normalized: "eng", // translated from "en"
    audioDescription: false,
    id: "audio_2"
  }
];
```

## <a name="cons"></a>Constructor options

### <a name="cons-defaultLanguage"></a>defaultLanguage

#### What changed

This option has been removed from the constructor to simplify the API. Now you have to set the wanted transport per-``loadVideo`` calls via its ``defaultAudioTrack`` option.

#### Examples

Without audio description:
```js
// In the previous version
player = new RxPlayer({
  defaultLanguage: "en"
});

// becomes
player = new RxPlayer();
player.loadVideo({
  defaultAudioTrack: {
    language: "en"
  },
  // ...
});
```

With audio description:
```js
player = new RxPlayer();
player.loadVideo({
  defaultAudioTrack: {
    language: "en",
    audioDescription: true
  },
  // ...
});
```

### <a name="cons-defaultSubtitle"></a>defaultSubtitle

#### What changed

This option has been removed from the constructor to simplify the API. Now you have to set the wanted transport per-``loadVideo`` calls via its ``defaultTextTrack`` option.

#### Examples

Without closed caption:
```js
// In the previous version
player = new RxPlayer({
  defaultSubtitle: "en"
});

// becomes
player = new RxPlayer();
player.loadVideo({
  defaultTextTrack: {
    language: "en"
  },
  // ...
});
```

With closed caption:
```js
player = new RxPlayer();
player.loadVideo({
  defaultTextTrack: {
    language: "en",
    closedCaption: true
  },
  // ...
});
```

### <a name="cons-initVideoBitrate"></a>initVideoBitrate / initAudioBitrate

#### What changed

Those options just changed their name:
  - ``initVideoBitrate`` becomes ``initialVideoBitrate``
  - ``initAudioBitrate`` becomes ``initialAudioBitrate``

This is to mainly to add clarity to the API.

#### Examples

```js
// In the previous version
player = new RxPlayer({
  initVideoBitrate: 1e6,
  initAudioBitrateBitrate: 2e4
});

// becomes
player = new RxPlayer({
  initialVideoBitrate: 1e6,
  initialAudioBitrateBitrate: 2e4
});
```

### <a name="cons-defaultAudioTrack"></a>defaultAudioTrack

#### What changed

This option has been removed from the constructor to simplify the API. Now you have to set the wanted transport per-``loadVideo`` calls via its ``defaultAudioTrack`` option, which has the exact same format.

### <a name="cons-defaultTextTrack"></a>defaultTextTrack

#### What changed

This option has been removed from the constructor to simplify the API. Now you have to set the wanted transport per-``loadVideo`` calls via its ``defaultTextTrack`` option, which has the exact same format.

### <a name="cons-transport"></a>transport

#### What changed

This option has been removed from the constructor to simplify the API. Now you have to set the wanted transport per-``loadVideo`` calls via its ``transport`` option, which has the exact same format.

### <a name="cons-transportOptions"></a>transportOptions

#### What changed

This option has been removed from the constructor to simplify the API. Now you have to set the wanted transport options per-``loadVideo`` calls via its ``transportOptions`` option, which has the exact same format.

## <a name="load"></a>loadVideo

``loadVideo`` is the central method of the RxPlayer and changed enough to earn its own chapter.

Both parameters and the return value changed.

### <a name="load-return"></a>Return value

#### What changed

``loadVideo`` does not return anything anymore.

#### Replacement examples

If you want to know when the player is on error, you will have to listen to the ``error`` events:
```js
player.addEventListener("error", (error) => {
  console.log("content on error");
});
```

If you want to know when the content is loaded, you will have to listen to when the ``playerStateChange`` events:
```js
player.addEventListener("playerStateChange", (state) => {
  switch (state) {
    case "LOADING":
      console.log("the content is loading");
      break;
    case "LOADED":
      console.log("the content has loaded");
      break;
    case "PLAYING":
      console.log("the content is now playing");
      break;
  }
});
```

Bear in mind however that both are triggered when ANY content you choosed to play are loaded/on error, not just the last one.

### <a name="load-defaultLanguage"></a>defaultLanguage parameter

#### What changed

``defaultLanguage`` is replaced by the ``defaultAudioTrack`` option, which supports audio description.

#### Replacement example

Without audio description:
```js
// In the previous version
player.loadVideo({
  url: someURL,
  defaultLanguage: "en"
});

// becomes
player.loadVideo({
  url: someURL,
  defaultAudioTrack: {
    language: "en"
  }
});
```

With audio description:
```js
player.loadVideo({
  url: someURL,
  defaultAudioTrack: {
    language: "en",
    audioDescription: true
  }
});
```

### <a name="load-defaultSubtitle"></a>defaultSubtitle parameter

#### What changed

``defaultSubtitle`` is replaced by the ``defaultTextTrack`` option, which supports closed caption.

#### Replacement example

Without closed caption:
```js
// In the previous version
player.loadVideo({
  url: someURL,
  defaultSubtitle: "en"
});

// becomes
player.loadVideo({
  url: someURL,
  defaultTextTrack: {
    language: "en"
  }
});
```

With closed caption:
```js
player.loadVideo({
  url: someURL,
  defaultTextTrack: {
    language: "en",
    closedCaption: true
  }
});
```

### <a name="load-images"></a>images parameter

#### What changed

``images`` is renamed as ``supplementaryImageTracks`` for clarity.

#### Replacement example

```js
// In the previous version
player.loadVideo({
  url: someURL,
  images: {
    mimeType: "application/bif",
    url: "",
  },
});

// becomes
player.loadVideo({
  url: someURL,
  supplementaryImageTracks: {
    mimeType: "application/bif",
    url: "",
  },
});
```

### <a name="load-subtitles"></a>subtitles parameter

#### What changed

``subtitles`` is renamed as ``supplementaryTextTracks`` for clarity.

#### Replacement example

```js
// In the previous version
player.loadVideo({
  url: someURL,
  subtitles: {
    mimeType: "application/x-sami",
    url: "",
  },
});

// becomes
player.loadVideo({
  url: someURL,
  supplementaryTextTracks: {
    mimeType: "application/x-sami",
    url: "",
  },
});
```

### <a name="load-timeFragment"></a>timeFragment parameter

#### What changed

The ``timeFragment`` parameter has been completely removed.

If you want to start at a precize point in the stream, you can use the ``startAt`` parameter instead, documented [here](./loadVideo_options.md#prop-startAt).

If you want to end at a precize point in the stream, this has not been re-implemented as I do not know for now any usecase for that. Please open an issue if you need that feature.

### <a name="load-manifests">manifests parameter

#### What changed

The ``manifests`` parameter has been completely removed. Its behavior can easily be replaced by two existing options: ``url`` and ``keySystems``:
  - The url of the first object in the ``manifests`` array should be put in the ``url`` parameter
  - Each ``keySystem`` property defined in the ``manifests`` array should be put in the ``keySystems`` array, in the same order

Doing this should lead to the exact same behavior.

#### Replacement example

```js
// In the previous version
player.loadVideo({
  manifests: [
    {
      url: someURL1
      keySystem: keySystem1
    },
    {
      url: someURL2
    },
    {
      url: someURL3
      keySystem: keySystem3
    },
    {
      url: someURL4
      keySystem: keySystem4
    }
  ],
});

// becomes
player.loadVideo({
  url: someURL1,
  keySystems: [
    keySystem1,
    keySystem3,
    keySystem4
  ],
});
```

## <a name="rem"></a>Removed methods

### <a name="rem-setVideoMaxBitrate"></a>getVideoMaxBitrate / getAudioMaxBitrate / setVideoMaxBitrate / setAudioMaxBitrate

#### What changed

Those methods just changed their name to have a more coherent API:

  - ``setVideoMaxBitrate`` becomes ``setMaxVideoBitrate``
  - ``setAudioMaxBitrate`` becomes ``setMaxAudioBitrate``
  - ``getVideoMaxBitrate`` becomes ``getMaxVideoBitrate``
  - ``getAudioMaxBitrate`` becomes ``getMaxAudioBitrate``

This is mostly done to be aligned with the ``maxVideoBitrate`` and ``maxAudioBitrate`` constructor options.

#### Replacement examples

##### setVideoMaxBitrate

```js
// In the previous version
player.setVideoMaxBitrate(1500);

// becomes
player.setMaxVideoBitrate(1500);
```

##### setAudioMaxBitrate

```js
// In the previous version
player.setAudioMaxBitrate(999);

// becomes
player.setMaxAudioBitrate(999);
```

##### getVideoMaxBitrate

```js
// In the previous version
maxBitrate = player.getVideoMaxBitrate();

// becomes
maxBitrate = player.getMaxVideoBitrate();
```

##### getAudioMaxBitrate

```js
// In the previous version
maxBitrate = player.getAudioMaxBitrate();

// becomes
maxBitrate = player.getMaxAudioBitrate();
```

### <a name="rem-setVideoBufferSize"></a>setVideoBufferSize / setAudioBufferSize / getVideoBufferSize / getAudioBufferSize

#### What changed

Those four methods were removed to be replaced with simpler generic ``getWantedBufferAhead``/``setWantedBufferAhead`` methods. They also take seconds in argument.

The only difference is that you cannot discriminate by type of buffer (audio/video) anymore. This is for done for multiple reasons:

  - There are more than two types of buffers (for now there are four: audio, video, text and image). Adding one methods per type could be cumbersome for the user (for example, when wanting to set the limit for three or four of them)

  - More buffer-related APIs were added which are type-agnostic. Adding one per-type would be heavy both for the rx-player and for the application using it

  - It's easier to explain through the documentation, for people that do not want to understand the nitty-gritty of a player

  - We did not encounter any usecase for separate methods yet

#### Replacement examples

##### setVideoBufferSize

```js
// In the previous version
player.setVideoBufferSize(15);

// becomes (also affect audio, text and image buffer)
player.setWantedBufferAhead(15);
```

##### setAudioBufferSize

```js
// In the previous version
player.setAudioBufferSize(10);

// becomes (also affect video, text and image buffer)
player.setWantedBufferAhead(10);
```

##### getVideoBufferSize

```js
// In the previous version
bufferSize = player.getVideoBufferSize();

// becomes
bufferSize = player.getWantedBufferAhead();
```

##### getAudioBufferSize

```js
// In the previous version
bufferSize = player.getAudioBufferSize();

// becomes
bufferSize = player.setWantedBufferAhead();
```

### <a name="rem-asObservable"></a>asObservable

#### What Changed

``asObservable`` has been completely removed for the following reasons:

  - it exposed to much of the player. Guaranteeing compatibility between versions was too hard.

  - it exposed the internal Rxjs library, which we now stop to do for various reasons.

### <a name="rem-getAvailableLanguages"></a>getAvailableLanguages

#### What Changed

This method now has been completely replaced by ``getAvailableAudioTracks`` which add audio description support. See [the API documentation](./api/index.md) for more infos.

#### Replacement example

```js
// In the previous version
audioTracks = player.getAvailableLanguages();

if (audioTracks && audioTracks.length) {
  console.log("audio languages:", ...audioTracks);
} else {
  console.log("no audio language");
}

// -------------------------------

// becomes
audioTracks = player.getAvailableAudioTracks();

if (audioTracks && audioTracks.length) {
  console.log("audio languages:", ...audioTracks.map(track => track.language));
} else {
  console.log("no audio language");
}
```

### <a name="rem-getAvailableSubtitles"></a>getAvailableSubtitles

#### What Changed

This method now has been completely replaced by ``getAvailableTextTracks`` which add closed caption support. See [the API documentation](./api/index.md) for more infos.

#### Replacement example

```js
// In the previous version
subtitleTracks = player.getAvailableSubtitles();

if (subtitleTracks && subtitleTracks.length) {
  console.log("subtitle languages:", ...subtitleTracks);
} else {
  console.log("no subtitle language");
}

// -------------------------------

// becomes
subtitleTracks = player.getAvailableTextTracks();

if (subtitleTracks && subtitleTracks.length) {
  console.log("subtitle languages:", ...subtitleTracks.map(track => track.language));
} else {
  console.log("no subtitle language");
}
```

### <a name="rem-getAverageBitrates"></a>getAverageBitrates

#### What Changed

``getAverageBitrates`` is deleted. It can normally be completely replaced by the [bitrateEstimationChange event](./api/player_events.md#events-bitrateEstimationChange) which can be listened thanks to the [addEventListener method](./api/index.md#meth-addEventListener).

### <a name="rem-getCurrentTime"></a>getCurrentTime

#### What Changed

getCurrentTime was separated in two methods:
  - getWallClockTime: returns the wall-clock-time of the current position in seconds.
    That is:
      - for live content, get a timestamp in seconds of the current position.
      - for static content, returns the position from beginning, also in seconds.

    This is the closest implementation of getCurrentTime. The only difference being that for live contents, a timestamp will be returned (in seconds), not a Date object

  - getPosition: returns the video element's current position, in seconds. The difference with getWallClockTime is that for live contents the position is not re-calculated to match a live timestamp.

 If you do not know if you want to use getWallClockTime or getPosition:
   - If what you want is to display the current time to the user, you will most probably want to use getWallClockTime.
   - If what you want is to interact with the player's API or perform other
     actions with the real player data, use getPosition.

#### Replacement example

```js
// In the previous version
currentTime = player.getCurrentTime();

if (currentTime instanceof Date) {
  currentTime = currentTime.getTime() / 1000;
}

// -------------------------------

// becomes
currentTime = player.getWallClockTime();
```

### <a name="rem-getDebug"></a>getDebug / showDebug / hideDebug / toggleDebug

#### What Changed

Those will be removed from the API and won't be replaced.

Those methods were used internally, but were exposed like regular APIs.
They have not much usage either as other APIs should be sufficient.

### <a name="rem-getEndTime"></a>getEndTime

#### What Changed

``getEndTime`` was removed from the API. Its role can be replaced by the new ``getMaximumPosition`` API which will return the maximum position the user can seek to.

#### Replacement example

```js
// In the previous version
endTime = player.getEndTime();

// becomes
endTime = player.getMaximumPosition();
```

### <a name="rem-static-error-codes"></a>static getErrorCodes

#### What Changed

This static method was updated to a static property ``ErrorCodes``.

#### Replacement example

```js
// In the previous version
errorCodes = player.getErrorCodes();

// becomes
errorCodes = player.ErrorCodes;
```

### <a name="rem-static-error-types"></a>static getErrorTypes

#### What Changed

This static method was updated to a static property ``ErrorTypes``.

#### Replacement example

```js
// In the previous version
errorTypes = player.getErrorTypes();

// becomes
errorTypes = player.ErrorTypes;
```

### <a name="rem-getImageTrack"></a>getImageTrack

#### What Changed

``getImageTrack`` is now replaced by both:
  - the ``imageTrackUpdate`` event (the closest to ``getImageTrack`` previous behavior) triggered each time new image data is received with the complete image data as a payload (all the image data from the current image adaptation) in a ``data`` property.
  - the ``getImageTrackData`` method, which returns an array for all the currently referenced image data for the seekable content.

#### Replacement example

```js
// In the previous version
player.getImageTrack().subscribe(images => {
  displaySomeImages(images);
});

// becomes
player.addEventListener("imageTrackUpdate", ({ data }) => {
  displaySomeImages(data);
});
```

### <a name="rem-getLanguage"></a>getLanguage

#### What Changed

``getLanguage`` has been replaced by ``getAudioTrack`` which adds audio description support.

#### Replacement example

```js
// In the previous version
track = player.getLanguage();

if (track) {
  console.log("audio language:", track);
} else {
  console.log("no audio language");
}

// ------------------------

// becomes
track = player.getAudioTrack();

if (track) {
  console.log("audio language:", track.language);
} else {
  console.log("no audio language");
}
```

### <a name="rem-getMetrics"></a>getMetrics

#### What Changed

getMetrics is removed from the API and is not replaced. This is due to the fact that the ABR (adaptive bitrate) strategy completely changed, and re-implementing this method is not straightforward.

### <a name="rem-getStartTime"></a>getStartTime

#### What Changed

``getStartTime`` was removed from the API. Its role can be replaced by the new ``getMinimumPosition`` API which will return the minimum position the user can seek to.

#### Replacement example

```js
// In the previous version
startTime = player.getStartTime();

// becomes
startTime = player.getMinimumPosition();
```

### <a name="rem-getSubtitle"></a>getSubtitle

#### What Changed

``getSubtitle`` has been replaced by ``getTextTrack`` which adds closed caption support.

#### Replacement example

```js
// In the previous version
track = player.getSubtitle();

if (track) {
  console.log("text language:", track);
} else {
  console.log("no text language");
}

// ------------------------

// becomes
track = player.getTextTrack();

if (track) {
  console.log("text language:", track.language);
} else {
  console.log("no text language");
}
```

### <a name="rem-goToStart"></a>goToStart

#### What Changed

``goToStart`` is removed from the API and not replaced. You might want to use both ``getMinimumPosition`` and ``seekTo`` to seek to the earliest part of the stream.

#### Replacement example

```js
// In the previous version
player.goToStart();

// becomes
player.seekTo(player.getMinimumPosition());
```
##  <a name="rem-isLanguageAvailable"></a>isLanguageAvailable / isSubtitleAvailable

#### What Changed

Those methods are removed and not replaced. Use ``getAvailableAudioTracks`` / ``getAvailableTextTracks`` instead.

#### Replacement examples

##### isLanguageAvailable

```js
// In the previous version
console.log(player.isLanguageAvailable("fr"));

// becomes
const tracks = player.getAvailableAudioTracks();
console.log(!!tracks && tracks.some(({ language }) => language === "fr"));
```

##### isSubtitleAvailable

```js
// In the previous version
console.log(player.isSubtitleAvailable("fr"));

// becomes
const tracks = player.getAvailableTextTracks();
console.log(!!tracks && tracks.some(({ language }) => language === "fr"));
```

### <a name="rem-normalizeLanguageCode"></a>normalizeLanguageCode

#### What Changed

``normalizeLanguageCode`` is removed and not replaced. Switching audio and text tracks is now
id-based, so the language code has much less use than before.

### <a name="rem-setLanguage"></a>setLanguage

#### What Changed

``setLanguage`` has been replaced by ``setAudioTrack`` which adds audio description support.

#### Replacement example

```js
// In the previous version
try {
  player.setLanguage("fr");
} catch(e) {
  console.warn("no track found with this language");
}

// -------------------------

// becomes
track = player.getAvailableAudioTracks();
const indexOf = tracks && tracks.indexOf(({ language }) => language === "fr");

if (tracks && indexOf !== -1) {
  player.setAudioTrack(tracks[indexOf].id);
} else {
  console.warn("no track found with this language");
}
```

### <a name="rem-setSubtitle"></a>setSubtitle

#### What Changed

``setSubtitle`` has been replaced by ``setTextTrack`` which adds closed caption support.

#### Replacement example

```js
// In the previous version
try {
  player.setSubtitle("fr");
} catch(e) {
  console.warn("no track found with this language");
}

// -------------------------

// becomes
track = player.getAvailableTextTracks();
const indexOf = tracks && tracks.indexOf(({ language }) => language === "fr");

if (tracks && indexOf !== -1) {
  player.setTextTrack(tracks[indexOf].id);
} else {
  console.warn("no track found with this language");
}
```

## <a name="chan"></a>Changed methods

### <a name="chan-seekTo"></a>seekTo

#### What Changed

In the previous version, you could give directly a Number or Date object to ``seekTo``. What it would do with that depended on if the content was a live content or not:
  - for live content, a time in milliseconds or a Date object was expected corresponding to the WallClock time (timestamp of the live content)
  - for non-live content, the time in seconds was expected, which was the time the video tag seek to.

Now, you can only give a number or an Object to this function. If you give a number, it will allways be the new time in seconds the video tag will seek to. This call is documented [here](./api/index.md#meth-seekTo).

#### Replacement example

To copy the old behavior for live contents, you can set the ``wallClockTime`` property:
```js
// seeking at 30 minute before now on what is broadcasted live

// In the previous version:
player.seekTo(Date.now() - 30*60 * 1000);

// becomes
player.seekTo({ wallClockTime: Date.now() / 1000 - 30*60});
```

To copy the old behavior for non-live contents, nothing has changed:
```js
// seek to the tenth second for a non live content

// In the previous version:
player.seekTo(10);

// becomes
player.seekTo(10);
```

### <a name="chan-setVideoBitrate"></a>setVideoBitrate / setAudioBitrate

#### What Changed

Previously, calling this method in the following situation threw an error:
  - no content is playing
  - the set bitrate does not exist

Now, this call never throws:
  - if you call it while no content is playing, the limit is still set for the next content played.
  - if the set bitrate does not exist on the current content, the value will just act as a ceil (the chosen bitrate will be the one immediately inferior). If still no bitrate is inferior to it, the lowest bitrate will be chosen instead.

### <a name="chan-getUrl"></a>getUrl

#### What Changed

Previously, calling this method when no content is playing threw an error.

Now, doing so will just return ``undefined``.

### <a name="chan-isLive"></a>isLive

#### What Changed

Previously, calling this method when no content is playing threw an error.

Now, doing so will just return ``false``.

## <a name="remev"></a>Removed events

### <a name="remev-currentTimeChange"></a>

#### What Changed

The ``currentTimeChange`` is replaced by the ``positionUpdate`` event.

It is similar to ``currentTimeChange`` but with the following properties removed:
  - ``buffered``
  - ``paused``
  - ``range``
  - ``readyState``
  - ``stalled``
  - ``ts`` (replaced by ``position``)
  - ``playback`` (replaced by ``playbackRate``)
  - ``gap`` (replaced by ``bufferGap``)

And with the following property updated:
  - ``wallClockTime``: will go from a Date object to the same indication in seconds.

### <a name="remev-progress"></a>progress

#### What Changed

``progress`` events are removed and not replaced. This is because it exposed to much of our internal logic.

### <a name="remev-languageChange"></a>languageChange

#### What Changed

``languageChange`` is replaced by the ``audioTrackChange`` event, which supports audio description.

#### Replacement example

```js
// In the previous version
player.addEventListener("languageChange", (lang) => {
  console.log("language changed to", lang);
});

// becomes
player.addEventListener("audioTrackChange", (track) => {
  const { language, id, audioDescription } = track;
  console.log("language changed to", language);
});
```

### <a name="remev-subtitleChange"></a>subtitleChange

#### What Changed

``subtitleChange`` is replaced by the ``textTrackChange`` event, which supports closed caption.

#### Replacement example

```js
// In the previous version
player.addEventListener("subtitleChange", (lang) => {
  console.log("subtitle changed to", lang);
});

// becomes
player.addEventListener("textTrackChange", (track) => {
  const { language, id, closedCaption } = track;
  console.log("language changed to", language);
});
```

### <a name="remev-nativeTextTrackChange"></a>nativeTextTrackChange

#### What Changed

``nativeTextTrackChange`` is replace by the ``nativeTextTracksChange`` (notice the supplementary "s") event.

Three things have changed comparatively:
  - The payload of this event now is an array of ``TextTrack`` element. Previously, it was a single ``TextTrackElement`` (which correspond to the first in the array).
  - The event is also triggered when a ``TextTrackElement`` is removed from the ``<video>`` tag. Previously, it was only when added.
  - The event is fired even if no content is playing

This is to support edge cases where the ``<track>`` element could be modified by the user of our library, in which case the RxPlayer could give false informations. Also, this allows to signal when a ``TextTrack`` has been removed from the DOM to help you free up ressources on your side.

#### Replacement example

```js
// In the previous version
player.addEventListener("nativeTextTrackChange", (track) => {
  console.log("the track changed:", track);
});

// becomes
player.addEventListener("nativeTextTracksChange", (tracks) => {
  if (tracks.length === 0) {
    console.log("no active track!");
  } else {
    // in most usecases you can just check the first element.
    // (this will have the exact same effect than the previous event)
    console.log("the track changed:", tracks[0]);
  }
});
```

## <a name="chanev"></a>Changed events

### <a name="chanev-positionUpdate"></a>positionUpdate

#### What Changed

The ``maximumBufferTime`` property has now been removed from ``positionUpdate`` events. This is because this is now the exact same thing than:
  - ``liveGap + position`` (from the same event) for live contents
  - ``duration`` (from the same event) for non-live contents
