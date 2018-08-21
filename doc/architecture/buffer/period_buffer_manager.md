# PeriodBufferManager ##########################################################


## Overview ####################################################################

To be able to play a content, the player has to be able to download chunks of
media data - called segments - and has to push them to SourceBuffers.

In the RxPlayer, the _PeriodBufferManager_ is the entry point for performing all
those tasks.

Basically, the _PeriodBufferManager_:

  - dynamically creates various SourceBuffers depending on the needs of the
    given content

  - orchestrates segment downloading and "pushing" to allow the content to
    play in the best conditions possible.



## Multiple types handling #####################################################

More often than not, content are divised into multiple "types": "audio", "video"
or "text" segments, for example. They are often completely distinct in a
manifest and as such, have to be downloaded and decoded separately.

Each type has its own _SourceBuffer_. For "audio"/"video" contents, we use
regular _MSE_ SourceBuffers.
For any other types, such as "text" and "image", we defined custom SourceBuffers
implementation adapted to these type of contents.

We then create a different Buffer for each type. Each will progressively
download and push content of their respective type to their respective
SourceBuffer:

```
- AUDIO BUFFER _
|======================    |

- VIDEO BUFFER _
|==================        |

- TEXT BUFFER _
|========================  |

- IMAGE BUFFER _
|====================      |
```
_(the ``|`` sign delimits the temporal start and end of a given buffer, the
``=`` sign represent a pushed segment in the corresponding SourceBuffer)_



## Native SourceBuffers ########################################################

SourceBuffers created for the audio and/or video types are called _native
SourceBuffers_. This is because their management is managed by the browser,
hence it's a "native" implementation.
SourceBuffers for any other possible types (for example "text" and "image") are
called _custom SourceBuffers_. This is because their management is done by the
RxPlayer, to emulate the native behavior.

Native SourceBuffers have several differences with the custom ones, especially:

  - They are managed by the browser where custom ones are implemented in JS.
    As such, they must obey to various browser rules, among which:

      1. They cannot be lazily created as the content plays. We have to
         initialize all native SourceBuffers beforehand.

      2. They have to be linked to a specific codec.

      3. They have to be added to the MediaSource

      4. They have to be added to the MediaSource after the media HTMLElement
         has been linked to the MediaSource

  - They are in a way more "important" than custom ones. If a problem happens
    with a native SourceBuffer, we interrupt playback. For a custom one, we can
    just deactivate the SourceBuffer for the content.

  - They affect buffering when custom SourceBuffers do not (no text segment for
    a part of the content means we will just not have subtitles, no audio
    segment means we will completely stop to await them)

  - They affect various API linked to the media element in the DOM. Such as
    ``HTMLMediaElement.prototype.buffered``.
    Custom SourceBuffers do not.

Due to these differences, native SourceBuffers are often managed in a less
permissive way than custom ones:

  - They will be created at the very start of the content

  - An error coming from one of them will lead us to completely stop the content
    on a fatal error



## PeriodBuffers ###############################################################

The _DASH_ streaming technology has a concept called _Period_. Simply put, it
allows to set various types of content successively in the same manifest.

For example, let's take a manifest describing a live content with
chronologically:
 1. an english TV Show
 2. an old italian film with subtitles
 3. an American film with closed captions.

Example:

```
08h05              09h00                       10h30                now
  |==================|===========================|===================|
        TV Show               Italian Film            American film
```

Those contents are drastically different (they have different languages, the
american film might have more available bitrates than the old italian one).

Moreover, even a library user might want to be able to know when the italian
film is finished, to report about it immediately in a graphical interface.

As such, they have to be considered separately - in a different Period:

```
        Period 1                Period 2                Period 3
08h05              09h00                       10h30                now
  |==================|===========================|===================|
        TV Show               Italian Film            American film
```

In the RxPlayer, we create one _buffer_ per Period **and** per type.
Those are called _PeriodBuffers_.

_PeriodBuffers_ are automatically created/destroyed during playback. The job of
a single _PeriodBuffer_ is to process and download optimally the content linked
to a single _Period_ and to a single type:

```
- VIDEO BUFFER -

     PERIOD BUFFER
08h05              09h00
  |=========         |
        TV Show


- AUDIO BUFFER -

     PERIOD BUFFER
08h05              09h00
  |=============     |
        TV Show


- TEXT BUFFER -

     PERIOD BUFFER
08h05              09h00
  |======            |
        TV Show
```


