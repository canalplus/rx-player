# Exported Types ###############################################################

The RxPlayer being written in TypeScript, it has type definitions attached to
its source code that can be helpful if you develop an application in TypeScript
yourself.


## "Using" types ###############################################################

Because we follow the usual way of adding definition files (as ``d.ts`` file
alongside our sources), those typings should be auto-exported when importing our
library in your favorite editor (as long as it is linked to a TSServer of some
sort).



## Importing specific types ####################################################

As some APIs can have pretty complicated arguments, you might also want to
import some of our internal type definitions into your code.

To simplify this process, we export some type definitions which can be imported
through the following line in your file:

```ts
import { SOME_TYPE } from "rx-player/types"
```

The exported types are:

  - ``IConstructorOptions``: Argument to give to ``new RxPlayer(args)``.
    Example:

    ```ts
    import RxPlayer from "rx-player";
    import { IConstructorOptions } from "rx-player/types";

    function generateConstructorOptions() : IConstructorOptions {
      const videoElement = document.querySelector("video");
      return {
        stopAtEnd: false,
        videoElement,
      };
    }

    const options = generateConstructorOptions();
    const player = new RxPlayer(options);

    export default player;
    ```

  - ``ILoadVideoOptions``: Argument to give to a ``loadVideo`` call.
    Example:

    ```ts
    import { ILoadVideoOptions } from "rx-player/types";
    import player from "./player"; // define an RxPlayer instance
    import config from "./config"; // define a global config

    function generateLoadVideoOptions(url : string) : ILoadVideoOptions {
      return {
        url,
        transport: "dash",
        autoPlay: true,
      };
    }

    const loadVideoOpts = generateLoadVideoOptions(config.DEFAULT_URL);
    player.loadVideo(loadVideoOpts);
    ```

Speaking of ``loadVideo``, some subparts of ``ILoadVideoOptions`` are also
exported:

  - ``ITransportOptions``: type for the ``transportOptions`` property
    optionally given to ``loadVideo``.

  - ``IKeySystemOption``: type for an element of the ``keySystems`` array,
    which is an optional property given to ``loadVideo``.

    To clarify, the ``keySystems`` property in a ``loadVideo`` call is an
    optional array of one or multiple ``IKeySystemOption``.

  - ``ISupplementaryTextTrackOption``: type for an element of the
    ``supplementaryTextTracks`` array, which is an optional property given to
    ``loadVideo``.

  - ``ISupplementaryImageTrackOption``: type for an element of the
    ``supplementaryImageTracks`` array, which is an optional property given to
    ``loadVideo``.

  - ``IDefaultAudioTrackOption``: type for the ``defaultAudioTrack`` property
    optionally given to ``loadVideo``.

  - ``IDefaultTextTrackOption``: type for the ``defaultAudioTrack`` property
    optionally given to ``loadVideo``.

  - ``INetworkConfigOption``: type for the ``networkConfig`` property
    optionally given to ``loadVideo``.

  - ``IStartAtOption``: type for the ``startAt`` property optionally given to
    ``loadVideo``.

Two constructor options have also their type definition exported, those are:

  - `IAudioTrackPreference`: which is the type of a single element in the
    `preferredAudioTracks` array.

  - `ITextTrackPreference`: which is the type of a single element in the
    `preferredTextTracks` array.
