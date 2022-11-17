# The `ContentInitializer` #####################################################

The ContentInitializer is the part of the code actually starting and running the
logic behind playing a content.

Its code is written in the `src/core/init` directory.

Every time you're calling the API to load a new video, a ContentInitializer is
called by it (with multiple options).

The ContentInitializer then starts loading the content and communicate back its progress to
the API through events.

```
                 +-----------+
 1. loadVideo    |           |      2. Instanciate
---------------> |    API    | -------------------+
                 |           |                    |
                 +-----------+                    |
                       ^                          v
                       |                    +--------------------+
                       |   3. Emit events   |                    |
                       +------------------- | ContentInitializer |
                                            |                    |
                                            +--------------------+
```
During the various events happening on content playback, the ContentInitializer will
create / destroy / update various player submodules.

Example of such submodules are:
  - Adaptive streaming management
  - DRM handling
  - Manifest loading, parsing and refreshing
  - Buffer management
  - ...



## Usage #######################################################################

Concretely, the ContentInitializer is a class respecting a given interface,
allowing to:

  - prepare a future content for future play - without influencing a potentially
    already-playing content (e.g. by pre-loading the next content's Manifest).

  - start loading the content on a given media element

  - communicate about various playback events


### Emitted Events #############################################################

Events allows the ContentInitializer to reports milestones of the content
playback, such as when the content is ready to play.

It's also a way for the `ContentInitializer` to communicate information about
the content and give some controls to the user.

For example, as available audio languages are only known after the manifest has
been downloaded and parsed, and as it is most of all a user preference, the
ContentInitializer can emit to the API, objects allowing the API to "choose" at
any time the wanted language.



### Playback rate management ###################################################

The playback rate (or speed) is updated by the ContentInitializer.

There can be three occasions for these updates:

  - the API set a new speed

  - the content needs to build its buffer.

    In which case, the playback speed will be set to 0 (paused) even if the
    API set another speed.

  - the content has built enough buffer to un-pause.
    The regular speed set by the user will be set again in that case.
