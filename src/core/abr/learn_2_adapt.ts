import { Observable } from "rxjs";
import { Representation } from "../../manifest";
import { IBeginRequestValue, IRequestInfo } from "./pending_requests_store";
import { IABRMetricsEventValue, IABRStreamEvents } from "./representation_estimator";

enum L2A_State {
  NoChange, // Only 1 bitrate available
  Start,
  Steady,
}

interface IRulesContext {
  qualityBasedBitrate: number;
  bufferGap: number;
  lastRequestInfo: IRequestInfo;
  speed: number;
}

interface L2AParameters {
  w: number[];
  prevW: number[];
  Q: number;
  segmentRequestStart: number;
  segmentDownloadFinish: number;
  bufferTargetLvl: number;
}

interface ICxtArg {
  bitrates: number[];
  representations: Representation[];
  streamEvents$: Observable<IABRStreamEvents>;
}

class L2ARule {
  // private readonly _representations: Representation[];
  private readonly _bitrates: number[];

  private _state: L2A_State;
  private _lastQuality: number;
  // private _placeholderBuffer: number;
  // private _lastSegmentWasReplacement: boolean;
  private _mostAdvancedSegmentStart: number | null;
  private _lastSegmentDuration: number | null;
  private _lastSegmentStart: number | null;
  private _lastSegmentRequestTimeMs: number | null;
  private _lastSegmentFinishTimeMs: number | null;

  private _l2AParameters: L2AParameters;

  constructor({ bitrates }: ICxtArg) {
    // this._representations = representations;
    this._bitrates = bitrates;

    this._state = L2A_State.Start;
    this._lastQuality = 0;
    this._lastSegmentDuration = 0;
    // this._placeholderBuffer = 0;
    // this._lastSegmentWasReplacement = false;
    this._mostAdvancedSegmentStart = null;
    this._lastSegmentDuration = null;
    this._lastSegmentStart = null;
    this._lastSegmentRequestTimeMs = null;
    this._lastSegmentFinishTimeMs = null;

    this._l2AParameters = {
      w: [],
      prevW: [],
      Q: 0,
      segmentRequestStart: 0,
      segmentDownloadFinish: 0,
      bufferTargetLvl: 1.5,
    };
  }

  private _resetL2AInfos() {
    // this._placeholderBuffer = 0;
    // this._lastSegmentWasReplacement = false; // used to know if the last segment has been replace (we dont use it for now);
    this._mostAdvancedSegmentStart = null;
    this._lastSegmentDuration = null;
    this._lastSegmentStart = null;
    this._lastSegmentRequestTimeMs = null;
    this._lastSegmentFinishTimeMs = null;
  }

  /**
   * Adjust State accordingly
   */
  private _checkNewSegment() {
    if (this._lastSegmentStart !== null &&
        this._lastSegmentRequestTimeMs !== null &&
        this._lastSegmentFinishTimeMs !== null) {
      this._l2AParameters.segmentRequestStart = 0.001 * this._lastSegmentRequestTimeMs;
      this._l2AParameters.segmentDownloadFinish = 0.001 * this._lastSegmentFinishTimeMs;
      this._lastSegmentStart = null;
      this._lastSegmentRequestTimeMs = null;
    }
  }

  private _dotmultiplication(a: number[], b: number[]) {
    if (a.length !== b.length) {
      return -1;
    }
    let sumdot = 0;
    for (let i = 0; i < a.length; i++) {
      sumdot = sumdot + a[i] * b[i];
    }
    return sumdot;
  }

  /**
     * Project an n-dim vector y to the simplex Dn
     * Dn = { x : x n-dim, 1 >= x >= 0, sum(x) = 1}
     * Algorithm is explained at http://arxiv.org/abs/1101.6081
     * @param {array} arr
     * @return {array}
     */
  private _euclideanProjection(arr: number[]): number[] {
    const m = arr.length;
    let bget = false;
    let arr2 = [];
    for (let ii = 0; ii < m; ++ii) {
        arr2[ii] = arr[ii];
    }
    let s = arr.sort(function (a, b) {
        return b - a;
    });
    let tmpsum = 0;
    let tmax = 0;
    let x = [];
    for (let ii = 0; ii < m - 1; ++ii) {
        tmpsum = tmpsum + s[ii];
        tmax = (tmpsum - 1) / (ii + 1);
        if (tmax >= s[ii + 1]) {
            bget = true;
            break;
        }
    }
    if (!bget) {
        tmax = (tmpsum + s[m - 1] - 1) / m;
    }
    for (let ii = 0; ii < m; ++ii) {
        x[ii] = Math.max(arr2[ii] - tmax, 0);
    }
    return x;
}

