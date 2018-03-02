# MetaPlaylist

## Table of Contents

- [Overview](#overview)
- [Structure of a MetaPlaylist manifest](#structure)
- [The logic behind](#logic)
- [Requirements and recommandations](#recommandations)

## <a name="overview"></a>Overview

The MetaPlaylist is a format of manifest which describes a playlist of several static DASH or Smooth manifests. Contents are synchronized against EPOCH time (01/01/1970).

The aim is to represents a live stream from original decorrelated contents, whatever their type is, considering start and end times for each played content. Contents must playback contiguously from start to end of a specific period. See recommendations at the bottom of the page.

## <a name="structure"></a>Structure of a MetaPlaylist manifest

The MetaPlaylist file (.mpl) contains JSON representing contents that way:

```json
{
    "contents": [
        {
            "url": "http://mydash/dash.mpd",
            "startTime": "125",
            "endTime": "300",
            "transport": "dash",
        },
        {
            "url": "http://mysmooth/smooth.ism/Manifest",
            "startTime": "300",
            "endTime": "400",
            "transport": "smooth",
        },
    ]
}
```

Mandatory parameters for each content are:
- url ( _type_: ``string`` ): The URL of original static content.
- startTime ( _type_: ``number`` ): The start time from EPOCH time of current content.
- endTime ( _type_: ``number`` ): The end time from EPOCH time of current content (end - start must equal real duration of content).
- transport ( _type_: ``string`` ): Define the type of transport of content. Either "dash" or "smooth" ... or maybe even "metaplaylist".

## <a name="logic"></a>The logic behind

The MetaPlaylist defines the playback of original content on his own timeline. 
The timeline of MetaPlaylist starts at 01/01/1970. Considering that each original content start time is 0, each content plays at specified startTime in MetaPlaylist. The startTime of content is thus an offset to original boudaries. 

```
0 ----[...]-------- MetaPlaylist Timeline -------- NOW ----------->

                            play at: 1300000000        1300000300
                                   |-------- DASH ---------|
                                start: 0    Content      end: 300

        play at: 1299999800     1300000000
                |----- Smooth -----|
            start: 0   Content   end: 200
```

Each original manifest is downloader and parsed, so periods could be extracted. From these periods and from manifest traits, a new [manifest object](./manifest.md) is built, with the same structure and properties than with DASH and Smooth manifest.

The _timeShiftBufferDepth_ is the higher duration from all contents.
The _avaibilityStartTime_ is 0.
_suggestedPresentationDelay_, _maxSegmentDuration_ and _minBufferTime_ are the minimum corresponding values from contents. 

For each segment from periods, MetaPlaylist implies:
- Segment time has, in the timeline point of view, an offset. However, it must be requested with the correct name, as the server provides original segments. (e.g. Segment has time 20, offset is 1656145656, name pattern is segment_$Time$.mp4. Real segment name still is segment_20.mp4).

- In each mp4 segment, there must be a tfdt box that defines the start time of video or audio content. Segment must be patched in order to apply an offset to the start time. If the segment is not patched, data will be bufferized in original timeline boudaries.

## <a name="recommandations"></a>Requirements and recommandations

- Each original content must be static, or non-live content.
- Manifest duration shall be precise to the milli-seconds against real segment timeline, in order to avoid discountinuities between contents.
- You can't have several contents overlap themselves through time.
- Contents must be contiguous (end time must be start time from next content).