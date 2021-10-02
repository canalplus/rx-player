# setMaxVideoBitrate

## Description

Set a maximum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate higher than 1 Megabits per second you can call:

```js
player.setMaxVideoBitrate(1e6);
```

Any limit can be removed just by setting that value to `Infinity`:

```js
// remove video bitrate higher limit
player.setMaxVideoBitrate(Infinity);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling `setVideoBitrate`) bypass this limit completely.

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setMaxVideoBitrate(maxBitrate);
```

  - **arguments**:

    1. _maxBitrate_ `number`: Upper video bitrate limit when adaptive streaming
       is enabled.
