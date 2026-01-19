# getWorkerInterface

## Description

When running the RxPlayer in a
["multithreading" mode](../../Getting_Started/MultiThreading.md), it will rely on a
WebWorker to run the core logic of the player.

In that situation, if you have advanced needs (importing certain features, implementing
custom loading logic etc.), you may want to
[define your own worker-side code](./../../Getting_Started/ImportableWorker.md).

`getWorkerInterface` then allows your application to communicate with that worker.

If no worker is initialized through the current RxPlayer instance, it will return `null`.

If however a worker is initialized (you called the `attachWorker` method on the same
`RxPlayer` instance), it should return an object with the following properties:

- `sendMessage`: A function allowing to send messages to the associated Worker.

  It takes two arguments:
  1. **messageName** (`string`): Name for the associated event that has been listened to
     through an `addMessageListener` call on the worker-side. Can be any string.

  2. **payload** (`Object`): Payload for that particular event.

     It has to be cloneable through
     [the structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

- `addMessageListener`: A function allowing to catch event sent by the worker-side, which
  has a mirror version of this interface. It will be received by the worker if it

  It takes two arguments:
  1. **messageName** (`string`): Name for the event from the worker-side to listen to.

  2. **callback** (`function`): The callback that will be called every time a message with
     the given **messageName** was sent by the worker. This callback takes the payload the
     worker sent as argument. Like when doing the `sendMessage` on this interface,
     payloads sent by the worker also have been cloned through the structured clone
     algorithm first.

- `removeMessageListener`: A function allowing to remove a message listener previously
  added through an `addMessageListener` call. Takes two arguments which have to be the
  same ones than the one provided to `addMessageListener`.

#### Example

```js
const workerInterface = player.getWorkerInterface();
if (workerInterface === null) {
  console.info("No worker attached."); // Note that this may also happen when an
  // error prevented a worker from being attached.
} else {
  // Example of a message that can be sent
  workerInterface.sendMessage("my-content-info", {
    title: "myContent",
    id: 468742542,
  });

  // Listen for example to an event you produce worker-side when new media data
  // is requested.
  workerInterface.addMessageListener("my-request-info", (info) => {
    console.log(info.url);
  });
}
```

## Syntax

```js
const workerInterface = player.getWorkerInterface();
```

- **return value** `Object|null`
