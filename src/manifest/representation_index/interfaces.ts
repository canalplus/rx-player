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

// ISegment Object.
// Represent a single Segment from a Representation.
export interface ISegment {
  id : string; // ID of the Segment. Should be unique for this Representation
  isInit : boolean; // If true, it's an initialization Segment
  time : number; // Time of beginning for the segment
  timescale : number; // Timescale to convert time and duration into seconds

  media? : string; // optional string used to link to the media
  duration? : number; // duration of the segment
  indexRange? : [number, number]; // If set, the corresponding byte Range in the
                                  // downloaded Segment will contain an index
                                  // for other Segments
  number? : number; // Optional number of the Segment
  range? : [number, number]; // Optional byte range to retrieve the Segment
}

interface IRepresentationIndexSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

// Interface that should be implemented by any Representation's index
export default interface IRepresentationIndex {
  getInitSegment() : ISegment;
  getSegments(up : number, duration : number) : ISegment[];
  shouldRefresh(parsedSegments : ISegment[], up : number, to : number) : boolean;
  getFirstPosition() : number|undefined;
  getLastPosition() : number|undefined;
  checkDiscontinuity(time : number) : number;
  scale(time : number) : number;
  update(newIndex : any /* TODO @ index refacto */) : void; // TODO find what to do :p
  getType() : string; // TODO Remove
  _addSegments(
    nextSegments : any[],
    currentSegment : any
  ) : IRepresentationIndexSegmentInfos[]; // TODO
}
