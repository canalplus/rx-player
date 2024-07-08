# The ContentDecryptor

| Consideration           | Status                    |
| ----------------------- | ------------------------- |
| Preferred import style  | Directory-only _[1]_      |
| Multithread environment | Always run in main thread |

_[1]_ Only the `decrypt` directory itself should be imported and relied on by the rest of
the code, not its inner files (thus `./index.ts` should export everything that may be
imported by outside code).

## Overview

This directory exports the `ContentDecryptor`, which allows to easily interface with the
browser APIs for decrypting an encrypted content, it follows the
[Encrypted Media Extensions recommandations](https://www.w3.org/TR/encrypted-media/).

The `ContentDecryptor` is a module isolated from the rest of the player taking a form of a
class. It starts initializing decryption capabilities as soon as it is instanciated and
emits various events to communicate with external code.

A central concept of the `ContentDecryptor` is its states. As decryption initialization
goes on, it reaches multiple steps on which the rest of the RxPlayer code might want to
react.

Before going in, you're encouraged to read a little about the Encrypted Media Extensions
(EME). This code is heavy on EME APIs and may be difficult to follow if you don't have a
vague understanding of the concept of a `MediaKeySession` or of a `MediaKeySystemAccess`.
