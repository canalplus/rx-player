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
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import clearOnStop from "./clear_on_stop";
import ContentDecryptor from "./content_decryptor";
import disposeDecryptionResources from "./dispose_decryption_resources";
import getKeySystemConfiguration from "./get_key_system_configuration";
export * from "./types";
export default ContentDecryptor;
export { clearOnStop, disposeDecryptionResources, getKeySystemConfiguration };
//# sourceMappingURL=index.d.ts.map