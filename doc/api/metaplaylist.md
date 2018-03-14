# MetaPlaylist

## Table of Contents

- [Overview](#overview)
- [Structure of a MetaPlaylist manifest](#structure)
- [The logic behind](#logic)
- [Requirements and recommandations](#recommandations)

## <a name="overview"></a>Overview

The MetaPlaylist is a format of manifest which describes a playlist of several static DASH or Smooth manifests.

The aim is to represents a live stream from original decorrelated contents, whatever their type is, considering start and end times for each played content. Contents must playback contiguously from start to end of a specific period. See recommendations at the bottom of the page.

## <a name="structure"></a>Structure of a MetaPlaylist manifest

RxPlayer 3.3.x support version 1.
The MetaPlaylist file (.json) contains JSON representing contents and the version number that way:

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
    ],
    "version": 1,
}
```

Mandatory parameters for each content are:
- url ( _type_: ``string`` ): The URL of original static content.
- startTime ( _type_: ``number`` ): The start time from EPOCH time of current content.
- endTime ( _type_: ``number`` ): The end time from EPOCH time of current content (end - start must equal real duration of content).
- transport ( _type_: ``string`` ): Define the type of transport of content. Either "dash" or "smooth".

## <a name="logic"></a>The logic behind

The MetaPlaylist defines the playback of original content on his own timeline. 
The timeline of MetaPlaylist starts at 01/01/1970. Considering that each original content start time is 0, each content plays at specified startTime in MetaPlaylist. The startTime of content is thus an offset to original boudaries. 

```
0 ----[...]-------- MetaPlaylist Timeline -------- NOW ----------->

                            play at: 1300000000        1300000300
                                   |-------- DASH -------->|
                                start: 0    Content      end: 300

        play at: 1299999800     1300000000
                |----- Smooth ---->|
            start: 0   Content   end: 200
```

## <a name="recommandations"></a>Requirements and recommandations

- Each original content must be static, or non-live content.
- Manifest duration shall be precise to the milli-seconds against real segment timeline, in order to avoid discountinuities between contents.
- You can't have several contents overlap themselves through time.
- Contents must be contiguous (end time must be start time from next content).