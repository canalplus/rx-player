# DASH-WASM MPD parser #########################################################

This directory exposes a WebAssembly-based MPD parser, whose intent is to be
faster than the default JS-based one, especially on very large (multiple
megabytes) MPDs.



## What is this ################################################################

### How Manifest parsing works in the RxPlayer #################################

In the RxPlayer every Manifest parser output the same final Manifest format
which follow the same structure regardless of the transport protocol used (e.g.
DASH, Smooth etc.).

For the MPD (DASH's Manifest format), this transformation (from an XML to that
final Manifest format) happens in two steps:
  1. first from the XML to a JS object very close that representation (same
     hierarchy, same elements and attributes names).

     This is what we call the "intermediate representation" (kind of a cheeky
     name, because that expression is usually used for more complex compiler
     mid-compilation structures, but we found the name to be a fit also in our
     case).

  2. Then from this "intermediate representation" to the final Manifest.

The idea is that the "intermediate representation" is much easier to manipulate
than the XML format in JavaScript.



### Problems with the JavaScript parser ########################################

Before the DASH-WASM parser, we only had the JavaScript parser, which relied on
the browser's DOM APIs (e.g. `DOMParser`).

This parser works fine but we found that its performance was really poor when
encoutering huge MPDs (several MBs), that we're dealing with at Canal+ on a
regular basis.
Usually those problematic MPDs have several gigantic `<SegmentTimeline>`
elements that takes a lot of time to parse.

After multiple tests, profiling and improvements, it appeared that the issue had
to do with XML parsing and the DOM APIs (regarding the speed of the parsing
operation, but also some stability issues most likely related to garbage
collection pressure).

Moreover, on some embedded devices, this operation could take several seconds.
This leaded us to try to implement a parser running in a WebWorker (to avoid
blocking the main thread, which is also handling the user interface).

As no DOM API are available in a WebWorker, we had to re-define the XML parsing
APIs.  We first opted for a JavaScript library, yet found performance in our
initial tests to be subpar.
We ended up trying with WebAssembly instead.

I chose to start a proof-of-concept in Rust because I already had some
experience with it. After the first results, which were exceeding our
expectations, it became clear that this strategy could be the way to go.

Even if initially, this parser was written to run in a WebWorker, this is not
(yet?) the case. This is because:

  1. we found that the performance of the parser rewrote in WebAssembly to be
     more than acceptable, even in the main thread

  2. after some initial tests, we noticed that adding a worker into the mix
     could add some non-negligible time penalties.
     This could potentially be avoidable but we did not take the time to work on
     that for now.

  3. we see a lot of improvements which could make running in a main thread less
     of a problem, most notably parsing at the same time than the MPD request is
     pending, small MPD chunk by small MPD chunk.

Due to this, we decided to only develop and integrate the WebAssembly part at
first, which will run in the main thread. We may add WebWorker-related logic in
future releases.



### What is WebAssembly ########################################################

WebAssembly is a binary format for executables that can be executed - among
other platforms - in modern browsers.
It is generally compiled from code written in other languages (even if a
WebAssembly text format does exist).

The initial idea was both to provide a possibly-faster language than JavaScript
in the browser and to allow programs written in other languages than JavaScript
to run in the browser with few efforts.

In the context of the RxPlayer, we only use it for optimization reasons, when
we noticed that switching the DASH MPD parser to WebAssembly has a high impact
in terms of performance when compared to the equivalent JavaScript code.


### Where does the DASH-WASM parser fits into this #############################

The DASH-WASM MPD parser only does the first step of transforming the initial
XML format into the "intermediate representation", by using WebAssembly.

We could resume by writing it this way. The DASH-WASM parser's code only does
the following things:
  1. It browses the XML
  2. It converts each of its attributes to the wanted format (e.g. floats,
     JS strings, integers, booleans...)
  3. From those, it constructs the "intermediate representation" of the MPD

After those steps, the rest of the transformation into the final Manifest is
done by a common code (common with the JS parser) written in JavaScript.

This logic was written as such because:

  - when we profiled the performance of our JS parser, we noticed that the
    performance issue was overwhelmingly linked to the APIs related to XML
    parsing

  - as we were introducing another language into the RxPlayer, we wanted its
    maintenance cost to be as small as possible, thus keeping the not-so
    problematic steps in JavaScript.



## How this parser is written ##################################################

### Directories ################################################################

The DASH-WASM parser comes into part:

  - the Rust part, written in the `rs` directory, that browses the XML and
    convert values to the right format.

  - the TypeScript part, written in the `ts` directory that constructs the
    "intermediate representation" JS object from what is parsed by the Rust
    part.

