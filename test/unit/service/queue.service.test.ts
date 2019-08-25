import QueueServiceInterface from "../../../src/lib/interface/queue.service.interface";
import QueueService from "../../../src/service/queue.service";
import ChannelMock from "./../../mock/channel.mock";
import { amqpConnectMockSuccess, amqpConnectMockFailed, ConnectionMock }
  from "../../mock/channel.mock";
import { Logger } from "log4js";
import { Channel, Connection, Options} from "amqplib";
import { TEST_QUEUE, THROW_ERR_STR } from "../../testConstants";
import { configureAndGetLogger }  from "../../testLogging";
// @ts-ignore
import * as Promise from "bluebird";

describe('QueueService', () => {
    let queueService: QueueServiceInterface;
    let logger: Logger;
    let channelMock: Channel;
    let connMock: Connection;
    let testJobId: number = 1;
    let queueConf: Options.Connect;

    beforeAll(async () => {
      logger = configureAndGetLogger();
      channelMock = new ChannelMock();
      connMock = new ConnectionMock();
      queueConf = {
        hostname: "host",
        port: 1234,
      };
      queueService = new QueueService(queueConf, TEST_QUEUE, logger);
      queueService.setChannel(channelMock);
    });

    describe('test putJob(jobId: number) function', () => {
      it(`should return true if sending to queue is successful`,
    async () => {
          expect(await queueService.putJob(testJobId)).toBe(true);
      });
      it(`should return false if no channel is available in the queue`,
    async () => {
          const newQueueService: QueueServiceInterface =
              new QueueService(queueConf, TEST_QUEUE, logger);
          newQueueService.getChannel = async () => { return undefined };
          expect(await newQueueService.putJob(testJobId)).toBe(false);
        });
      it(`should return false if sending to queue is not successful`,
    async () => {
          const newChannelMock: ChannelMock = new ChannelMock();
          newChannelMock.sendToQueue = (queue: string, content: Buffer,
                                     options?: Options.Publish):
                                    boolean => {return false};
          const newQueueService: QueueServiceInterface =
              new QueueService(queueConf, TEST_QUEUE, logger);
          newQueueService.setChannel(newChannelMock);
          expect(await newQueueService.putJob(testJobId)).toBe(false);
      });
      it(`should return false if a problem occurs with queue server`,
      async () => {
          const newChannelMock: ChannelMock = new ChannelMock();
          newChannelMock.assertQueue = () => { throw THROW_ERR_STR };
          const newQueueService: QueueServiceInterface =
            new QueueService(queueConf, TEST_QUEUE, logger);
          newQueueService.setChannel(newChannelMock);
          expect(await newQueueService.putJob(testJobId)).toBe(false);
        });
      });

    describe('test setChannel(channel: Channel) function', () => {
      it(`should set channel property`,
          async () => {
            const newChannelMock: ChannelMock = new ChannelMock();
            newChannelMock.assertQueue = () => { throw THROW_ERR_STR };
            const newQueueService: QueueServiceInterface =
                new QueueService(queueConf, TEST_QUEUE, logger);
            newQueueService.setChannel(newChannelMock);
            expect(await newQueueService.getChannel()).toBe(newChannelMock);
      });
    });

    describe('test getChannel() function', () => {
      it(`should retrieve channel if it exists`,
      async () => {
            expect(await queueService.getChannel()).toBe(channelMock);
      });
      it(`should create channel if it does not exist`,
          async () => {
            const newQueueService: QueueServiceInterface =
                new QueueService(queueConf, TEST_QUEUE, logger);
            newQueueService.createChannel = async () => {return channelMock};
            expect(await newQueueService.getChannel()).toBe(channelMock);
      });
      it(`should return undefined if it does not exist and channel creation fails`,
          async () => {
            const newQueueService: QueueServiceInterface =
                new QueueService(queueConf, TEST_QUEUE, logger);
            newQueueService.createChannel = async () => {return undefined};
            expect(await newQueueService.getChannel()).toBeUndefined();
          });

    });

    describe('test createChannel(callback) function', () => {
      it(`should retrieve channel if it exists`,
          async () => {
            const newChannelMock: Channel = await connMock.createChannel();
            expect(await queueService.createChannel(amqpConnectMockSuccess))
                .toStrictEqual(newChannelMock);
          });
      it(`should return undefined when an error occurs during channel creation`,
          async () => {
            expect(await queueService.createChannel(amqpConnectMockFailed)).toBeUndefined();
          });
    });

    afterAll(async () => {
    });
});