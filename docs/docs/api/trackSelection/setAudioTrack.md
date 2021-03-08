---
id: setAudioTrack-api
title: setAudioTrack method
sidebar_label: setAudioTrack
slug: api/track-selection/setAudioTrack
---

--

**syntax**: `player.setAudioTrack(audioTrackId)`

**arguments**:

- _audioTrackId_ (`string|Number`): The `id` of the track you want to set

--

Change the current audio track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
`getAvailableAudioTracks` method.

--

Note for multi-Period contents:

This method will only have an effect on the [Period](../terms.md#period) that is
currently playing.
If you want to update the track for other Periods as well, you might want to
either:

- update the current audio track once a `"periodChange"` event has been
  received.
- update first the preferred audio tracks through the
  [setPreferredAudioTracks](#meth-setPreferredAudioTracks) method.

--

:warning: If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :

- The HLS defines variants, groups of tracks that may be read together
- Safari may decide to enable a track for accessibility or user language
  convenience (e.g. Safari may switch subtitle to your OS language if you pick
  another audio language)
  You can know if another track has changed by listening to the corresponding
  events that the tracks have changed.
