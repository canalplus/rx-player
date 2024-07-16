import type { IParsedRepresentation } from "../../types";
import type { IContentProtectionIntermediateRepresentation } from "../node_parser_types";
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
    /**
     * Stores `ContentProtection` elements that can be referenced, identified by
     * their `refId` attribute.
     */
    private _refs;
    /**
     * Storage of `ContentProtection` elements that could not yet have been parsed
     * due to not-yet resolved references.
     *
     * This is only possible if a `ContentProtection` element performs a
     * "forward-reference" to a later `ContentProtection` element that is not yet
     * known by this `ContentProtectionParser`.
     */
    private _stored;
    constructor();
    /**
     * Add new `IContentProtectionIntermediateRepresentation` objects that can
     * be relied on as a reference by later
     * `IContentProtectionIntermediateRepresentation` objects, without the need
     * to actually apply it to a Representation.
     * @param {Object} contentProtections
     */
    addReferences(contentProtections: IContentProtectionIntermediateRepresentation[]): void;
    /**
     * Add a new `IContentProtectionIntermediateRepresentation` object that should
     * be parsed with the result linked to the given `IParsedRepresentation`.
     * @param {Object} representation
     * @param {Object} contentProt
     */
    add(representation: IParsedRepresentation, contentProt: IContentProtectionIntermediateRepresentation): void;
    /**
     * It is possible that even after parsing the full MPD,
     */
    finalize(): void;
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
    private _resolveStoredRefs;
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
    private _tryParsing;
    /**
     * Returns an `IContentProtectionIntermediateRepresentation` based on its
     * "refId".
     * Returns `undefined` if it is not known yet.
     *
     * @param {string} refId
     * @returns {Object|undefined}
     */
    private _getReferenced;
}
//# sourceMappingURL=content_protection_parser.d.ts.map