# The SourceBuffers ############################################################


## Overview ####################################################################

Technically speaking ``SourceBuffer``s are browser objects allowing JavaScript
applications to "append" media segments for them to be decoded at the right time
through their attached media element (e.g. ``<audio>`` or ``<video>`` media
elements).

Likewise in the RxPlayer code, the ``core/source-buffer`` directory contains the
part of the code directly related to the insertion and removal of media
segments.

You'll find there:

  - code that interacts with browser ``SourceBuffer`` Objects.

  - custom implementations of the ``SourceBuffer`` interface for ``text``
    (subtitles) or ``image`` (thumbnails) buffers.

  - decoders for the custom SourceBuffer implementation (e.g. the ``text``
    decoder parse subtitles and display them on screen at the right time).

  - functions which help to perform memory management on custom
    SourceBuffer implementations as well as native ones (this is mostly needed
    on some peculiar low-memory target with legacy browsers, but you might want
    to control at best your memory footprint even on a classical
    web-applications).



## SourceBuffersStore ##########################################################

The ``SourceBuffersStore`` is the main export from there. It facilitates the
creation and destruction of SourceBuffers.
More specifically, it keep track of every ``SourceBuffer`` created for a given
content.

As a rule, only ONE ``SourceBuffer`` is allowed by type of buffer (e.g.
``audio``, ``video``, ``text`` (subtitles), ``images`` (thumbnails)).



## QueuedSourceBuffer ##########################################################

A ``QueuedSourceBuffer`` is a wrapper on top of a ``SourceBuffer`` (a native one
or a custom RxPlayer implementation) that allows to push and remove segments
sequentially.
Basically, it waits for the previous action to be finished before going on the
next step.

It is the main interface the rest of the RxPlayer code has with SourceBuffers.
As a wrapper it copy most of the original browser API to lower the cognitive
complexity of using it.



## BufferGarbageCollector ######################################################

The BufferGarbageCollector is a function used by the RxPlayer to
periodically perform "garbage collection" manually on a given SourceBuffer.

It is based on the following building bricks:

  - A clock, which is an observable emitting the current time (in seconds) when
    the garbage collection task should be performed

  - The QueuedSourceBuffer on which the garbage collection task should run

  - The maximum time margin authorized for the buffer behind the current
    position

  - The maximum time margin authorized for the buffer ahead of the current
    position

Basically, each times the given clock ticks, the BufferGarbageCollector will
ensure that the volume of data before and ahead of the current position does not
grow into a larger value than what is configured.

One of them is created per SourceBuffer.
