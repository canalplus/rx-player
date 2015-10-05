## Constructor

Constructor will be exported in CommonJS.

```
var Player = require('rx-player')
```

#### new Player({ [videoElement] })

It is possible to give a `<video>` element when you instanciate it. Otherwise, it will be created.

## States / Getters

### Player

#### `getPlayerState() : string`

Returns playback state of the player. Available states are :

- `STOPPED`: there is no information about the current stream (beginning state or after `stop()` is called)
- `LOADING`: the stream and encryption information, if needed, are loading
- `LOADED`: the player is ready to play
- `ENDED`: the player has reached the end of thre stream or `endTime` with success
- `PLAYING`: the content is currently playing
- `PAUSED`: playback has been paused by the user
- `BUFFERING`: the player has reached the end of the buffer and is waiting for data to be appended.
- `SEEKING`: the player has reached the end of the buffer because of an action of seeking by the user

State chart:

```
    -------------
    |  STOPPED  | <-----------------+
    -------------                   | stop() or "error" event
       |                            |
-------| loadVideo() -------------------------------------------------------
|      v                           -----------------------                 |
|  -----------     ------------  play()  -----------     |    -----------  |
|  | LOADING | --> |  LOADED  | ---|---> | PLAYING | ----|--> |  ENDED  |  |
|  -----------     ------------ autoPlay -----------     |    -----------  |
|                                  |         | ^         |                 |
|           ---------------        |  play() | | pause() |                 |
|           |  BUFFERING  | -----> |         v |         |                 |
|           |     or      |        |     -----------     |                 |
|           |   SEEKING   | <----- |     | PAUSED  |     |                 |
|           ---------------        |     -----------     |                 |
|                                  -----------------------                 |
----------------------------------------------------------------------------
```

#### `isLive() : bool`

Returns `true` if the content is a live content.

#### `getUrl() : string`

Returns the url of content's manifest.

#### `getVideoDuration() : float`

Returns the total duration of the content. `Infinity` for a live stream.

#### `getVideoLoadedTime() : float`

Returns in seconds the duration of the loaded video on the current range.

#### `getVideoPlayedTime() : float`

Returns in seconds the duration of the played video on the current range.

#### `getVideoElement() : HTMLVideoElement`

Returns the <video> DOM element used by the player.

#### `getNativeTextTrack() : TextTrack`

Returns the text-track element used by the player to inject subtitles.

#### `getCurrentTime() : float`

Returns the current playback position :
  * in seconds for an on-demand content
  * with a `Date` object for live content.

#### `getStartTime() : float`

Returns the start playback position :
  * in seconds for an on-demand content
  * with a `Date` object for live content.

#### `getEndTime() : float`

Returns the end playback position.
  * in seconds for an on-demand content
  * with a `Date` object for live content.

#### `getPlaybackRate(): float`

Returns the current playback speed.

#### `getVolume() : float`

Returns the value of current volume, as a float between 0 and 1.

#### `isFullscreen() : bool`

Returns `true` if player is in fullscreen mode.

#### `getAvailableLanguages()/getAvailableSubtitles() : []string`

Returns an array availables languages/subtitles.

#### `getLanguage()/getSubtitle() : string`

Returns current language/subtitle. `null` if not set.

### Bitrates

#### `getAvailableVideoBitrates()/getAvailableAudioBitrates() : []int`

Returns an array of availabes video/audio bitrates, in bits per seconds.

#### `getVideoBitrate()/getAudioBitrate() : int`

Returns current video/audio bitrate, in bits per seconds.

#### `getVideoMaxBitrate()/getAudioMaxBitrate() : int`

Returns the video/audio bitrate maximum. 0 if no limit.

#### `getVideoBufferSize()/getAudioBufferSize() : int`

Returns the size of the video/audio buffer.

## Commandes

