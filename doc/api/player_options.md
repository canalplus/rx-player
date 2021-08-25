# Player Options ###############################################################

## Table of Contents ###########################################################

  - [Overview](#overview)
  - [Properties](#prop)
    - [videoElement](#prop-videoElement)
    - [initialVideoBitrate](#prop-initialVideoBitrate)
    - [initialAudioBitrate](#prop-initialAudioBitrate)
    - [minVideoBitrate](#prop-minVideoBitrate)
    - [minAudioBitrate](#prop-minAudioBitrate)
    - [maxVideoBitrate](#prop-maxVideoBitrate)
    - [maxAudioBitrate](#prop-maxAudioBitrate)
    - [wantedBufferAhead](#prop-wantedBufferAhead)
    - [maxBufferAhead](#prop-maxBufferAhead)
    - [maxBufferBehind](#prop-maxBufferBehind)
    - [limitVideoWidth](#prop-limitVideoWidth)
    - [throttleVideoBitrateWhenHidden](#prop-throttleVideoBitrateWhenHidden)



<a name="overview"></a>
## Overview ####################################################################

Player options are options given to the player on instantiation.

It's an object with multiple properties. None of them are mandatory.
For most usecase though, you might want to set at least the associated media
element via the ``videoElement`` property.



<a name="prop"></a>
## Properties ##################################################################

<a name="prop-videoElement"></a>
### videoElement ###############################################################

_type_: ``HTMLMediaElement|undefined``

The media element the player will use.

Note that despite what its name suggests, this can be a `<video>` or an
`<audio>` element.

```js
// Instantiate the player with the first video element in the DOM
const player = new Player({
  videoElement: document.getElementsByTagName("VIDEO")[0]
});
```

If not defined, a `<video>` element will be created without being inserted in
the document. You will have to do it yourself through the ``getVideoElement``
method to add it yourself:
```js
const player = new Player();

const videoElement = player.getVideoElement();
document.body.appendChild(videoElement);
```


<a name="prop-initialVideoBitrate"></a>
### initialVideoBitrate ########################################################

_type_: ``Number|undefined``

_defaults_: ``0``

This is a ceil value for the initial video bitrate chosen.

That is, the first video [Representation](../terms.md#representation) chosen
will be both:
  - inferior or equal to this value.
  - the closest possible to this value (after filtering out the ones with a
    superior bitrate).


If no Representation is found to respect those rules, the Representation with
the lowest bitrate will be chosen instead. Thus, the default value - ``0`` -
will lead to the lowest bitrate being chosen at first.

```js
// Begin either by the video bitrate just below or equal to 700000 bps if found
// or the lowest bitrate available if not.
const player = new Player({
  initialVideoBitrate: 700000
});
```

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-initialAudioBitrate"></a>
### initialAudioBitrate ########################################################

_type_: ``Number|undefined``

_defaults_: ``0``

This is a ceil value for the initial audio bitrate chosen.

That is, the first audio [Representation](../terms.md#representation) chosen
will be:
  - inferior or equal to this value.
  - the closest possible to this value (after filtering out the ones with a
    superior bitrate).

If no Representation is found to respect those rules, the Representation with
the lowest bitrate will be chosen instead. Thus, the default value - ``0`` -
will lead to the lowest bitrate being chosen at first.

```js
// Begin either by the audio bitrate just below or equal to 5000 bps if found
// or the lowest bitrate available if not.
const player = new Player({
  initialAudioBitrate: 5000
});
```

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-minVideoBitrate"></a>
### minVideoBitrate ############################################################

_type_: ``Number|undefined``

_defaults_: ``0``

Minimum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate lower than that value.

The exception being when no quality has a higher bitrate, in which case the
maximum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate lower than 100 kilobits per second you can call:
```js
const player = new Player({
  minVideoBitrate: 100000
});
```

Any limit can be removed just by setting that value to ``0``:
```js
// remove video bitrate lower limit
player.setMinVideoBitrate(0);
```

You can update this limit at any moment with the ``setMinVideoBitrate`` API
call.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setVideoBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-minAudioBitrate"></a>
### minAudioBitrate ############################################################

_type_: ``Number|undefined``

_defaults_: ``0``

Minimum audio bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setAudioBitrate`), the player will never switch
to an audio quality with a bitrate higher than that value.

The exception being when no quality has a higher bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that audio qualities chosen automatically never have
a bitrate higher than 100 kilobits per second you can call:
```js
const player = new Player({
  minAudioBitrate: 100000
});
```

Any limit can be removed just by setting that value to ``0``:
```js
// remove audio bitrate lower limit
player.setMinAudioBitrate(0);
```

You can update this limit at any moment with the ``setMinAudioBitrate`` API
call.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setAudioBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-maxVideoBitrate"></a>
### maxVideoBitrate ############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Maximum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate higher than 1 Megabits per second you can call:
```js
const player = new Player({
  maxVideoBitrate: 1e6
});
```

Any limit can be removed just by setting that value to ``Infinity``:
```js
// remove video bitrate higher limit
player.setMaxVideoBitrate(Infinity);
```

You can update this limit at any moment with the ``setMaxVideoBitrate`` API
call.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setVideoBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-maxAudioBitrate"></a>
### maxAudioBitrate ############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Maximum audio bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setAudioBitrate`), the player will never switch
to an audio quality with a bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that audio qualities chosen automatically never have
a bitrate higher than 1 Megabits per second you can call:
```js
const player = new Player({
  maxAudioBitrate: 1e6
});
```

Any limit can be removed just by setting that value to ``Infinity``:
```js
// remove audio bitrate higher limit
player.setMaxAudioBitrate(Infinity);
```

You can update this limit at any moment with the ``setMaxAudioBitrate`` API
call.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setAudioBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-wantedBufferAhead"></a>
### wantedBufferAhead ##########################################################

_type_: ``Number|undefined``

_defaults_: ``30``

Set the default buffering goal, as a duration ahead of the current position, in
seconds.

Once this size of buffer is reached, the player won't try to download new
segments anymore.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-maxBufferAhead"></a>
### maxBufferAhead #############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Set the maximum kept buffer ahead of the current position, in seconds.

Everything superior to that limit (``currentPosition + maxBufferAhead``) will
be automatically garbage collected.

This feature is not necessary as the browser should by default correctly
remove old segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

Its default value, ``Infinity``, will remove this limit and just let the browser
do this job instead.

The minimum value between this one and the one returned by
``getWantedBufferAhead`` will be considered when downloading new segments.

:warning: Bear in mind that a too-low configuration there (e.g. inferior to
``10``) might prevent the browser to play the content at all.

You can update that limit at any time through the [setMaxBufferAhead
method](./index.md#meth-setMaxBufferAhead).

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-maxBufferBehind"></a>
### maxBufferBehind ############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Set the maximum kept buffer before the current position, in seconds.

Everything before that limit (``currentPosition - maxBufferBehind``) will be
automatically garbage collected.

This feature is not necessary as the browser should by default correctly
remove old segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

Its default value, ``Infinity``, will remove this limit and just let the browser
do this job instead.

You can update that limit at any time through the [setMaxBufferBehind
method](./index.md#meth-setMaxBufferBehind).

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="prop-limitVideoWidth"></a>
### limitVideoWidth ############################################################

_type_: ``Boolean``

_defaults_: ``false``

With this feature, the possible video
[Representations](../terms.md#representation) considered are filtered by width:

The maximum width considered is the closest superior or equal to the video
element's width.

This is done because the other, "superior" Representations will not have any
difference in terms of pixels (as in most case, the display limits the maximum
resolution displayable). It thus save bandwidth with no visible difference.

To activate this feature, set it to ``true``.
```js
const player = Player({
  limitVideoWidth: true
});
```

For some reasons (displaying directly a good quality when switching to
fullscreen, specific environments), you might not want to activate this limit.

--

:warning: This option will have no effect for contents loaded :
- In _DirectFile_ mode (see [loadVideo options]
(./loadVideo_options.md#prop-transport)).
- On Firefox browsers (version >= 67) : We can't know if the Picture-In-Picture
feature or window is enabled and we can't know PIP window size. Thus we can't
rely on video element size attributes, that may not reflect the real video size
when PIP is enabled.


<a name="prop-throttleVideoBitrateWhenHidden"></a>
### throttleVideoBitrateWhenHidden #############################################

_type_: ``Boolean``

_defaults_: ``false``

The player has a specific feature which throttle the video to the minimum
bitrate when the current video element is considered hidden (e.g. the containing
page is hidden and the Picture-In-Picture mode is disabled) for more than a
minute.

To activate this feature, set it to ``true``.
```js
const player = Player({
  throttleVideoBitrateWhenHidden: true
});
```

--

:warning: This option will have no effect for contents loaded :
- In _DirectFile_ mode (see [loadVideo options]
(./loadVideo_options.md#prop-transport)).
- On Firefox browsers (version >= 67) : We can't know if the Picture-In-Picture
feature or window is enabled. Thus we can't rely on document hiddenness
attributes, as the video may be visible, through the PIP window.
