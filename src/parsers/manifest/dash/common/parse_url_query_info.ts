import { getQueryString } from "../../../../utils/url-utils.ts";
import type { IDescriptorIntermediateRepresentation } from "../node_parser_types.ts";

/** A query string generated from a DASH Annex I descriptor. */
export interface IDashUrlQueryInfo {
  /** Annex I signalling scheme from which this query string was generated. */
  scheme: "2014" | "2016";
  /** Query string without its leading question mark. */
  queryString: string;
  /** Whether this query string can only be sent back to its source origin. */
  sameOriginOnly: boolean;
  /** URL from which this query string was obtained. */
  sourceUrl?: string | undefined;
  /** Segment request categories on which this query string applies. */
  appliesTo: {
    /** Media segment requests. */
    segment: boolean;
    /** Initialization segment requests. */
    init: boolean;
  };
}

/**
 * Parse the Annex I descriptors declared at one level of the MPD hierarchy.
 *
 * This currently handles URL output for segment requests from the 2014 and
 * 2016 schemes. Remote elements, header sources and scheme-dependent client
 * parameters are deliberately left out of this first implementation.
 */
export function parseUrlQueryInfo(
  essentialProperties: IDescriptorIntermediateRepresentation[],
  supplementalProperties: IDescriptorIntermediateRepresentation[],
  mpdUrl: string | undefined,
): IDashUrlQueryInfo | undefined {
  const mpdQuery = mpdUrl === undefined ? "" : getQueryString(mpdUrl);
  // Both Shaka Player and dash.js select at most one descriptor at a given
  // level, prioritizing EssentialProperty over SupplementalProperty and then
  // taking the first matching descriptor. Keep that behavior here instead of
  // trying to merge ambiguous same-level signalling.
  const properties = essentialProperties.concat(supplementalProperties);
  for (const property of properties) {
    const schemeIdUri = property.attributes.schemeIdUri;
    let scheme: IDashUrlQueryInfo["scheme"] | undefined;
    if (schemeIdUri === "urn:mpeg:dash:urlparam:2014") {
      scheme = "2014";
    } else if (schemeIdUri === "urn:mpeg:dash:urlparam:2016") {
      scheme = "2016";
    }
    if (scheme === undefined) {
      continue;
    }

    const element =
      scheme === "2014"
        ? property.children.UrlQueryInfo[0]
        : property.children.ExtUrlQueryInfo[0];
    if (element === undefined) {
      return undefined;
    }
    const attributes = element.attributes;
    const appliesTo = getSegmentRequestApplicability(
      scheme,
      attributes.includeInRequests,
    );
    if (!appliesTo.segment && !appliesTo.init) {
      return undefined;
    }
    if (attributes.queryTemplate === undefined) {
      return undefined;
    }

    const initialParts: string[] = [];
    if (attributes.useMpdUrlQuery === true && mpdQuery.length > 0) {
      initialParts.push(mpdQuery);
    }
    if (attributes.queryString !== undefined && attributes.queryString.length > 0) {
      initialParts.push(attributes.queryString);
    }
    const initialQueryString = initialParts.join("&");
    const queryString = applyQueryTemplate(attributes.queryTemplate, initialQueryString);
    return queryString.length === 0
      ? undefined
      : {
          scheme,
          queryString,
          sameOriginOnly: scheme === "2016" && attributes.sameOriginOnly === true,
          sourceUrl: mpdUrl,
          appliesTo,
        };
  }
  return undefined;
}

/** Concatenate query strings inherited by a Representation. */
export function combineUrlQueryInfo(infos: IDashUrlQueryInfo[]): IDashUrlQueryInfo[] {
  // The 2016 scheme follows the MPD hierarchy from the root down to the
  // Representation. The baseline 2014 text specifies the inverse order.
  const extended = infos.filter((info) => info.scheme === "2016");
  const baseline = infos.filter((info) => info.scheme === "2014").reverse();
  return extended.concat(baseline);
}

function getSegmentRequestApplicability(
  scheme: IDashUrlQueryInfo["scheme"],
  includeInRequests: string | undefined,
): IDashUrlQueryInfo["appliesTo"] {
  // The 2026 specification distinguishes "segment" (media segments) from
  // "init" (initialization segments). However, Shaka Player and dash.js apply
  // Annex I parameters selected through "segment" to both kinds of segment.
  // RxPlayer currently follows that interoperable behavior. This may be
  // revisited independently from the parsing logic if stricter conformance is
  // preferred in the future.
  if (scheme === "2014" || includeInRequests === undefined) {
    return { segment: true, init: true };
  }
  const requestTypes = includeInRequests.trim().split(/\s+/);
  const appliesToAll = requestTypes.indexOf("*") >= 0;
  const appliesToSegments = appliesToAll || requestTypes.indexOf("segment") >= 0;
  return {
    segment: appliesToSegments,
    init: appliesToSegments || requestTypes.indexOf("init") >= 0,
  };
}

function applyQueryTemplate(template: string, initialQueryString: string): string {
  const queryData = parseQueryString(initialQueryString);
  return template.replace(
    /\$\$|\$querypart\$|\$query:([^$]+)\$|\$[^$]+\$/g,
    (identifier, queryParameterName: string | undefined) => {
      if (identifier === "$$") {
        return "$";
      }
      if (identifier === "$querypart$") {
        return initialQueryString;
      }
      if (queryParameterName !== undefined) {
        return queryData.get(queryParameterName) ?? "";
      }
      return "";
    },
  );
}

function parseQueryString(queryString: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const part of queryString.split("&")) {
    if (part.length === 0) {
      continue;
    }
    const separatorIndex = part.indexOf("=");
    const rawName = separatorIndex < 0 ? part : part.substring(0, separatorIndex);
    const rawValue = separatorIndex < 0 ? "" : part.substring(separatorIndex + 1);
    // Keep the value encoded: it is substituted into an already-encoded query
    // template. Decoding it here could turn an encoded ampersand into a query
    // separator when the final URL is built.
    result.set(decodeFormComponent(rawName), rawValue);
  }
  return result;
}

function decodeFormComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch (_) {
    return value;
  }
}
