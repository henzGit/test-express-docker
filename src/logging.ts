import * as log4js from "log4js";
import { Logger } from "log4js";

log4js.configure({
    appenders: {
        system: {type: 'file', filename: 'app.log'}
    },
    categories: {
        default: {appenders:['system'], level: 'debug'}
    }
});

export const logger: Logger = log4js.getLogger();