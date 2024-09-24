# setMaxAudioBitrate

## Description

Set a maximum audio bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced manually through
APIs such as `setAudioBitrate`), the player will never switch to an audio quality with a
bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the minimum quality
will always be chosen instead.

For example, if you want that audio qualities chosen automatically never have a bitrate
higher than 1 Megabits per second you can call:

```js
player.setMaxAudioBitrate(1e6);
```

Any limit can be removed just by setting that value to `Infinity`:

```js
// remove audio bitrate higher limit
player.setMaxAudioBitrate(Infinity);
```

The effect of this method is persisted from content to content. As such, it can even be
called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually (for example
by calling `setAudioBitrate`) bypass this limit completely.

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setMaxAudioBitrate(maxBitrate);
```

- **arguments**:

  1. _maxBitrate_ `number`: Upper audio bitrate limit when adaptive streaming is enabled.
