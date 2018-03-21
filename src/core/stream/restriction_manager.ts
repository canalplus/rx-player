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

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import Manifest, { Adaptation, Representation } from "../../manifest/index";
import { bytesToHex } from "../../utils/bytes";
import log from "../../utils/log";

interface IRights {
  [key: string] : {
      outputRestricted: boolean;
      // TODO isDecodable: boolean
      // TODO hasPoorQualityPlayback: boolean
    };
}

interface ISpecs {
    keyID: string; // e.g. AAAAAAAAAXefs544444444 ( Hex format )
}

const protectedTypes = ["video", "audio"];

/**
 * Handle all playback restrictions potentially due to :
 *  - Output restriction (e.g. HDCP):
 *      An output device may not support HDCP. The CDM may inform
 *      rx-player that some streams may not be readable. We should
 *      restrict all streams that may be unreadable.
 *
 *  - TODO : Not decodable content (e.g. H265):
 *      Depending on software and hardware capabilites, we may
 *      be unable to decode some streams.
 *
 *  - TODO : Poor playback qualitiy (e.g. dropped frames)
 *      If playback quality is judged poor (e.g. too much dropped frames)
 *      restrict stream.
 *
 * Each representation currently present in manifest is
 * auth. or not for playback.
 */
export default class StreamRestrictionManager {

  // Defines for each ciphered representation, the associated key ID.
  private representationInfos: Map<Representation, ISpecs>;

  // Defines for each DRM key ID, if associated content can be played.
  private keyIDauthorizations: Map<string, boolean>;

  private rightsUpdate: Subject<number>;

  /**
   * From a given manifest, update auth. and representation list.
   * @param manifest
   */
  constructor(
    manifest: Manifest
  ){
    this.representationInfos = new Map();
    this.keyIDauthorizations = new Map();
    this.rightsUpdate = new Subject();
    this.updateWithManifest(manifest);
  }

  public updateWithManifest(manifest: Manifest){
    log.info(
      "Update representations in restriction manager with manifest: \""+manifest.id+"\"");
    const adaptations = manifest.adaptations;
    protectedTypes.forEach((type) => {
      ((adaptations as any)[type] || []).forEach((adaptation: Adaptation) => {
        if(
          adaptation.contentProtection &&
          adaptation.contentProtection.length !== 0
        ){
          for(let j = 0; j<adaptation.contentProtection.length; j++){
            const _kid = adaptation.contentProtection[j].kid;
            if(_kid){
              const reps: Representation[] = adaptation.representations;
              reps.forEach((rep: Representation) => {
                const infos = this.representationInfos.get(rep);
                if(infos == null){
                  this.representationInfos
                    .set(rep, { keyID: _kid });
                }
              });
            }
          }
        }
      });
    });
  }

  /**
   * Sets restriction for given KID, and
   * triggers right collect
   * @param {number} _kid
   */
  public restrictForKeyID(_kid: Uint8Array) {
     const kid = bytesToHex(_kid);
     this.keyIDauthorizations.set(kid, false);
     this.rightsUpdate.next();
     const representations: Representation[] = [];
     this.representationInfos.forEach((obj, rep) => {
       if (obj.keyID === kid) {
        representations.push(rep);
       }
     });
     return { representations, keyId: kid };
  }

  /**
   * Emit rights for all representations when updated
   * @param {number} _kid
   */
  public getRepresentationRights$ = (): Observable<IRights> => {
     return this.rightsUpdate.map(() => {
         return this.formatRights();
     }).startWith(this.formatRights());
  }

  /**
   * Format representations rights from maps
   */
  private formatRights = (): IRights => {
     const result: IRights = {};
     this.representationInfos.forEach((obj, rep) => {
         const outputRestricted = this.keyIDauthorizations ?
         this.keyIDauthorizations.get(obj.keyID) != null ?
             this.keyIDauthorizations.get(obj.keyID) as boolean :
             true :
         true;
         result[rep.id] = {
             outputRestricted,
             // isDecodable
             // hasPoorPlayback
         };
     });
     return result;
  }
}

export { IRights };
