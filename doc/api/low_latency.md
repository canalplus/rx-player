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


### Note about rebuffering and other delay-creating situations #################

When playing in low latency mode, it is still possible to rebuffer or pause the
content, which could lead the user to being far from the live edge.

As several applications could want several workaround to that possible issue
(like updating the speed, seeking or just signaling the delay to the user), we
choose to let that happen by default with the RxPlayer.
