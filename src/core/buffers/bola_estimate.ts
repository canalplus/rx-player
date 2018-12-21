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

import {
  combineLatest as observableCombineLatest,
  Observable,
  Subject,
} from "rxjs";
import {
  filter,
  map,
  startWith,
  withLatestFrom,
} from "rxjs/operators";
import config from "../../config";
import { Representation } from "../../manifest";

const { ABR_STARVATION_GAP } = config;

interface IBufferedSegment {
  end : number;
  start : number;
  bufferedStart?: number;
  bufferedEnd?: number;
}

interface IBOLAClock {
  currentTime: number;
  seeking?: boolean;
  stalled?: { reason: string };
}

export default class BOLAManager {
  private _representations: Representation[];
  private _bitrates: number[];
  private _utilities: number[];
  private _segments: IBufferedSegment[];

  private _segmentAdded$: Subject<void>;
  private _wantedBufferAhead$: Observable<number>;

  private _gp?: number;
  private _V?: number;
  private _factor: number;

  constructor(
    representations: Representation[],
    wantedBufferAhead$: Observable<number>
  ) {
    this._segmentAdded$ = new Subject();
    this._wantedBufferAhead$ = wantedBufferAhead$;

    this._representations = representations;
    this._bitrates = this._representations.map(({ bitrate }) => bitrate);
    this._utilities =
    this._bitrates.map(bitrate => Math.log(bitrate / this._bitrates[0]));
    this._segments = [];

    this._factor = 1;
  }

  public get$(
    clock$: Observable<IBOLAClock>
  ): Observable<Representation> {
    return observableCombineLatest(
      this._segmentAdded$,
      clock$
    ).pipe(
      withLatestFrom(this._wantedBufferAhead$),
      map(([[_, { currentTime, stalled }], wantedBufferAhead]) => {
        if (this._representations.length === 0) {
          return this._representations[0];
        }
        if (stalled && stalled.reason === "buffering") {
          this._factor *= this._factor > 2 ? 0.99 : 1.01;
        }

        const bufferGap = this.getBufferGap(currentTime);
        const stableBuffer =
          Math.min(wantedBufferAhead, (this._representations.length * 2) + 10);

        this._V = stableBuffer / 10;
        this._gp = this.getGp(this._utilities, this._V, ABR_STARVATION_GAP, 1);

        if (this._gp == null) {
          throw new Error();
        }

        if (bufferGap != null) {
          this._factor *= 0.999;
          return this.getChosenRepresentation(
            this._utilities, this._V, this._gp * this._factor, bufferGap);
        }
      }),
      filter((cr): cr is Representation => !!cr),
      startWith(this._representations[0])
    );
  }

  /**
   * Update segments list.
   * @param {Array.<Object>} segments
   */
  public updateSegments(segments: IBufferedSegment[]): void {
    this._segments = segments;
    this._segmentAdded$.next();
  }

  /**
   * Increase gp factor
   */
  public increaseDistanceToFirstStep(): void {
    this._factor *= this._factor > 2 ? 0.99 : 1.01;
  }

  /**
   * Decrease gp factor
   */
  public decreaseDistanceToFirstStep(): void {
    this._factor *= this._factor > 0.5 ? 0.99 : 1.01;
  }

  /**
   *
   * @param {number} repIdx
   */
  public setFactorForFirstStep(repIdx: number): void {
    if (this._V != null) {
      const gp = this.getGp(
        this._utilities,
        this._V,
        ABR_STARVATION_GAP,
        repIdx
      );
      if (gp && this._gp) {
        const factor = gp / this._gp;
        if (factor > 1) {
          this._factor = Math.min(factor, 2);
        }
      }
    }
  }

  /**
   *
   * @param {number} currentTime
   */
  private getBufferGap(currentTime: number): number|undefined {
    const timeRanges = this._segments.reduce((acc: IBufferedSegment[], segment) => {
      const lastRange = acc[acc.length - 1];
      if (
        lastRange &&
        segment.start <= lastRange.end
      ) {
        lastRange.end = segment.end;
      } else {
        acc.push(segment);
      }
      return acc;
    }, []);

    return timeRanges.reduce((gap: number|undefined, timeRange) => {
      if (
        timeRange.start <= currentTime &&
        currentTime <= timeRange.end
      ) {
        return timeRange.end - currentTime;
      }
      return gap;
    }, undefined);
  }

  private getChosenRepresentation(
    utilities: number[],
    V: number,
    gp: number,
    bufferLevel: number
  ): Representation|undefined {
    const { chosenRepresentation } = utilities.reduce((acc: {
      max: undefined|number;
      chosenRepresentation: Representation|undefined;
    }, value, i) => {
      const bitrate = this._bitrates[i];
      const res = (V * (value + gp) - bufferLevel) / bitrate;
      if (
        acc.chosenRepresentation == null ||
        (acc.max != null && res > acc.max)
      ) {
        acc.max = res;
        acc.chosenRepresentation = this._representations[i];
      }
      return acc;
    }, { max: undefined, chosenRepresentation: undefined });
    return chosenRepresentation;
  }

  private getGp(
    utilities: number[],
    V: number,
    bufferLevel: number,
    repIdx: number
  ): number|undefined {
    for (let gpx = 50; gpx >= 0; gpx -= 0.001) {
      const chosenRepresentation =
        this.getChosenRepresentation(utilities, V, gpx, bufferLevel);
      if (
        chosenRepresentation &&
        chosenRepresentation.id === this._representations[repIdx].id
      ) {
        return gpx;
      }
    }
  }
}
