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
    - [preferredAudioTracks](#prop-preferredAudioTracks)
    - [preferredTextTracks](#prop-preferredTextTracks)
    - [preferredVideoTracks](#prop-preferredVideoTracks)
    - [maxBufferAhead](#prop-maxBufferAhead)
    - [maxBufferBehind](#prop-maxBufferBehind)
    - [limitVideoWidth](#prop-limitVideoWidth)
    - [throttleVideoBitrateWhenHidden](#prop-throttleVideoBitrateWhenHidden)
    - [throttleWhenHidden (deprecated)](#prop-throttleWhenHidden)



<a name="overview"></a>
## Overview ####################################################################

Player options are options given to the player on instantiation.

It's an object with multiple properties. None of them are mandatory.
For most usecase though, you might want to set at least the associated video
element via the ``videoElement`` property.



<a name="prop"></a>
## Properties ##################################################################

<a name="prop-videoElement"></a>
### videoElement ###############################################################

_type_: ``HTMLMediaElement|undefined``

The media element the player will use.

Note that this can be a `<video>` or an `<audio>` element.

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


<a name="prop-preferredAudioTracks"></a>
### preferredAudioTracks #######################################################

_type_: ``Array.<Object|null>``

_defaults_: ``[]``

This option allows to help the RxPlayer choose an initial audio track based on
either language preferences, codec preferences or both.

It is defined as an array of objects, each object describing constraints a
track should respect.

If the first object - defining the first set of constraints - cannot be
respected under the currently available audio tracks, the RxPlayer will skip
it and check with the second object and so on.
As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

Here is all the possible constraints you can set in any one of those objects
(note that all properties are optional here, only those set will have an effect
on which tracks will be filtered):
```js
{
  language: "fra", // {string|undefined} The language the track should be in
                   // (in preference as an ISO 639-1, ISO 639-2 or ISO 639-3
                   // language code).
                   // If not set or set to `undefined`, the RxPlayer won't
                   // filter based on the language of the track.

  audioDescription: false // {Boolean|undefined} Whether the audio track should
                          // be an audio description for the visually impaired
                          // or not.
                          // If not set or set to `undefined`, the RxPlayer
                          // won't filter based on that status.

  codec: { // {Object|undefined} Constraints about the codec wanted.
           // if not set or set to `undefined` we won't filter based on codecs.

    test: /ec-3/, // {RegExp} RegExp validating the type of codec you want.

    all: true, // {Boolean} Whether all the profiles (i.e. Representation) in a
               // track should be checked against the RegExp given in `test`.
               // If `true`, we will only choose a track if EVERY profiles for
               // it have a codec information that is validated by that RegExp.
               // If `false`, we will choose a track if we know that at least
               // A SINGLE profile from it has codec information validated by
               // that RegExp.
  }
}
```

This array of preferrences can be updated at any time through the
``setPreferredAudioTracks`` method, documented
[here](./index.md#meth-getPreferredAudioTracks).

#### Examples

Let's imagine that you prefer to have french or italian over all other audio
languages. If not found, you want to fallback to english:

```js
const player = new RxPlayer({
  preferredAudioTracks: [
    { language: "fra", audioDescription: false },
    { language: "ita", audioDescription: false },
    { language: "eng", audioDescription: false }
  ]
});
```

Now let's imagine that you want to have in priority a track that contain at
least one profile in Dolby Digital Plus (ec-3 codec) without caring about the
language:
```js
const player = new RxPlayer({
  preferredAudioTracks: [ { codec: { all: false, test: /ec-3/ } ]
});
```

At last, let's combine both examples by preferring french over itialian, italian
over english while preferring it to be in Dolby Digital Plus:
```js
const player = new RxPlayer({
  preferredAudioTracks: [
    {
      language: "fra",
      audioDescription: false,
      codec: { all: false, test: /ec-3/ }
    },

    // We still prefer non-DD+ french over DD+ italian
    { language: "fra", audioDescription: false },

    {
      language: "ita",
      audioDescription: false,
      codec: { all: false, test: /ec-3/ }
    },
    { language: "ita", audioDescription: false },

    {
      language: "eng",
      audioDescription: false,
      codec: { all: false, test: /ec-3/ }
    },
    { language: "eng", audioDescription: false }
  ]
```

--

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No audio track API is supported on the current browser
- The media file tracks are not supported on the browser


<a name="prop-preferredTextTracks"></a>
### preferredTextTracks ########################################################

_type_: ``Array.<Object|null>``

_defaults_: ``[]``

Set the initial text track languages preferences.

This option takes an array of objects describing the languages wanted for
subtitles:
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```

All elements in that Array should be set in preference order: from the most
preferred to the least preferred. You can set `null` in that array for no
subtitles.

When loading a content, the RxPlayer will then try to choose its text track by
comparing what is available with your current preferences (i.e. if the most
preferred is not available, it will look if the second one etc.).

This array of preferrences can be updated at any time through the
``setPreferredTextTracks`` method, documented
[here](./index.md#meth-getPreferredTextTracks).

#### Example

Let's imagine that you prefer to have french or italian subtitles.If not found,
you want no subtitles at all.

```js
const player = new RxPlayer({
  preferredTextTracks: [
    { language: "fra", closedCaption: false },
    { language: "ita", closedCaption: false },
    null
  ]
});
```

--

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No text track API is supported on the current browser
- The media file tracks are not supported on the browser

---


<a name="prop-preferredVideoTracks"></a>
### preferredVideoTracks #######################################################

_type_: ``Array.<Object|null>``

_defaults_: ``[]``

This option allows to help the RxPlayer choose an initial video track.

It is defined as an array of objects, each object describing constraints a
track should respect.

If the first object - defining the first set of constraints - cannot be
respected under the currently available video tracks, the RxPlayer will skip
it and check with the second object and so on.
As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

When the next encountered constraint is set to `null`, the player will simply
disable the video track. If you want to disable the video track by default,
you can just set `null` as the first element of this array (e.g. `[null]`).

Here is all the possible constraints you can set in any one of those objects
(note that all properties are optional here, only those set will have an effect
on which tracks will be filtered):
```js
{
  codec: { // {Object|undefined} Constraints about the codec wanted.
           // if not set or set to `undefined` we won't filter based on codecs.

    test: /hvc/, // {RegExp} RegExp validating the type of codec you want.

    all: true, // {Boolean} Whether all the profiles (i.e. Representation) in a
               // track should be checked against the RegExp given in `test`.
               // If `true`, we will only choose a track if EVERY profiles for
               // it have a codec information that is validated by that RegExp.
               // If `false`, we will choose a track if we know that at least
               // A SINGLE profile from it has codec information validated by
               // that RegExp.
  }
  signInterpreted: true, // {Boolean|undefined} If set to `true`, only tracks
                         // which are known to contains a sign language
                         // interpretation will be considered.
                         // If set to `false`, only tracks which are known
                         // to not contain it will be considered.
                         // if not set or set to `undefined` we won't filter
                         // based on that status.
}
```

This array of preferrences can be updated at any time through the
``setPreferredVideoTracks`` method, documented
[here](./index.md#meth-getPreferredVideoTracks).

#### Examples

Let's imagine that you prefer to have a track which contains at least one H265
profile. You can do:
```js
const player = new RxPlayer({
  preferredVideoTracks: [ { codec: { all: false, test: /^hvc/ } } ]
});
```

With that same constraint, let's no consider that the current user is deaf and
would thus prefer the video to contain a sign language interpretation.
We could set both the previous and that new constraint that way:
```js
const player = new RxPlayer({
  preferredVideoTracks: [
    // first let's consider the best case: H265 + sign language interpretation
    {
      codec: { all: false, test: /^hvc/ }
      signInterpreted: true,
    },

    // If not available, we still prefer a sign interpreted track without H265
    { signInterpreted: true },

    // If not available either, we would prefer an H265 content
    { codec: { all: false, test: /^hvc/ } },

    // Note: If this is also unavailable, we will here still have a video track
    // but which do not respect any of the constraints set here.
  ]
});
```

---

For a totally different example, let's imagine you want to start without any
video track enabled (e.g. to start in an audio-only mode). To do that, you can
simply do:
```js
const player = new RxPlayer({
  preferredVideoTracks: [null]
});
```

---

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No video track API is supported on the current browser
- The media file tracks are not supported on the browser


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


<a name="prop-throttleWhenHidden"></a>
### throttleWhenHidden #########################################################

--

:warning: This option is deprecated, it will disappear in the next major release
``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

Please use the
[throttleVideoBitrateWhenHidden](#prop-throttleVideoBitrateWhenHidden) property
instead, which is better defined for advanced cases, such as Picture-In-Picture.

--

_type_: ``Boolean``

_defaults_: ``false``

The player has a specific feature which throttle the video to the minimum
bitrate when the current page is hidden for more than a minute.

To activate this feature, set it to ``true``.
```js
const player = Player({
  throttleWhenHidden: true
});
```

--

:warning: This option will have no effect for contents loaded :
- In _DirectFile_ mode (see [loadVideo options]
(./loadVideo_options.md#prop-transport)).
- On Firefox browsers (version >= 67) : We can't know if the Picture-In-Picture
feature or window is enabled. Thus we can't rely on document hiddenness
attributes, as the video may be visible, through the PIP window.
