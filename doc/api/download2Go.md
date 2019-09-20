# Download2Go ######################################################


## Overview ####################################################################

The Download2Go capabilities offer a full API to download a video content while online and then consuming it offline.  
However, the different use cases are not frozen and we may use it for other cases such as low quality connection.

:warning: This tool is still in an experimental phase. We are progressively releasing it in production but the 
api can still change in the future.

New improvment are still pushed regularly to make it even better!    
We are waiting your feedback to improve it!

## How to use it ###############################################################

As an experimental tool, the Download2Go won't be included in a
default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency
trough the npm registry (e.g. by doing something like ``npm install
rx-player``) and then specifically importing this tool from
``"rx-player/experimental/tools"``:

```js
import { download2Go as D2G } from "rx-player/experimental/tools";

this.D2G = await D2G.init()
```

## Properties ##################################################################

_nameB_ : ``string`` The name of the IndexDB database.

_storeManifestEvery_ : ``function`` A function that tell whether or not to store the manifest in base depending the progress of the download

## Methods ###################################################################

#### Advanced start

```
this.D2G = await D2G.init({
    nameDB: "d2g-CompanyX",
    storeManifestEvery: (progress) => progress % 20 === 0 // Emit every 20%
})
```

You can pass 2 additionals arguments:

- `nameDB`: Simply let you the possibility to name your IndexDB database :)
    - `default`: d2g

- `storeManifestEvery`: This paramater let you adopt you own stategies of saving. It takes a `function` that should return a boolean that indicate either or not to store the manifest depending of the progress. For example, if you are downloading a heavy content, it may be interesting to have a short interval between save, because if the download fail for whatever reason, you can resume the download from a less far progress.
    - `default`: Store at the very begining and then every 10%.


### _download()_

#### Overview

> The download method is the key method, she is used to retrieve and download assets while the user is online.

We are be able to:  
    - Retrieving a licence (Widevine)
    - Download all assets related to play a content offline (Audio/Video/Texts)
    - Dash (.mpd) content is currently supported (Template and SegmentSIDX are supported only)
    - Depending of you strategies of save, we can play a content as soon as the first segments necessary are downloaded.

#### Usage

```Promise: download(IAddMovie): Promise<void>```

- _url_ (`string`): The url of the dash manifest (must be a mpd file),

- _parsedManifest_ (`IParserResponse<IParsedManifest>`):` This property is optional, only required if you already have a parsedManifest type

- _dbSettings_:`

    - _contentID_ (`string`): Mandatory property, that uniquely identify a content

    - _metaData_ (`string`): You can put whatever value you want here to get it in offline mode. Must be a javascript basic value type otherwise IndexDB won't insert it.

- _videoSettings_:

    - _quality_ `(string|[number, number])`: Specify the quality of the movie you want, could be HIGH, MEDIUM, LOW or the exact quality value of type [width, height]

    - _keySystems_:

        - _type_ (`string`): name of the DRM system used. Can be either "widevine", "playready" or clearkey or the type (reversed domain name) of the keySystem (e.g. "com.widevine.alpha", "com.microsoft.playready" …).

        - _getLicence_ (`function`): Callback which will be triggered everytime a message is sent by the Content Decryption Module (CDM), usually to fetch/renew the license.

        Gets two arguments when called:

            - the _message_ (`Uint8Array`): The message, formatted to an Array of bytes.

            - the _messageType_ (`string`): String describing the type of message received. There is only 4 possible message types, all defined in the w3c specification.
            This function should return either synchronously the license, null to not set a license for this message event or a Promise which should either:
                - resolve if the license was fetched, with the licence in argument
                - resolve with null if you do not want to set a license for this message event
                - reject if an error was encountered

### Example

#### Basic download with clear content

```js
this.D2G.download({
  url: "http://dash-vod-aka-test.canal-bis.com/multicodec/index.mpd",
  dbSettings: {
    contentID: "aQSDJT5612",
    metaData: { title: "Dream Bigger" },
  },
  videoSettings: {
    quality: "LOW",
  },
}).then(() => {
  console.warn("Download Started!")
});
```

#### Advanced download with encrypted content

```
...
```

### _pause()_ / _resume()_

#### Overview

The API, let you the possibility to pause and resume a content while downloading it.

#### Usage

