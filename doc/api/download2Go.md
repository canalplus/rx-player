# Download2Go

## Overview

The Download2Go capabilities offer a full API to download a video content while online and consuming it offline.

However, the different use cases of download are not frozen and we may use it for other cases such as low quality connection.

:warning: This tool is still in an experimental phase. We are progressively releasing it in production but the
api can still change in the future.

New improvment are still pushed regularly to make it even better!  
We are waiting your feedback to improve it!

## How to use it

As an experimental tool, the Download2Go won't be included in a default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency (e.g. by doing something like `npm install rx-player`) and then specifically importing this tool from
`"rx-player/experimental/tools"`:

```js
import { Download2Go as D2G } from "rx-player/experimental/tools";

this.D2G = new D2G();
await this.D2G.initDB(); // is Mandatory to initialize IndexedDB
```

## Properties

_nameB_ : `string` The name of the IndexDB database.

## Static properties

### isPersistentLicenseSupported()

Using the `download2Go` api require the browser be able to do it. Thus, to know if the browser can play the content we downloaded, we provided a method that will check the configuration of your current environnment.

More specifically, it will check the ability to store a `persistentLicense` to use it again latter.

If your browser doesn't support this property the method will return the value `false` and thus you will only be able to play DRM free content.

`isPersistentLicenseSupported(): Promise<boolean>`

```js
D2G.isPersistentLicenseSupported().then((isSupported) => {
  if (isSupported) {
    console.warn("Browser CAN store persistent license")
  } else {
    console.warn("Browser CAN'T store persistent license")
  }
})
```

## Methods

#### Advanced start

```js
this.D2G = new D2G({
  nameDB: "d2g-CompanyX"
});
await d2g.initDB(); // is Mandatory to initialize DB
```

You can pass 1 additional arguments:

- `nameDB`: Simply let you the possibility to name your IndexedDB database :)
  - `default`: d2g

### download()

#### Overview

> The download method is the key method, she is used to retrieve and download assets while the user is online.

We are be able to:

- Play a content that is encrypted (with Widevine/Playready DRM technologies) on supported browser.
- Download all assets related to play a content offline (Video/Audio/Text)
- We are able to download through **SMOOTH** and **DASH** streaming transport protocol (for now... maybe **HLS** later...).
- We can play a content as soon as the first segments necessary are downloaded, we save the progress every **10%** of download progress.

#### Usage

`download(IInitSettings): Promise<void>`

