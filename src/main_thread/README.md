# RxPlayer Main Thread #########################################################

| Consideration           | Status                                                     |
|-------------------------|------------------------------------------------------------|
| Preferred import style  | The `main_thread` directory shouldn't be imported directly |
| Multithread environment | It should only be relied on the main thread                |

## Overview ####################################################################

The "main_thread" directory regroups multiple modules constituting the central
logic of the RxPlayer that has to run in main thread (as opposed to `core`,
which optionally runs in a WebWorker).

Those modules are:

  - __the `API` (./api)__

    Defines the public API of the RxPlayer and provides abstractions to help
    implementing it.


  - __the `ContentInitializer` (./init)__

    Initialize playback and connects different modules between one another.


  - __the `ContentDecryptor` (./decrypt)__

    Negotiate content decryption.
    Only used for contents with DRM (Digital Right Management).


  - __the `TracksStore` (or `MediaElementTracksStore`) (./tracks_store)__

    Ease up text/audio/video track switching to provide a simple-to-use API.

    It as another sister block the `MediaElementTracksStore`
    (./tracks_store/media_element_tracks_store.ts), has the same role but
    for "directfile" contents - which are contents directly played by the
    browser (by setting the media file as the `src` of a media element).

  - __the `TextDisplayer` (./text_displayer)__

    Allows to display subtitles on screen. Either through HTML elements, or
    through native HTMLTrackElement (`<track>`).
