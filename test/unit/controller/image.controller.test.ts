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

import { OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from "http-status-codes";
import {
  ERR_CODE_MINUS_ONE,
  ERR_FILE_UPLOAD,
  ERR_MSG_NO_FILE,
  ERR_SAVE_IMAGE_INFO_KVS,
  SYS_ERR_FILE_UPLOAD,
  SUCCESS_IMG_PROCESSING,
  ERR_PUT_JOB_QUEUE,
  ERR_PARAM_INVALID_VALUE
} from "../../../src/lib/constant/constants";
import { SRC_IMG, TEST_DIR, DST_IMG, REDIS_INDEX_KEY, TEST_QUEUE }
  from "../../testConstants";

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

    beforeAll(async () => {
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

      const imageController: BaseControllerInterface = new ImageController(
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
                    imageId: 1,
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
              const imageController: ImageController = new ImageController(
                  fileServiceNewStub, kvsServiceStub, queueServiceStub, logger
              );
              testServer = getTestServerByController(imageController);
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
              const imageController: ImageController = new ImageController(
                 fileServiceStub , kvsServiceNewStub, queueServiceStub, logger
              );
              testServer = getTestServerByController(imageController);
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
              const imageController: ImageController = new ImageController(
                  fileServiceStub , kvsServiceStub , queueServiceNewStub, logger
              );
              testServer = getTestServerByController(imageController);
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