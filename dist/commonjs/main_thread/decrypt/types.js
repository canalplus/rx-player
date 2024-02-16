"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentDecryptorState = void 0;
/** Enumeration of the various "state" the `ContentDecryptor` can be in. */
var ContentDecryptorState;
(function (ContentDecryptorState) {
    /**
     * The `ContentDecryptor` is not yet ready to create key sessions and request
     * licenses.
     * This is is the initial state of the ContentDecryptor.
     */
    ContentDecryptorState[ContentDecryptorState["Initializing"] = 0] = "Initializing";
    /**
     * The `ContentDecryptor` has been initialized.
     * You should now called the `attach` method when you want to add decryption
     * capabilities to the HTMLMediaElement. The ContentDecryptor won't go to the
     * `ReadyForContent` state until `attach` is called.
     *
     * For compatibility reasons, this should be done after the HTMLMediaElement's
     * src attribute is set.
     *
     * It is also from when this state is reached that the `ContentDecryptor`'s
     * `systemId` property may be known.
     *
     * This state is always coming after the `Initializing` state.
     */
    ContentDecryptorState[ContentDecryptorState["WaitingForAttachment"] = 1] = "WaitingForAttachment";
    /**
     * Content (encrypted or not) can begin to be pushed on the HTMLMediaElement
     * (this state was needed because some browser quirks sometimes forces us to
     * call EME API before this can be done).
     *
     * This state is always coming after the `WaitingForAttachment` state.
     */
    ContentDecryptorState[ContentDecryptorState["ReadyForContent"] = 2] = "ReadyForContent";
    /**
     * The `ContentDecryptor` has encountered a fatal error and has been stopped.
     * It is now unusable.
     */
    ContentDecryptorState[ContentDecryptorState["Error"] = 3] = "Error";
    /** The `ContentDecryptor` has been disposed of and is now unusable. */
    ContentDecryptorState[ContentDecryptorState["Disposed"] = 4] = "Disposed";
})(ContentDecryptorState || (exports.ContentDecryptorState = ContentDecryptorState = {}));
