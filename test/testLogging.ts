import * as log4js from "log4js";
import { Logger } from "log4js";

export function configureAndGetLogger(): Logger {
    log4js.configure({
        appenders: {
            system: {type: 'file', filename: 'test.log'}
        },
        categories: {
            default: {appenders:['system'], level: 'debug'}
        }
    });
    return log4js.getLogger();
}