```pause(contentID: string): number | void```

This method just take a valid contentID, it means a download that is in action!

```
this.D2G.pause("aQSDJT5612")
console.warn("Content paused")
```

This method is also return a number:

1: The content has been well paused
2: The content was not downloading
emit: In case of error, emit.

```resume(contentID: string): Promise<void>```

Basically, resume a download that is partially downloaded, as pause, it takes a valid contentID.

```
this.D2G.resume("aQSDJT5612").then(() => {
  console.warn("Resume started!")
})
```

In case of error, emit.

### _getSingleMovie()_

#### Overview

This method is used to get only one content that has been downloaded fully or partially. This is the method we need to use to send it to the rx-Player

#### Usage

```Promise: getSingleMovie(contentID: string): Promise<T>```

```
const res = await D2G.getSingleMovie("aQSDJT5612")
// res => { movie }
```

```
type Movie = {
  contentID: string,
  rxpManifest: LocalManifest,
  metaData: any,
  progress: number,
  size: number,
  ...
}
```

```
this.D2G.getSingleMovie("aQSDJT5612").then(res => {
  const player = new RxPlayer({
    videoElement: document.getElementsByTagName("video")[0],
  })
  player.loadVideo({
    transportOptions: {
      manifestLoader(_, { resolve }) {
        resolve({
          data: res.rxpManifest,
        })
      },
    },
    transport: "local",
    autoPlay: true,
    keySystems: [
        {
            type: movieEntry.keySystems.type,
            persistentStateRequired: true,
            persistentLicense: true,
            licenseStorage: {
            save() {},
            load() {
                return movieEntry.keySystems.sessionsIDS
            },
        },
            getLicense() {
                return null
            },
        },
    ],
  })
})
```

### _deleteDownloadedMovie()_

#### Overview

This method is used to delete a content that has been fully or partially downloaded.

#### Usage

`Promise: deleteDownloadedMovie(contentID: string): Promise<number | void>`

```
this.D2G.deleteDownloadedMovie("azea55AZgd6").then(() => {
  console.warn("Content deleted!")
})
```

Should return 1 in case of success or emit an error.

### _getAllDownloadedMovies()_

#### Overview

Get all the downloaded entry (manifest) partially or fully downloaded.

#### Usage

`Promise: getAllDownloadedMovies(): Promise<T>`

```
const res = await D2G.getAllDownloadedMovies()
// res => [{ movie }]
```

### _getAvailableSpace()_

#### Overview

When downloading a content the data take place inside a space that the browser book for this kind of operation, but depending of the browser the rules are differents.

This method can be used to get an overview of how much space we currently use.

#### Usage

`Promise: getAvailableSpace(): Promise<{ total: number, used: number } | {}>`

```
const memorySpace = await this.D2G.getAvailableSpace()
console.warn(memorySpace) // { total: number bytes, used: number bytes }
```

### _Events_

#### Overview

In order to give you the data you need such as the progress level of a download. We exposed a eventful api that permit to subscribe to event and follow the flow in real time.

Here are these events:

##### _progress event_

The _progress_ event, is used to track the download of a content. The progress is emitted in percentage.
Moreover, the event can also have two differents status either counting that means that we are counting the number of segments we need to download and the other is processing, this means that we are really downloading the segments.

Usage:

```
const progressBar = document.getElementsByClassName("loader-grey")[0]
D2G.emitter.on("progress", evt => {
  // evt => { contentID: string, progress: number, status: "counting" | "processing" }
  progressBar.style.width = `${evt.progress}%`
})
```

##### _insertDB event_

The _insertDB_ event, will emit each time we are saving the manifest.

> This event will emit depending of your stategies of saving, you can change your strategies by setting this parameter here.

```
this.D2G.emitter.on("insertDB", evt => {
  // evt => { contentID: string, progress: number }
  console.warn(
    `The last ${evt.progress}% downloaded of ${evt.contentID} has been saved!`
  )
})
```

##### _error event_

The error event, is emitting each time you will try to make an action that is not expected or an error occurs during the downloading such as network errors.

```
this.D2G.emitter.on("error", evt => {
  // evt => { contentID: string, error: Error }
  notif(
    `${evt.contentID} has raised an error of type ${evt.error.name} - ${
      evt.error.message
    }`
  )
})
```