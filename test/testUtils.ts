import * as mockFs from "mock-fs";
const IORedisMock = require("ioredis-mock");
import { THUMBNAIL_PATH } from "./testConstants";

export function createMockFs(): void {
  mockFs({
    '/img/thumbnail/test.png': Buffer.from([8, 6, 7, 5, 3, 0, 9]),
    'test.png': Buffer.from([8, 6, 7, 5, 3, 0, 9]),
    'testDir': {}
  });
}
export const redisClientMock = new IORedisMock({
  // `options.data` does not exist in `ioredis`, only `ioredis-mock`
  data: {
  },
});
