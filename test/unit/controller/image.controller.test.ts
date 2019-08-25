import * as fs from "fs";
import * as mockFs from "mock-fs";
import * as supertest from "supertest";
import * as sinon from "sinon";

import TestServer from "../../testServer";
import ImageController from "../../../src/controller/image.controller";
import BaseControllerInterface from "../../../src/lib/interface/base.controller.interface";
import FileServiceInterface from "../../../src/lib/interface/file.service.interface";
import KvsServiceInterface from "../../../src/lib/interface/kvs.service.interface";
import QueueServiceInterface from "../../../src/lib/interface/queue.service.interface";
import FileService from "../../../src/service/file.service";
import KvsService from "../../../src/service/kvs.service";
import QueueService from "../../../src/service/queue.service";
import ChannelMock from "../../mock/channel.mock";

import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST, NOT_FOUND } from "http-status-codes";
import {
  ERR_CODE_MINUS_ONE,
  ERR_FILE_UPLOAD,
  ERR_MSG_NO_FILE,
  ERR_SAVE_IMAGE_INFO_KVS,
  SYS_ERR_FILE_UPLOAD,
  SUCCESS_IMG_PROCESSING,
  ERR_PUT_JOB_QUEUE,
  ERR_PARAM_INVALID_VALUE,
  ERR_GET_IMAGE_INFO_KVS,
  ERR_NOT_EXIST_IMAGE_ID,
  INFO_ERROR_DURING_PROCESSING,
  INFO_PROCESSING,
  INFO_READY_FOR_PROCESSING,
  SUCCESS_GET_IMG_THUMBNAIL,
} from "../../../src/lib/constant/constants";
import {
  SRC_IMG, TEST_DIR, DST_IMG, REDIS_INDEX_KEY, TEST_QUEUE, EMPTY_STR, THUMBNAIL_PATH, THROW_ERR_STR
} from "../../testConstants";
import { JOB_STATUS } from "../../../src/lib/constant/jobStatus.enum";

import { Server } from "http";
import { FileArray } from "express-fileupload";
import { Redis } from "ioredis";
import { Logger } from "log4js";
import { SuperTest, Test } from "supertest";
import { Options } from "amqplib";

import { stubObject } from "ts-sinon";
import { configureAndGetLogger } from "../../testLogging";
import { createMockFs, redisClientMock } from "../../testUtils";

