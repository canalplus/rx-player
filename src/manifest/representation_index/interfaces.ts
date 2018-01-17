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

export interface ISegment {
  id : string;
  isInit : boolean;
  time : number;
  timescale : number;

  media? : string;
  duration? : number;
  indexRange? : [number, number];
  number? : number;
  range? : [number, number];
}

interface IRepresentationIndexSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

export default interface IRepresentationIndex {
  getInitSegment() : ISegment;
  getSegments(up : number, duration : number) : ISegment[];
  shouldRefresh(parsedSegments : ISegment[], up : number, to : number) : boolean;
  getFirstPosition() : number|undefined;
  getLastPosition() : number|undefined;
  checkDiscontinuity(time : number) : number;
  scale(time : number) : number;
  setTimescale(timescale : number) : void;
  update(newIndex : any /* TODO @ index refacto */) : void; // TODO find what to do :p
  getType() : string; // TODO Remove
  _addSegments(
    nextSegments : any[], // XXX TODO
    currentSegment : any // XXX TODO
  ) : IRepresentationIndexSegmentInfos[];
}
