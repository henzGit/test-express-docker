import * as config from "config";
import ImageController from "./controller/image.controller";
import FileService from "./service/file.service";
import KvsService from "./service/kvs.service";
import QueueService from "./service/queue.service";
import BaseControllerInterface from "./lib/interface/base.controller.interface";
import FileServiceInterface from "./lib/interface/file.service.interface";
import KvsServiceInterface from "./lib/interface/kvs.service.interface";
import QueueServiceInterface from "./lib/interface/queue.service.interface";
import { Options } from "amqplib";
import { logger } from "./logging";

// Read config values
const uploadedPath: string = config.get('App.fileStorage.uploadedPath');
const redisHost: string = config.get('App.kvs.host');
const redisIndexKey: string = config.get('App.kvs.indexKey');
const queueName: string = config.get('App.queue.queueName');
const queueHost: string = config.get('App.queue.host');
const queuePort: number = config.get('App.queue.port');
const queueConf: Options.Connect = {
    hostname: queueHost,
    port: queuePort,
};

const fileService: FileServiceInterface = new FileService(uploadedPath, logger);
const kvsService: KvsServiceInterface = new KvsService(redisHost, redisIndexKey, logger);
const queueService: QueueServiceInterface = new QueueService(queueConf, queueName, logger);
const imageController: BaseControllerInterface = new ImageController(
    fileService, kvsService, queueService, logger
);

// List of all controllers
export const controllers: BaseControllerInterface[] = [
    imageController
];