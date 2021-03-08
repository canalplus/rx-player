---
id: StringUtils-tool
title: StringUtils
sidebar_label: StringUtils
slug: tools/string-utils
---

## Overview

Tools to convert strings into bytes and vice-versa.

The RxPlayer internally has a lot of code dealing with strings to bytes
conversion (and vice-versa). This tool exports that logic so you don't have to
rewrite it yourself.

You might need one of those functions for example when dealing with challenge
and licenses, which are often under a binary format.

## How to import it

The simplest way to import the StringUtils is by importing it as a named export
from "rx-player/tools", like so:

```js
import { StringUtils } from "rx-player/tools";

console.log(StringUtils.strToUtf8("hello😀"));
```

You can also import only the function(s) you want to use by importing it
directly from "rx-player/tools/string-utils":

```js
import { strToUtf8 } from "rx-player/tools/string-utils";
console.log(strToUtf8("hello😀"));
```

## StringUtils functions

`StringUtils` is an object containing the following functions:

- `strToUtf8`: Convert a JS string passed as argument to an Uint8Array of its
  corresponding representation in UTF-8.

  Example:

  ```js
  import { StringUtils } from "rx-player/tools";
  StringUtils.strToUtf8("hello😀");
  // => Uint8Array(9) [ 104, 101, 108, 108, 111, 240, 159, 152, 128 ]
  //                    "h"  "e"  "l"  "l"  "o"  "grinning face" emoji
  ```

- `utf8ToStr`: Convert a Uint8Array containing a string encoded with UTF-8
  into a JS string.

  Example:

  ```js
  import { StringUtils } from "rx-player/tools";
  const uint8Arr = new Uint8Array([
    104,
    101,
    108,
    108,
    111,
    240,
    159,
    152,
    128,
  ]);
  StringUtils.utf8ToStr(uint8Arr);
  // => "hello😀"
  ```

  Note: if what you have is an `ArrayBuffer`, you have to convert it to an
  `Uint8Array` first:

  ```js
  import { StringUtils } from "rx-player/tools";
  const toUint8Array = new Uint8Array(myArrayBuffer);
  console.log(StringUtils.utf8ToStr(toUint8Array));
  ```

- `strToUtf16LE`: Convert a JS string passed as argument to an Uint8Array
  containing its corresponding representation in UTF-16-LE (little endian
  UTF-16).

  Example:

  ```js
  import { StringUtils } from "rx-player/tools";
  StringUtils.strToUtf16LE("hi😀");
  // => Uint8Array(9) [ 104, 0, 105, 0, 61, 216, 0, 222 ]
  //                    "h"     "i"     "grinning face" emoji
  ```

- `utf16LEToStr`: Convert a Uint8Array containing a string encoded with
  UTF-16-LE (little endian UTF-16) into a JS string.

  Example:

  ```js
  import { StringUtils } from "rx-player/tools";
  const uint8Arr = new Uint8Array([104, 0, 105, 0, 61, 216, 0, 222]);
  StringUtils.utf16LEToStr(uint8Arr);
  // => "hi😀"
  ```

  Note: if what you have is an `ArrayBuffer`, you have to convert it to an
  `Uint8Array` first:

  ```js
  import { StringUtils } from "rx-player/tools";
  const toUint8Array = new Uint8Array(myArrayBuffer);
  console.log(StringUtils.utf16LEToStr(toUint8Array));
  ```

- `strToUtf16BE`: Convert a JS string passed as argument to an Uint8Array
  containing its corresponding representation in UTF-16-BE (big endian
  UTF-16).

  Example:

  ```js
  import { StringUtils } from "rx-player/tools";
  StringUtils.strToUtf16BE("hi😀");
  // => Uint8Array(9) [ 0, 104, 0, 105, 216, 61, 222, 0 ]
  //                    "h"     "i"     "grinning face" emoji
  ```

- `utf16BEToStr`: Convert a Uint8Array containing a string encoded with
  UTF-16-BE (big endian UTF-16) into a JS string.

  Example:

  ```js
  import { StringUtils } from "rx-player/tools";
  const uint8Arr = new Uint8Array([0, 104, 0, 105, 216, 61, 222, 0]);
  StringUtils.utf16BEToStr(uint8Arr);
  // => "hi😀"
  ```

  Note: if what you have is an `ArrayBuffer`, you have to convert it to an
  `Uint8Array` first:

  ```js
  import { StringUtils } from "rx-player/tools";
  const toUint8Array = new Uint8Array(myArrayBuffer);
  console.log(StringUtils.utf16BEToStr(toUint8Array));
  ```
