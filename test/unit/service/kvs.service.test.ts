import KvsServiceInterface from "../../../src/lib/interface/kvs.service.interface";
import KvsService from "../../../src/service/kvs.service";
import { DST_IMG, REDIS_INDEX_KEY, EMPTY_STR } from "../../testConstants"
import { ERR_CODE_MINUS_ONE, KVS_KEY_FILE_PATH,
  KVS_KEY_JOB_STATUS, KVS_KEY_THUMBNAIL_PATH }
  from "../../../src/lib/constant/constants";
import { JOB_STATUS } from "../../../src/lib/constant/jobStatus.enum";
import { Logger } from "log4js";
import { configureAndGetLogger }  from "../../testLogging";
import { redisClientMock } from "../../testUtils";
const IORedisMock = require("ioredis-mock");

describe('KvsService', () => {
    let kvsService: KvsServiceInterface;
    let logger: Logger;
    let imageId: number;
    let redisHost: string;

    beforeAll(async () => {
      redisHost = "test";
      logger = configureAndGetLogger();
      kvsService = new KvsService(redisHost, REDIS_INDEX_KEY, logger);
      kvsService.setRedisClient(redisClientMock);
    });

    describe('test putImageInfo(filePath: string) function', () => {
      it(`should return imageId if successful and data exists in redis`,
      async () => {
          // check return value of kvsService.putImageInfo
          imageId = await kvsService.putImageInfo(DST_IMG);
          expect(imageId).toBe(1);
          // check if redisIndexKey is updated correctly
          const redisIndexKeyValue: string = await redisClientMock.get(REDIS_INDEX_KEY);
          expect(redisIndexKeyValue).toBe(String(imageId));
          // check data existence given by imageId
          const imageInfo: object = await redisClientMock.hmget(
              String(imageId),
              KVS_KEY_FILE_PATH,
              KVS_KEY_JOB_STATUS,
              KVS_KEY_THUMBNAIL_PATH
          );
          expect(imageInfo).toStrictEqual(
              [DST_IMG, String(JOB_STATUS.READY_FOR_PROCESSING), EMPTY_STR]
          );
      });
      it(`should return -1 if not successful and data DOES NOT exist in redis`,
      async () => {
          redisClientMock.incr = () => { throw "test" };
          const newKvsService: KvsServiceInterface =
              new KvsService(redisHost, REDIS_INDEX_KEY, logger);
          newKvsService.setRedisClient(redisClientMock);
          const currRedisIndexKeyVal: string = await redisClientMock.get(REDIS_INDEX_KEY);
          // check return value of kvsService.putImageInfo
          imageId = await newKvsService.putImageInfo(DST_IMG);
          expect(imageId).toBe(ERR_CODE_MINUS_ONE);
          // check if redisIndexKey is not updated
          const nextRedisIndexKeyVal: string = await redisClientMock.get(REDIS_INDEX_KEY);
          expect(nextRedisIndexKeyVal).toBe(currRedisIndexKeyVal);
          // check data given by imageId does not exist in redis
          const imageInfo: object = await redisClientMock.hmget(
              String(imageId),
              KVS_KEY_FILE_PATH,
              KVS_KEY_JOB_STATUS
          );
          expect(imageInfo).toStrictEqual([null, null]);
      });
    });

    describe('test getRedisClient() function', () => {
      it(`should return current redis client if exists`,
        async () => {
          expect(kvsService.getRedisClient(IORedisMock)).toBe(redisClientMock);
      });
      // Skip due to limitation of mocking library (RedisClientMock)
      it(`should return new redis client instance if no client exists`,
        async () => {
          const newKvsService: KvsServiceInterface =
              new KvsService(redisHost, REDIS_INDEX_KEY, logger);
          expect(newKvsService.getRedisClient(IORedisMock)).not.toEqual(redisClientMock);
          expect(newKvsService.getRedisClient(IORedisMock)).toBeInstanceOf(IORedisMock);
        });
    });

    afterAll(async () => {
    });
});