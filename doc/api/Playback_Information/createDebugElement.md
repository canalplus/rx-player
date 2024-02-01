# createDebugElement

## Description

Displays the default RxPlayer's debugging element inside the HTML element given in
argument.

The debugging information will then be regularly updated until the `dispose` method of the
returned object is called.

This method can only be called if the `DEBUG_ELEMENT` feature has been added to the
RxPlayer.

You can have more information on this feature
[in the Debug Element documentation page](../Miscellaneous/Debug_Element.md).

## Syntax

```js
const debugInfo = player.createDebugElement(myElement);
```

- **arguments**:

  1. _element_ `HTMLElement`: HTML element in which the debugging information should be
     displayed.

- **return value** `Object`: Object with a `dispose method, allowing to remove and stop
  updating the debugging element.
