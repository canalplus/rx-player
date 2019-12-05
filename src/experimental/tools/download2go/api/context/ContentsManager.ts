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
import { IQualityInputType, VideoQualityPickerType } from "../../types";
import {
  ContentBufferType,
  IContext,
  IContextUniq,
  IGlobalContext,
} from "../downloader/types";
import { ContentType } from "./types";

class ContentManager {
  readonly manifest: Manifest;
  readonly quality: IQualityInputType;
  readonly videoQualityPicker?: VideoQualityPickerType;

  constructor(
    manifest: Manifest,
    quality: IQualityInputType = "MEDIUM",
    videoQualityPicker?: VideoQualityPickerType
  ) {
    this.manifest = manifest;
    this.quality = quality;
    this.videoQualityPicker = videoQualityPicker;
  }

  getContextsForCurrentSession(): IGlobalContext {
    return this.manifest.periods.reduce(
      (acc: IGlobalContext, period) => {
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
    const video = globalCtx.video.reduce(
      (_: IContext[], currVideo): IContext[] => {
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
    const audio = globalCtx.audio.reduce(
      (_: IContext[], currAudio): IContext[] => {
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
    const text = globalCtx.text.reduce(
      (_: IContext[], currText): IContext[] => {
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

  private getRepresentationByQualityBitrate(representations: Representation[]) {
    switch (this.quality) {
      case "HIGH":
        return representations.reduce((acc, curr) => {
          if (curr.bitrate > acc.bitrate) {
            return curr;
          }
          return acc;
        });
      case "MEDIUM":
        return representations[Math.floor(representations.length / 2)];
      case "LOW":
        return representations.reduce((acc, curr) => {
          if (curr.bitrate < acc.bitrate) {
            return curr;
          }
          return acc;
        });
      default:
        return representations[Math.floor(representations.length / 2)];
    }
  }

  private getVideoRepresentationByManualPicker(
    representations: Representation[]
  ): Representation | undefined {
    if (
      this.videoQualityPicker === undefined ||
      typeof this.videoQualityPicker !== "function"
    ) {
      return undefined;
    }
   const videoRepresentationPicked = this.videoQualityPicker(representations);
   if (videoRepresentationPicked instanceof Representation) {
    return videoRepresentationPicked;
   }
    return undefined;
  }

  private decideRepresentation(
    representations: Representation[],
    contentType: ContentBufferType
  ): Representation {
    switch (contentType) {
      // If we want to take a representation by bufferType
      case ContentType.VIDEO: {
        const representationManualPicker = this.getVideoRepresentationByManualPicker(
          representations
        );
        if (representationManualPicker === undefined) {
          return this.getRepresentationByQualityBitrate(representations);
        }
        return representationManualPicker;
      }
      // case ContentType.AUDIO: {
      //   return this.getRepresentationByQualityBitrate(representations);
      // }
      // case ContentType.TEXT: {
      //   return this.getRepresentationByQualityBitrate(representations);
      // }
      default:
        return this.getRepresentationByQualityBitrate(representations);
    }
  }

  private decideUniqContext(
    adaptations: Adaptation[],
    contentType: ContentBufferType
  ): IContextUniq[] {
    return adaptations.reduce((acc: IContextUniq[], adaptation) => {
      const representation = this.decideRepresentation(
        adaptation.representations,
        contentType
      );
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

export default ContentManager;
