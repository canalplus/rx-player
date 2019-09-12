# Playing Low-Latency contents #################################################


## Overview ####################################################################

The RxPlayer can play DASH contents specifically crafted to be played with a
low latency (read close to the live edge) through a technology called something
along the lines of "CMAF with Chunked Transfer Encoding".

Such contents are backward-compatible DASH contents (meaning they can be played
in a regular non-low-latency way) which serves CMAF segment with an HTTP 1.1
transfer mechanism called "Chunked transfer encoding".

To vulgarize, such segments are divided into multiple chunks which can be
requested while the whole segment is still being encoded - through Chunked
transfer encoding HTTP requests.

If you want more informations on this technology, the best for us is probably to
redirect you to the multiple resources you can probably find with your favorite
search engine!



## How to play a low latency content ###########################################

### lowLatencyMode option ######################################################

To play a low-latency DASH content with - well - a low latency, you will need
to set the `lowLatencyMode` `loadVideo` option.

```js
rxPlayer.loadVideo({
  url: "https://www.example.com/content.mpd",
  transport: "dash",
  lowLatencyMode: true,
})
```

When set, this option will perform multiple optimizations specific to
low-latency contents. For live contents:

  - it will by default play much closer to the live edge

  - it will begin to play faster and seek in non-buffered parts faster

  - it will request segments which did not have time to be completely encoded on
    the server-side (as long as the beginning should be available)

  - it will be safer when choosing the right video / audio quality (to avoid the
    higher chances of rebuffering)

  - and multiple other minor optimizations

Note that you can also set the `lowLatencyMode` mode for VoD (non-live)
contents.
In that case, the main advantage would be to be able to play and seek faster as
long as the content is compatible (again, with CMAF and Chunked Transfer
Encoding).


<a name="note-time-sync"></a>
### Note about time synchronization ############################################

In most cases, DASH low-latency contents rely on time synchronization between
the server and the client without providing a synchronization mechanism.

This means that, on poorly configurated client (with bad clock settings), you
could lose latency or worse: obtain playback issues.

To work around that problem, the RxPlayer allows you to provide a
synchronization mechanism to loadVideo. This is done through the
``serverSyncInfos`` ``transportOptions``. Which itself is a `loadVideo` option.

TL;DR You can look at the [API
documentation](./loadVideo_options.md#prop-transportOptions) for a quick
explanation of what to put in it.

---

Here how it works:

Imagine you have an URL allowing you to know the UTC time on the server's side.
Let's call it `serverTimeURL`.

Now you can have the server's time at a particular point in time (!). The
problem is that time continously changes: a time synchronization mechanism will
have to be aware of how much time passed since the last request to obtain that
time.

We could asks for the client's timestamp - obtained thanks to the `Date.now()`
API - at the time of the request.
This would allow us to know how much time have passed since that event by
calling `Date.now()` again in the future and calculating the difference.
The problem however is that `Date.now()` will instantly change if the user
updates its system clock. If that happens, we will lose the ability to know how
much time has elapsed since the request.

To workaround this issue, we can use instead `performance.now()`, which does not
rely on the system's clock.
However, we are still left with two other issues:

  1. `performance.now()` comparisons are useful only if both values were
     obtained in the same JS worker.
     So we have to make sure each `performance.now()` call is done in the same
     worker.

  2. `performance.now()` doesn't integrate the notion of leap seconds whereas
     unix time (the server's time) does. This could mean small time
     de-synchronization when leap seconds are added or substracted.

We however consider those last two problems minor when compared to
`Date.now()`'s problem (which is the fact that it "breaks" if the system clock
is updated). If you would prefer to provide `Date.now()` anyway, you can open
an issue and we will think about a possible implementation.

So we now have two values:
  - `serverTimestamp` (`number`): Unix timestamp of the server at a given
    point in time.
  - `clientTime` (`number`): Value of the `performance.now()` API at the
    time the `serverTimestamp` value was true. Please note that if your page
    contains multiple worker, the `performance.now()` call should be done on
    the same worker than the one in which loadVideo is called.

Those two values can be combined in the `serverSyncInfos` option like this:
```js
const timeResponse = await fetch(serverTimeURL);
const serverTimestamp = await timeResponse.text();
const clientTime = performance.now();
const serverSyncInfos = { serverTimestamp, clientTime };
rxPlayer.loadVideo({
  // ...
  transportOptions: { serverSyncInfos }
})
```


### Note about rebuffering and other delay-creating situations #################

When playing in low latency mode, it is still possible to rebuffer or pause the
content, which could lead the user to being far from the live edge.

As several applications could want several workaround to that possible issue
(like updating the speed, seeking or just signaling the delay to the user), we
choose to let that happen by default with the RxPlayer.
