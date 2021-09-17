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

//  import log from "../../log";
import { Period, Representation } from "../../manifest";
import { IBufferType } from "../segment_buffers/implementations/types";
 
interface IRepresentationChange {
    type: IBufferType;
    period: Period;
    /** The new loaded `Representation`. `null` if no Representation is chosen. */
    representation : Representation |
                     null;
}

 /**
  * Store information about switches happened in playback session:
  * @class SwitchesStore
  */
 export default class SwitchesStore {
   private _currentSwitches: IRepresentationChange[];
 
   constructor() {
     this._currentSwitches = [];
   }
 
   public add(infos: IRepresentationChange) : void {
       if (this._currentSwitches.length === 0) {
           this._currentSwitches.push(infos);
           return;
        }
        const lastIndex = this._currentSwitches.length - 1;
        if (this._currentSwitches[lastIndex].representation?.id !== infos.representation?.id) {
            this._currentSwitches.push(infos);
        }
   }

   public getSwitchesTotal() : number {
       return this._currentSwitches.length;
   }

   public getSwitches() : IRepresentationChange[] {
       return this._currentSwitches;
   }
 }
 