import * as IORedis from "ioredis";
import KvsServiceInterface from "../lib/interface/kvs.service.interface";
import { Logger } from "log4js";
import { JOB_STATUS } from "../lib/constant/jobStatus.enum";
import { ERR_CODE_MINUS_ONE, KVS_KEY_FILE_PATH, KVS_KEY_JOB_STATUS,
  KVS_KEY_THUMBNAIL_PATH }
  from "../lib/constant/constants";

/**
 * KvsService is a service class that deals with key-value server such as Redis
 */
export default class KvsService implements KvsServiceInterface {
  private redisClient: IORedis.Redis;
  constructor (
      private readonly redisHost: string,
      // Key as index in redis
      private readonly redisIndexKey: string,
      private readonly logger: Logger,
  ) {
    this.redisHost = redisHost;
    this.redisIndexKey = redisIndexKey;
    this.logger = logger;
  }

  /**
   * Get current instance of redis client if exists, otherwise create a new instance
   * @returns redis instance
   */
  public getRedisClient(Class: new (host?: string, options?: IORedis.RedisOptions) => IORedis.Redis)
    : IORedis.Redis {
    if (this.redisClient) return this.redisClient;
    // Create a new instance of not exist yet
    const redisClient: IORedis.Redis = new Class(this.redisHost);
    this.redisClient = redisClient;
    return this.redisClient;
  }

  /**
   * Put information about an image file into redis
   * @param filePath filepath of the image file in storage system
   * @returns image id if successful else -1
   */
  public async putImageInfo(filePath: string): Promise<number> {
    let imageId: number;
    try {
      // TODO improvement into single transaction using multi command
      this.logger.info(`trying to increment index key in redis: ${this.redisIndexKey}`);
      imageId = await this.getRedisClient(IORedis).incr(this.redisIndexKey);
      this.logger.info(`trying to put image file info into redis: 
        imageId: ${imageId}, filePath: ${filePath}, 
        with jobStatus:  ${JOB_STATUS.READY_FOR_PROCESSING},
        and thumbnailPath: ""
      `);
      await this.getRedisClient(IORedis).hmset(
          String(imageId),
          KVS_KEY_FILE_PATH, filePath,
          KVS_KEY_JOB_STATUS, String(JOB_STATUS.READY_FOR_PROCESSING),
          KVS_KEY_THUMBNAIL_PATH, ""
      );
    } catch (err) {
      // TODO handle error
      this.logger.error(err);
      return ERR_CODE_MINUS_ONE;
    }
    return imageId;
  }

  /**
   * Set redis client
   * @param redisClient instance of redis client
   */
  setRedisClient(redisClient: IORedis.Redis): void {
    this.redisClient = redisClient;
  }
}