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

require("rxjs/add/observable/of");
require("rxjs/add/observable/throw");

require("rxjs/add/operator/catch");
require("rxjs/add/operator/concat");
require("rxjs/add/operator/concatAll");
require("rxjs/add/operator/concatMap");
require("rxjs/add/operator/debounceTime");
require("rxjs/add/operator/distinctUntilChanged");
require("rxjs/add/operator/do");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/finally");
require("rxjs/add/operator/ignoreElements");
require("rxjs/add/operator/map");
require("rxjs/add/operator/mapTo");
require("rxjs/add/operator/mergeMap");
require("rxjs/add/operator/multicast");
require("rxjs/add/operator/publish");
require("rxjs/add/operator/scan");
require("rxjs/add/operator/share");
require("rxjs/add/operator/skip");
require("rxjs/add/operator/startWith");
require("rxjs/add/operator/switchMap");
require("rxjs/add/operator/take");
require("rxjs/add/operator/takeUntil");
require("rxjs/add/operator/timeout");

module.exports = require("./core/player");
