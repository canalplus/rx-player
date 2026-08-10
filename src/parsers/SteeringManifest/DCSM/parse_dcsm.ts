import type { IPathwayClone, ISteeringManifest } from "../types.ts";

export default function parseDashContentSteeringManifest(
  input: string | Partial<Record<string, unknown>>,
): [ISteeringManifest, Error[]] {
  const warnings: Error[] = [];
  let json;
  if (typeof input === "string") {
    json = JSON.parse(input) as Partial<Record<string, unknown>>;
  } else {
    json = input;
  }

  if (json.VERSION !== 1) {
    throw new Error("Unhandled DCSM version. Only `1` can be proccessed.");
  }

  const initialPriorities = json["PATHWAY-PRIORITY"] ?? [];
  if (!Array.isArray(initialPriorities)) {
    throw new Error("The DCSM's PATHWAY-PRIORITY is in the wrong format");
  } else if (json["PATHWAY-PRIORITY"] !== undefined && initialPriorities.length === 0) {
    warnings.push(
      new Error("The DCSM's PATHWAY-PRIORITY should contain at least one element"),
    );
  }

  const priorities: string[] = [];
  for (const priority of initialPriorities) {
    if (typeof priority === "string" && priorities.indexOf(priority) < 0) {
      priorities.push(priority);
    }
  }
  if (priorities.length !== initialPriorities.length) {
    warnings.push(
      new Error("The DCSM's PATHWAY-PRIORITY contains invalid or duplicate IDs"),
    );
  }

  if (typeof json.TTL !== "number" || !Number.isFinite(json.TTL) || json.TTL < 0) {
    throw new Error("The DCSM's mandatory TTL is in the wrong format");
  }
  const lifetime = json.TTL;

  let reloadUri;
  if (typeof json["RELOAD-URI"] === "string") {
    reloadUri = json["RELOAD-URI"];
  } else if (json["RELOAD-URI"] !== undefined) {
    warnings.push(new Error("The DCSM's RELOAD-URI in in the wrong format"));
  }

  const pathwayClones: IPathwayClone[] = [];
  const initialClones = json["PATHWAY-CLONES"];
  if (initialClones !== undefined && !Array.isArray(initialClones)) {
    warnings.push(new Error("The DCSM's PATHWAY-CLONES is in the wrong format"));
  } else if (Array.isArray(initialClones)) {
    for (const clone of initialClones) {
      const parsedClone = parsePathwayClone(clone);
      if (parsedClone === null || pathwayClones.some(({ id }) => id === parsedClone.id)) {
        warnings.push(new Error("The DCSM contains an invalid pathway clone"));
      } else {
        pathwayClones.push(parsedClone);
      }
    }
  }

  return [{ lifetime, reloadUri, priorities, pathwayClones }, warnings];
}

function parsePathwayClone(value: unknown): IPathwayClone | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const clone = value as Partial<Record<string, unknown>>;
  const replacement = clone["URI-REPLACEMENT"];
  if (
    typeof clone["BASE-ID"] !== "string" ||
    typeof clone.ID !== "string" ||
    clone.ID === clone["BASE-ID"] ||
    typeof replacement !== "object" ||
    replacement === null
  ) {
    return null;
  }
  const replacementObject = replacement as Partial<Record<string, unknown>>;
  const host = replacementObject.HOST;
  const initialParams = replacementObject.PARAMS;
  if (host !== undefined && typeof host !== "string") {
    return null;
  }
  let params: Record<string, string> | undefined;
  if (initialParams !== undefined) {
    if (typeof initialParams !== "object" || initialParams === null) {
      return null;
    }
    params = {};
    for (const [key, val] of Object.entries(initialParams)) {
      if (typeof val !== "string") {
        return null;
      }
      params[key] = val;
    }
  }
  if (host === undefined && params === undefined) {
    return null;
  }
  return {
    baseId: clone["BASE-ID"],
    id: clone.ID,
    uriReplacement: { host, params },
  };
}
