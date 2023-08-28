import log from "../../../../log";
import { ITrackUpdateChoiceObject } from "../../../../multithread_types";
import { ITrackType } from "../../../../public_types";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import SharedReference from "../../../../utils/reference";
import { IAdaptationChoice, IRepresentationsChoice } from "../../../stream";

export default class TrackChoiceSetter {
  private _refs: Map<string, Partial<Record<
    ITrackType,
    SharedReference<IAdaptationChoice | null | undefined>
  >>>;

  constructor() {
    this._refs = new Map();
  }

  public reset(): void {
    this._refs = new Map();
  }

  public addTrackSetter(
    periodId : string,
    bufferType : ITrackType,
    ref: SharedReference<IAdaptationChoice | null | undefined>
  ) {
    let obj = this._refs.get(periodId);
    if (obj === undefined) {
      obj = {};
      this._refs.set(periodId, obj);
    }
    if (obj[bufferType] !== undefined) {
      log.warn("WP: Track for periodId already declared", periodId, bufferType);
      obj[bufferType]?.finish();
    }
    obj[bufferType] = ref;
  }

  public setTrack(
    periodId : string,
    bufferType : ITrackType,
    choice: ITrackUpdateChoiceObject | null | undefined
  ) : boolean {
    const ref = this._refs.get(periodId)?.[bufferType];
    if (ref === undefined) {
      log.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
      return false;
    }
    if (isNullOrUndefined(choice)) {
      ref.setValue(choice);
    } else {
      ref.setValue({
        adaptationId: choice.adaptationId,
        switchingMode: choice.switchingMode,
        representations: new SharedReference(choice.initialRepresentations),
      });
    }
    return true;
  }

  public updateRepresentations(
    periodId : string,
    adaptationId : string,
    bufferType : ITrackType,
    choice: IRepresentationsChoice
  ) : boolean {
    const ref = this._refs.get(periodId)?.[bufferType];
    if (ref === undefined) {
      log.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
      return false;
    }
    const val = ref.getValue();
    if (isNullOrUndefined(val) || val.adaptationId !== adaptationId) {
      log.debug("WP: Desynchronized Adaptation id", val?.adaptationId, adaptationId);
      return false;
    }
    val.representations.setValue(choice);
    return true;
  }

  public removeTrackSetter(periodId : string, bufferType : ITrackType) : boolean {
    const obj = this._refs.get(periodId);
    const ref = obj?.[bufferType];
    if (obj === undefined || ref === undefined) {
      log.debug("WP: Removing track setter for inexistent periodId",
                periodId,
                bufferType);
      return false;
    }
    ref.finish();
    delete obj[bufferType];
    if (Object.keys(obj).length === 0) {
      this._refs.delete(periodId);
    }
    return true;
  }
}
