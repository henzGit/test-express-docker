import * as mockFs from "mock-fs";
const IORedisMock = require("ioredis-mock");

export function createMockFs(): void {
  mockFs({
    'test.png': Buffer.from([8, 6, 7, 5, 3, 0, 9]),
    'testDir': {}
  });
}
export const redisClientMock = new IORedisMock({
  // `options.data` does not exist in `ioredis`, only `ioredis-mock`
  data: {
  },
});
