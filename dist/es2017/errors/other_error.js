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
import { ErrorTypes } from "./error_codes";
import errorMessage from "./error_message";
/**
 * @class OtherError
 * @extends Error
 */
export default class OtherError extends Error {
    /**
     * @param {string} code
     * @param {string} reason
     */
    constructor(code, reason) {
        super();
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, OtherError.prototype);
        this.name = "OtherError";
        this.type = ErrorTypes.OTHER_ERROR;
        this.code = code;
        this.message = errorMessage(this.code, reason);
        this.fatal = false;
        this._originalMessage = reason;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
        return { name: this.name, code: this.code, reason: this._originalMessage };
    }
}
