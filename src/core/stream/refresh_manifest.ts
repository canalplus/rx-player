import { Observable, EMPTY } from "rxjs";
import { tap, share, mapTo } from "rxjs/operators";
import Manifest from "../../manifest";
import log from "../../log";
import { IManifestUpdateEvent } from "./types";
import EVENTS from "./events_generators";

/**
 * Re-fetch the manifest and merge it with the previous version.
 *
 * /!\ Mutates the given manifest
 * @param {Function} manifestPipeline - download the manifest
 * @param {Object} currentManifest
 * @returns {Observable}
 */
export default function refreshManifest(
  manifestPipeline : (url : string) => Observable<Manifest>,
  currentManifest : Manifest
) : Observable<IManifestUpdateEvent> {
  const refreshURL = currentManifest.getUrl();
  if (!refreshURL) {
    log.warn("Cannot refresh the manifest: no url");
    return EMPTY;
  }

  return manifestPipeline(refreshURL).pipe(
    tap((parsed) => {
      currentManifest.update(parsed);
    }),
    share(), // share the previous side effect
    mapTo(EVENTS.manifestUpdate(currentManifest))
  );
}
