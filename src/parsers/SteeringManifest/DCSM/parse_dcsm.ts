import type { ISteeringManifest } from "../types";

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

  const initialPriorities = json["SERVICE-LOCATION-PRIORITY"];
  if (!Array.isArray(initialPriorities)) {
    throw new Error("The DCSM's SERVICE-LOCATION-URI in in the wrong format");
  } else if (initialPriorities.length === 0) {
    warnings.push(
      new Error("The DCSM's SERVICE-LOCATION-URI should contain at least one element"),
    );
  }

  const priorities: string[] = initialPriorities.filter(
    (elt): elt is string => typeof elt === "string",
  );
  if (priorities.length !== initialPriorities.length) {
    warnings.push(
      new Error("The DCSM's SERVICE-LOCATION-URI contains URI in a wrong format"),
    );
  }
  let lifetime = 300;

  if (typeof json.TTL === "number") {
    lifetime = json.TTL;
  } else if (json.TTL !== undefined) {
    warnings.push(new Error("The DCSM's TTL in in the wrong format"));
  }

  let reloadUri;
  if (typeof json["RELOAD-URI"] === "string") {
    reloadUri = json["RELOAD-URI"];
  } else if (json["RELOAD-URI"] !== undefined) {
    warnings.push(new Error("The DCSM's RELOAD-URI in in the wrong format"));
  }

  return [{ lifetime, reloadUri, priorities }, warnings];
}
