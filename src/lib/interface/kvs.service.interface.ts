import * as IORedis from "ioredis";

export default interface KvsServiceInterface {
  putImageInfo(filePath: string): Promise<number>;
  getRedisClient(Class: new (host?: string, options?: IORedis.RedisOptions)
      => IORedis.Redis): IORedis.Redis;
  setRedisClient(redisClient: IORedis.Redis): void;
}