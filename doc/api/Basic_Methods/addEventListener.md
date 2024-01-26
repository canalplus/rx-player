# addEventListener

## Description

Add an event listener to trigger a callback as it happens. The callback will
have the event payload as a single argument.

The RxPlayer API is heavily event-based. As an example: to know when a content
is loaded, the most straightforward way is to add an event listener for the
`"playerStateChange"` event. This can be done only through this method.

To have the complete list of player events, consult the [Player events
page](../Player_Events.md).

## Syntax

```js
player.addEventListener(event, callback);
```

- **arguments**:

  1. _event_ `string`: The wanted event's name.

  2. _callback_ `Function`: The callback for the event.
     The same callback may be used again when calling `removeEventListener`.

## Example

```js
player.addEventListener("error", function (err) {
  console.log(`The player stopped with an error: ${err.message}`);
});
```
