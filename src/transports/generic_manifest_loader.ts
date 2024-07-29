import type { ILoadedManifestFormat } from "../public_types";
import type { CancellationSignal } from "../utils/task_canceller";
import type { IManifestLoaderOptions, IRequestedData, ITransportOptions } from "./types";
import generateManifestLoader from "./utils/generate_manifest_loader";

export default function loadManifestAndDetectTransport(
  transportOptions: ITransportOptions,
  url: string | undefined,
  options: IManifestLoaderOptions,
  cancelSignal: CancellationSignal,
): Promise<
  IRequestedData<{
    transport: "dash" | "smooth" | "metaplaylist";
    manifest: ILoadedManifestFormat;
  }>
> {
  const customManifestLoader = transportOptions.manifestLoader;
  const manifestLoader = generateManifestLoader({ customManifestLoader }, "text", null);
  return manifestLoader(url, options, cancelSignal)
    .then((res) => {
      let responseAsString: string | undefined;
      if (typeof res.responseData === "string") {
        responseAsString = res.responseData;
      } else if (typeof Document === "object" && res.responseData instanceof Document) {
        responseAsString = (res.responseData as Document).documentElement.outerHTML;
      } else if (res.responseData instanceof ArrayBuffer) {
        responseAsString = new TextDecoder().decode(res.responseData);
      }

      if (responseAsString === undefined) {
        throw new Error("Could not parse the obtained Manifest");
      }

      // TODO check end for </MPD>, </Smooth bidule> etc.?
    });
}
