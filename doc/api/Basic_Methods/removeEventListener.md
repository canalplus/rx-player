# removeEventListener

## Description

Remove an event listener.
That is, remove a callback previously registered with `addEventListener` from
being triggered on the corresponding event. This also free-up the corresponding
ressources.

The callback given is optional: if not given, _every_ registered callback to
that event will be removed.

## Syntax

```js
// Remove all callbacks linked to event
player.removeEventListener(event);

// Remove specific listener
player.removeEventListener(event, callback);
```

  - **arguments**:

     1. _event_ `string`: The event name.

     2. _callback_ (optional) `Function`|`undefined`: The callback given when
        calling the corresponding `addEventListener` API.

## Example

```js
player.removeEventListener("playerStateChange", listenerCallback);
```
