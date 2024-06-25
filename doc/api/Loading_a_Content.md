# Loading a Content

## The `loadVideo` method

The `loadVideo` method of the RxPlayer loads the content described in the argument.

This is the central method to use when you want to play a new content. Options available
are described in the next chapters. Despite its name, this method can also load audio-only
content.

### Example

```js
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```

## `loadVideo` options

`loadVideo` receives a single object in argument which can take several properties all
defined here.

### transport

_type_: `string|undefined`

The transport protocol used for this content. This property is mandatory.

Can be either:

- **`"dash"` - for DASH contents.**

  If you're using the [minimal build of the player](../Getting_Started/Minimal_Player.md),
  you will need to add at least either one of the following features to be able to play
  DASH contents:

  - the `DASH` feature (rely on a generally-sufficient JavaScript parser)

  - the `DASH_WASM` feature (backed by a WebAssembly parser, more efficient when handling
    very large MPDs). More information in the
    [`DASH_WASM` feature documentation](./Miscellaneous/DASH_WASM_Parser.md).

  - or both (which will use the latter only when available)

- **`"smooth"` - for Microsoft Smooth Streaming contents**

  If you're using the [minimal build of the player](../Getting_Started/Minimal_Player.md),
  you will need to add at least the `SMOOTH` feature to be able to play Smooth contents.

- **`"directfile"` - for loading a video in _DirectFile_ mode, which allows to directly
  play media files** (example: `.mp4` or `.webm` files) without using a transport
  protocol. With that option, you can even play HLS contents on multiple browsers (mainly
  safari and iOS browsers).

  If you're using the [minimal build of the player](../Getting_Started/Minimal_Player.md),
  you will need to add at least the `DIRECTFILE` feature to be able to play those
  contents.

<div class="warning">
  In that mode, multiple APIs won't have any effect.
  This is documented in the documentation of each concerned method, option or
  event in the API.
</div>

- `"metaplaylist"` for [MetaPlaylist](./Miscellaneous/MetaPlaylist.md) streams, which are
  a concatenation of multiple smooth and DASH contents

  If you're using the [minimal build of the player](../Getting_Started/Minimal_Player.md),
  you will need to add at least the `METAPLAYLIST` experimental feature to be able to play
  those contents.

- `"local"` for [local manifests](./Miscellaneous/Local_Contents.md), which allows to play
  downloaded DASH, Smooth or MetaPlaylist contents (when offline for example).

  If you're using the [minimal build of the player](../Getting_Started/Minimal_Player.md),
  you will need to add at least the `LOCAL_MANIFEST` experimental feature to be able to
  play those contents.

Example:

```js
// play some dash content
rxPlayer.loadVideo({
  transport: "dash",
  url: "https://www.example.com/dash.mpd",
});
```

### url

_type_: `string|undefined`

