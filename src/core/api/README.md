# The `API` ####################################################################

The API is the front-facing part of the code.
It will be the only layer used by applications integrating the RxPlayer library.

As such, its main roles are to:
  - provide a comprehensive API for the user
  - translate user order into actions in the player
  - redirecting events to the user


## Subparts ####################################################################

To facilitate those actions, the API relies on multiple building blocks:

  - __the `PlaybackObserver` (./playback_observer.ts)__

    Provide multiple methods allowing to monitor the current playback conditions
    (e.g. the current position and/or the current playback rate).
    Many RxPlayer modules rely on this PlaybackObserver.


  - __the `TracksStore` (./track_management/tracks_store.ts)__

    Ease up text/audio/video track switching to provide a simple-to-use API.

    It as another sister block the `MediaElementTracksStore`
    (./track_management/media_element_tracks_store.ts), has the same role but
    for "directfile" contents - which are contents directly played by the
    browser (by setting the media file as the `src` of a media element).


  - __the `option utils` (./option_utils.ts)__

    Parse options given to some RxPlayer API calls, to add default parameters
    and provide inteligible warnings/errors
