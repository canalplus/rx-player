import log from "../../../../log";
import arrayFind from "../../../../utils/array_find";
import type { IParsedRepresentation } from "../../types";
import type { IContentProtectionIntermediateRepresentation } from "../node_parser_types";

/**
 * Class whose purpose is to parse `<ContentProtection>` elements in a DASH MPD.
 *
 * This element relies on particular attention because a ContentProtection can
 * inherit either another ContentProtection element coming before it or even
 * after it in the MPD through a system of "reference IDs".
 *
 * To simplify the inheritance logic, the idea is that the main parsing logic
 * just needs to signal to this class when a `ContentProtection` element is
 * encountered and in which object to push the result, and this class will then
 * parse as soon as it has all referenced ContentProtection elements.
 *
 * @class ContentProtectionParser
 */
export default class ContentProtectionParser {
  private _refs: Map<string, IContentProtectionIntermediateRepresentation>;
  private _stored: Array<
    [IParsedRepresentation, IContentProtectionIntermediateRepresentation]
  >;

  constructor() {
    this._refs = new Map();
    this._stored = [];
  }

  /**
   * Add a new `IContentProtectionIntermediateRepresentation` that should be
   * parsed with the result linked to the given `IParsedRepresentation`.
   * @param {Object} representation
   * @param {Object} contentProt
   */
  public add(
    representation: IParsedRepresentation,
    contentProt: IContentProtectionIntermediateRepresentation,
  ): void {
    if (!this._tryParsing(representation, contentProt, false)) {
      this._stored.push([representation, contentProt]);
    } else if (contentProt.attributes.refId !== undefined) {
      this._refs.set(contentProt.attributes.refId, contentProt);
      this._resolveStoredRefs(false);
    }
  }

  /**
   * It is possible that even after parsing the full MPD,
   */
  public finalize(): void {
    this._resolveStoredRefs(true);
  }

  private _resolveStoredRefs(force: boolean): boolean {
    for (let i = this._stored.length - 1; i >= 0; i--) {
      const [representation, baseContentProt] = this._stored[i];
      if (this._tryParsing(representation, baseContentProt, force)) {
        this._stored.splice(i, 1);
      }
    }
    return this._stored.length === 0;
  }

  private _tryParsing(
    representation: IParsedRepresentation,
    baseContentProt: IContentProtectionIntermediateRepresentation,
    force: boolean,
  ): boolean {
    if (baseContentProt.attributes.ref === undefined) {
      // There's no reference, we can parse right away
      this._parse(representation, baseContentProt);
      return true;
    }

    const referenced = this._getReferenced(baseContentProt.attributes.ref);
    if (referenced === undefined) {
      // Referenced ContentProtection not found, exit
      if (force) {
        log.warn("DASH: forcing the parsing of a referencing ContentProtection");
        this._parse(representation, baseContentProt);
      }
      return false;
    }

    // Referenced ContentProtection found, let's inherit its attributes

    baseContentProt.children.cencPssh.push(...referenced.children.cencPssh);
    if (
      baseContentProt.attributes.keyId === undefined &&
      referenced.attributes.keyId !== undefined
    ) {
      baseContentProt.attributes.keyId = referenced.attributes.keyId;
    }
    if (
      baseContentProt.attributes.schemeIdUri === undefined &&
      referenced.attributes.schemeIdUri !== undefined
    ) {
      baseContentProt.attributes.schemeIdUri = referenced.attributes.schemeIdUri;
    }
    if (
      baseContentProt.attributes.value === undefined &&
      referenced.attributes.value !== undefined
    ) {
      baseContentProt.attributes.value = referenced.attributes.value;
    }
    this._parse(representation, baseContentProt);
    return true;
  }

  private _getReferenced(
    refId: string,
  ): IContentProtectionIntermediateRepresentation | undefined {
    return this._refs.get(refId);
  }

  private _parse(
    representation: IParsedRepresentation,
    contentProtectionIr: IContentProtectionIntermediateRepresentation,
  ): void {
    let systemId: string | undefined;
    if (
      contentProtectionIr.attributes.schemeIdUri !== undefined &&
      contentProtectionIr.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:"
    ) {
      systemId = contentProtectionIr.attributes.schemeIdUri
        .substring(9)
        .replace(/-/g, "")
        .toLowerCase();
    }
    if (
      contentProtectionIr.attributes.keyId !== undefined &&
      contentProtectionIr.attributes.keyId.length > 0
    ) {
      const kidObj = { keyId: contentProtectionIr.attributes.keyId, systemId };
      if (representation.contentProtections === undefined) {
        representation.contentProtections = { keyIds: [kidObj], initData: [] };
      } else if (representation.contentProtections.keyIds === undefined) {
        representation.contentProtections.keyIds = [kidObj];
      } else {
        representation.contentProtections.keyIds.push(kidObj);
      }
    }

    if (systemId === undefined) {
      return;
    }
    const { cencPssh } = contentProtectionIr.children;
    const values: Array<{ systemId: string; data: Uint8Array }> = [];
    for (const data of cencPssh) {
      values.push({ systemId, data });
    }
    if (values.length === 0) {
      return;
    }
    if (representation.contentProtections === undefined) {
      representation.contentProtections = {
        keyIds: [],
        initData: [{ type: "cenc", values }],
      };
      return;
    }

    const cencInitData = arrayFind(
      representation.contentProtections.initData,
      (i) => i.type === "cenc",
    );
    if (cencInitData === undefined) {
      representation.contentProtections.initData.push({ type: "cenc", values });
    } else {
      cencInitData.values.push(...values);
    }
  }
}
