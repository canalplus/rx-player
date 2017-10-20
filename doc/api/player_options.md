# Player Options

## Table of Contents

  - [Overview](#overview)
  - [Properties](#prop)
    - [videoElement](#prop-videoElement)
      - [initialVideoBitrate](#prop-initialVideoBitrate)
      - [initialAudioBitrate](#prop-initialAudioBitrate)
      - [maxVideoBitrate](#prop-maxVideoBitrate)
      - [maxAudioBitrate](#prop-maxAudioBitrate)
      - [wantedBufferAhead](#prop-wantedBufferAhead)
      - [maxBufferAhead](#prop-maxBufferAhead)
      - [maxBufferBehind](#prop-maxBufferBehind)
      - [limitVideoWidth](#prop-limitVideoWidth)
      - [throttleWhenHidden](#prop-throttleWhenHidden)

## <a name="overview"></a>Overview

Player options are options given to the player on instantiation. It's an object with multiple properties.

None of them are mandatory. For most usecase though, you might want to set at least the associated video element via the ``videoElement`` property.

## <a name="prop"></a>Properties

### <a name="prop-videoElement"></a>videoElement

_type_: ``HTMLMediaElement|undefined``

The video element the player will use.

```js
// Instantiate the player with the first video element in the DOM
const player = new Player({
  videoElement: document.getElementsByTagName("VIDEO")[0]
});
```

If not defined, a new video element will be created without being inserted in the document, you will have to do it yourself through the ``getVideoElement`` method:
```js
const player = new Player();

const videoElement = player.getVideoElement();
document.appendChild(videoElement);
```

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

### <a name="prop-wantedBufferAhead"></a>wantedBufferAhead

_type_: ``Number|undefined``

_defaults_: ``30``

Set the default buffering goal, as a duration ahead of the current position, in seconds.

Once this size of buffer is reached, the player won't try to download new video segments anymore.

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

### <a name="prop-limitVideoWidth"></a>limitVideoWidth

_type_: ``Boolean``

_defaults_: ``false``

With this feature, the possible video representations (qualities) considered are filtered by width:
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
