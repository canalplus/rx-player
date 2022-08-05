# Troubleshooting

This page regroups multiple frequent problems that have been encountered with
the RxPlayer associated to the found solution.

If that solution does not work for you, do not hesitate to create an issue.


## `autoPlay` doesn't work

  - If the media plays automatically despite not setting the
    [`autoPlay`](../api/Loading_a_Content.md#autoplay) `loadVideo` option or
    setting it to `false`, check that the media element does not already have an
    `autoplay` attribute.

    If it has, you should remove it so the `autoPlay` `loadVideo` option work as
    intended.
    We hesitated doing it ourselves but finally chose not to, to not break other
    applications putting it there for a reason

  - If the media does not play despite setting the
    [`autoPlay`](../api/Loading_a_Content.md#autoplay) `loadVideo` option
    to `true`, it is probably due to the browser blocking it (and in that case,
    you should also have received a `MEDIA_ERROR` `warning` event, with the code
    `MEDIA_ERR_BLOCKED_AUTOPLAY`).

    In that scenario, the content will only be able to play after a user
    interaction is done on the page (e.g. user clicking on a "play" button).

    This is a behavior forced by multiple browsers to prevent annoying
    autoplaying video, generally those who have sound enabled (on that matter,
    muting the media element might also work).


## Text tracks does not respect the format's style

  - Check that you're not in the default `"native"`
    [`textTrackMode`](../api/Loading_a_Content.md#texttrackmode) (when either
    the `textTrackMode` `loadVideo` option is not set or is set to `native`, or
    when the `textTrackElement` `loadVideo` option is not set).

    If you're in that case, style-enriched subtitles are only available in the
    `"html"` `textTrackMode`. Please set both `textTrackMode` to `"html"` and a
    `textTrackElement` to display text tracks into.


## Issues when switching the audio track

  - If audio tracks take a LOT of time on some devices to change, it may be due
    to how often low-level audio buffers are updated (from higher-level browser
    audio buffers) on that device.

    To fix that solution, you might want to set [the `switchingMode` property on
    calls to `setAudioTrack`](../api/Track_Selection/setAudioTrack.md) to
    `"direct"` or `"reload"`, if you have issues with the former value.

  - If you lose sound after switching the audio track and you're in the
    `"direct"` `switchingMode`, this is a known issue on some browser versions.
    Please change the `switchingMode` to any other value (the closest to
    `"direct"` being `"reload"`.


## Parts of a content are automatically skipped/seeked over

The RxPlayer has two complex inner mechanisms that may lead to subparts of a
content being seemingly automatically skipped:

  - A buffer discontinuity detection mechanism that tend to prioritize
    uninterrupted content playback over content completeness

  - A browser's garbage collection detection mechanism that also prioritize the
    same aspect

When some media data appears to be skipped, it generally means to the RxPlayer
that either:
  - no media data was available at that position
  - media data was available, but the browser stalled trying to play it
  - media data was available at that position, but was immediately garbage
    collected by the browser, potentially multiple times in a row.

You can investigate in which scenario you are by looking at the RxPlayer's logs.

If you see logs about "GC" (garbage collector) before those skip happen, you
might be in the last scenario.
If it appears to be insistent, you may want to check the remaining available
memory on the device when it happens. If it looks very low, you might want to
configure the RxPlayer so less media data is buffered in advance, through
either:
  - the [`maxVideoBufferSize`](../api/Creating_a_Player.md#maxvideobuffersize)
    constructor option, or

  - the [`setMaxVideoBufferSize`](../api/Buffer_Control/setMaxVideoBufferSize.md)
    method



## Codec switching does not work

By default, codec switching is performed seamlessly but that does not work on
all devices.

Please check the [`onCodecSwitch`](../api/Loading_a_Content.md#oncodecswitch)
`loadVideo` option, and set it to `"reload"` - if that's not already the
case - to see if it fixes the issue.


## The RxPlayer uses a lot of memory

By default the RxPlayer uses the most memory it can to provide the best
experience.

It may not always what you might want however. To let you configure how much
media data is kept at maximum behind and ahead of the current position, you
can set respectively a "maximum buffer behind" or a "maximum buffer ahead" in
seconds through either:

  - the [`maxBufferBehind`](../api/Creating_a_Player.md#maxbufferbehind)
    and [`maxBufferAhead`](../api/Creating_a_Player.md#maxbufferahead)
    constructor options.

  - the [`setMaxBufferBehind`](../api/Buffer_Control/setMaxBufferBehind.md) and
    the [`setMaxBufferAhead`](../api/Buffer_Control/setMaxBufferAhead.md)
    methods

If you're setting a "maximum buffer ahead", please keep in mind that it should
always be higher than the set "wanted buffer ahead" option
[`wantedBufferAhead`](../api/Creating_a_Player.md#wantedbufferahead)
constructor option or [`setWantedBufferAhead`](../api/Buffer_Control/setWantedBufferAhead.md)
method).

If you want even a more precize control over memory usage of media data, you
can set the "maximum video buffer size" setting through either:

- the [`maxVideoBufferSize`](../api/Creating_a_Player.md#maxvideobuffersize)
  constructor option, or

- the [`setMaxVideoBufferSize`](../api/Buffer_Control/setMaxVideoBufferSize.md)
  method


## Playback issues related to DRMs

There is a lot of compatibility issues that may be linked to DRMs.

Here is some of them.


### Issues with fallbacking with the Edge browser and PlayReady

We sometimes encountered a bug which makes the player loads indefinitely when
fallbacking from an undecipherable quality, if done through the
`fallbackOnLastTry` option. This was only constated on the Edge browser and
appears to be a browser or CDM bug.

Sadly, no work-around has been found for now for this issue. We're currently
trying to create a reproducible scenario and document that issue so it can
hopefully be fixed in the future. In the meantime, you're encouraged either to
use Widevine (only on Chromium-based Edge) or to not make use of the
`fallBackOnLastTry` option on that browser.


### The Player do not download any segment when playing encrypted contents

This is probably due to an issue we encountered several time on embedded
devices.

Basically, this behavior is due to a deadlock, where the RxPlayer is waiting for
the CDM logic to be initialized to download segments but the CDM logic wait for
the opposite: it will only initialize itself once segments have been downloaded.

The RxPlayer is waiting for the CDM initialization for a very specific usage:
playing a mix of unencrypted and encrypted data. We detected that on some Chrome
versions we could not play encrypted data if we first played unencrypted data
without the CDM logic in place.

Fortunately, this usage is for very specific cases and you most likely won't
need it (or even if you will, you most likely will not encounter that problem).

You can completely remove that deadlock with a property called
`disableMediaKeysAttachmentLock`. Like other properties introduced here, you
should put it in the `keySystems` object of `loadVideo`, like such:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      disableMediaKeysAttachmentLock: true,
    },
    {
      type: "playready",
      getLicense,
      disableMediaKeysAttachmentLock: true,
    },
  ],
});
```

### After two or several loadVideo calls the RxPlayer refuses to play

There's a chance that you're encountering another issue we found on embedded
devices.

By default, the RxPlayer maintains a cache containing the last loaded licenses.
This allows to quickly switch to already-played contents, an important
improvement when playing live contents for example.
Rest assured, our cache size is not infinite, and as such it should work on most
devices.

However, we found that on some devices, this logic can be problematic, and it
will just refuse to add a license at a given point.

You can add a property which will flush that cache anytime the content changes,
called `closeSessionsOnStop`.

Like other properties introduced here, you should put it in the `keySystems`
object of `loadVideo`, like such:

```js
rxPlayer.loadVideo({
  url: MANIFEST_URL,
  transport: "dash",
  keySystems: [
    {
      type: "widevine",
      getLicense,
      closeSessionsOnStop: true,
    },
    {
      type: "playready",
      getLicense,
      closeSessionsOnStop: true,
    },
  ],
});
```
