/**
 * This file exportsa tool allowing to easily update the global RxPlayer config
 * at runtime.
 *
 * Note that this should only be used for debugging purposes as the config is
 * __NOT__ part of the RxPlayer API.
 */

import type { IDefaultConfig } from "./default_config.ts";
import DEFAULT_CONFIG from "./default_config.ts";
import deepMerge from "./utils/deep_merge.ts";
import EventEmitter from "./utils/event_emitter.ts";

interface IConfigHandlerEvents {
  update: Partial<IDefaultConfig>;
}

class ConfigHandler extends EventEmitter<IConfigHandlerEvents> {
  public updated = false;
  private _config = DEFAULT_CONFIG;

  update(config: Partial<IDefaultConfig>) {
    const newConfig = deepMerge(this._config, config);
    this._config = newConfig;
    this.updated = true;
    this.trigger("update", config);
  }

  getCurrent(): IDefaultConfig {
    return this._config;
  }
}
const configHandler = new ConfigHandler();
export default configHandler;
