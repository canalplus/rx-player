---
id: presentation_time_offset
title: Presentation Time Offset
sidebar_label: Presentation Time Offset
slug: presentation_time_offset
---

The presentationTimeOffset is an attribute which can be encountered in an MPD
(the "manifest" of the DASH streaming technology).

## Overview

Simply put, this attribute allows to correct an offset present in the media
segments once those are decoded.

One of the possible usecase would be creating an on demand MPD from a subsection
of an already-existing content, without modifying directly the concerned
segments nor their (possibly time-based) URLs.

Another main usecase is when handling multi-Periods MPDs.
Segments in newer Periods already need to consider an offset, corresponding to
the start of the given Period.
In those cases, the presentationTimeOffset might allows to "cancel" out this
offset. This can be useful if the corresponding segments already define the
right time.

## Simple example

For example, let's imagine some on-demand content with a duration of 2 hours.
To stay simple, this content begins at `00:00:00.000` and ends at
`01:08:00.000` (1 hour and 8 minutes).

```
CONTENT:

00:00:00.000                                                        01:08:00.000
    |====================================================================|

```

Now let's say that we want to create a new on-demand content, which is only a
sub-part from this content.
For example, we will take the subpart going from `00:05:24.000` to
`00:12:54.000` (for a duration of `00:07:30.000`).

```

00:00:00.000                                                        02:00:00.000
    |====|------|========================================================|
            ^
      Subpart going from 00:05:24 to 00:12:54.000

```

Because we might not want to use money uselessly, we want to create this new
content simply by creating a new MPD, and without touching the already created
segments, nor their URLs.

In that condition, we will still need the client to know that this content
actually have an offset of `00:05:24.000`. If it does not know that, we will
just think that the content begins at a default `00:00:00.000` time.

Letting the client think that the content begins at the default `00:00:00.000`
time could lead to several issues:

- it might not be able to request the right first segments (as the URLs could
  be time-based)

- even if it does, it might not be able to actually play the content, as we're
  pushing segments corresponding to a `00:05:24.000` while the browser is
  still waiting for the `00:00:00.000` ones (in that case, we would just have
  an infinite buffering state).

- even if it does, the client timeline will announce a wrong time, offseted 5
  minutes and 24 seconds too late.

This is where the `presentationTimeOffset` comes into play. In our simple
example, this value will just announce an offset of `00:05:24.000` (under the
form of an integer with a timescale to convert it into seconds), and the client
will know what to do.

What the client has to do here is:

- begin to play at 0 secods
- ask the right segments, by adding this offset to the one it thinks it needs
- remove the offset from the segment before decoding it

## Time conversions

The presentationTimeOffset is linked to multiple other time attributes of an
MPD, especially the start of the Period concerned, and of course the time
of the segment.

We will enounce below a simple equation which put their relation into
perspective.

To understand this equation, we will need to define some variables:
| Variable | Definition |
|----------|------------|
| PTO | The "presentationTimeOffset" attribute of the MPD |
| mediaTime | The start time announced in the segment |
| TS | Timescale used by PTO and segmentTime, to transform them into seconds |
| periodStart | Start time of the given period, in seconds |
| presentationTime | The time at which the segment will be shown, in seconds |

```
    mediaTime        PTO
  -------------  -  -----  +  periodStart  =  presentationTime
       TS            TS
```

### Easier conversion: the timestampOffset

As seen in the previous chapter, to convert the media time (time announced in
the segments) into the presentation time (time that will be shown to the user),
you will need to use both also include three other variables:

- the start of the period

- the presentationTimeOffset

- the timescale used by the presentationTimeOffset and the media time

As a convenient plus, those three variables rarely change for a given period.

To simplify the conversion, we can thus define a new variable using those three.
This is what the `timestampOffset` is all about.

Let's go back to the equations in the previous chapters, to isolate those three
into the really simple equation:
`mediaTime/TS + timestampOffset = presentationTime` (you can refer to the
previous chapter to understand what those variables means)

```

  mediaTime       PTO
 -----------  -  -----  +  periodStart  =  presentationTime
     TS           TS

  mediaTime           PTO
 -----------  + ( -  -----  +  periodStart ) =  presentationTime
     TS               TS

                          PTO                                       PTO
  timestampOffset  =  -  -----  +  periodStart  =  periodStart  -  -----
                          TS                                        TS

```

With `timestampOffset` defined, it becomes easy to go back and forth between
the `mediaTime` and the `presentationTime`:

```
                       mediaTime
presentationTime  =   -----------  +  timestampOffset
                          TS

mediaTime  =  (  presentationTime  -  timestampOffset  )  *  TS

```

As an added bonus, SourceBuffers defined in the HTML5 MediaSource Extentions
also have a [`timestampOffset` property
](https://www.w3.org/TR/media-source/#dom-sourcebuffer-timestampoffset), which
means exactly the same thing as defined here!

## In the RxPlayer

Now that we have all of those concepts out of the way, how are we going to use
it, in the RxPlayer?

The RxPlayer has A LOT of time-related values defined for a given segment:

- the time defined in the segment itself (mediaTime)

- the time displayed when playing it in the HTMLMediaElement
  (presentationTime)

- the time possibly set in the request (requestSegmentTime)

- the time as announced in the corresponding attribute of the manifest
  (manifestTime)

- the time used in the corresponding Segment Object in the RxPlayer
  (playerTime)

- the time used in the `buffered` APIs of a HTMLMediaElement or SourceBuffer
  (bufferedTime)

- ...

As it turns out it's a lot simpler once you make two isolated groups:

- the `manifest` group, which uses the non-offseted `mediaTime`.

  In this group you have:

  - the mediaTime (duh)
  - the manifestTime
  - the requestSegmentTime

- the `real time` group, which uses the offseted `presentationTime`.

  In this group you have:

  - the presentationTime
  - the playerTime
  - the bufferedTime

The `manifest` group is then only used in the `transports` code of the
RxPlayer.
Meanwhile, the `real time` group is used everywhere else.

It's actually the `transports` code that does most of the conversion for the
rest of the code (removing the offset when requesting new segments, re-adding it
once the segment is downloaded.

To be able to offset those segments in the SourceBuffer, those are still
informed of course of the `timestampOffset` by the `transports` code.
Then, this `timestampOffset` will be exploited only by the final decoding
code.
