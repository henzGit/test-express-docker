import * as mockFs from "mock-fs";
const IORedisMock = require("ioredis-mock");

export const imageData = Buffer.from([8, 6, 7, 5, 3, 0, 9]);

export function createMockFs(): void {
  mockFs({
    '/img/thumbnail/test.png': imageData,
    'test.png': imageData,
    'testDir': {}
  });
}
export const redisClientMock = new IORedisMock({
  // `options.data` does not exist in `ioredis`, only `ioredis-mock`
  data: {
  },
});
