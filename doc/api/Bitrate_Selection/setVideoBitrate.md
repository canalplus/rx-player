# setVideoBitrate

## Description

Force the current video track to be of a certain bitrate.

If a video quality in the current track is found with the exact same bitrate,
this quality will be set.

If no video quality is found with the exact same bitrate, either:

- the video quality with the closest bitrate inferior to that value will be
  chosen.

- if no video quality has a bitrate lower than that value, the video
  quality with the lowest bitrate will be chosen instead.

By calling this method with an argument set to `-1`, this setting will be
disabled and the RxPlayer will chose the right quality according to its adaptive
logic.

You can use `getAvailableVideoBitrates` to get the list of available bitrates
for the current video track.

Note that the value set is persistent between `loadVideo` calls.
As such, this method can also be called when no content is playing (the same
rules apply for future contents).

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setVideoBitrate(bitrate);
```

  - **arguments**:

    1. _bitrate_ `Number`: Optimal video bitrate (the quality with the maximum
       bitrate inferior to this value will be chosen if it exists).
