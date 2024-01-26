import log from "../../../log";
import type { ITrackUpdateChoiceObject } from "../../../multithread_types";
import type { ITrackType } from "../../../public_types";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectAssign from "../../../utils/object_assign";
import SharedReference from "../../../utils/reference";
import type { IAdaptationChoice, IRepresentationsChoice } from "../../stream";

export default class TrackChoiceSetter {
  /**
   * Store SharedReference through which track choices and Representation
   * choices will be emitted to the rest of the code.
   *
   * Organized by Period id and by track type (audio, video, text).
   */
  private _refs: Map<
    /** Period's id */
    string,
    Partial<
      Record<
        ITrackType,
        {
          /** Object through which track choices will be emitted. */
          trackReference: SharedReference<IAdaptationChoice | null | undefined>;
          /**
           * Object through which Representation choices will be emitted.
           *
           * This same object (same reference) is also found inside data emitted
           * by `trackReference`.
           * It is repeated here as the one declared inside `trackReference` is
           * declared by type as a read-only property - which makes more sense in
           * the rest of the code.
           */
          representations: SharedReference<IRepresentationsChoice>;
        }
      >
    >
  >;

  constructor() {
    this._refs = new Map();
  }

  public reset(): void {
    for (const key of this._refs.keys()) {
      // Ensure no event listener is still listening to track/representations choices.
      // This should be unnecessary if the rest of the code is well-written but
      // better safe than sorry.
      this._refs.get(key)?.audio?.trackReference.finish();
      this._refs.get(key)?.audio?.representations.finish();
      this._refs.get(key)?.video?.trackReference.finish();
      this._refs.get(key)?.video?.representations.finish();
      this._refs.get(key)?.text?.trackReference.finish();
      this._refs.get(key)?.text?.representations.finish();
    }

    this._refs = new Map();
  }

  public addTrackSetter(
    periodId: string,
    bufferType: ITrackType,
    ref: SharedReference<IAdaptationChoice | null | undefined>,
  ) {
    let obj = this._refs.get(periodId);
    if (obj === undefined) {
      obj = {};
      this._refs.set(periodId, obj);
    }
    if (obj[bufferType] !== undefined) {
      log.warn("WP: Track for periodId already declared", periodId, bufferType);
      obj[bufferType]?.trackReference.finish();
      obj[bufferType]?.representations.finish();
    }

    const val = ref.getValue();
    let representations;
    if (isNullOrUndefined(val)) {
      // When no track is chosen yet, set default empty Representation choices
      representations = new SharedReference<IRepresentationsChoice>({
        representationIds: [],
        switchingMode: "lazy",
      });
    } else {
      // Re-add `representations` key as a SharedReference so we're able to
      // update it.
      representations = new SharedReference<IRepresentationsChoice>(
        val.representations.getValue(),
      );
      ref.setValue(
        objectAssign({}, val, {
          representations,
        }),
      );
    }
    obj[bufferType] = {
      trackReference: ref,
      representations,
    };
  }

  public setTrack(
    periodId: string,
    bufferType: ITrackType,
    choice: ITrackUpdateChoiceObject | null | undefined,
  ): boolean {
    const ref = this._refs.get(periodId)?.[bufferType];
    if (ref === undefined) {
      log.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
      return false;
    }
    if (isNullOrUndefined(choice)) {
      // When no track is chosen, set default empty Representation choices
      ref.representations = new SharedReference<IRepresentationsChoice>({
        representationIds: [],
        switchingMode: "lazy",
      });
      ref.trackReference.setValue(choice);
    } else {
      ref.representations = new SharedReference(choice.initialRepresentations);
      ref.trackReference.setValue({
        adaptationId: choice.adaptationId,
        switchingMode: choice.switchingMode,
        representations: ref.representations,
        relativeResumingPosition: choice.relativeResumingPosition,
      });
    }
    return true;
  }

  public updateRepresentations(
    periodId: string,
    adaptationId: string,
    bufferType: ITrackType,
    choice: IRepresentationsChoice,
  ): boolean {
    const ref = this._refs.get(periodId)?.[bufferType];
    if (ref === undefined) {
      log.debug("WP: Setting track for inexistent periodId", periodId, bufferType);
      return false;
    }
    const val = ref.trackReference.getValue();
    if (isNullOrUndefined(val) || val.adaptationId !== adaptationId) {
      log.debug("WP: Desynchronized Adaptation id", val?.adaptationId, adaptationId);
      return false;
    }
    ref.representations.setValue(choice);
    return true;
  }

  public removeTrackSetter(periodId: string, bufferType: ITrackType): boolean {
    const obj = this._refs.get(periodId);
    const ref = obj?.[bufferType];
    if (obj === undefined || ref === undefined) {
      log.debug(
        "WP: Removing track setter for inexistent periodId",
        periodId,
        bufferType,
      );
      return false;
    }
    ref.trackReference.finish();
    ref.representations.finish();
    delete obj[bufferType];
    if (Object.keys(obj).length === 0) {
      this._refs.delete(periodId);
    }
    return true;
  }
}
