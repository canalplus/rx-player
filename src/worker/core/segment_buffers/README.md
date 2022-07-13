# The SegmentBuffers ###########################################################

The ``core/segment_buffers`` directory contains the part of the code directly
related to the insertion and removal of media segments to a buffer for later
decoding.

This is either done through native `SourceBuffers`, which are JavaScript objects
implemented by the browser or a custom buffer implementation entirely defined
in the code of the RxPlayer.

The interface through which the RxPlayer's code push segment is called the
`SegmentBuffer`, it comes on top of the buffer implementation (regardless if it
comes from native `SourceBuffer` objects or if it is a custom one).

A `SegmentBuffer` is defined for a type of media (e.g. "video", "audio",
"text"...) they are defined in the `src/core/segment_buffers/implementations`
directory.

Here's a simplified architecture schema of the code in that directory:
```
   +--------------------------------------------------------------------------+
   |                        Rest of the RxPlayer's code                       |
   +--------------------------------------------------------------------------+
                                |       ^
 Ask to get / create / remove   |       | Returns created SegmentBuffer or
 SegmentBuffer for a given type |       | wanted information
 or get information about the   |       |
 available types                |       |
                                |       |
                                V       |
   +--------------------------------------------------------------------------+
   |                         SegmentBuffersStore                              |
   +--------------------------------------------------------------------------+
          |                  |                  |                  |
          | creates          | creates          | creates          | creates
          | (if needed)      | (if needed)      | (if needed)      | (if needed)
          |                  |                  |                  |
          V                  V                  V                  V
  +-------------+    +-------------+     +-------------+     +-------------+
  |  AudioVideo |    |  AudioVideo |     |             |     |             |
  |SegmentBuffer|    |SegmentBuffer|     |    Text     |     |    Image    |
  |   (video)   |    |   (audio)   |     |SegmentBuffer|     |SegmentBuffer|
  |             |    |             |     |             |     |             |
  +-------------+    +-------------+     +-------------+     +-------------+
     Uses both          Uses both             Uses                Uses
      |      |           |      |               |                   |
      |      |           |      |               |                   |
      V      V           V      V               V                   V
  +-----+ +-----+    +-----+ +-----+         +-----+             +-----+
  | SI* | | SB* |    | SI* | | SB* |         | SI* |             | SI* |
  +-----+ +-----+    +-----+ +-----+         +-----+             +-----+

  SI*: SegmentInventory. Store the metadata on every segments currently
       available in the associated media buffer.

  SB*: SourceBuffer (browser implementation of a media buffer).
```



## SegmentBuffersStore #########################################################

The ``SegmentBuffersStore`` is the main export from there.
It facilitates the creation and destruction of these `SegmentBuffers`.

Its roles are to:

  - announce which types of `SegmentBuffer` can be currently created on the
    HTMLMediaElement (example of a type of buffer would be "audio", "video" or
    "text").

    For example, no "video" `SegmentBuffer` should be created on an `<audio>`
    element (though it wouldn't cause any problem, it would be useless
    as video cannot be rendered here). To give another example, you should not
    create a "text" `SegmentBuffer` if no text track parser has been added to
    the RxPlayer.

  - Create only one `SegmentBuffer` instance per type of buffer.

    Multiple `SegmentBuffer` for a single type could lead to browser issues
    and to conflicts in the RxPlayer code.

  - Provide a synchronization mechanism to announce when all `SourceBuffers` are
    ready to receive segments.

    I'll explain:

    `SourceBuffers` are browser implementations for media data buffers.
    They typically are used by the "video" and "audio" `SegmentBuffer`.

    Among several other constraints, all `SourceBuffers` needed to play a
    given content should be created before we can start pushing segments to any
    of them. This is a browser limitation.

    This is where this synchronization mechanism can become useful. The
    `SegmentBuffersStore` will signal when all of the `SourceBuffers`
    needed for the given contents are created, so that the rest of the RxPlayer
    knows when it can begin to push segments to those.

    Note that this means that `SourceBuffers` for an un-needed type (e.g. an
    audio content won't need a video `SourceBuffer`) have to be explicitely
    "disabled" here, as the `SegmentBuffersStore` cannot know whether it should
    wait until those `SourceBuffers` are created of if you just don't need it.



## SegmentBuffers implementations ##############################################

A `SegmentBuffer` is an Object maintaining a media buffer for a given type (e.g.
"audio", "video", "text" etc.) used for later decoding.

There exists several `SegmentBuffer` implementations in the RxPlayer's code
depending on the type concerned.
An implementation takes the form of a class with a well-defined API shared with
every other implementations. It allows to push segments, remove data and
retrieve information about the data that is contained within it.

At its core, it can either rely on a browser-defined `SourceBuffer` Object or
can be entirely defined in the code of the RxPlayer.

A `SegmentBuffer` also keeps an inventory containing the metadata of all
segments currently contained in it, with the help of a `SegmentInventory`
Object (see corresponding chapter).

It is the main interface the rest of the RxPlayer code has with media buffers.



## BufferGarbageCollector ######################################################

The `BufferGarbageCollector` is a function used by the RxPlayer to
periodically perform "garbage collection" manually on a given
`SegmentBuffer`.

It is based on the following building bricks:

  - An observable emitting the current time (in seconds) when the garbage
    collection task should be performed

  - The `SegmentBuffer` on which the garbage collection task should run

  - The maximum time margin authorized for the buffer behind the current
    position

  - The maximum time margin authorized for the buffer ahead of the current
    position

Basically, each times the given Observable emits, the BufferGarbageCollector will
ensure that the volume of data before and ahead of the current position does not
grow into a larger value than what is configured.

For now, its code is completely decoupled for the rest of the code in that
directory. This is why it is not included in the schema included on the top of
this page.



## The SegmentInventory ########################################################

The SegmentInventory is a class which registers some information about every
segments currently present in a `SegmentBuffer`.

One of them is created for every new `SegmentBuffer`.

This helps the RxPlayer to avoid re-downloading segments unnecessarily and know
when old one have been garbage collected.
For example, we could decide not to re-download a segment in any of the
following cases:

  - The same segment is already completely present in the `SegmentBuffer`

  - The same segment is partially present in the `SegmentBuffer` (read: a part
    has been removed or garbage collected), but enough is still there for what
    we want to play

  - Another segment is in the `SegmentBuffer` at the wanted time, but it is the
    same content in a better or samey quality


On the contrary, we need to download the segment in the following cases:

  - No segment has been pushed at the given time

  - A segment has been pushed, but at a lower quality than what we currently
    want

  - A segment has been pushed at a sufficient quality, but we miss to much of it
    for our needs (too much has been garbage collected, removed or the segment
    is just too short).

  - A segment has been pushed but is not exactly the content we want
    (example: it is in another language)

Thanks to the SegmentInventory, we can infer on which situation we are at any time.



### Implementation #############################################################

The SegmentInventory is merely a "Store", meaning it will just store and
process the data you give to it, without searching for the information itself.

It contains in its state an array, the _inventory_, which stores every segments
which should be present in the `SegmentBuffer` in a chronological order.

To construct this inventory, three methods can be used:

  - one to add information about a new chunk (part of a segment or the whole
    segment), which should have been pushed to the `SegmentBuffer`.

  - one to indicate that every chunks from a given segment have been pushed.

  - one to synchronize the currently pushed segments with what the
    `SegmentBuffer` says it has buffered (which can be different for example
    after an automatic garbage collection).

After calling the synchronization one, you should be able to tell which parts of
which segments are currently _living_ in your `SegmentBuffer`.
