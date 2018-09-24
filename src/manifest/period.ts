/**
 * Copyright 2015 CANAL+ Group
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
import arrayFind from "array-find";
import { Subject } from "rxjs";
import { ICustomError } from "../errors";
import MediaError from "../errors/MediaError";
import log from "../log";
import { CustomRepresentationFilter } from "../net/types";
import arrayIncludes from "../utils/array-includes";
import generateNewId from "../utils/id";
import { normalize as normalizeLang } from "../utils/languages";
import Adaptation, {
  IAdaptationArguments,
  IAdaptationType,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "./adaptation";
import { StaticRepresentationIndex } from "./representation_index";

export type IManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;

export type IAdaptationsArguments =
  Partial<Record<IAdaptationType, IAdaptationArguments[]>>;

export interface ISupplementaryImageTrack {
  mimeType : string;
  url : string;
}

export interface ISupplementaryTextTrack {
  mimeType : string;
  codecs? : string;
  url : string;
  language? : string;
  languages? : string[];
  closedCaption : boolean;
}

export interface IPeriodArguments {
  id: string;
  adaptations: IAdaptationsArguments;
  start: number;
  duration?: number;
}

export default class Period {
  public readonly id : string;
  public readonly adaptations : IManifestAdaptations;
  public duration? : number;
  public start : number;
  public end? : number;

  /**
   * @constructor
   * @param {Object} args
   */
  constructor(
    args : IPeriodArguments,
    warning$: Subject<Error|ICustomError>,
    customRepresentationFilter? : CustomRepresentationFilter
  ) {
    this.id = args.id;
    this.adaptations =
      (Object.keys(args.adaptations) as IAdaptationType[])
        .reduce<IManifestAdaptations>((acc, type) => {
          if (args.adaptations[type]) {
            const adaptationsForType = args.adaptations[type];
            if (adaptationsForType) {
              acc[type] = adaptationsForType
                .filter((adaptation) => {
                  if (!arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptation.type)) {
                    log.info("not supported adaptation type", adaptation.type);
                    warning$.next(
                      new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE", null, false)
                    );
                    return false;
                  } else {
                    return true;
                  }
                })
                .map((adaptation) => {
                  return new Adaptation(adaptation, warning$, customRepresentationFilter);
                })
                .filter((adaptation) => adaptation.representations.length);
            }
          }
          return acc;
        }, {});

    if (
      (!this.adaptations.video || !this.adaptations.video.length) &&
      (!this.adaptations.audio || !this.adaptations.audio.length)
    ) {
      throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
    }

    this.duration = args.duration;
    this.start = args.start;

    if (this.duration != null && this.start != null) {
      this.end = this.start + this.duration;
    }
  }

  /**
   * Add supplementary image Adaptation(s) to the manifest.
   * @param {Object|Array.<Object>} imageTracks
   */
  addSupplementaryImageAdaptations(
    imageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
  ) : void {
    const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
    const newImageTracks = _imageTracks.map(({ mimeType, url }) => {
      const adaptationID = "gen-image-ada-" + generateNewId();
      const representationID = "gen-image-rep-" + generateNewId();
      return new Adaptation({
        id: adaptationID,
        type: "image",
        manuallyAdded: true,
        representations: [{
          bitrate: 0,
          id: representationID,
          mimeType,
          index: new StaticRepresentationIndex({ media: url }),
        }],
      });
    });

    if (newImageTracks.length) {
      this.adaptations.image = this.adaptations.image ?
        this.adaptations.image.concat(newImageTracks) : newImageTracks;
    }
  }

  /**
   * Add supplementary text Adaptation(s) to the manifest.
   * @param {Object|Array.<Object>} textTracks
   */
  addSupplementaryTextAdaptations(
    textTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[]
  ) : void {
    const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
    const newTextAdaptations = _textTracks.reduce((allSubs : Adaptation[], {
      mimeType,
      codecs,
      url,
      language,
      languages,
      closedCaption,
    }) => {
      const langsToMapOn : string[] = language ? [language] : languages || [];

      return allSubs.concat(langsToMapOn.map((_language) => {
        const adaptationID = "gen-text-ada-" + generateNewId();
        const representationID = "gen-text-rep-" + generateNewId();
        return new Adaptation({
          id: adaptationID,
          type: "text",
          language: _language,
          normalizedLanguage: normalizeLang(_language),
          closedCaption,
          manuallyAdded: true,
          representations: [{
            bitrate: 0,
            id: representationID,
            mimeType,
            codecs,
            index: new StaticRepresentationIndex({ media: url }),
          }],
        });
      }));
    }, []);

    if (newTextAdaptations.length) {
      this.adaptations.text = this.adaptations.text ?
        this.adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
    }
  }

  /**
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    const adaptationsByType = this.adaptations;
    if (!adaptationsByType) {
      return [];
    }

    const adaptationsList : Adaptation[] = [];
    for (const adaptationType in adaptationsByType) {
      if (adaptationsByType.hasOwnProperty(adaptationType)) {
        const adaptations =
          adaptationsByType[adaptationType as IAdaptationType] as Adaptation[];
        adaptationsList.push(...adaptations);
      }
    }
    return adaptationsList;
  }

  /**
   * @param {string} adaptationType
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[] {
    const adaptations = this.adaptations[adaptationType];
    return adaptations || [];
  }

  /**
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getAdaptation(wantedId : number|string) : Adaptation|undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }
}