describe('ImageController', () => {
    let listenedServer: Server;
    let agent: SuperTest<Test>;
    let logger: Logger;
    let testServer: TestServer;
    let fileServiceStub: FileServiceInterface;
    let kvsServiceStub: KvsServiceInterface;
    let queueServiceStub: QueueServiceInterface;
    let channelMock: ChannelMock;
    let queueConf: Options.Connect;
    let imageId: number;
    let imageController: ImageController;
    let imageInfo: string[];

    beforeAll(async () => {
      imageId = 1;
      // Mock with virtual filesystem for testing
      createMockFs();
      expect(fs.existsSync(SRC_IMG)).toBe(true);
      expect(fs.existsSync(DST_IMG)).toBe(false);

      logger = configureAndGetLogger();
      fileServiceStub = getFileServiceStub(TEST_DIR, logger);
      kvsServiceStub = getKvsServiceStub(
          redisClientMock, REDIS_INDEX_KEY, logger
      );
      channelMock = new ChannelMock();
      queueConf = {
        hostname: 'host',
        port: 1234,
      };
      queueServiceStub = getQueueServiceStub(queueConf, TEST_QUEUE, logger);
      queueServiceStub.setChannel(channelMock);

      imageController = new ImageController(
          fileServiceStub, kvsServiceStub , queueServiceStub, logger
      );
      testServer = getTestServerByController(imageController);
      listenedServer = await testServer.getInstance().listen(testServer.getPort());
      agent = supertest.agent(listenedServer);
    });

    describe('POST API: "/image"', () => {
        it(`should return a JSON object with the message "${ERR_MSG_NO_FILE}"
            and a status code of "${BAD_REQUEST}" if no file is specified`,
        async () => {
                await agent.post('/image')
                    .expect(BAD_REQUEST)
                    .expect(ERR_MSG_NO_FILE)
            });
        it(`should return a JSON object with the message "${SUCCESS_IMG_PROCESSING}"
              and a status code of "${OK}" if image is successfully processed`,
        async () => {
                // Check API response
                await agent.post('/image')
                  .attach('image', SRC_IMG)
                  .expect(OK)
                  .expect({
                    imageId: imageId,
                    msg: SUCCESS_IMG_PROCESSING
                  });
            });
        it(`should return a JSON object with the message "${ERR_FILE_UPLOAD}"
                and a status code of "${INTERNAL_SERVER_ERROR}" if something occurs 
                during file upload`,
        async () => {
              await listenedServer.close();
              createMockFs();
              logger = configureAndGetLogger();
              const fileServiceNewStub = stubObject<FileServiceInterface>(
                  fileServiceStub,
                  { putImage: SYS_ERR_FILE_UPLOAD }
              );
              const newImageController: ImageController = new ImageController(
                  fileServiceNewStub, kvsServiceStub, queueServiceStub, logger
              );
              testServer = getTestServerByController(newImageController);
              listenedServer = await testServer.getInstance().listen(testServer.getPort());
              agent = supertest.agent(listenedServer);
              await agent.post('/image')
                  .attach('image', SRC_IMG)
                  .expect(INTERNAL_SERVER_ERROR)
                  .expect(ERR_FILE_UPLOAD);
          });
        it(`should return a JSON object with the message "${ERR_SAVE_IMAGE_INFO_KVS}"
              and a status code of "${INTERNAL_SERVER_ERROR}" if something occurs 
              during saving file info into kvs`,
        async () => {
              await listenedServer.close();
              createMockFs();
              logger = configureAndGetLogger();
              const kvsServiceNewStub = stubObject<KvsServiceInterface>(
                  kvsServiceStub,
                  { putImageInfo: ERR_CODE_MINUS_ONE }
              );
              const newImageController: ImageController = new ImageController(
                 fileServiceStub , kvsServiceNewStub, queueServiceStub, logger
              );
              testServer = getTestServerByController(newImageController);
              listenedServer = await testServer.getInstance().listen(testServer.getPort());
              agent = supertest.agent(listenedServer);
              await agent.post('/image')
                  .attach('image', SRC_IMG)
                  .expect(INTERNAL_SERVER_ERROR)
                  .expect(ERR_SAVE_IMAGE_INFO_KVS);
          });
        it(`should return a JSON object with the message "${ERR_PUT_JOB_QUEUE}"
                  and a status code of "${INTERNAL_SERVER_ERROR}" if something occurs 
                  during putting job into queue server`,
        async () => {
              await listenedServer.close();
              createMockFs();
              logger = configureAndGetLogger();
              const queueServiceNewStub = stubObject<QueueServiceInterface>(
                  queueServiceStub,
                  { putJob: false }
              );
              const newImageController: ImageController = new ImageController(
                  fileServiceStub , kvsServiceStub , queueServiceNewStub, logger
              );
              testServer = getTestServerByController(newImageController);
              listenedServer = await testServer.getInstance().listen(testServer.getPort());
              agent = supertest.agent(listenedServer);
              await agent.post('/image')
                  .attach('image', SRC_IMG)
                  .expect(INTERNAL_SERVER_ERROR)
                  .expect(ERR_PUT_JOB_QUEUE);
          });
    });

    describe('GET API: "/image/{imageId}/thumbnail:"', () => {
      it(`should return a JSON object with the message "${ERR_PARAM_INVALID_VALUE}"
              and a status code of "${BAD_REQUEST}" if imageId is not integer`,
          async () => {
                const wrongImageId: string = 'fdsfds';
                await agent.get(`/image/${wrongImageId}/thumbnail`)
                    .expect(BAD_REQUEST)
                    .expect(res => {
                      const errors: Array<object> = res.body.errors;
                      expect(errors).toHaveLength(1);
                      expect(errors[0]).toEqual({
                          value: wrongImageId,
                          msg: ERR_PARAM_INVALID_VALUE,
                          param: 'imageId',
                          location: 'params'
                      });
                    })
          });
      it(`should return a JSON object with the message "${ERR_GET_IMAGE_INFO_KVS}"
              and a status code of "${INTERNAL_SERVER_ERROR}" if get info from redis
              server failed`,
      async () => {
          await listenedServer.close();
          createMockFs();
          logger = configureAndGetLogger();
          const kvsServiceNewStub = stubObject<KvsServiceInterface>(
              kvsServiceStub,
              { getImageInfo: undefined }
          );
          const newImageController: ImageController = new ImageController(
              fileServiceStub , kvsServiceNewStub , queueServiceStub, logger
          );
          testServer = getTestServerByController(newImageController);
          listenedServer = await testServer.getInstance().listen(testServer.getPort());
          agent = supertest.agent(listenedServer);
          await agent.get(`/image/${imageId}/thumbnail`)
                .expect(INTERNAL_SERVER_ERROR)
                .expect(ERR_GET_IMAGE_INFO_KVS)
          });
      it(`should return a JSON object with the message "${ERR_NOT_EXIST_IMAGE_ID}"
              and a status code of "${NOT_FOUND}" if requested imageId does not exist`,
      async () => {
            await listenedServer.close();
            createMockFs();
            logger = configureAndGetLogger();
            const kvsServiceNewStub = stubObject<KvsServiceInterface>(
                kvsServiceStub,
                { getImageInfo: [null, null] }
            );
            const newImageController: ImageController = new ImageController(
                fileServiceStub , kvsServiceNewStub , queueServiceStub, logger
            );
            testServer = getTestServerByController(newImageController);
            listenedServer = await testServer.getInstance().listen(testServer.getPort());
            agent = supertest.agent(listenedServer);
            await agent.get(`/image/${imageId}/thumbnail`)
                .expect(NOT_FOUND)
                .expect(ERR_NOT_EXIST_IMAGE_ID)
        });
      it(`should return a JSON object with the message "${SUCCESS_GET_IMG_THUMBNAIL}"
              and a status code of "${OK}" if request is successful`,
      async () => {
            await listenedServer.close();
            createMockFs();
            logger = configureAndGetLogger();
            const kvsServiceNewStub = stubObject<KvsServiceInterface>(
                kvsServiceStub,
                { getImageInfo: [String(JOB_STATUS.COMPLETE), THUMBNAIL_PATH] }
            );
            const newImageController: ImageController = new ImageController(
                fileServiceStub , kvsServiceNewStub , queueServiceStub, logger
            );
            testServer = getTestServerByController(newImageController);
                listenedServer = await testServer.getInstance().listen(testServer.getPort());
                agent = supertest.agent(listenedServer);
                await agent.get(`/image/${imageId}/thumbnail`)
                    .expect(OK)
                    .expect(res => {
                      expect(res.body).toEqual({
                        msg: SUCCESS_GET_IMG_THUMBNAIL,
                        jobStatus: JOB_STATUS.COMPLETE,
                        thumbnailPath: THUMBNAIL_PATH
                      })
                    });
              });
      });

    describe('Test getThumbnailRetDtoFromImageInfo(imageInfo: string[])', () => {
      it(`should return ${INFO_READY_FOR_PROCESSING} message when
        jobStatus is ${JOB_STATUS.READY_FOR_PROCESSING}`, () => {
        imageInfo = [String(JOB_STATUS.READY_FOR_PROCESSING), EMPTY_STR];
        let retDto: object = imageController.getThumbnailRetDtoFromImageInfo(imageInfo);
        expect(retDto).toStrictEqual({
              msg: INFO_READY_FOR_PROCESSING,
              jobStatus: JOB_STATUS.READY_FOR_PROCESSING,
              thumbnailPath: EMPTY_STR
          }
        );
      });
      it(`should return ${INFO_PROCESSING} message when jobStatus is 
        ${JOB_STATUS.PROCESSING}`, () => {
        imageInfo = [String(JOB_STATUS.PROCESSING), EMPTY_STR];
        let retDto: object = imageController.getThumbnailRetDtoFromImageInfo(imageInfo);
        expect(retDto).toStrictEqual({
              msg: INFO_PROCESSING,
              jobStatus: JOB_STATUS.PROCESSING,
              thumbnailPath: EMPTY_STR
            }
        );
      });
      it(`should return ${INFO_ERROR_DURING_PROCESSING} message when 
        jobStatus is ${JOB_STATUS.ERROR_DURING_PROCESSING}`, () => {
        imageInfo = [String(JOB_STATUS.ERROR_DURING_PROCESSING), EMPTY_STR];
        let retDto: object = imageController.getThumbnailRetDtoFromImageInfo(imageInfo);
        expect(retDto).toStrictEqual({
              msg: INFO_ERROR_DURING_PROCESSING,
              jobStatus: JOB_STATUS.ERROR_DURING_PROCESSING,
              thumbnailPath: EMPTY_STR
            }
        );
      });
      it(`should return ${SUCCESS_GET_IMG_THUMBNAIL} message when 
        jobStatus is ${JOB_STATUS.COMPLETE}`, () => {
        imageInfo = [String(JOB_STATUS.COMPLETE), THUMBNAIL_PATH];
        let retDto: object = imageController.getThumbnailRetDtoFromImageInfo(imageInfo);
        expect(retDto).toStrictEqual({
              msg: SUCCESS_GET_IMG_THUMBNAIL,
              jobStatus: JOB_STATUS.COMPLETE,
              thumbnailPath: THUMBNAIL_PATH
            }
        );




      });
    });

    afterAll(async () => {
          await listenedServer.close();
          mockFs.restore();
      });
});