For Smooth, DASH or MetaPlaylist contents, the URL to the
[Manifest](../Getting_Started/Glossary.md#manifest) (or equivalent)

For _DirectFile_ mode contents, the URL of the content (the supported contents depends on
the current browser).

This property is mandatory unless either:

- a [`manifestLoader` option](#manifestloader) is defined, in which case that callback
  will be called instead any time we want to load the Manifest.

- an [`initialManifest` option](#initialmanifest) is defined, in which case it as the
  first version of the Manifest. Note however that if the Manifest needs to be refreshed
  and no `url` nor `manifestLoader` has been set, the RxPlayer will most likely fail and
  stop playback.

Example:

```js
// play some dash content
rxPlayer.loadVideo({
  url: "https://www.example.com/dash.mpd",
  transport: "dash",
});
```

### keySystems

_type_: `Array.<Object>|undefined`

`keySystems` allows to define every options relative to the encryption of the wanted
content.

This property is mandatory if the content relies on DRM and needs to be decrypted but
unnecessary if the content is not encrypted.

As `keySystems` options are numerous, they are described in its own documentation page,
[Decryption Options](./Decryption_Options.md).

### autoPlay

_type_: `Boolean|undefined`

_defaults_: `false`

If set to `true`, the video will play immediately after being loaded.

<div class="note">
On some browsers, auto-playing a media without user interaction is blocked
due to the browser's policy.
<br>
<br>
In that case, the player won't be able to play (it will stay in a `LOADED`
state) and you will receive a <a href="./Player_Errors.md">warning event</a>
containing a `MEDIA_ERROR` with the code: `MEDIA_ERR_BLOCKED_AUTOPLAY`.
<br>
<br>
A solution in that case would be to propose to your users an UI element to
trigger the play with an interaction.
</div>

### startAt

_type_: `Object|undefined`

`startAt` allows to define a starting position in the played content whether it is a live
content or not.

This option is only defining the starting position, not the beginning of the content. The
user will then be able to navigate anywhere in the content through the `seekTo` API.

If defined, this property must be an object containing a single key. This key can be
either:

- **position** (`Number`): The starting position, in seconds.

- **wallClockTime** (`Number|Date`): The starting wall-clock time (re-scaled position from
  [Manifest](../Getting_Started/Glossary.md#manifest) information to obtain a timestamp on
  live contents), in seconds. Useful to use the type of time returned by the
  `getWallClockTime` API for live contents. If a Date object is given, it will
  automatically be converted into seconds.

- **fromFirstPosition** (`Number`): relative position from the minimum possible one, in
  seconds. That is:

  - for dynamic (live) contents, from the beginning of the buffer depth (as defined by the
    Manifest).
  - for non-dynamic (vod) contents, from the position `0` (this option should be
    equivalent to `position`)

- **fromLastPosition** (`Number`): relative position from the maximum possible one, in
  seconds. Should be a negative number:

  - for dynamic (e.g. live) contents, it is the difference between the starting position
    and the currently last possible position, as defined by the manifest.
  - for VoD contents, it is the difference between the starting position and the end
    position of the content.

- **fromLivePosition** relative position relative to the content's live edge (for live
  contents, it is the position that is intended to be broadcasted at the current time) if
  it makes sense, in seconds. Should be a negative number.

  If the live edge is unknown or if it does not make sense for the current content (for
  example, it won't make sense for a VoD content), that setting repeats the same behavior
  than **fromLastPosition**.

- **percentage** (`Number`): percentage of the wanted position. `0` being the minimum
  position possible (0 for static content, buffer depth for dynamic contents) and `100`
  being the maximum position possible (`duration` for VoD content, last currently possible
  position for dynamic contents).

<div>
Only one of those properties will be considered, in the same order of
priority they are written here.
</div>

If the value set is inferior to the minimum possible position, the minimum possible
position will be used instead. If it is superior to the maximum possible position, the
maximum will be used instead as well.

More information on how the initial position is chosen can be found
[in the specific documentation page on this subject](./Miscellaneous/Initial_Position.md).

#### Notes for dynamic contents

For dynamic contents, `startAt` could work not as expected:

- Depending on the type of Manifest, it will be more or less precize to guess the current
  last position of the content. This will mostly affect the `fromLastPosition` option.

- If the Manifest does not allow to go far enough in the past (not enough buffer,
  server-side) to respect the position wanted, the maximum buffer depth will be used as a
  starting time instead.

- If the Manifest does not allow to go far enough in the future to respect the position
  wanted, the current last available position will be used to define the starting time
  instead.

If `startAt` is not set on live contents, the time suggested by the Manifest will be
considered. If it is also not set, the initial position will be based on the real live
edge.

#### Example

```js
// using position
player.loadVideo({
  // ...
  startAt: {
    position: 10, // start at position == 10 (in seconds)
  },
});

// using wall-clock time
player.loadVideo({
  // ...
  startAt: {
    wallClockTime: Date.now() / 1000 - 60, // 1 minute before what's broadcasted
    // now
  },
});

// using fromFirstPosition
player.loadVideo({
  // ...
  startAt: {
    fromFirstPosition: 30, // 30 seconds after the beginning of the buffer
  },
});

// using fromLastPosition
player.loadVideo({
  // ...
  startAt: {
    fromLastPosition: -60, // 1 minute before the end
  },
});
```

### requestConfig

_type_: `Object`

_defaults_: `{}`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Configuration linked to [Manifest](../Getting_Started/Glossary.md#manifest) and segment
requests. This object can take the following properties (all are optional):

- `segment` (`object|undefined`): If set, segment-specific request configuration. That
  object can contain any of the following properties:

  - `maxRetry` (`number|undefined`): Maximum number of times a segment request will be
    retried when an error happen - only on some condition [1].

    Those retry will be done with a progressive delay, to avoid overloading a CDN. When
    this count is reached, the player will stop and throw a fatal error.

    Defaults to `4`.

  - `timeout` (`number|undefined`): Specifies the maximum time, in milliseconds, that the
    client can wait for downloading all the data of the request response. If all data are
    not downloaded within the specified timeout, segment request are aborted and,
    depending on other options, retried.

    To set to `-1` for no timeout.

    `undefined` (the default) will lead to a default, large, timeout being used.

  - `connectionTimeout` (`number|undefined`): Specifies the maximum time, in milliseconds,
    that the client can wait for receiving the responses headers and status code. If they
    are not received within the specified timeout, segment requests are aborted and,
    depending on other options, retried. It differs from `timeout` option as
    `connectionTimeout` will not time out if the download of the response body took too
    long. The `connectionTimeout` should be lower than `timeout`

    To set to `-1` for no timeout.

    `undefined` (the default) will lead to a default, large, timeout being used.

- `manifest` (`object|undefined`): If set, manifest-specific request configuration. That
  object can contain any of the following properties:

  - `maxRetry` (`number|undefined`): Maximum number of times a Manifest request will be
    retried when a request error happen - only on some condition [1]. Defaults to `4`.

    Those retry will be done with a progressive delay, to avoid overloading a CDN. When
    this count is reached, the player will stop and throw a fatal error.

    Defaults to `4`.

  - `timeout` (`number|undefined`): Specifies the maximum time, in milliseconds, that the
    client can wait for downloading all the data of the request response. If all data are
    not downloaded within the specified timeout, manifest requests are aborted and,
    depending on other options, retried.

    To set to `-1` for no timeout.

    `undefined` (the default) will lead to a default, large, timeout being used.

  - `connectionTimeout` (`number|undefined`): Specifies the maximum time, in milliseconds,
    that the client can wait for receiving the responses headers and status code. If they
    are not received within the specified timeout, manifest requests are aborted and,
    depending on other options, retried. It differs from `timeout` option as
    `connectionTimeout` will not time out if the download of the response body took too
    long. The `connectionTimeout` should be lower than `timeout`

    To set to `-1` for no timeout.

    `undefined` (the default) will lead to a default, large, timeout being used.

[1] To retry a request, one of the following condition should be met:

- The request failed because of a `404` HTTP code

- The request failed because of an HTTP code in the `500` family

- The request failed because of a timeout

- the request failed because of an unknown request error (might be a parsing/interface
  error)

### textTrackMode

_type_: `string|undefined`

_defaults_: `"native"`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

This option allows to specify how the text tracks should be displayed.

There is two possible values:

- `"native"`
- `"html"`

In the default `"native"` mode, a `<track>` element will be created on the video and the
subtitles will be displayed by it, with a minimal style. There is no action on your side,
the subtitles will be correctly displayed at the right time.

In `"html"` mode, the text tracks will be displayed on a specific HTML element. This mode
allows us to do much more stylisation, such as the one defined by TTML styling attributes
or SAMI's CSS. It is particularly useful to correctly manage complex closed captions (with
multiple colors, positionning etc.). With this mode, you will need to provide a wrapper
HTML element with the [textTrackElement option](#texttrackelement).

All text track formats supported in `"native"` mode also work in `"html"` mode.

More infos on supported text tracks can be found in the
[text track documentation](./Miscellaneous/Text_Tracks.md).

### textTrackElement

_type_: `HTMLElement|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

`textTrackElement` is only required and used if you provided a `"html"`
[textTrackMode](#texttrackmode).

This property will be the element on which text tracks will be set, as child elements, at
the right time. We expect that this element is the exact same size than the media element
it applies to (this allows us to properly place the subtitles position without polling
where the video is in your UI). You can however re-size or update the style of it as you
wish, to better suit your UI needs.

### minimumManifestUpdateInterval

_type_: `number|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Set the minimum time, in milliseconds, we have to wait between Manifest updates.

A Manifest may need to be updated in regular intervals (e.g. many DASH dynamic contents
depend on that behavior).

The frequency at which we normally update a Manifest depends on multiple factors: the
information taken from the Manifest, the transport chosen or the current playback
conditions. You might want to use `minimumManifestUpdateInterval` to limit that frequency
to a minimum.

This option is principally useful on some embedded devices where resources are scarce. The
request and data decompression done at each Manifest update might be too heavy for some
and reducing the interval at which they are done might help.

Please note however than reducing that frequency can raise the chance of rebuffering, as
we might be aware of newly generated segments later than we would be without that option.

Example:

```js
rxPlayer.loadVideo({
  // ...
  minimumManifestUpdateInterval: 5000, // Perform Manifest updates at most
                                       // every 5 seconds
  },
});
```

### initialManifest

_type_: `number|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Manifest that will be initially used (before any potential Manifest refresh).

Some applications pre-load the Manifest to parse some information from it before calling
`loadVideo`. As in that case the Manifest has already been loaded, an application can
optimize content loading time by giving to the RxPlayer that already-loaded Manifest so
the latter can avoid doing another request for it.

The format accepted for that option depends on the current chosen
[`transport`](#transport):

- for `"dash"` and `"smooth"` contents either a `string` (of the whole Manifest's xml
  data) or a corresponding `Document` format is accepted.

- for `"metaplaylist"`, either a `string` (for the whole JSON) or the corresponding JS
  Object is accepted.

- for `"local"`, only the corresponding local Manifest as a JS object is accepted.

Note that using this option could have implications for live contents. Depending on the
content, the initial playing position and maximum position could be calculated based on
that option's value.

In a case where the corresponding Manifest request was performed long before the
`loadVideo` call, the RxPlayer could be for example initially playing far from the real
live edge. Because of that, it is recommended to only set that options for live/dynamic
contents if its request was done immediately before the `loadVideo` call.

### representationFilter

_type_: `Function|string|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Allows to filter out `Representation`s (i.e. media qualities) seen in the Manifest, to
prevent the RxPlayer from ever playing them but also from listing them through the tracks
and `Representation` API. It will be as if they weren't present in the content's Manifest
in the first place.

Note that you generally don't need to set this advanced option as it is possible to
manually choose at any time the wanted tracks and Representation. This option only allows
to simplify your code when you know a device has limitations based on some known
characteristics (generally: a maximum decodable video resolution or a maximum bitrate
tolerated by the device).

Filtering them out through a `representationFilter` allows to skip having to avoid them by
using other RxPlayer API like `setVideoTrack` and/or `lockVideoRepresentations`.

This function receives information on each `Representation` encountered in a Manifest, and
should return `true` if you want to keep such Representation or to `false` if you want to
filter it out. For example:

```js
rxPlayer.loadVideo({
  // Filter out video content with a higher resolution than 1080p:
  representationFilter(representation, infos) {
    if (context.trackType !== "video") {
      return true;
    }
    const height = representation.height;
    return typeof height === "number" ? height <= 1080 : true;
  },
});
```

More information on it can be found
[here](../api/Miscellaneous/plugins.md#representationfilter).

#### Important considerations when in "multithread" mode

Note that if you're running in the "multithread" mode, the `representationFilter` function
might be run in a WebWorker environment and thus face several restrictions.

- The function has to be defined as a string (note that defining a `representationFilter`
  as a string also works in the regular "main" mode) which contains the function.

  For example to filter only video Representation which are 1080p or lower, you should
  write it completely under string form, like this:

  ```js
  `function (representation, context) {
      if (context.trackType !== 'video') {
        return true;
      }
      const height = representation.height;
      return typeof height === 'number' ? height <= 1080 : true;
    }`;
  ```

  To explain succintly how it works, the RxPlayer is then transforming it to a function
  when in the right environment (WebWorker or main thread) by passing it through the
  `Function` constructor (new Function(...)).

  As the provided string will be executed, this option is sensible to attacks like
  cross-site scripting. It is **VERY** important to either not rely on external (config,
  user) input at all to produce that string, or if not possible to make sure that all
  potential inputs will lead to expected behavior (an easy way of doing this for example
  is too only allow inputed JS numbers, a whitelisted choice of properties etc.).

- As you do not control the scope nor the realm in which it is run in, this function
  should not use variables declared in its current outer scope, only on its declared
  parameters. This also means that you should not rely on variables declared in things
  like `window`.

- It cannot access API that may not be available in a WebWorker or main thread
  environment, as this function may run in one or the other. In particular this means: no
  `document`, no `window`, no `localStorage`. Still note that many API are still available
  in both environments: `JSON`, `Math`, `performance`, most JavaScript features...

- It probably won't be transpiled by your building dependencies. This means that you
  should refrain from using too new JS features that may not be supported natively by
  targeted devices.

### segmentLoader

_type_: `Function|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

<div class="warning">
This option cannot be relied on in <i>Multithread</i> mode (see <a href="./Miscellaneous/MultiThreading.md">
transport option</a>)
</div>

Defines a custom segment loader for when you want to perform the requests yourself.

```js
rxPlayer.loadVideo({
  // ...
  segmentLoader(infos, callbacks) {
    // logic to download a segment
  },
});
```

More info on it can be found [here](../api/Miscellaneous/plugins.md#segmentloader).

### manifestLoader

_type_: `Function|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

<div class="warning">
This option cannot be relied on in <i>Multithread</i> mode (see <a href="./Miscellaneous/MultiThreading.md">
transport option</a>)
</div>

Defines a custom Manifest loader (allows to set a custom logic for the Manifest request).

```js
rxPlayer.loadVideo({
  // ...
  manifestLoader(url, callbacks) {
    // logic to fetch the Manifest
  },
});
```

More info on it can be found [here](../api/Miscellaneous/plugins.md#manifestloader).

### onCodecSwitch

_type_: `string|undefined`

_defaults_: `"continue"`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Behavior taken by the player when switching to either an audio or video track which has a
codec "incompatible" with the previous one (for example going from avc, a.k.a h264 to
hevc, a.k.a. h265).

This switch comes either after the user switches from one track to another or after
encountering a new Period in some transport technologies (concept existing for DASH,
"local" and MetaPlaylist contents).

Can be set to one of those two values:

- `"continue"`: try to have a seamless transition between both codecs. This behavior works
  on most modern browsers but might lead to problems like infinite buffering and decoding
  errors on older browsers and peculiar platforms. This is the default behavior.

- `"reload"`: When switching from one codec to another - incompatible - one, the RxPlayer
  will "reload" the content: the player will go into the `"RELOADING"` state for a small
  amount of time, during which the video will disappear and many APIs will become
  unavailable, before playing the track with the new codec. That behavior has the
  advantage of working on any platform but disadvantage of having a visible transition
  when those type of codec switches happen.

  Use it if you have issues with codec switching on some platforms.

  _More information about the `"RELOADING"` state can be found in
  [the player states documentation](./Player_States.md)._

### defaultAudioTrackSwitchingMode

_type_: `string|undefined`

_defaults_: `"seamless"`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Behavior taken by the player by default when switching to a different audio track, for
example through the `setAudioTrack` method.

Note that this is only a default value which can be changed at any `setAudioTrack` call,
through its `switchingMode` optional property.

Those are the possible values for that option:

- `"seamless"`: The transition between the old audio track and the new one happens
  seamlessly, without interruption. This is the default behavior.

  As an inconvenient, you might have at worst a few seconds in the previous audio track
  before the new one can be heard.

- `"direct"`: The player will try to switch to the new audio track as soon as possible,
  which might lead to a brief interruption and rebuffering period (where the RxPlayer is
  in the `BUFFERING` state) while it is doing so.

- `"reload"` The player will directly switch to the new audio track (like direct) but may
  reload the media to do so. During this reloading step, there might be a black screen
  instead of the video and the RxPlayer might go into the `RELOADING` state temporarily.

  Although it provides a more aggressive transition than the `"direct"` mode (because it
  goes through a reloading step with a black screen), the `"reload"` mode might be
  preferable in specific situations where `"direct"` is seen to have compatibility issues.

  We observed such issues with some contents and devices combinations, if you observe
  issues such as losing the audio or video glitches just after changing the audio track
  while the `"direct"` mode is used, you may want to use the `"reload"` mode instead.

  More information about the `"RELOADING"` state can be found in
  [the player states documentation](./Player_States.md).

### lowLatencyMode

_type_: `Boolean|undefined`

_defaults_: `false`

Allow to play DASH low-latency contents (with Chunk-encoded and chunk-transferred CMAF
segments) with a low latency efficiently.

In the some rare browsers who do not support the `fetch` API (like IE11 or the BlackBerry
browser), we might be more prone to rebuffering in that mode the first few seconds. If you
want to have a better experience on those browsers, you might want to begin to play
further from the live edge in those cases through the `startAt` option.

More information on playing low-latency DASH contents can be found in the
[corresponding documentation page](./Miscellaneous/Low_Latency.md).

### enableFastSwitching

_type_: `boolean|undefined`

_defaults_: `true`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Enable (when set to `true` and by default) or disable (when set to `false`) the
"fast-switching" feature.

"Fast-switching" is an optimization which allows the RxPlayer to replace low-quality
segments (i.e. with a low bitrate) with higher-quality segments (higher bitrate) in the
buffer in some situations.

This is used for example to obtain a faster quality transition when the user's network
bandwidth raise up: instead of pushing the new high-quality segments at the end of the
current buffer, we push them much sooner - "on top" of already pushed low-quality
segments - so the user can quickly see the better quality.

In most cases, this is a feature you want. On some rare devices however, replacing
segments is poorly supported. We've for example seen on a few devices that old replaced
segments were still decoded (and not the new better-quality segments that should have
replaced them). On other devices, replacing segments resulted in visible small decoding
issues.

Setting `enableFastSwitching` to `false` thus allows to disable the fast-switching
behavior. Note that it is - sadly - difficult to know when you need to disable it. In the
great majority of cases, enabling fast-switching (the default behavior) won't lead to any
problem. So we advise to only disable it when you suspect that segment replacement when
the quality raises is at the source of some issues you're having (in which case it will
help to see if that's really the case).

It is also warning to add that setting `enableFastSwitching` to `false` only disable the
fast-switching feature and not all the logic where the RxPlayer is replacing segments it
already pushed to the buffer. Forbiding the RxPlayer to replace segments altogether is
today not possible and would even break playback in some situations: when multi-Period
DASH contents have overlapping segments, when the browser garbage-collect partially a
segment...

### mode

_type_: `string|undefined`

_defaults_: `"auto"`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Advanced setting to force the RxPlayer to run in a specific way. The default `"auto"` mode
should be sufficient for most use cases.

It can be set to the following values:

- `"main"`: the player's main logic will run on the main thread, even if multithread
  features have been enabled.

  If using the [minimal build](../Getting_Started/Minimal_Player.md) of the RxPlayer, you
  will have to have imported at least one streaming protocol parser (e.g. `DASH` or
  `SMOOTH`) for the `"main"` mode to be able to run. In other cases, a `loadVideo` call
  will throw.

- `"multithread"`: the player's main logic will run on a WebWorker and the player's API on
  the main thread alongside the application. This hopefully improves your application's as
  well as the player's responsivity on low-end devices while the content is playing.

  Note that there is several requirements to be able to run on `"multithread"` mode and
  several limitations, they are all documentend
  [in the MultiThreading documentation page](Miscellaneous/MultiThreading.md).

- `"auto"`; the RxPlayer will select either of those modes based on features enabled and
  options used. Basically it will run in `"multithread"` mode if possible and the `"main"`
  mode in other cases, which should be what you want in most cases.

If not set or set to `"auto"`, you can see which mode is effective by calling the
[`getCurrentModeInformation` method](./Playback_Information/getCurrentModeInformation.md).
If the `useWorker` property is set to `false`, you're running in `"main"` mode, if set to
`true`, you're running in `"multithread"` mode.

### cmcd

_type_: `Object|undefined`

_defaults_: `"undefined"`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

When set to an object, it enables "Common Media Client Data" (CMCD) so the RxPlayer is
able to report playback conditions to the CDN.

If set to `undefined` or not defined, CMCD will be disabled.

When set to an Object, it can have the following properties:

- `contentId` (`string|undefined`): Content ID delivered by CMCD metadata for that
  content. If not specified, a default one will be generated.

  It is heavily recommended that you provide your own content identifier here.

- `sessionId` (`string|undefined`): Session ID delivered by CMCD metadata. If not
  specified, a default one will be generated.

- `communicationType` (`string|undefined`): Way in which the CMCD metadata is
  communicated.

  Can be set to `"query"` for communicating it through query strings or `"headers"` for
  communicating it through headers (which may lead to supplementary complexities linked to
  CORS policies such as preflight request, blocking etc.).

  If not set, the RxPlayer will automatically select the most appropriate way instead.

### checkMediaSegmentIntegrity

_type_: `boolean|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

If set to `true`, the RxPlayer will retry a media segment request if that segment seems
corrupted.

If not set or set to `false`, the RxPlayer might interrupt playback in the same situation.

You can set this option if you suspect the CDN providing your contents to sometimes send
you incomplete/corrupted segments.

Note however that not all cases of media segment corruptions are spotted, it can still
happen with this option set to `true`.

Example:

```js
rxPlayer.loadVideo({
  // ...
  checkMediaSegmentIntegrity: true,
});
```

### checkManifestIntegrity

_type_: `boolean|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

If set to `true`, the RxPlayer will retry a Manifest request if it appears corrupted.

If not set or set to `false`, the RxPlayer might interrupt playback in the same situation.

You can set this option if you suspect the CDN providing your contents to sometimes send
you incomplete/corrupted Manifests.

Note however that not all cases of Manifest corruptions are spotted, and that it only has
an effect on DASH contents for now.

Example:

```js
rxPlayer.loadVideo({
  // ...
  checkManifestIntegrity: true,
});
```

### serverSyncInfos

_type_: `Function|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Allows to provide a time synchronization mechanism between the client and the server.

This value is mainly useful for live DASH contents based on a SegmentTemplate scheme
without SegmentTimeline elements as those rely on having a synchronized clock on the
client side.

The `serverSyncInfos` object contains two keys:

- `serverTimestamp` (`number`): Unix timestamp of the server at a given point in time, in
  milliseconds.

- `clientTime` (`number`): Value of the `performance.now()` API at the time the
  `serverTimestamp` value was true. Please note that if your page contains multiple
  worker, the `performance.now()` call should be done on the same worker than the one in
  which loadVideo is called.

  <div class="note">
  The `performance.now()` API is used here because it is the main API to
  obtain a monotically increasing clock on the client-side.
  </div</div>

Example:

```js
const timeResponse = await fetch(timeServerURL);
const clientTime = performance.now();
const serverTimestamp = await timeResponse.text();
const serverSyncInfos = { serverTimestamp, clientTime };
rxPlayer.loadVideo({
  // ...
  serverSyncInfos,
});
```

If indicated, we will ignore any time indication on the MPD and only consider
`serverSyncInfos` to calculate the time on the server side.

This value is also very useful for low-latency contents, as some of them do not indicate
any server's time, relying on the client one instead.

Note that there is a risk of us losing synchronization when leap seconds are
added/substracted to unix time. However we consider those situations rare enough (and the
effect should be relatively weak) to let this as is for the moment. For a complete
explanation, you can look at the
[corresponding chapter of the low-latency documentation](./Miscellaneous/Low_Latency.md#note-about-time-synchronization).

### referenceDateTime

_type_: `Function|undefined`

<div class="warning">
This option has no effect in <i>DirectFile</i> mode (see <a href="#transport">
transport option</a>)
</div>

Only useful for live contents. This is the default amount of time, in seconds, to add as
an offset to a given media content's time, to obtain the real live time.

For example, if the media has it's `0` time corresponding to the 30th of January 2010 at
midnight, you can set the `referenceDateTime` to `new Date(2010-01-30) / 1000`. This value
is useful to communicate back to you the "live time", for example through the
`getWallClockTime` method.

This will only be taken into account for live contents, and if the Manifest / MPD does not
already contain an offset (example: an "availabilityStartTime" attribute in a DASH MPD).

Example:

```js
rxPlayer.loadVideo({
  // ...
  referenceDateTime: new Date(2015 - 05 - 29) / 1000,
});
```
