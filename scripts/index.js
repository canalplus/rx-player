import "babel-polyfill";
import React from "react";
import ReactDOM from "react-dom";
import Main from "./controllers/Main.jsx";

import "rxjs/add/observable/combineLatest";
import "rxjs/add/observable/interval";
import "rxjs/add/operator/catch";
import "rxjs/add/operator/concat";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/do";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";
import "rxjs/add/operator/skip";
import "rxjs/add/operator/startWith";
import "rxjs/add/operator/switchMap";
import "rxjs/add/operator/take";
import "rxjs/add/operator/takeUntil";

ReactDOM.render(<Main />, document.getElementById("player-container"));
