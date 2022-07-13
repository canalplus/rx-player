# The `API` ####################################################################

The API is the front-facing part of the code.
It will be the only layer used by applications integrating the RxPlayer library.

As such, its main roles are to:
  - provide a comprehensive API for the user
  - translate user order into actions in the player
  - redirecting events to the user



## `public_api.ts`: the largest file here ######################################

`public_api.ts` is at the time of writing by far the longest file in all the
RxPlayer, with more than 2000 lines.

One of reason is that the API needs to have a considerable state because most of
the other modules rely on Observables.

I'll explain:
The API can't just interogate at any time the concerned module as if it was a
class with methods. Here most modules are functions which send events.

The problem is that a library user might want to have an information at any
given moment (for example, the current bitrate), which internally is only
sent as an event by some module.
It is thus the role of the API to store that information when it receives
this event to then communicate it back to the user.

 Also, as the API is a single class with a huge private state, being able
 to see those state mutations in a single file allows us to better think about
 how it all works.

 Another huge part of that file is actually the entire public API, as small
 functions.

 Still, we did some efforts to reduce the size of that file. For example, some
 long argument-parsing code has been moved out of this file, into
 `core/api/option_utils`. We might find other ways to reduce that size in the
 future, but that's not a main concern for now.



## Subparts ####################################################################

To facilitate those actions, the API relies on multiple building blocks:

  - __the `PlaybackObserver` (./playback_observer.ts)__

    Provide multiple methods allowing to monitor the current playback conditions
    (e.g. the current position and/or the current playback rate).
    Many RxPlayer modules rely on this PlaybackObserver.


  - __the `TrackChoiceManager` (./track_choice_manager.ts)__

    Ease up text/audio/video track switching to provide a simple-to-use API.

    It as another sister block the `MediaElementTrackChoiceManager`
    (./media_element_track_choice_manager.ts), has the same role but for
    "directfile" contents - which are contents directly played by the browser
    (by setting the media file as the `src` of a media element).


  - __the `option utils` (./option_utils.ts)__

    Parse options given to some RxPlayer API calls, to add default parameters
    and provide inteligible warnings/errors
