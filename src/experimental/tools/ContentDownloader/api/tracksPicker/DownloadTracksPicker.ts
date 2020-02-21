/**
 * Copyright 2019 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Manifest, { Adaptation, Representation } from "../../../../../manifest";
import { IRepresentationFilters } from "../../types";
import {
  ContentBufferType,
  IContext,
  IContextUniq,
  IGlobalContext,
} from "../downloader/types";
import { ContentType, IContextManager } from "./types";

/**
 * ContentManager that will decide which context adaptations/representations to use
 */
class DownloadTracksPicker {

  static getHighestRepresentationIDByBitrate(
    representations: Representation[]
  ): string | null {
    if (representations.length === 0) {
      return null;
    }
    const representation = representations.reduce<Representation>((acc, currRepre) => {
      if (acc.bitrate < currRepre.bitrate) {
        return currRepre;
      }
      return acc;
    }, representations[0]);
    return String(representation.id);
  }

  readonly manifest: Manifest;
  readonly filters: IRepresentationFilters | undefined ;

  constructor({ manifest, filters }: IContextManager) {
    this.manifest = manifest;
    this.filters = filters === null || typeof filters !== "object" ? undefined : filters;
  }

  getContextsForCurrentSession(): IGlobalContext {
    return this.manifest.periods.reduce<IGlobalContext>(
      (acc, period) => {
        const videoContexts = this.decideUniqContext(
          period.getAdaptationsForType(ContentType.VIDEO),
          ContentType.VIDEO
        );
        acc.video.push({ period, contexts: videoContexts });
        const audioContexts = this.decideUniqContext(
          period.getAdaptationsForType(ContentType.AUDIO),
          ContentType.AUDIO
        );
        acc.audio.push({ period, contexts: audioContexts });
        const textContexts = this.decideUniqContext(
          period.getAdaptationsForType(ContentType.TEXT),
          ContentType.TEXT
        );
        acc.text.push({ period, contexts: textContexts });
        return acc;
      },
      { video: [], audio: [], text: [], manifest: this.manifest }
    );
  }

  getContextsFormatted(
    globalCtx: IGlobalContext
  ): { video: IContext[]; audio: IContext[]; text: IContext[] } {
    const video = globalCtx.video.reduce<IContext[]>(
      (_, currVideo) => {
        return currVideo.contexts.map(
          (videoContext): IContext => ({
            manifest: globalCtx.manifest,
            period: currVideo.period,
            ...videoContext,
          })
        );
      },
      []
    );
    const audio = globalCtx.audio.reduce<IContext[]>(
      (_, currAudio) => {
        return currAudio.contexts.map(
          (audioContext): IContext => ({
            manifest: globalCtx.manifest,
            period: currAudio.period,
            ...audioContext,
          })
        );
      },
      []
    );
    const text = globalCtx.text.reduce<IContext[]>(
      (_, currText) => {
        return currText.contexts.map(
          (textContext): IContext => ({
            manifest: globalCtx.manifest,
            period: currText.period,
            ...textContext,
          })
        );
      },
      []
    );
    return { video, audio, text };
  }

  private getRepresentationWithFilter(
    filterType: "video",
    representations: Representation[]
  ) : string | undefined {
    if (this.filters === undefined || typeof this.filters[filterType] !== "function") {
      return undefined;
    }
    const representationFilterFn = this.filters[filterType];
    return representationFilterFn(representations.map(
      ({ width, height, id, bitrate }) => ({ width, height, id, bitrate })
    ));
  }

  private decideRepresentation(
    contentType: ContentBufferType,
    representations: Representation[]
  ): string | null {
    switch (contentType) {
      // If we want to take a representation by bufferType
      case ContentType.VIDEO: {
        const representationIDPickedByFilter = this.getRepresentationWithFilter(
          ContentType.VIDEO,
          representations
        );
        if (representationIDPickedByFilter === undefined) {
          return DownloadTracksPicker.getHighestRepresentationIDByBitrate(
            representations
          );
        }
        return representationIDPickedByFilter;
      }
      // case ContentType.AUDIO: {
      //   return this.getHighestRepresentationIDByBitrate(representations);
      // }
      // case ContentType.TEXT: {
      //   return this.getHighestRepresentationIDByBitrate(representations);
      // }
      default:
        return DownloadTracksPicker.getHighestRepresentationIDByBitrate(representations);
    }
  }

  private decideUniqContext(
    adaptations: Adaptation[],
    contentType: ContentBufferType
  ): IContextUniq[] {
    return adaptations.reduce((acc: IContextUniq[], adaptation) => {
      const representationID = this.decideRepresentation(
        contentType,
        adaptation.representations
      );
      if (representationID === null) {
        throw new Error("No representation playable");
      }
      const representation = adaptation.getRepresentation(representationID);
      if (representation === undefined) {
        throw new Error("No representation playable");
      }
      const segment = representation.index.getInitSegment();
      if (segment === null) {
        throw new Error("Error while constructing the init segment");
      }
      acc.push({
        adaptation,
        representation,
        segment,
      });
      return acc;
    }, []);
  }
}

export default DownloadTracksPicker;