- _url_ (`string`): The url of the manifest (**DASH**/**SMOOTH**). [MANDATORY]

- _transport_ (`smooth|dash`):` Tell to the loader what type of streaming transport protocol we will use. [MANDATORY]

- _contentID_ (`string`): Uniquely identify a downloaded content. [MANDATORY]

- _metaData_ (`any`): You can put whatever value you want here to get it in offline mode. Valid javascript type: `object|array|string|number`.

- _advanced_ `(object)`:

  - _quality_ `(string)`: Specify the quality of the movie you want, could be HIGH, MEDIUM, LOW.

    - `HIGH`: Will take the **HIGHEST** quality possible.
    - `MEDIUM`: Will take the **MIDDLE** quality (Based on lower quality pick).
    - `LOW`: Will take the **LOWEST** quality possible.

    > This parameter is useful if you want to set up a quick download.

  - _videoQualityPicker_ `(function)`: This parameter is much more **advanced** than the one above, it allows you to choose a specific quality depending a representation given in the manifest. The function take an array of representation for the given adaptation and must return the representation that we will use.

    - Type: `([Representation, Representation, Representation]) => Representation`
    - A **Representation** in a manifest is defined [here](https://github.com/canalplus/rx-player/blob/master/src/manifest/representation.ts).

    > You can choose a very specific Representation, depending your need, you have a full control!

- _keySystems_ `(object)`:

> This property is mandatory if the content uses DRM.

It is here that is defined every options relative to the encryption of your content. There’s a lot of configuration possible here. In the case you find this documentation hard to grasp, we’ve written a tutorial on [DRM configuration here](https://developers.canal-plus.com/rx-player/doc/pages/tutorials/contents_with_DRM.html).

- _type_ (`string`): name of the DRM system used. Can be either "widevine", "playready" or clearkey or the type (reversed domain name) of the keySystem (e.g. "com.widevine.alpha", "com.microsoft.playready" …).

- _serverCertificate_ (`BufferSource|undefined`): Eventual certificate used to encrypt messages to the license server. If set, we will try to set this certificate on the CDM. If it fails, we will still continue to try deciphering the content (albeit a warning will be emitted in that case with the code "LICENSE_SERVER_CERTIFICATE_ERROR").

- _getLicence_ (`function`): Callback which will be triggered everytime a message is sent by the Content Decryption Module (CDM), usually to fetch/renew the license.

  - the _message_ (`Uint8Array`): The message, formatted to an Array of bytes.

  - the _messageType_ (`string`): String describing the type of message received. There is only 4 possible message types, all defined in the w3c specification.
          This function should return either synchronously the license, null to not set a license for this message event or a Promise which should either:
              - resolve if the license was fetched, with the licence in argument
              - resolve with null if you do not want to set a license for this message event
              - reject if an error was encountered

  This function should return either synchronously the license, null to not set a license for this message event or a Promise which should either: - resolves if the license was fetched, with the licence in argument - resolve with null if you do not want to set a license for this message event - reject if an error was encountered.

  In any case, the license provided by this function should be of a BufferSource type (example: an Uint8Array or an ArrayBuffer).

  Even in case of an error, you can (this is not mandatory) set two properties on the rejected value which will be interpreted by the RxPlayer: - noRetry (Boolean): If set to true, we will throw directly a KEY_LOAD_ERROR to call getLicense. If not set or set to false, the current retry parameters will be applied (see getLicenseConfig) - message (string): If the message property is set as a “string”, this message will be set as the message property of the corresponding EncryptedMediaError (either communicated through an "error" event if we’re not retrying or through a "warning" event if we’re retrying). As every other getLicense-related errors, this error will have the KEY_LOAD_ERROR code property.

  Note: We set a 10 seconds timeout by default on this request (configurable through the getLicenseConfig object). If the returned Promise do not resolve or reject under this limit, the player will stop with an error.

#### Example

##### Basic download with clear content

```js
this.D2G.download({
  url: "http://dash-vod-aka-test.canal-bis.com/multicodec/index.mpd",
  contentID: "aQSDJT5612",
  metaData: { title: "Dream Bigger" }
  advanced: {
    quality: "LOW"
  }
}).then(() => {
  console.warn("Download Started!");
});
```

##### Advanced download with encrypted content

```
...
```

### pause() / resume()

#### Overview

The API, let you the possibility to pause and resume a content while downloading it.

#### Usage

`pause(contentID: string): number | void`

This method just take a valid contentID.

```js
this.D2G.pause("aQSDJT5612")
console.warn("Content paused")
```

`resume(contentID: string): Promise<void>`

Basically, resume a download that is partially downloaded, as pause, it takes a valid contentID.

```js
this.D2G.resume("aQSDJT5612").then(() => {
  console.warn("Resume started!")
})
```

In case of error, emit on `error`.

### getSingleContent()

#### Overview

This method is used to get only one content that has been downloaded fully or partially. This is the method we need to use to send it to the rx-Player

#### Usage

`getSingleContent(contentID: string): Promise<IContentLoader | void>`

```js
const res = await D2G.getSingleContent("aQSDJT5612")
// res => { IContentLoader }
```

```js
type Movie = {
  progress: IProgressBuilder;
  size: number;
  transport: "dash" | "smooth";
  contentID: string;
  metaData?: {
    [prop: string]: any;
  };
  contentProtection?: {
    sessionsIDS: IPersistedSessionData[];
    type: string;
  };
  offlineManifest: ILocalManifest;
}
```

```js
this.D2G.getSingleContent("aQSDJT5612").then(res => {
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

### deleteContent()

#### Overview

This method is used to delete a content that has been fully or partially downloaded.

#### Usage

`deleteDownloadedMovie(contentID: string): Promise<void>`

```js
this.D2G.deleteDownloadedMovie("azea55AZgd6").then(() => {
  console.warn("Content deleted!")
})
```

> If the content is downloading, the method will **pause** it and **delete** it.

### getAllOfflineContent()

#### Overview

Get all the downloaded entry (manifest) partially or fully downloaded.

#### Usage

`getAllDownloadedMovies(): Promise<IStoredManifest[] | undefined>`

```js
const res = await D2G.getAllDownloadedMovies()
// res => [{ IStoredManifest }]
```

```js
type IStoredManifest = {
  contentID: string;
  transport: "smooth" | "dash";
  manifest: Manifest | null;
  builder: {
    video: IContextRicher[];
    audio: IContextRicher[];
    text: IContextRicher[];
  };
  progress: IProgressBuilder;
  size: number;
  metaData?: {
    [prop: string]: any;
  };
  duration: number;
}
```

> If you want to play a content, you should **always** use the `getSingleContent()` method instead.

### getAvailableSpaceOnDevice()

#### Overview

When downloading a content the data are stored inside a space that the browser book for this kind of operation, but depending of the browser the rules are differents.

This method can be used to get an overview of how much space we currently use (may not be always very accurate).

#### Usage

`getAvailableSpaceOnDevice(): Promise<{ total: number, used: number } | null>`

```js
const memorySpace = await this.D2G.getAvailableSpaceOnDevice()
console.warn(memorySpace) // { total: number bytes, used: number bytes }
```

## Events

### Overview

In order to give you the data you need such as the progress level of a download. We exposed a eventful api that permit to subscribe to event and follow the flow in real time.

Here are these events:

### `progress`

The _progress_ event, is used to track the download of a content. The progress is emitted in percentage.
Moreover, the event can also have two differents status either counting that means that we are counting the number of segments we need to download and the other is processing, this means that we are really downloading the segments.

Usage:

```js
const progressBar = document.getElementsByClassName("loader-grey")[0]
D2G.emitter.on("progress", evt => {
  // evt => { contentID: string, progress: number, status: "counting" | "processing" }
  progressBar.style.width = `${evt.progress}%`
});
```

### `insertDB`

The _insertDB_ event, will emit each time we are saving the manifest.

> This event will emit depending of your stategies of saving, you can change your strategies by setting this parameter here.

```js
this.D2G.emitter.on("insertDB", evt => {
  // evt => { contentID: string, progress: number }
  console.warn(
    `The last ${evt.progress}% downloaded of ${evt.contentID} has been saved!`
  )
});
```

### `error`

The error event, is emitting each time you will try to make an action that is not expected or an error occurs during the downloading such as network errors.

```js
this.D2G.emitter.on("error", evt => {
  // evt => { contentID: string, error: Error }
  console.warn(
    `${evt.contentID} has raised an error of type ${evt.error.name} - ${ evt.error.message }`
  );
});
```
