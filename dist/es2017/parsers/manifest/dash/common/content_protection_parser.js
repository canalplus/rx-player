import log from "../../../../log";
import arrayFind from "../../../../utils/array_find";
/**
 * Class whose purpose is to parse `<ContentProtection>` elements in a DASH MPD.
 *
 * This element has to be particularly considered because a ContentProtection
 * element can inherit another ContentProtection element coming before it yet
 * even after it in the MPD, through a system of "reference IDs".
 *
 * The idea here is that the main MPD parsing logic just needs to signal to this
 * class when a `ContentProtection` element is encountered - and to which
 * `Representation` it is associated, and this class will then perform the
 * ContentProtection-parsing operation as soon as it has all referenced
 * ContentProtection elements.
 *
 * @class ContentProtectionParser
 */
export default class ContentProtectionParser {
    constructor() {
        this._refs = new Map();
        this._stored = [];
    }
    /**
     * Add new `IContentProtectionIntermediateRepresentation` objects that can
     * be relied on as a reference by later
     * `IContentProtectionIntermediateRepresentation` objects, without the need
     * to actually apply it to a Representation.
     * @param {Object} contentProtections
     */
    addReferences(contentProtections) {
        for (const contentProt of contentProtections) {
            if (contentProt.attributes.refId !== undefined) {
                this._refs.set(contentProt.attributes.refId, contentProt);
            }
        }
    }
    /**
     * Add a new `IContentProtectionIntermediateRepresentation` object that should
     * be parsed with the result linked to the given `IParsedRepresentation`.
     * @param {Object} representation
     * @param {Object} contentProt
     */
    add(representation, contentProt) {
        if (!this._tryParsing(representation, contentProt, false)) {
            this._stored.push([representation, contentProt]);
        }
        if (contentProt.attributes.refId !== undefined) {
            this._refs.set(contentProt.attributes.refId, contentProt);
            this._resolveStoredRefs(false);
        }
    }
    /**
     * It is possible that even after parsing the full MPD,
     */
    finalize() {
        this._resolveStoredRefs(true);
    }
    /**
     * Try to parse all ContentProtection that are currently waiting due to a
     * referenced ContentProtection not being known yet.
     *
     * Return `true` if all ContentProtection references could have been found
     * and `false` if at least one wasn't.
     *
     * The `force` parameter indicate what should be done if a reference linked
     * to a ContentProtection couldn't be resolved: if `false`, we just keep that
     * ContentProtection aside for later, if `true` we parse it right now even if
     * information could be missing.
     *
     * @param {boolean} force
     * @returns {boolean}
     */
    _resolveStoredRefs(force) {
        for (let i = this._stored.length - 1; i >= 0; i--) {
            const [representation, contentProt] = this._stored[i];
            if (this._tryParsing(representation, contentProt, force) || force) {
                this._stored.splice(i, 1);
            }
        }
        return this._stored.length === 0;
    }
    /**
     * Parse the `IContentProtectionIntermediateRepresentation` given and add the
     * corresponding attributes to the given `IParsedRepresentation` when done.
     *
     * Because the `IContentProtectionIntermediateRepresentation` may be
     * referencing another `IContentProtectionIntermediateRepresentation`, this
     * method might not succeed to do so if the referenced
     * `IContentProtectionIntermediateRepresentation` has not yet been encountered.
     *
     * In that last scenario, this method returns `false` and:
     *   - Either `force` is set to `true`, in which case what could be parsed
     *     will still be set on the `IParsedRepresentation`.
     *   - Either `force` is set to `false`, in which case the parsing of this
     *     `IContentProtectionIntermediateRepresentation` is skipped.
     * @param {Object} representation
     * @param {Object} contentProt
     * @param {boolean} force
     * @returns {boolean}
     */
    _tryParsing(representation, contentProt, force) {
        if (contentProt.attributes.ref === undefined) {
            // There's no reference, we can parse right away
            parseContentProtection(representation, contentProt);
            return true;
        }
        const referenced = this._getReferenced(contentProt.attributes.ref);
        if (referenced === undefined) {
            // Referenced ContentProtection not found, exit
            if (force) {
                log.warn("DASH: forcing the parsing of a referencing ContentProtection");
                parseContentProtection(representation, contentProt);
            }
            return false;
        }
        // Referenced ContentProtection found, let's inherit its attributes
        contentProt.children.cencPssh.push(...referenced.children.cencPssh);
        if (contentProt.attributes.keyId === undefined &&
            referenced.attributes.keyId !== undefined) {
            contentProt.attributes.keyId = referenced.attributes.keyId;
        }
        if (contentProt.attributes.schemeIdUri === undefined &&
            referenced.attributes.schemeIdUri !== undefined) {
            contentProt.attributes.schemeIdUri = referenced.attributes.schemeIdUri;
        }
        if (contentProt.attributes.value === undefined &&
            referenced.attributes.value !== undefined) {
            contentProt.attributes.value = referenced.attributes.value;
        }
        parseContentProtection(representation, contentProt);
        return true;
    }
    /**
     * Returns an `IContentProtectionIntermediateRepresentation` based on its
     * "refId".
     * Returns `undefined` if it is not known yet.
     *
     * @param {string} refId
     * @returns {Object|undefined}
     */
    _getReferenced(refId) {
        return this._refs.get(refId);
    }
}
/**
 * Parses an `IContentProtectionIntermediateRepresentation` and update the
 * corresponding attributes on the given `IParsedRepresentation`.
 * @param {Object} representation
 * @param {Object} contentProtectionIr
 */
function parseContentProtection(representation, contentProtectionIr) {
    let systemId;
    if (contentProtectionIr.attributes.schemeIdUri !== undefined &&
        contentProtectionIr.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:") {
        systemId = contentProtectionIr.attributes.schemeIdUri
            .substring(9)
            .replace(/-/g, "")
            .toLowerCase();
    }
    if (contentProtectionIr.attributes.keyId !== undefined &&
        contentProtectionIr.attributes.keyId.length > 0) {
        const kidObj = { keyId: contentProtectionIr.attributes.keyId, systemId };
        if (representation.contentProtections === undefined) {
            representation.contentProtections = { keyIds: [kidObj], initData: [] };
        }
        else if (representation.contentProtections.keyIds === undefined) {
            representation.contentProtections.keyIds = [kidObj];
        }
        else {
            representation.contentProtections.keyIds.push(kidObj);
        }
    }
    if (systemId === undefined) {
        return;
    }
    const { cencPssh } = contentProtectionIr.children;
    const values = [];
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
    const cencInitData = arrayFind(representation.contentProtections.initData, (i) => i.type === "cenc");
    if (cencInitData === undefined) {
        representation.contentProtections.initData.push({ type: "cenc", values });
    }
    else {
        cencInitData.values.push(...values);
    }
}
