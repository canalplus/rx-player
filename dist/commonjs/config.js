"use strict";
/**
 * This file exportsa tool allowing to easily update the global RxPlayer config
 * at runtime.
 *
 * Note that this should only be used for debugging purposes as the config is
 * __NOT__ part of the RxPlayer API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var default_config_1 = require("./default_config");
var deep_merge_1 = require("./utils/deep_merge");
var ConfigHandler = /** @class */ (function () {
    function ConfigHandler() {
        this._config = default_config_1.default;
    }
    ConfigHandler.prototype.update = function (config) {
        var newConfig = (0, deep_merge_1.default)(this._config, config);
        this._config = newConfig;
    };
    ConfigHandler.prototype.getCurrent = function () {
        return this._config;
    };
    return ConfigHandler;
}());
var configHandler = new ConfigHandler();
exports.default = configHandler;
