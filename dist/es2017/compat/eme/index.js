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
import closeSession from "./close_session";
import defaultEmeImplementation from "./eme-api-implementation";
import generateKeyRequest from "./generate_key_request";
import getInitData from "./get_init_data";
import loadSession from "./load_session";
export default defaultEmeImplementation;
export { closeSession, generateKeyRequest, getInitData, loadSession, };
