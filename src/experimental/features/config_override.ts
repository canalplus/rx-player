import deepMerge from "../../utils/deep_merge";
import DEFAULT_CONFIG, {IDefaultConfig} from "../../default_config";


class ConfigHandler {
    _config = DEFAULT_CONFIG;

    update(self: ConfigHandler, config: Partial<IDefaultConfig>){
        const newConfig = deepMerge(DEFAULT_CONFIG, config) as IDefaultConfig
        self._config = newConfig
    }
}

export const configHandler = new ConfigHandler()