function getQueueServiceStub(connectConf: Options.Connect, queue: string, logger: Logger):
  sinon.SinonStubbedInstance<QueueServiceInterface> {
  const queueService: QueueServiceInterface = new QueueService(connectConf, queue, logger);
  const queueServiceMock: sinon.SinonStubbedInstance<QueueServiceInterface>
      = sinon.stub(queueService);
  queueServiceMock.putJob.callsFake(
      async (jobId: number) => {
        return true;
      });
  return queueServiceMock;
}

function getFileServiceStub(testDir: string, logger: Logger):
    sinon.SinonStubbedInstance<FileServiceInterface> {
  const fileService: FileServiceInterface = new FileService(testDir, logger);
  const fileServiceMock: sinon.SinonStubbedInstance<FileServiceInterface>
      = sinon.stub(fileService);
  fileServiceMock.putImage.callsFake(
      async (files: FileArray) => {
        //@ts-ignore
        return testDir + "/" + files.image.name;
      });
  return fileServiceMock;
}

function getKvsServiceStub(redisClient: Redis, redisIndexKey: string, logger: Logger):
    sinon.SinonStubbedInstance<KvsServiceInterface> {
  const kvsService: KvsServiceInterface = new KvsService("test", redisIndexKey, logger);
  const kvsServiceMock: sinon.SinonStubbedInstance<KvsServiceInterface>
      = sinon.stub(kvsService);
  kvsServiceMock.putImageInfo.callsFake(
      async (filePath: string) => {
        return 1;
      });
  return kvsServiceMock;
}

function getTestServerByController(controller: BaseControllerInterface): TestServer {
  let testServer: TestServer = new TestServer();
  testServer.addController(controller);
  testServer.setMiddleWares();
  return testServer;
}