The parser's entry point is also written in TypeScript and can be found in the
`ts` directory.


### How Rust and TypeScript interact ###########################################

#### Architecture

Currently, the DASH-WASM parser parses in one go the XML.

  1. The XML data is continuously fed to the WebAssembly, which just sees it as
     an array of bytes, it then goes through the quick-xml dependency - a Rust
     "crate" (equivalent to a node module).

  2. As quick-xml encounters new XML elements (it uses an event-driven SAX
     parser approach which continuously parses the MPD, not a DOM one reading
     it fully in advance), quick-xml will notify our WebAssembly code that this
     is the case.

  3. The WebAssembly code assigns to each recognized element a number (defined
     as a Rust and TypeScript enum).

     If the XML element encountered is recognized, it will call a JavaScript
     callback with the right number, to signal that this element has been
     encountered.

  4. This callback, registered by the TypeScript code, begin to create the
     object corresponding to that element and update some callbacks called
     by Rust so that new elements and attributes are considered as part of
     this element.

  5. The WebAssembly then iterates through each of that element's attribute.

     When it recognizes one for a given element (e.g. Period@start):
       - it converts it to the right format (integer, float, UTF-8 string).
       - it assigns a number to this attribute (like for elements, but with a
         different enum).
       - it calls a JavaScript callback signaling that that attribute has been
         encountered with its value (in some cases, a pointer and potential
         length of the value).

   6. The attribute is received by the TypeScript code. It will generally do a
      small conversion again to the right type (e.g. UTF-8 to JS String, floats
      and integers to JS numbers and so on) and then add it to the object
      created previously for that element.

   7. The WebAssembly code continues to parse elements and attributes inside
      that signaled element and continue to call the corresponding JavaScript
      callbacks as it does so.

      Once it encounters a closing element, it checks if the element is
      recognized (is part of the element enum). If that's the case, it calls
      another JavaScript callback with that element's number signaling that its
      closing tag was encountered.

   8. The callback, defined in the TypeScript code, handles the closing tag
      event mainly by re-updating other callbacks (so new elements and
      attributes are not considered part of this closed element anymore).

   9. The same logic is continued until the end of the MPD.

There's also another JavaScript callback not introduced here to simplify. This
is a callback to let the WebAssembly code signal when minor errors have been
encountered when parsing the MPD (e.g. invalid attributes' data).

This current architecture has initially been designed for simplicity, seeing
that its results were more than suitable, we stood with it.
If you think another approach would be preferable for any reason, don't hesitate
to propose a change (through an issue first)


### Details on FFI #############################################################

Technically, some data and function calls needs to cross the language boundaries
between the compiled JavaScript and WebAssembly code.

On the JavaScript/TypeScript-side, everything stays relatively simple, with few
considerations to have. TypeScript functions are defined, which take `number`
arguments, and are communicated when instantiating a new WebAssembly module.

On Rust-side, we exploit multiple FFI features:

  - compiling Rust with the `"cdylib"` `crate-type` (as indicated in the
    `Cargo.toml` file). This has for effect to create a "system" dynamic
    library, which will follow the stable C ABI.

  - marking function defined in JavaScript with an `extern "C" {` block, to
    indicate that they follow the C ABI.

  - marking function defined in Rust but callable in JavaScript both with `pub`
    and `extern "C"` indicating that they are public function using the C ABI.

    Also those functions have the `#[no_mangle]` attribute, disabling name
    mangling for these so they can be easily called from JavaScript by using the
    same name.

  - data other than integers are usually exchanged through a duo of a pointer
    and a length.
    JavaScript has access to the full WebAssembly's memory, meaning that large
    chunk of data can just be exchanged by reading from and writing to this
    memory with only a pointer and a length given.



## How to build the Rust code ##################################################

The Rust code is compiled through npm scripts, just like all other building
logic in the RxPlayer.

To be able to call the corresponding npm script [1], you will need to:

  1. Install [cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html),
     which is roughly Rust's npm.

  2. Install [binaryen](https://github.com/WebAssembly/binaryen), which is a
     WebAssembly toolbox we're using to optimize the built wasm file.

If you see error messages while building related to a "wasm32-unknown-unknown"
target not being installed, you should install it.

If you use `rustup` this can be done for example by writing:
```sh
rustup target add wasm32-unknown-unknown
```

[1] The name of those scripts are not repeated in this document because of the
fear that they may change in the future, in which case this documentation could
easily be outdated.
