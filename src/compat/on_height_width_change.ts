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

import {
  defer as observableDefer,
  interval as observableInterval,
  Observable,
  Observer,
} from "rxjs";
import {
  distinctUntilChanged,
  map,
  startWith,
} from "rxjs/operators";
import log from "../log";
import isNode from "./is_node";

export interface IResolution { width : number;
                               height : number; }

interface IResizeObserverConstructor {
  /* tslint:disable callable-types */
  new(callback: IResizeObserverCallback) : IResizeObserver;
  /* tslint:enable callable-types */
}

interface IResizeObserver { observe(target : Element) : void;
                            unobserve(target : Element) : void;
                            disconnect() : void; }

type IResizeObserverCallback  = (entries: IResizeObserverEntry[],
                                 observer: IResizeObserver) => void;

interface IResizeObserverEntry { readonly target : Element;
                                 readonly contentRect : IDOMRectReadOnly; }

interface IDOMRectReadOnly { readonly x: number;
                             readonly y: number;
                             readonly width: number;
                             readonly height: number;
                             readonly top: number;
                             readonly right: number;
                             readonly bottom: number;
                             readonly left: number; }

const _ResizeObserver : IResizeObserverConstructor |
                        /* tslint:disable no-unsafe-any */
                        undefined = isNode ? undefined :
                                            (window as any).ResizeObserver;
                        /* tslint:enable no-unsafe-any */

/**
 * Emit the current height and width of the given `element` on subscribtion
 * and each time it changes.
 *
 * On some browsers, we might not be able to rely on a native API to know when
 * it changes, the `interval` argument allow us to provide us an inverval in
 * milliseconds at which we should query that element's size.
 * @param {HTMLElement} element
 * @param {number} interval
 * @returns {Observable}
 */
export default function onHeightWidthChange(
  element : HTMLElement,
  interval : number
) : Observable<IResolution> {
  return observableDefer(() : Observable<IResolution> => {
    if (_ResizeObserver !== undefined) {
      let lastHeight : number = -1;
      let lastWidth : number = -1;

      return new Observable((obs : Observer<IResolution>) => {
        const resizeObserver = new _ResizeObserver(entries => {
          if (entries.length === 0) {
            log.error("Compat: Resized but no observed element.");
            return;
          }

          const entry = entries[0];
          const { height, width } = entry.contentRect;

          if (height !== lastHeight || width !== lastWidth) {
            lastHeight = height;
            lastWidth = width;
            obs.next({ height, width });
          }
        });

        resizeObserver.observe(element);
        return () => {
          resizeObserver.disconnect();
        };
      });
    }

    return observableInterval(interval).pipe(
      startWith(null),
      map(() : IResolution => {
        const { height, width } = element.getBoundingClientRect();
        return { height, width };
      }),
      distinctUntilChanged((o, n) => {
        return o.height === n.height && o.width === n.width;
      })
    );
  });
}