To allow smooth transitions between them, we also might want to preload content
defined by a subsequent _Period_ once we lean towards the end of the content
described by the previous one.
Thus, multiple _PeriodBuffers_ might be active at the same time:

```
+----------------------------   AUDIO   ----------------------------------+
|                                                                         |
|      PERIOD BUFFER 1        PERIOD BUFFER 2         PERIOD BUFFER 3     |
| 08h05              09h00                       10h30                now |
|   |=============     |=================          |================   |  |
|         TV Show               Italian Film            American film     |
+-------------------------------------------------------------------------+

+------------------------------   VIDEO   --------------------------------+
|                                                                         |
|      PERIOD BUFFER 1        PERIOD BUFFER 2         PERIOD BUFFER 3     |
| 08h05              09h00                       10h30                now |
|   |=====             |===                        |===                |  |
|         TV Show               Italian Film            American film     |
+-------------------------------------------------------------------------+

+------------------------------   TEXT   ---------------------------------+
|                                                                         |
|      PERIOD BUFFER 1        PERIOD BUFFER 2         PERIOD BUFFER 3     |
| 08h05              09h00                       10h30                now |
|     (NO SUBTITLES)   |=========================  |=================  |  |
|         TV Show               Italian Film            American film     |
+-------------------------------------------------------------------------+
```


### Multi-Period management ####################################################

The creation/destruction of _PeriodBuffers_ by the Stream is actually done in a
very precize and optimal way, which gives a higher priority to immediate
content.

To better grasp how it works, let's imagine a regular use-case, with two periods
for a single type of buffer:

--------------------------------------------------------------------------------

Let's say that the _PeriodBuffer_ for the first _Period_ (named P1) is currently
actively downloading segments (the "^" sign is the current position):

```
   P1
|====  |
   ^
```

Once P1 is full (it has no segment left to download):

```
   P1
|======|
   ^
```

We will be able to create a new _PeriodBuffer_, P2, for the second _Period_:

```
   P1     P2
|======|      |
   ^
```

Which will then also download segments:

```
   P1     P2
|======|==    |
   ^
```

If P1 needs segments again however (e.g. when the bitrate changes...)

```
   P1     P2
|===   |==    |
   ^
```

Then we will destroy P2, to keep it from downloading segments:

```
   P1
|===   |
   ^
```

--------------------------------------------------------------------------------

Once P1, goes full again, we re-create P2:

```
   P1     P2
|======|==    |
   ^
```

_Note that we still have the segment pushed to P2 available_

When the current position go ahead of a _PeriodBuffer_ (here ahead of P1):

```
   P1     P2
|======|===   |
        ^
```

This _PeriodBuffer_ is destroyed to free up ressources:

```
          P2
       |===   |
        ^
```

----

When the current position goes behind the first currently defined _PeriodBuffer_:

```
          P2
       |===   |
    ^
```

Then we destroy all previous _PeriodBuffers_ and [re-]create the one needed:

```
   P1
|======|
    ^
```

In this example, P1 is full (as we already downloaded its segments) so we also
can re-create P2, which will also keep its already-pushed segments:

```
   P1     P2
|======|===   |
    ^
```

--------------------------------------------------------------------------------

For multiple types of buffers (example: _audio_ and _video_) the same logic is
repeated (and separated) as many times. An _audio_ _PeriodBuffer_ will not
influence a _video_ one:

```
---------------------------   AUDIO   --------------------------------
     Period 1         Period 2
|================|=============   |
     ^

---------------------------   VIDEO   --------------------------------
     Period 1
|=======         |
     ^

----------------------------   TEXT   --------------------------------
     Period 1         Period 2          Period 3
|================| (NO SUBTITLES) |================   |
     ^
```

At the end, we should only have _PeriodBuffer[s]_ for consecutive Period[s]:
  - The first chronological one is the one currently seen by the user.
  - The last chronological one is the only one downloading content.
  - In between, we only have full consecutive _PeriodBuffers_.


### Communication with the API #################################################

The Stream communicates to the API about creations and destructions of
_PeriodBuffers_ respectively through ``"periodBufferReady"`` and
``"periodBufferCleared"`` events.

When the currently seen Period changes, an ``activePeriodChanged`` event is
sent.
