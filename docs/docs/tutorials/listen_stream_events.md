---
id: listenSteamEvents-tutorials
title: Listening to stream events
sidebar_label: Listening to stream events
slug: listening-to-stream-events
---

# Tutorial: Listening to stream events

Some contents contain events a player will need to send at a particular point
in time. We call those in the RxPlayer "stream events".

For example, stream events are often used jointly with ad-insertion, to allow a
player to notify when an user begin to see a particular ad.

Stream events are not only restrained to ad-related usages though. Any event
you want to synchronize with the played content can be inserted.

## Event Formats understood by the RxPlayer

### DASH EventStream elements

For now, the RxPlayer only make use of DASH' EventStream elements.

Such elements are defined in a DASH MPD in the concerned `Period`.
Here is an example of such element in an MPD:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MPD
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd"
  type="dynamic"
  minimumUpdatePeriod="PT2S"
  timeShiftBufferDepth="PT30M"
  availabilityStartTime="2011-12-25T12:30:00"
  minBufferTime="PT4S"
  profiles="urn:mpeg:dash:profile:isoff-live:2011">

    <Period id="1">
      <EventStream schemeIdUri="urn:uuid:XYZY" timescale="1000" value="call">
        <Event presentationTime="0" duration="10000" id="0">
          1 800 10101010
        </Event>
        <Event presentationTime="20000" duration="10000" id="1">
          1 800 10101011
        </Event>
        <Event presentationTime="40000" duration="10000" id="2">
          1 800 10101012
        </Event>
        <Event presentationTime="60000" duration="10000" id="3">
          1 800 10101013
        </Event>
      </EventStream>
      <!-- ... -->
    </Period>

</MPD>
```

Here the `<EventStream />` elements and its `<Event />` children elements will
be parsed by the RxPlayer.

Each `<Event />` element can then be sent through a single RxPlayer events.

## How to listen to stream events

The RxPlayer notify of such events through the usual RxPlayer events.

_As a reminder (or if you didn't know), the RxPlayer can send a multitude of
[events](../api/events.md) that can be listened to by the usage of the
[addEventListener method](../api/basicMethods/addEventListener.md)._

The events related to stream events are:

- `"streamEvent"`: an event has just been reached.

- `"streamEventSkip"`: an event has been skipped over. This usually means
  that a player seek operation resulted in the corresponds event being
  "missed".

In any case, the corresponding event will be attached as a payload.

Example:

```js
// listen to "streamEvent" events
rxPlayer.addEventListener("streamEvent", (evt) => {
  console.log("An event has been reached:", evt);
});

// listen to "streamEventSkip" events
rxPlayer.addEventListener("streamEventSkip", (evt) => {
  console.log("We just 'skipped' an event:", evt);
});
```

## The event format

Whether you're listening to the `"streamEvent"` or the `"streamEventSkip"`
event, you will receive an object containing the corresponding event
information.

Here is an example of such events:

```js
{
  start: 10, // start time of the event, in seconds.
             //
             // It is always defined, as a number.
             //
             // A start at `10` here means that the event began when the player
             // reached the position at 10 seconds.

  end: 25, // Optional end time of the event, in seconds.
           //
           // It can be undefined or unset for events without any duration.
           // A end at `25` here indicates that this event only last from the
           // position at 10 seconds (the `start`) to the position at 25
           // seconds, or an event with a duration of 15 seconds.
           //
           // If `end` is defined, you can be notified when the end of this
           // event is reached by adding an `onExit` callback to that event
           // (continue reading this tutorial for more information).

  data: { // The event's data itself.

    type: EVENT_TYPE, // String describing the source of the event.

    value: EVENT_VALUE, // This property's format and content depends on the
                        // `type` property. For example, when the type property
                        // is set to "dash-event-stream", this value will be the
                        // <Event /> element corresponding to that DASH event.
  }
}
```

As written in this example, the underlying format of the event itself will
depend on the source of the event. For example, an event generated from a DASH's
`<EventStream />` won't be in the same format that an event generated from a
MP4's `emsg` box.

You can know which current format is used by checking the value of the
`data.type` property.

For now, we only have one format: DASH EventStream elements, which will have a
`data.type` property equal to `"dash-event-stream"`.

### DASH EventStream elements

A DASH EventStream's event will be parsed under the following format:

```js
{
  start: 10, // As usual, the event start time in seconds

  end: 15, // optional end position of the event, in seconds.
           // Can be not set or set to `undefined` for events without a duration

  data: {

    type: "dash-event-stream", // Type corresponding to a DASH's EventStream's
                               // Event element

    value: {
      schemeIdUri: SCHEME_ID_URI,
      element: EVENT_ELEMENT,
      timescale: EVENT_TIMESCALE,
    }
  }
}
```

Where:

- `SCHEME_ID_URI` will be the value of the corresponding EventStream's
  `schemeIdUri` attribute

- `EVENT_ELEMENT` will be the corresponding `<Event />` element in the MPD.

- `EVENT_TIMESCALE` will be the value of the corresponding EventStream's
  `timescale` attribute.
  This indicates a way to convert some time information on an
  `EVENT_ELEMENT` into seconds (by dividing the value by `timescale`),
  though it can usually safely be ignored.

For example for the following EventStream:

```xml
<EventStream schemeIdUri="urn:uuid:XYZY" timescale="1000" value="call">
  <Event presentationTime="0" duration="10000" id="0">1 800 10101010</Event>
  <Event presentationTime="40000" duration="10000" id="1">1 800 10101012</Event>
  <Event presentationTime="60000" duration="10000" id="2">1 800 10101013</Event>
