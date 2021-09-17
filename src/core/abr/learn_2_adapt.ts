import { Representation } from "../../manifest";

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
}

class L2ARule {
  private readonly _representations: Representation[];
  private readonly _bitrates: number[];

  private _state: "start" | "steady";
  private _lastQuality: number;
  private _placeholderBuffer: number;
  private _lastSegmentWasReplacement: boolean;
  private _mostAdvancedSegmentStart: number | null;
  private _lastSegmentDuration: number | null;
  private _lastSegmentStart: number | null;
  private _lastSegmentRequestTimeMs: number | null;
  private _lastSegmentFinishTimeMs: number | null;

  private _l2AParameters: L2AParameters;

  constructor({ bitrates, representations }: ICxtArg) {
    this._representations = representations;
    this._bitrates = bitrates;

    this._state = "start";
    this._lastQuality = 0;
    this._lastSegmentDuration = 0;
    this._placeholderBuffer = 0;
    this._lastSegmentWasReplacement = false;
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

  public onSeeking() {
    // Do something on seeking event
  }

  public onSegmentDownloaded() {
    // Do something on Segment downloaded
  }

  public onMetricAdded() {
    // Do something when metrics are coming
  }

  public onRepresentationChangeRequested() {
    // Do something when quality/representation change is asked by application
  }

  public getMaxPossibleRepresentation() {
    // Return / Determine the best possible represenation
  }
}

export default L2ARule;