  /**
   * When the Player seek, reset the state to Start and
   * reset L2A infos, to start from a fresh learning copy.
   */
  public onSeeking() {
    if (this._state !== L2A_State.NoChange) {
      this._state = L2A_State.Start;
      this._resetL2AInfos();
    }
  }

  public onSegmentDownloaded(e: IBeginRequestValue) {
    if (this._state !== L2A_State.NoChange) {
      const start = e.requestTimestamp;
      if (this._mostAdvancedSegmentStart === null || 
            start > this._mostAdvancedSegmentStart) {
        this._mostAdvancedSegmentStart = start; // replace by the latest/newest segment
    }
    this._lastSegmentStart = start;
    this._lastSegmentDuration = e.duration;
    this._lastQuality = e.representation.bitrate;
    this._checkNewSegment();
  }
}

  public onMetricAdded(e: IABRMetricsEventValue) {
    if (this._state !== L2A_State.NoChange) {
      this._lastSegmentRequestTimeMs = e.duration;
      this._lastSegmentFinishTimeMs = e.finishTime;
      this._checkNewSegment();
    }
  }

  // public onRepresentationChangeRequested() {
  //   // Do something when quality/representation change is asked by application
  // }

  public getMaxPossibleRepresentation({ qualityBasedBitrate, bufferGap, lastRequestInfo, speed }: IRulesContext) {
    const react = 2; // Reactiveness to volatility (abrupt throughput drops), used to re-calibrate Lagrangian multiplier Q
    const horizon = 4; // Optimization horizon (The amount of steps required to achieve convergence)
    const vl = Math.pow(horizon, 0.99);// Cautiousness parameter, used to control aggressiveness of the bitrate decision process.
    const alpha = Math.max(Math.pow(horizon, 1), vl * Math.sqrt(horizon));// Step size, used for gradient descent exploration granularity
    let quality = qualityBasedBitrate;

    switch (this._state) {
      case L2A_State.Start: {
        this._lastQuality = qualityBasedBitrate;
        if (this._lastSegmentDuration === null && bufferGap >= this._l2AParameters.bufferTargetLvl) {
          this._state = L2A_State.Steady;
          this._l2AParameters.Q = vl;
          for (let i = 0; i < this._bitrates.length; i++) {
            if (this._bitrates[i] === this._lastQuality) {
              this._l2AParameters.prevW[i] = 1;
            } else {
              this._l2AParameters.prevW[i] = 0;
            }
          }
        }
        break;
      }
      case L2A_State.Steady: {
        const diff = [];
        const throughputMeasureTime = lastRequestInfo.progress.reduce((acc, curr) => acc + curr.duration, 0);
        const downloadedBytes = lastRequestInfo.progress.reduce((acc, curr) => acc + curr.size, 0);
        let lastThroughput = Math.round((8 * downloadedBytes) / throughputMeasureTime);
        if (lastThroughput < 1) { // Avoid division by 0 if the network goes off.
          lastThroughput = 1;
        
        }
        let V = this._lastSegmentDuration as number;
        let sign = 1;

        for (let i = 0; i< this._bitrates.length; i++) {
          this._bitrates[i] = this._bitrates[i] / 1000;
          if (speed * this._bitrates[i] > lastThroughput) {
            sign = -1;
          }
          this._l2AParameters.w[i] = this._l2AParameters.prevW[i] + sign * (V / (2 * alpha)) * ((this._l2AParameters.Q + vl) * (speed * this._bitrates[i] / lastThroughput));//Lagrangian descent
        }
        this._l2AParameters.w = this._euclideanProjection(this._l2AParameters.w);

        for (let i = 0; i < this._bitrates.length; i++) {
          diff[i] = this._l2AParameters.w[i] - this._l2AParameters.prevW[i];
          this._l2AParameters.prevW[i] = this._l2AParameters.w[i];
        }

        this._l2AParameters.Q = Math.max(0, this._l2AParameters.Q - V + V * speed * ((this._dotmultiplication(this._bitrates, this._l2AParameters.prevW) + this._dotmultiplication(this._bitrates, diff)) / lastThroughput));

        let temp: number[] = [];
        for (let i = 0; i < this._bitrates.length; i++) {
          temp[i] = Math.abs(this._bitrates[i] - this._dotmultiplication(this._l2AParameters.w, this._bitrates));
        }

        quality = temp.find(x => x === Math.min(...temp)) as number;

        if (quality > this._lastQuality) {
          const targetsBitrate = this._bitrates.filter(x => x <= lastThroughput);
          if (targetsBitrate.length > 0) {
            quality = targetsBitrate[targetsBitrate.length - 1];
          }
        }
        if (quality >= lastThroughput) {
          this._l2AParameters.Q = react * Math.max(vl, this._l2AParameters.Q);
        }
        return quality;
      }
      default:
        break;
    }

  }
}

export default L2ARule;
