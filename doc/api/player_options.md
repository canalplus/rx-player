# Player Options

## Table of Contents

  - [Overview](#overview)
  - [Properties](#prop)
    - [videoElement](#prop-videoElement)
      - [transport](#prop-transport)
      - [transportOptions](#prop-transportOptions)
      - [defaultAudioTrack](#prop-defaultAudioTrack)
      - [defaultTextTrack](#prop-defaultTextTrack)
      - [initialVideoBitrate](#prop-initialVideoBitrate)
      - [initialAudioBitrate](#prop-initialAudioBitrate)
      - [maxVideoBitrate](#prop-maxVideoBitrate)
      - [maxAudioBitrate](#prop-maxAudioBitrate)
      - [limitVideoWidth](#prop-limitVideoWidth)
      - [throttleWhenHidden](#prop-throttleWhenHidden)
      - [wantedBufferAhead](#prop-wantedBufferAhead)
      - [maxBufferAhead](#prop-maxBufferAhead)
      - [maxBufferBehind](#prop-maxBufferBehind)

## <a name="overview"></a>Overview

Player options are options given to the player on instantiation. It's an object with multiple properties.

None of them are mandatory. For most usecase though, you might want to set at least the associated video element via the ``videoElement`` property.

## <a name="prop"></a>Properties

### <a name="prop-videoElement"></a>videoElement

_type_: ``HTMLMediaElement|undefined``

The video element the player will use. If not defined, a new video element will be
created.

```js
// Instantiate the player with the first video element in the DOM
const player = new Player({
  videoElement: document.getElementsByTagName("VIDEO")[0]
});
```

### <a name="prop-transport"></a>transport

_type_: ``string|undefined``

The default transport used. Can be either:
  - ``"dash"`` - for DASH streams
  - ``"smooth"`` - for Microsoft Smooth Streaming streams

You can still set the transport per-content with the ``loadVideo`` method. This method only set a default value.

```js
// this player will play smooth streaming streams most of the time
const player = new Player({
  // ...
  transport: "smooth"
});
```

### <a name="prop-transportOptions"></a>transportOptions

_type_: ``Object|undefined``

Options concerning the "transport".
That is, the part of the code:
  - performing manifest and segment requests
  - parsing the manifest and parsing/updating/creating segments

This Object can contain multiple properties. Only those documented here are considered stable:
  - ``segmentLoader`` (``Function``): defines a custom segment loader. More info on it can be found [here](./plugins.md#segmentLoader).


Note that ``transportOptions`` can also be set when loading a video. Only set it on instantiation if you know this will be your default implementation.

```js
const player = new Player({
  transportOptions: {
    segmentLoader (/* args, callbacks */) => {
      // ...
    }
  }
});
```

### <a name="prop-defaultAudioTrack"></a>defaultAudioTrack

_type_: ``Object|string|undefined``

_defaults_: ``"fra"``

The default language for the audio track.

The specified language can be an [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes), an [ISO 639-2](https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes) or an [ISO 639-3](https://en.wikipedia.org/wiki/List_of_ISO_639-3_codes) language code (if the language given is not in any of those language sets, it will still be checked against the manifest).

You can set it as an object with two properties:
```js
const player = new Player({
  // ...
  defaultAudioTrack: {
    language: "fra",       // {string} The language wanted
    audioDescription: true // {Boolean} Whether the track should be an audio
                           // description for the visually impaired
  }
});
```
Or just as a string instead:
```js
const player = new Player({
  // ...
  defaultAudioTrack: "fra"
});
```

Giving a string instead of an object is the same as setting an object with ``audioDescription`` set to ``false`` (``"fra" == { language: "fra", audioDescription: false }``).

You can still set a default audio track per-content with the ``loadVideo`` method.

### <a name="prop-defaultTextTrack"></a>defaultTextTrack

_type_: ``Object|string|undefined``

_defaults_: ``null``

The default language for the text track.

The specified language can be an [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes), an [ISO 639-2](https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes) or an [ISO 639-3](https://en.wikipedia.org/wiki/List_of_ISO_639-3_codes) language code (if the language given is not in any of those language sets, it will still be checked against the manifest).


You can set it as an object with two properties:
```js
const player = new Player({
  // ...
  defaultTextTrack: {
    language: "fra",    // {string} The language wanted
    closedCaption: true // {Boolean} Whether the track should be a closed
                        // caption for the hard-of-hearing
  }
});
```
Or just as a string instead:
```js
const player = new Player({
  // ...
  defaultTextTrack: "fra"
});
```

Giving a string instead of an object is the same as setting an object with ``closedCaption`` set to ``false`` (``"fra" == { language: "fra", closedCaption: false }``).

By default, text tracks are deactivated (``null`` value as ``defaultTextTrack``).

You can still set a default text track per-content with the ``loadVideo`` method.

### <a name="prop-initialVideoBitrate"></a>initialVideoBitrate

_type_: ``Number|undefined``

_defaults_: ``0``

The initial ceil for the video bitrate, in bits per seconds

If lower than the lowest video bitrate available, the lowest video bitrate available will be taken instead.

```js
// Begin either by the video bitrate just below or equal to 700000 bps if found
// or the lowest bitrate available if not.
const player = new Player({
  initialVideoBitrate: 700000
});
```

### <a name="prop-initialAudioBitrate"></a>initialAudioBitrate

_type_: ``Number|undefined``

_defaults_: ``0``

The initial ceil for the audio bitrate, in bits per seconds

If lower than the lowest audio bitrate available, the lowest audio bitrate available will be taken instead.

```js
// Begin either by the audio bitrate just below or equal to 5000 bps if found
// or the lowest bitrate available if not.
const player = new Player({
  initialAudioBitrate: 5000
});
```

### <a name="prop-maxVideoBitrate"></a>maxVideoBitrate

_type_: ``Number|undefined``

_defaults_: ``Infinity``

The maximum video bitrate reachable through adaptive streaming. The player will never automatically switch to a video representation with a higher bitrate.

```js
// limit automatic adaptive streaming for the video track to up to 1 Mb/s
const player = new Player({
  maxVideoBitrate: 1e6
});
```

You can update this limit at any moment with the ``setMaxVideoBitrate`` API call.

This limit can be removed by setting it to ``Infinity`` (which is the default value).

### <a name="prop-maxAudioBitrate"></a>maxAudioBitrate

_type_: ``Number|undefined``

_defaults_: ``Infinity``

The maximum audio bitrate reachable through adaptive streaming. The player will never automatically switch to an audio representation with a higher bitrate.

```js
// limit automatic adaptive streaming for the audio track to up to 100 kb/s
const player = new Player({
  maxAudioBitrate: 1e5
});
```

You can update this limit at any moment with the ``setMaxAudioBitrate`` API call.

This limit can be removed by setting it to ``Infinity`` (which is the default value).

### <a name="prop-limitVideoWidth"></a>limitVideoWidth

_type_: ``Boolean``

_defaults_: ``false``

As a default, the possible video representations (qualities) considered are filtered by width:
The maximum width considered is the closest superior or equal to the video element's width.

This is done because the other, "superior" representations will not have any difference in terms of pixels (as in most case, the display limits the maximum resolution displayable). It thus save bandwidth with no visible difference.

To activate this feature, set it to ``true``.

For some reasons (displaying directly a good quality when switching to fullscreen, specific environments), you might want to not activate this limit.


```js
const player = Player({
  // ...
  limitVideoWidth: false
});
```

### <a name="prop-throttleWhenHidden"></a>throttleWhenHidden

_type_: ``Boolean``

_defaults_: ``false``

The player has a specific feature which throttle the video to the minimum bitrate when the current page is hidden for more than a minute (based on ``document.hidden``).

To activate this feature, set it to ``true``.

```js
const player = Player({
  // ...
  throttleWhenHidden: false
});
```

### <a name="prop-wantedBufferAhead"></a>wantedBufferAhead

_type_: ``Number|undefined``

_defaults_: ``30``

Set the default buffering goal, as a duration ahead of the current position, in seconds.
Once this size of buffer reached, the player won't try to download new video segments anymore.

### <a name="prop-maxBufferAhead"></a>maxBufferAhead

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Set the default maximum kept buffer ahead of the current position, in seconds.
Everything superior to that limit (``currentPosition + maxBufferAhead``) will be automatically garbage collected. This feature is not necessary as
the browser is already supposed to deallocate memory from old segments if/when the memory is scarce.

However on some custom targets, or just to better control the memory imprint of the player, you might want to set this limit. You can set it to ``Infinity`` to remove any limit and just let the browser do this job.

:warning: Bear in mind that a too-low configuration there (e.g. inferior to ``10``) might prevent the browser to play the content at all.

### <a name="prop-maxBufferBehind"></a>maxBufferBehind

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Set the default maximum kept past buffer, in seconds.
Everything before that limit (``currentPosition - maxBufferBehind``) will be automatically garbage collected.

This feature is not necessary as the browser is already supposed to deallocate memory from old segments if/when the memory is scarce.

However on some custom targets, or just to better control the memory imprint of the player, you might want to set this limit. You can set it to ``Infinity`` to remove any limit and just let the browser do this job.