</EventStream>
```

The RxPlayer will define those three events (note: I used custom syntax here to
include a readable `document` format):

```jsx
// The first event:
{
  start: 0,
  end: 10,
  data: {
    type: "dash-event-stream",
    value: {
      schemeIdUri: "urn::uuid::XYZY",
      element: <Event presentationTime="0" duration="10000" id="0">
                 1 800 10101010
               </Event>,
      timescale: 1000,
    }
  }
}

// The second event:
{
  start: 40,
  end: 50,
  data: {
    type: "dash-event-stream",
    value: {
      schemeIdUri: "urn::uuid::XYZY",
      element: <Event presentationTime="40000" duration="10000" id="1">
                 1 800 10101012
               </Event>,
      timescale: 1000,
    }
  }
}

// The third event:
{
  start: 60,
  end: 70,
  data: {
    type: "dash-event-stream",
    value: {
      schemeIdUri: "urn::uuid::XYZY",
      element: <Event presentationTime="60000" duration="10000" id="2">
                 1 800 10101013
               </Event>,
      timescale: 1000,
    }
  }
}
```

## Listening when an event has ended

Some stream events have a `end` property, you could thus need to know when an
event that the RxPlayer reached is now ended.

Thankfully, we planned this need in the API of the RxPlayer.

Any event with a set `end` can be added an `onExit` callback. This callback will
be called once the event has ended.

So for example you can write:

```js
rxPlayer.addEventListener("streamEvent", (evt) => {
  console.log("An event has been reached:", evt);
  if (evt.end !== undefined) {
    evt.onExit = () => {
      console.log("An event has been exited:", evt);
    };
  }
});
```

When defined, that `onExit` callback will be called once the RxPlayer either
reaches the end position of the event or seek outside of the scope of this
event.

Please note however that even if an event has an `end` property, it is possible
that the `onExit` callback will never be called. For example, the user could
stop the content while an event was "active" (we do not trigger `onExit`
callbacks in that case) or the corresponding `<Event />` could "disappear" from
the MPD once it has been refreshed.

## Example

To end this tutorial, lets define a complete example:

```js
rxPlayer.addEventListener("streamEvent", (evt) => {
  console.log("An event has been reached:", evt);

  console.log("This is an event of type:", evt.data.type);
  if (evt.data.type === "dash-event-stream") {
    console.log("This is a DASH EventStream's Event element.");

    console.log("schemeIdUri:", evt.data.schemeIdUri);
    console.log("<Event /> element:", evt.data.element);
  }

  if (evt.end !== undefined) {
    evt.onExit = () => {
      console.log("An event has been exited:", evt);
    };
  }
});

rxPlayer.addEventListener("streamEventSkip", (evt) => {
  console.log("We just 'skipped' an event:", evt);

  console.log("This was an event of type:", evt.data.type);
  // ...
});
```
