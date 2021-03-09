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

import assert from "./assert";
import noop from "./noop";

export default class TaskCanceller {
  public signal : CancellationSignal;
  public isUsed : boolean;
  private _trigger : (error : CancellationError) => void;

  constructor() {
    const [trigger, register] = createCancellationFunctions();
    this.isUsed = false;
    this._trigger = trigger;
    this.signal = new CancellationSignal(register);
  }

  public cancel() : void {
    if (this.isUsed) {
      return ;
    }
    this.isUsed = true;
    const cancellationError = new CancellationError();
    this._trigger(cancellationError);
  }

  static isCancellationError(error : unknown) : boolean {
    return error instanceof CancellationError;
  }
}

/**
 * Error created when a task is cancelled through the TaskCanceller.
 *
 * @class AssertionError
 * @extends Error
 */
export class CancellationError extends Error {
  public readonly name : "CancellationError";
  public readonly message : string;

  /**
   * @param {string} message
   */
  constructor() {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, CancellationError.prototype);

    this.name = "CancellationError";
    this.message = "This task was cancelled.";
  }
}

type ICancellationListener = (error : CancellationError) => void;

function createCancellationFunctions() : [
  (error : CancellationError) => void,
  (newListener : ICancellationListener) => void
] {
  let listener : (error : CancellationError) => void = noop;
  return [
    function trigger(error : CancellationError) {
      listener(error);
    },
    function register(newListener : ICancellationListener) {
      listener = newListener;
    },
  ];
}

export class CancellationSignal {
  public isCancelled : boolean;
  private _cancellationError : CancellationError | null;
  private _listener : ((error : CancellationError) => void) | null;

  constructor(registerToSource : (listener: ICancellationListener) => void) {
    this.isCancelled = false;
    this._cancellationError = null;
    this._listener = null;

    registerToSource((cancellationError : CancellationError) : void => {
      this.isCancelled = true;
      this._cancellationError = cancellationError;
      if (this._listener !== null) {
        this._listener(cancellationError);
      }
    });
  }

  public setListener(fn : (error : CancellationError) => void) : void {
    if (this.isCancelled) {
      assert(this._cancellationError !== null);
      fn(this._cancellationError);
    }
    this._listener = fn;
  }
}
