/**
 * This file exportsa tool allowing to easily update the global RxPlayer config
 * at runtime.
 *
 * Note that this should only be used for debugging purposes as the config is
 * __NOT__ part of the RxPlayer API.
 */

import type { IDefaultConfig } from "./default_config";
import DEFAULT_CONFIG from "./default_config";
import deepMerge from "./utils/deep_merge";

class ConfigHandler {
  _config = DEFAULT_CONFIG;

  update(config: Partial<IDefaultConfig>) {
    const newConfig = deepMerge(this._config, config);
    this._config = newConfig;
  }

  getCurrent(): IDefaultConfig {
    return this._config;
  }
}
const configHandler = new ConfigHandler();
export default configHandler;
