# setAudioTrack

## Description

Change the current audio track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
`getAvailableAudioTracks` method.

<div class="note">
Note for multi-Period contents:
<br>
This method will only have an effect on the
<a href="../../Getting_Started/Glossary.md#period">Period</a> that is currently
playing.  If you want to update the track for other Periods as well, you might
want to either:
<br>
<ul>
  <li>update the current video track once a `"periodChange"` event has been
  received.</li>
  <li>update first the preferred video tracks through the
  <a href="./setPreferredVideoTracks.md">setPreferredVideoTracks</a> method.
  </li>
</ul>
</div>

<div class="warning">
If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :

<ul>
  <li>The HLS defines variants, groups of tracks that may be read together</li>
  <li>Safari may decide to enable a track for accessibility or user language
  convenience (e.g. Safari may switch subtitle to your OS language if you pick
  another audio language)
  You can know if another track has changed by listening to the corresponding
  events that the tracks have changed.</li>
</ul>
</div>

## Syntax

```js
player.setAudioTrack(audioTrackId);
```

 - **arguments**:

   1. _audioTrackId_ `string|number`: The `id` of the track you want to set
