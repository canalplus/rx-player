# getVideoTrack

## Description

Get information about the video track currently set.

  - `null` if no video track is enabled right now.
  - `undefined` if no video content has been loaded yet or if its information
    is unknown.

If a video track is set and information about it is known, this method will
return an object with the following properties:

  - `id` (`Number|string`): The id used to identify this track. No other
    video track for the same [Period](../../Getting_Started/Glossary.md#period)
    will have the same `id`.

    This can be useful when setting the track through the `setVideoTrack`
    method.

  - `label` (`string|undefined`): A human readable label that may be displayed in
    the user interface providing a choice between video tracks.

    This information is usually set only if the current Manifest contains one.

  - `representations` (`Array.<Object>`):
    [Representations](../../Getting_Started/Glossary.md#representation) of this video track, with
    attributes:

    - `id` (`string`): The id used to identify this Representation.
      No other Representation from this track will have the same `id`.

    - `bitrate` (`Number`): The bitrate of this Representation, in bits per
      seconds.

    - `width` (`Number|undefined`): The width of video, in pixels.

    - `height` (`Number|undefined`): The height of video, in pixels.

    - `codec` (`string|undefined`): The video codec the Representation is
      in, as announced in the corresponding Manifest.

    - `frameRate` (`number|undefined`): The video frame rate.

    - `hdrInfo` (`Object|undefined`) Information about the hdr
      characteristics of the track.
      (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

  - `signInterpreted` (`Boolean|undefined`): If set to `true`, this track is
    known to contain an interpretation in sign language.
    If set to `false`, the track is known to not contain that type of content.
    If not set or set to undefined we don't know whether that video track
    contains an interpretation in sign language.

  - `isTrickModeTrack` (`Boolean|undefined`): If set to `true`, this track
    is a trick mode track. This type of tracks proposes video content that is
    often encoded with a very low framerate with the purpose to be played more
    efficiently at a much higher speed.

    To enter or exit a mode where trickmode tracks are used instead of regular
    non-trickmode ones, you can use the `setPlaybackRate` function.

  - `trickModeTracks` (`Array.<Object> | undefined`): Trick mode video tracks
    attached to this video track.

    Each of those objects contain the same properties that a regular video track
    (same properties than what is documented here).

    It this property is either `undefined` or not set, then this track has no
    linked trickmode video track.

<div class="note">
Note for multi-Period contents:
<br>
This method will only return the chosen video track for the
<a href="../../Getting_Started/Glossary.md#period">Period</a> that is currently
playing.
</div>

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), if there is no
video tracks API in the browser, this method returns "undefined".
</div>

## Syntax

```js
const videoTrack = player.getVideoTrack();
```

 - **return value** `Object|null|undefined`
