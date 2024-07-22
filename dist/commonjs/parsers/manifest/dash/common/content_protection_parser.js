"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../log");
var array_find_1 = require("../../../../utils/array_find");
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
var ContentProtectionParser = /** @class */ (function () {
    function ContentProtectionParser() {
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
    ContentProtectionParser.prototype.addReferences = function (contentProtections) {
        var e_1, _a;
        try {
            for (var contentProtections_1 = __values(contentProtections), contentProtections_1_1 = contentProtections_1.next(); !contentProtections_1_1.done; contentProtections_1_1 = contentProtections_1.next()) {
                var contentProt = contentProtections_1_1.value;
                if (contentProt.attributes.refId !== undefined) {
                    this._refs.set(contentProt.attributes.refId, contentProt);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (contentProtections_1_1 && !contentProtections_1_1.done && (_a = contentProtections_1.return)) _a.call(contentProtections_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Add a new `IContentProtectionIntermediateRepresentation` object that should
     * be parsed with the result linked to the given `IParsedRepresentation`.
     * @param {Object} representation
     * @param {Object} contentProt
     */
    ContentProtectionParser.prototype.add = function (representation, contentProt) {
        if (!this._tryParsing(representation, contentProt, false)) {
            this._stored.push([representation, contentProt]);
        }
        if (contentProt.attributes.refId !== undefined) {
            this._refs.set(contentProt.attributes.refId, contentProt);
            this._resolveStoredRefs(false);
        }
    };
    /**
     * It is possible that even after parsing the full MPD,
     */
    ContentProtectionParser.prototype.finalize = function () {
        this._resolveStoredRefs(true);
    };
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
    ContentProtectionParser.prototype._resolveStoredRefs = function (force) {
        for (var i = this._stored.length - 1; i >= 0; i--) {
            var _a = __read(this._stored[i], 2), representation = _a[0], contentProt = _a[1];
            if (this._tryParsing(representation, contentProt, force) || force) {
                this._stored.splice(i, 1);
            }
        }
        return this._stored.length === 0;
    };
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
    ContentProtectionParser.prototype._tryParsing = function (representation, contentProt, force) {
        var _a;
        if (contentProt.attributes.ref === undefined) {
            // There's no reference, we can parse right away
            parseContentProtection(representation, contentProt);
            return true;
        }
        var referenced = this._getReferenced(contentProt.attributes.ref);
        if (referenced === undefined) {
            // Referenced ContentProtection not found, exit
            if (force) {
                log_1.default.warn("DASH: forcing the parsing of a referencing ContentProtection");
                parseContentProtection(representation, contentProt);
            }
            return false;
        }
        // Referenced ContentProtection found, let's inherit its attributes
        (_a = contentProt.children.cencPssh).push.apply(_a, __spreadArray([], __read(referenced.children.cencPssh), false));
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
    };
    /**
     * Returns an `IContentProtectionIntermediateRepresentation` based on its
     * "refId".
     * Returns `undefined` if it is not known yet.
     *
     * @param {string} refId
     * @returns {Object|undefined}
     */
    ContentProtectionParser.prototype._getReferenced = function (refId) {
        return this._refs.get(refId);
    };
    return ContentProtectionParser;
}());
exports.default = ContentProtectionParser;
/**
 * Parses an `IContentProtectionIntermediateRepresentation` and update the
 * corresponding attributes on the given `IParsedRepresentation`.
 * @param {Object} representation
 * @param {Object} contentProtectionIr
 */
function parseContentProtection(representation, contentProtectionIr) {
    var e_2, _a, _b;
    var systemId;
    if (contentProtectionIr.attributes.schemeIdUri !== undefined &&
        contentProtectionIr.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:") {
        systemId = contentProtectionIr.attributes.schemeIdUri
            .substring(9)
            .replace(/-/g, "")
            .toLowerCase();
    }
    if (contentProtectionIr.attributes.keyId !== undefined &&
        contentProtectionIr.attributes.keyId.length > 0) {
        var kidObj = { keyId: contentProtectionIr.attributes.keyId, systemId: systemId };
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
    var cencPssh = contentProtectionIr.children.cencPssh;
    var values = [];
    try {
        for (var cencPssh_1 = __values(cencPssh), cencPssh_1_1 = cencPssh_1.next(); !cencPssh_1_1.done; cencPssh_1_1 = cencPssh_1.next()) {
            var data = cencPssh_1_1.value;
            values.push({ systemId: systemId, data: data });
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (cencPssh_1_1 && !cencPssh_1_1.done && (_a = cencPssh_1.return)) _a.call(cencPssh_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    if (values.length === 0) {
        return;
    }
    if (representation.contentProtections === undefined) {
        representation.contentProtections = {
            keyIds: [],
            initData: [{ type: "cenc", values: values }],
        };
        return;
    }
    var cencInitData = (0, array_find_1.default)(representation.contentProtections.initData, function (i) { return i.type === "cenc"; });
    if (cencInitData === undefined) {
        representation.contentProtections.initData.push({ type: "cenc", values: values });
    }
    else {
        (_b = cencInitData.values).push.apply(_b, __spreadArray([], __read(values), false));
    }
}
