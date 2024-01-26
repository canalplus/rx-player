import { join, dirname } from "path";
import { fileURLToPath } from "url";

export default join(dirname(fileURLToPath(import.meta.url)), "../../");
