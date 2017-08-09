# Deprecated list

# Table of Contents

- [overview](#overview)
- [A note about the Subtitle and Language APIs](#notes)
  - [Why changing the name?](#notes-why)
  - [API change](#notes-api)
- [Deprecated methods](#meth)
  - [setVideoBufferSize (replaced/updated)](#meth-setVideoBufferSize)
  - [setAudioBufferSize (replaced/updated)](#meth-setAudioBufferSize)
  - [getVideoBufferSize (replaced/updated)](#meth-getVideoBufferSize)
  - [getAudioBufferSize (replaced/updated)](#meth-getAudioBufferSize)
  - [getStartTime (replaced/updated)](#meth-getStartTime)
  - [getEndTime (replaced/updated)](#meth-getEndTime)
  - [goToStart (replaced/updated)](#meth-goToStart)
  - [getImageTrack (replaced)](#meth-getImageTrack)
  - [getCurrentTime (replaced/updated)](#meth-getCurrentTime)
  - [seekTo(WallClockTime) (updated)](#meth-seekTo)
  - [getMetrics (removed)](#meth-getMetrics)
  - [getAverageBitrates (removed)](#meth-getAverageBitrates)
  - [asObservable (removed)](#meth-asObservable)
  - [getDebug (removed)](#meth-getDebug)
  - [showDebug (removed)](#meth-showDebug)
  - [hideDebug (removed)](#meth-hideDebug)
  - [toggleDebug (removed)](#meth-toggleDebug)
  - [getVideoMaxBitrate (renamed)](#meth-setVideoMaxBitrate)
  - [getAudioMaxBitrate (renamed)](#meth-setAudioMaxBitrate)
  - [setVideoMaxBitrate (renamed)](#meth-setVideoMaxBitrate)
  - [setAudioMaxBitrate (renamed)](#meth-setAudioMaxBitrate)
  - [setFullscreen(false) (replaced/updated)](#meth-setFullscreen)
  - [getErrorTypes (renamed)](#meth-static-error-types)
  - [getErrorCodes (renamed)](#meth-static-error-codes)
  - [getAvailableLanguages (replaced/updated)](#meth-getAvailableLanguages)
  - [getAvailableSubtitles (replaced/updated)](#meth-getAvailableSubtitles)
  - [getLanguage (replaced/updated)](#meth-getLanguage)
  - [getSubtitle (replaced/updated)](#meth-getSubtitle)
  - [isLanguageAvailable (replaced/updated)](#meth-isLanguageAvailable)
  - [isSubtitleAvailable (replaced/updated)](#meth-isSubtitleAvailable)
  - [setLanguage (replaced/updated)](#meth-setLanguage)
  - [setSubtitle (replaced/updated)](#meth-setSubtitle)
- [Deprecated parameters](#options)
  - [loadVideo parameter timeFragment (replaced/updated)](#options-timeFragment)
  - [constructor parameter initVideoBitrate (renamed)](#options-initVideoBitrate)
  - [constructor parameter initAudioBitrate (renamed)](#options-initAudioBitrate)
  - [constructor and loadVideo parameter defaultLanguage (renamed/updated)](#options-defaultLanguage)
  - [constructor and loadVideo parameter defaultSubtitle (renamed/updated)](#options-defaultSubtitle)
  - [loadVideo parameter images (renamed)](#options-images)
  - [loadVideo parameter subtitles (renamed)](#options-subtitles)
- [Deprecated events](#events)
    - [currentTimeChange (replaced/updated)](#events-currentTimeChange)
    - [progress (removed)](#events-progress)
    - [languageChange (renamed/updated)](#events-languageChange)
    - [subtitleChange (renamed/updated)](#events-subtitleChange)

# <a name="overview"></a>Overview

This document is written to list and explain current deprecated calls and suggest more stable alternatives.

Currently, a large part of the API is deprecated, this is due to several facts:
  - the project goes from a relatively "slow" phase to a faster paced one, with new features and improvements coming.
  - the support of audio description and closed captions could led to an API breaking change if left that way. The update concerns A LOT of APIs (8 methods, 4 parameters and 2 events)
  - the upcoming ABR refacto will need to remove some APIs (getMetrics and getAverageBitrates)
  - new APIs had to be added.
  - the API was not consistent.

I understand that replacing otherwise functional code is not "fun", the current state is exceptional and will not be repeated to that extent.

Please note, that everything listed here still works until the next major release (v3.0.0).

## <a name="notes"></a>A note about the Subtitle and Language APIs

### <a name="notes-why"></a>Why changing the name?

All language-related API changed their name:
  - methods about the audio language now use the denomination "*AudioTrack" instead of "*Language"
  - methods about the subtitles language now use the denomination "*TextTrack" instead of "*Subtitle"

This is due to multiple reasons:
  - the word "language" is ambiguous here, and could apply to both audio and texts.
  - the API changed to add support for closed captions and audio description, and I do not want to break so many API calls without deprecating them first
  - as a user, we never know when to use "Subtitle" or "Subtitles" as both can be used as a singular form.
  - The word TextTrack for referring to subtitles is more idiomatic in the browser world than the word SubtitlesTrack. Subtitles are generally just translations, where TextTracks can be under several forms, most notably: "subtitles", "captions" and "descriptions".
  - TextTrack sounds good, refers to what we already call the "text" adaptation and is close to the AudioTrack name, so it leads to a more coherent and easy-to-remember API.

### <a name="notes-api"></a>API change

The new format for AudioTracks (previously Language) and TextTracks (previously Subtitle) changed, to support audio description (for the visually impaired), and closed captions (for the hard-of-hearing).

#### Format of a track

Basically, the new format for AudioTracks goes from:
```js
"fre"
```

to

```js
{
  id: "someId",
  language: "fre",
  audioDescription: false
}
```
(Of course, audioDescription is ``true`` when the track is... an audioDescription track).

And the new format for subtitles tracks goes from:
```js
"fre"
```
to:
```js
{
  id: "someId"
  language: "fre",
  closedCaption: false
}
```

#### Track getters

The format just defined in the previous chapter is what will be returned by the getters call:
  - getAudioTrack
  - getTextTrack

These two methods:
  - getAvailableTextTracks
  - getAvailableAudioTracks
Will have a supplementary property, ``active``, which is a boolean. If true, it means that the track is the one considered "active".

#### Track events

Same deal for the track events:
  - audioTrackChange
  - textTrackChange

They will both return the new format.

#### Track setters

When using the following methods:
  - setAudioTrack
  - setTextTrack

you now have to pass the __id__ part of a track.

For example:
```js
const tracks = player.getAvailableAudioTracks();

// setting the first track
player.setAudioTrack(tracks[0].id);
```

#### track options

For:
  - the ``defaultAudioTrack`` option in the constructor, ``loadVideo``
  - the ``defaultTextTrack`` option in the constructor, ``loadVideo``

You can either give:
  - a track object, without the id part.

    Such as:
    ```js
    {
      language: "fr",
      audioDescription: true
    }
    ```

    In which case, the first track respecting these conditions (here french audio with audioDescription) will be considered.

  - a string of the language you want.

    For example, for ``defaultAudioTrack``, ``"fre"`` is accepted and is inferred to be equal to ``{ language: "fre", audioDescription: false }``.


## <a name="meth"></a>Deprecated methods

### <a name="meth-setVideoBufferSize"></a>setVideoBufferSize

``setVideoBufferSize`` will be removed from the API. Its role can eventually be replaced by the new ``setWantedBufferAhaead`` API which will set the buffering goal (buffer size).

The only difference being than this is not type-related (as in audio/video types) anymore.

#### Why?

Same reason than ``getAudioBufferSize``, ``getVideoBufferSize``, ``setAudioBufferSize``:

Many buffer-related APIs have been added, and trying to set everything per-type would bring a much more complicated code / difficult to explain API for not enough advantages. Also, the text buffer could not be modified until then.

### <a name="meth-setAudioBufferSize"></a>setAudioBufferSize

``setAudioBufferSize`` will be removed from the API. Its role can eventually be replaced by the new ``setWantedBufferAhaead`` API which will set the buffering goal (buffer size).

The only difference being than this is not type-related (as in audio/video types) anymore.

#### Why?

Same reason than ``getAudioBufferSize``, ``getVideoBufferSize``, ``setVideoBufferSize``:

Many buffer-related APIs have been added, and trying to set everything per-type would bring a much more complicated code / difficult to explain API for not enough advantages. Also, the text buffer could not be modified until then.


### <a name="meth-getVideoBufferSize"></a>getVideoBufferSize

``getVideoBufferSize`` will be removed from the API. Its role can eventually be replaced by the new ``getWantedBufferAhaead`` API which will return the buffering goal (buffer size).

The only difference being than this is not type-related (as in audio/video types) anymore.

#### Why?

Same reason than ``getAudioBufferSize``, ``setAudioBufferSize``, ``setVideoBufferSize``:

Many buffer-related APIs have been added, and trying to set everything per-type would bring a much more complicated code / difficult to explain API for not enough advantages. Also, the text buffer could not be modified until then.

### <a name="meth-getAudioBufferSize"></a>getAudioBufferSize

``getAudioBufferSize`` will be removed from the API. Its role can eventually be replaced by the new ``getWantedBufferAhaead`` API which will return the buffering goal (buffer size).

The only difference being than this is not type-related (as in audio/video types) anymore.

#### Why?

Same reason than ``getVideoBufferSize``, ``setAudioBufferSize``, ``setVideoBufferSize``:

Many buffer-related APIs have been added, and trying to set everything per-type would bring a much more complicated code / difficult to explain API for not enough advantages. Also, the text buffer could not be modified until then.

### <a name="meth-getStartTime"></a>getStartTime

``getStartTime`` will be removed from the API. Its role can eventually be replaced by the new ``getMinimumPosition`` API which will return the minimum position the user can seek to.

#### Why?

(Same reason than ``getEndTime`` and ``goToStart``:)

This method is part of the timeFragment API which was too complex to maintain and add evolutions to. From the creation of the new and more powerful ``loadVideo`` argument ``startAt``, documented [here](./loadVideo_options.md#prop-startAt), ``timeFragment.start`` causes more problems than it resolves.

A real, and more simple, ``timeFragment`` replacement might be added in the future but I have too few usecases in mind for it. Let me know if you actually need this feature (and why) in the issues.

### <a name="meth-getEndTime"></a>getEndTime

``getEndTime`` will be removed from the API. Its role can eventually be replaced by the new ``getMaximumPosition`` API which will return the maximum position the user can seek to.

#### Why?

(Same reason than ``getStartTime`` and ``goToStart``:)

This method is part of the timeFragment API which was too complex to maintain and add evolutions to. From the creation of the new and more powerful ``loadVideo`` argument ``startAt``, documented [here](./loadVideo_options.md#prop-startAt), ``timeFragment.start`` causes more problems than it resolves.

A real, and more simple, ``timeFragment`` replacement might be added in the future but I have too few usecases in mind for it. Let me know if you actually need this feature (and why) in the issues.

### <a name="meth-goToStart"></a>goToStart

``goToStart`` will be removed from the API. Its role can eventually be replaced by the new ``getMinimumPosition`` API which will return the minimum position the user can seek to:
```js
player.seekTo({
  position: player.getMinimumPosition()
})
```
#### Why?

(Same reason than ``getStartTime`` and ``getEndTime``:)

This method is part of the timeFragment API which was too complex to maintain and add evolutions to. From the creation of the new and more powerful ``loadVideo`` argument ``startAt``, documented [here](./loadVideo_options.md#prop-startAt), ``timeFragment.start`` causes more problems than it resolves.

A real, and more simple, ``timeFragment`` replacement might be added in the future but I have too few usecases in mind for it. Let me know if you actually need this feature (and why) in the issues.

### <a name="meth-getImageTrack"></a>getImageTrack

``getImageTrack`` will be removed from the API. For now, it is replaced by both:
  - the ``imageTrackUpdate`` event (the closest to ``getImageTrack`` previous behavior) triggered each time new image data is received with the image data as a payload (all the image data from the current image adaptation) in a ``data`` property.
  - ``getImageTrackData``, which returns an array for all the currently referenced image data for the seekable content.

#### Why?

It exposes our internal rxjs library through our APIs, which will tend to not do anymore, as:
  - if RxJS has a breaking change and we update it, we have a high chance of having a breaking change through our API (some operator might not work anymore)
  - the library user has to learn this specific library from a specific version.
  - if the library user imports RxJS (or other observable libraries) in his/her codebase but in a different version, it could lead to an impossible-to-follow codebase (some observables use a syntax, other an other).
  - for event handling, event listeners are idiomatic and simple-to-use enough for every JavaScript developer to use a callback system with no effort.

Also it uses the ``getXTrack`` pattern which has a different meaning now (informations about the current X adaptation) in our API.

### <a name="meth-getCurrentTime"></a>getCurrentTime

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

#### Example

```js
// displaying a GUI for the user's current position
const time = player.getWallClockTime();
document.getElementById("current-position").innerHTML = time;

// using the video position
player.pause();
const videoElement = document.getElementsByTagName("VIDEO")[0];
const videoPosition = player.getPosition();
console.log(videoElement.currentTime === position); // This is true
```

#### Why?

getCurrentTime was:
  - not a simple API: returns a Date Object (which is generally converted into ms) in some case, a Number (in seconds) in other
  - not coherent with a new API, getSegment, which just use the current video time, regardless of if we are playing a live content or not.
  - not clear enough of what the difference were when compared to videoElement.currentTime

### <a name="meth-seekTo"></a>seekTo(wallClockTime)

seekTo takes now an object with either one of those 3 properties:
  - ``relative`` (``{Number}``): the relative time, in seconds, you want to seek to compared to the current posision.

  - ``position`` (``{Number}``): the absolute position, in seconds, you want the video element to seek to.

  - ``wallClockTime`` (``{Number}``): the wall-clock-time, in seconds you want the video element to seek to.

#### Example

```js
// seeking 5 seconds in the past
player.seekTo({ relative: -5 });

// seeking at 50s in the content
player.seekTo({ position: 50 });

// seeking at 30 minute before now on what is broadcasted live
player.seekTo({ wallClockTime: Date.now() / 1000 - 30*60});
```

#### Why?

The seekTo method has been updated for mostly the same reasons than getCurrentTime:
  - it expected a milliseconds timestamp for live contents, and a second time for non-linear contents
  - what it did was cryptic when compared to ``videoElement.currentTime = newPosition``.

### <a name="meth-getMetrics"></a>getMetrics

getMetrics will be removed from the API and won't be replaced

#### Why?

This API has few usages and guarenteeing to not break the API with the upcoming adaptive enhancements is an inconvenience.

Also, it exposes our internal rxjs library through our APIs, which will tend to not do anymore, as:
  - if RxJS has a breaking change and we update it, we have a high chance of having a breaking change through our API (some operator might not work anymore)
  - the library user has to learn this specific library from a specific version.
  - if the library user imports RxJS (or other observable libraries) in his/her codebase but in a different version, it could lead to an impossible-to-follow codebase (some observables use a syntax, other an other).
  - for event handling, event listeners are idiomatic and simple-to-use enough for every JavaScript developer to use a callback system with no effort.

### <a name="meth-getAverageBitrates"></a>getAverageBitrates

getAverageBitrates will be removed from the API and won't be replaced.

You can still use the event ``"audioBitrateChange"`` and ``"videoBitrateChange"`` through the ``addEventListener`` method.

#### Why?

This API has few usages and guarenteeing to not break the API with the upcoming adaptive enhancements is an inconvenience.

Also, it exposes our internal rxjs library through our APIs, which will tend to not do anymore, as:
  - if RxJS has a breaking change and we update it, we have a high chance of having a breaking change through our API (some operator might not work anymore)
  - the library user has to learn this specific library from a specific version.
  - if the library user imports RxJS (or other observable libraries) in his/her codebase but in a different version, it could lead to an impossible-to-follow codebase (some observables use a syntax, other an other).
  - for event handling, event listeners are idiomatic and simple-to-use enough for every JavaScript developer to use a callback system with no effort.

### <a name="meth-asObservable"></a>asObservable

asObservable will be removed from the API and won't be replaced

#### Why?

This API is a pain to not break as it exposes a too large part of our internal code.

It has not much usage either as other APIs should be sufficient to report progression and problems.

Also, it exposes our internal rxjs library through our APIs, which will tend to not do anymore, as:
  - if RxJS has a breaking change and we update it, we have a high chance of having a breaking change through our API (some operator might not work anymore)
  - the library user has to learn this specific library from a specific version.
  - if the library user imports RxJS (or other observable libraries) in his/her codebase but in a different version, it could lead to an impossible-to-follow codebase (some observables use a syntax, other an other).
  - for event handling, event listeners are idiomatic and simple-to-use enough for every JavaScript developer to use a callback system with no effort.

### <a name="meth-getDebug"></a>getDebug

getDebug will be removed from the API and won't be replaced

#### Why?

This method was used internally, but was exposed like a regular API.

It has not much usage either as other APIs should be sufficient.

### <a name="meth-showDebug"></a>showDebug

showDebug will be removed from the API and won't be replaced

#### Why?

This method was used internally, but was exposed like a regular API.

### <a name="meth-hideDebug"></a>hideDebug

hideDebug will be removed from the API and won't be replaced

#### Why?

This method was used internally, but was exposed like a regular API.

It has not much usage either as other APIs should be sufficient.

### <a name="meth-toggleDebug"></a>toggleDebug

toggleDebug will be removed from the API and won't be replaced

#### Why?

This method was used internally, but was exposed like a regular API.

It has not much usage either as other APIs should be sufficient.

### <a name="meth-getVideoMaxBitrate"></a>getVideoMaxBitrate

This method just changed its name to ``getMaxVideoBitrate``. Nothing else changes.

#### Why?

This is more coherent with the ``maxVideoBitrate`` option we already have.

### <a name="meth-getAudioMaxBitrate"></a>getAudioMaxBitrate

This method just changed its name to ``getMaxAudioBitrate``. Nothing else changes.

#### Why?

This is more coherent with the ``maxAudioBitrate`` option we already have.

### <a name="meth-setVideoMaxBitrate"></a>setVideoMaxBitrate

This method just changed its name to ``setMaxVideoBitrate``. Nothing else changes.

#### Why?

This is more coherent with the ``maxVideoBitrate`` option we already have.

### <a name="meth-setAudioMaxBitrate"></a>setAudioMaxBitrate

This method just changed its name to ``setMaxAudioBitrate``. Nothing else changes.

#### Why?

This is more coherent with the ``maxAudioBitrate`` option we already have.

### <a name="meth-setFullscreen"></a>setFullscreen(false)

Calling setFullscreen with the false argument (to exit fullscreen mode) is deprecated. You should use the
``exitFullscreen`` method instead.

#### Example
```js
// entering fullscreen mode -- did not change
player.setFullscreen();

// exiting fullscreen mode -- previously player.setFullscreen(false)
player.exitFullscreen();
```

#### Why?

It's more clear to use.

### <a name="meth-static-error-types"></a>static getErrorTypes

This static method was updated to a static property ``ErrorTypes``.

#### Example
```js
// equivalent to the old player.getErrorTypes();
const errorTypes = player.ErrorTypes;
```

#### Why?

This is more idiomatic in a browser environment to expose this list as a static property.

### <a name="meth-static-error-codes"></a>static getErrorCodes

This static method was updated to a static property ``ErrorCodes``.

#### Example

```js
// equivalent to the old player.getErrorCodes();
const errorCodes = player.ErrorCodes;
```

#### Why?

This is more idiomatic in a browser environment to expose this list as a static property.

### <a name="meth-getAvailableLanguages"></a>getAvailableLanguages

This call has been replaced by ``getAvailableAudioTracks``.

It now supports audio description. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// equivalent to const tracksLanguages = player.getAvailableLanguages();
const tracks = player.getAvailableAudioTracks();
const tracksLanguages = tracks.map(t => t.language);
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="meth-getAvailableSubtitles"></a>getAvailableSubtitles

This call has been replaced by ``getAvailableTextTracks``.

It now supports closed caption. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// equivalent to const tracksLanguages = player.getAvailableSubtitles();
const tracks = player.getAvailableTextTracks();
const tracksLanguages = tracks.map(t => t.language);
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="meth-getLanguage"></a>getLanguage

This call has been replaced by ``getAudioTrack``.

It now supports audio description. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// equivalent to const tracksLanguages = player.getLanguage();
const track = player.getAudioTrack();
const trackLanguage = track.language;
const hasAudioDescription = track.audioDescription;
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="meth-getSubtitle"></a>getSubtitle

This call has been replaced by ``getTextTrack``.

It now supports closed caption. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// equivalent to const tracksLanguages = player.getSubtitle();
const track = player.getTextTrack();
const trackLanguage = track.language;
const hasClosedCaption = track.closedCaption;
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="meth-isLanguageAvailable"></a>isLanguageAvailable

This method is not replaced.

#### Why?

There is no sufficient usecase to keep this method in our API. Either way, you will need an __id__ to update the track, so you might as well get all the current audioTracks;

See [the note](#notes-why) at the top for more informations.

### <a name="meth-isSubtitleAvailable"></a>isSubtitleAvailable

This method is not replaced.

#### Why?

There is no sufficient usecase to keep this method in our API. Either way, you will need an __id__ to update the track, so you might as well get all the current audioTracks;

See [the note](#notes-why) at the top for more informations.

### <a name="meth-setLanguage"></a>setLanguage

This call has been replaced by ``setAudioTrack``.

It now supports audio description. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// setting the first track
const tracks = player.getAudioTracks();
player.setAudioTrack(tracks[0].id);
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="meth-setSubtitle"></a>setSubtitle

This call has been replaced by ``setTextTrack``.

It now supports closed caption. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// setting the first track
const tracks = player.getTextTracks();
player.setTextTrack(tracks[0].id);
```

#### Why?

See [the note](#notes-why) at the top.

## <a name="options"></a>Deprecated parameters

### <a name="options-timeFragment"></a>loadVideo parameter timeFragment

This option is deprecated in favor of just [startAt](#loadVideo_options.md#prop-startAt), which replaces ``timeFragment.start`` for now.

#### Why?

The timeFragment API was too complex to maintain and add evolutions to. Especially when adding notions of configurable initial liveGap (now easily doable through ``startAt.fromLastPosition``).

Let me know if you actually need this parameter (and why) in the issues.


### <a name="options-initAudioBitrate"></a>constructor option initAudioBitrate

This option has been renamed to ``initialAudioBitrate``.

#### Why?

``initAudioBitrate`` is an ambiguous name. "init" is more often used as a short form of the verb "initialize" than for "initial".

By setting it to ``initialAudioBitrate``, its role is completely clear.

### <a name="options-initVideoBitrate"></a>constructor option initVideoBitrate

This option has been renamed to ``initialVideoBitrate``.

#### Why?

``initVideoBitrate`` is an ambiguous name. "init" is more often used as a short form of the verb "initialize" than for "initial".

By setting it to ``initialVideoBitrate``, its role is completely clear.

### <a name="options-defaultLanguage"></a>constructor and loadVideo option defaultLanguage

This option has been replaced by ``defaultAudioTrack``.

It now supports audio description. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// setting a default track at instantiation
const player = new RxPlayer({
  defaultAudioTrack: {
    language: "fre",
    audioDescription: false
  }
});


// setting a default track when loading a video
player.loadVideo({
  url,
  defaultAudioTrack: {
    language: "eng",
    audioDescription: true
  }
});
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="options-defaultSubtitle"></a>constructor and loadVideo option defaultSubtitle

This option has been replaced by ``defaultTextTrack``.

It now supports closed caption. The API changed, read [the note](#notes-api) for more info.

#### Example

```js
// setting a default track at instantiation
const player = new RxPlayer({
  defaultTextTrack: {
    language: "fre",
    closedCaption: false
  }
});


// setting a default track when loading a video
player.loadVideo({
  url,
  defaultTextTrack: {
    language: "eng",
    closedCaption: true
  }
});
```

#### Why?

See [the note](#notes-why) at the top.

### <a name="options-defaultSubtitle"></a>loadVideo parameter images

This option, which is used to add supplementary image adaptations in the downloaded manifest, has been renamed to ``supplementaryImageTracks``.

#### Why?

The ``images`` option was not indicative enough of what the option is for. Moreover, it adds (and not replace) image tracks to the one already present in the downloaded manifest.

### <a name="options-defaultSubtitle"></a>loadVideo parameter subtitles

This option, which is used to add supplementary image adaptations in the downloaded manifest, has been renamed to ``supplementaryTextTracks``.

#### Why?

The ``subtitles`` option was not indicative enough of what the option is for. Moreover, it adds (and not replace) image tracks to the one already present in the downloaded manifest.

## <a name="events"></a>Deprecated events

### <a name="events-currentTimeChange"></a>currentTimeChange

The ``currentTimeChange`` payload will be replaced by the ``positionUpdate`` event in the next major version (``3.0.0``).

The following properties are considered for it:
  - ``position`` (``Number``): The current position in the video, in seconds.
  - ``duration`` (``Number``): The duration of the content.
  - ``bufferGap`` (``Number``): The gap, in seconds, between the current position and the end of the current buffered range.
  -  ``playbackRate`` (``Number``): The current playback rate the content is on.
  - ``liveGap`` (``Number|undefined``): Only for live contents. The gap between the current position and the "live".
  - ``wallClockTime`` (``Number|undefined``): Only for live contents. The current time converted to wall-clock time in seconds. That is the real live position (and not the position as announced by the video element).

That is, similar to ``currentTimeChange`` but with the following properties removed:
  - ``buffered``
  - ``paused``
  - ``range``
  - ``readyState``
  - ``stalled``
  - ``ts`` (replaced by ``position``)
  - ``gap`` (replaced by ``bufferGap``)
  - ``playback`` (replaced by ``playbackRate``)

And with the following property updated:
  - ``wallClockTime``: will go from a Date object to the same indication in seconds.

#### Why?

There are various reasons for these changes:
  1. Too much was exposed with this API, but nothing was documented.
  2. ``wallClockTime`` had to be aligned with the new ``getWallClockTime`` API.
  3. ``ts`` is badly named for the API. It is now aligned with the ``getPosition`` API.
  4. ``positionUpdate`` name is close to the ``timeupdate`` HTML5 event while being aligned with the ``getPosition`` API.
  5. Multiple properties should not be needed by a user (``buffered``, ``readyState``)

### <a name="events-progress"></a>progress

The event "progress" will be removed and not replaced.

#### Why?

I do not see any reason for an user to access the segment data if not for plugging its own downloader logic (already implemented through the loadVideo's ``segmentLoader`` transport options).

### <a name="events-languageChange"></a>languageChange

This event is being replaced by the ``audioTrackChange`` event.

It now supports audio description. The API changed, read [the note](#notes-api) for more info.

#### Why?

See [the note](#notes-why) at the top.

### <a name="events-subtitleChange"></a>subtitleChange

This event is being replaced by the ``textTrackChange`` event.

It now supports closed captions. The API changed, read [the note](#notes-api) for more info.

#### Why?

See [the note](#notes-why) at the top.