This is a list of methods you can use to change player stats.
All these methods return [Promises/A+](http://promisesaplus.com/) objects.

### Player

#### `loadVideo(options) : Promise`

Load a video stream given the url of its manifest.
This method can be call anytime, even if a stream is already loaded an played by the player. In this case, the player states will be cleared, and the new stream will be loaded.

* `options.url, options.keySystems`

  To load an encrypted stream, at least one `KeySystem` object must be given. This `KeySystem` provides interface to specify the license retrieval strategy.


  - `{ url, keySystems: [keySystem...], subtitles }`: an object containing the URL of an encrypted stream, with a list of `KeySystem` to decrypt it

  `Subtitles` is array of object with the following interface:

  ```java
  interface Subtitles {
    string url,
    string mimeType
    string [language], Array<string> [languages],
  },
  ```

  The player is responsible to use the right `KeySystem` which is compatible to user platform.

  `KeySystem` is an object with the following interface:

    ```java
    interface KeySystem {
      // String providing the supported DRM(s).
      // Currently, available DRM(s) are playready (Microsoft), widevine (Google), or clearkey
      string type;

      // Method called with the DRM challenge as a parameter
      // It returns a Promise corresponding to XHR made to the server with the
      // challenge as an ArrayBuffer
      Promise<ArrayBuffer> getLicense((ArrayBuffer) challenge);

      // Optional Boolean specifying if the keySystem needs to be persisted.
      // If true you need to pass a LicenseStorage with interface below.
      boolean persistentLicense;
      LicenseStorage licenseStorage;

      // Booleans to parametrize the use of persistentState or
      // distinctiveIdentifier functionnalities. See eme spec for
      // more details. Both are false by default.
      boolean persistentStateRequired;
      boolean distinctiveIdentifierRequired;
    }
    ```

    ```java
    interface LicenseStorage {
      Array save();
      void load(Array entries);
    }
    ```

  For more informations about EME, take a look to the [W3C specification](https://dvcs.w3.org/hg/html-media/raw-file/tip/encrypted-media/encrypted-media.html#introduction).

* `options.timeFragment`

  Parameter allowing to specify the start and the end of the video. This parameter can be provided with following formats :

  - a string followuing the [MediaFragment standard](http://www.w3.org/TR/media-frags/#naming-time) (naming time only): `"12,120"`, `",10"`, `"10"` etc.
  - an object with javascript timestamps`{ [start]: Number, [end]: Number }`
  - an object with `Date` objects `{ [start]: Date, [end]: Date }`

* `options.transport`

  Parameter allowing to specify the type of "transport" used by the player to load manifest and media chunks.
  It is possible to choose between the available transports given a string. Currently, the available transports are :

    * `dash`: DASH transport implementation
    * `smooth`: SmoothStreaming transport implementation

  It is also possible to write your own transport, by giving a function returning an object containing those parameters  `{ manifestPipeline, segmentPipeline, textTrackPipeline }`, where each parameter is a `Pipeline` object with the following interface:

  ```java
  interface Pipeline {
    Observable resolver(infos),
    Observable loader(infos),
    Observable parser(infos),
  }
  ```

* `options.transportOptions`

  Object which is used as a parameter of the transport method each time the player is instanciated.

* `options.directFile`

  Boolean allowing to specify the stream URL given as parameter of `loadVideo` should be used without using `MediaSource` interface.

* `options.initVideoBitrate` / `options.initAudioBitrate`

  Number used as initial video and audio bitrates by the adaptive streaming.

#### `play() : void`

Starts video playback. Should be called when the stream is ready, eg. when state machine reaches the state `LOADED`.

#### `pause() : void`

Pauses the video playback.

#### `stop() : void`

Stops video playback and clean the player, to put back the machine state into start state.

#### `setPlaybackRate(float) : Promise`

Changes the video playback speed.

#### `seekTo(float) : Promise`

Changes the video position given a parameter :
  * in seconds for an on-demand content
  * with a `Date` object for live content.

#### `goToLive() : Promise`

In case of a live video stream, take back position to live position. This is an alias to `seekTo(Date.now())`.

#### `goToStart() : Promise`

Changes position to start position. This is an alias to `seekTo(start content timestamp)`.

#### `setFullscreen(bool) : void`

This methods allow to toggle the fullscreen state of the browser.

#### `setVolume(float) : void`

Sets the video volume, given a float between 0.0 and 1.0.

#### `mute() : void`

Sets volume to 0.0 and record volume value, allowing then to unmute.

#### `unMute() : void`

Sets volume to recorded value before muting it.

#### `setLanguage(string) : Promise`

Changes the audio track to the one matching the audio language given in parameter. It is possible to list the available languages using the method `getAvailableLanguages()`.

#### `setSubtitle(string) : Promise`

Changes the subtitle track to the one matching the subtitle language given in parameter. It is possible to list the available subtitles using the method `getAvailableSubtitles()`. If `null` is given, subtitle are disabled.

### Bitrates

#### `setVideoBitrate(int)/setAudioBitrate(int)`

Sets a specific bitrate for the audio/video stream. The given bitrate must match one bitrate of the list returned by `getAvailableVideoBitrates/getAvailableAudioBitrates` method. This method disables the *auto-adaptive* mode of the player. Giving 0, *auto-adaptive* is on again.

#### `setVideoMaxBitrate(int)/setAudioMaxBitrate(int)`

Sets a maximum limit in the bitrate chosen by the *auto-adaptive* player strategy. If the given value is negative, the limit is disabled.

#### `setVideoBufferSize(int)/setAudioBufferSize(int)`

Sets the buffer size in seconds. If 0 is given, default value is used (30 seconds, in the inital implementation).

## Events

#### `addEventListener(event, func)`

Adds a listener on an event. The avaiable events are :

- `"playerStateChange", string`: changes in the state machine of the player.
- `"progress", string`: changes in the buffer state
- `"currentTimeChange", float`: changes in the currentTime
- `"languageChange", string`: changes in audio language
- `"subtitleChange", string`: changes in subtitle track
- `"audioBitrateChange", int`: changes in audio bitrate
- `"videoBitrateChange", int`: changes in video bitrate
- `"fullscreenChange", bool`: changes in fullscreen state
- `"error", Error TBD`: asynchronous error in playback.

#### `removeEventListener(event, func)`

Removes an event listener
