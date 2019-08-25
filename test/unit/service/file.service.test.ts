import * as fs from "fs";
import * as mockFs from "mock-fs";
import * as sinon from "sinon";
import FileServiceInterface from "../../../src/lib/interface/file.service.interface";
import FileService from "../../../src/service/file.service";
import { FileArray, UploadedFile } from "express-fileupload";
import { configureAndGetLogger }  from "../../testLogging";
import { Logger } from "log4js";
import { createMockFs } from "../../testUtils";
import { TEST_DIR, SRC_IMG, DST_IMG, THROW_ERR_STR } from "../../testConstants";
import { SYS_ERR_FILE_UPLOAD } from "../../../src/lib/constant/constants";

describe('FileService', () => {
    let fileService: FileServiceInterface;
    let testFileArray: FileArray;
    let logger: Logger;

  beforeAll(async () => {
      testFileArray = getTestFileArray(SRC_IMG, true);
      createMockFs();
      expect(fs.existsSync(SRC_IMG)).toBe(true);
      expect(fs.existsSync(DST_IMG)).toBe(false);
      logger = configureAndGetLogger();
      fileService = getFileServiceMock(TEST_DIR, logger);
    });

    describe('test putImage(files: FileArray) function', () => {
      it(`should return true if successful and a file exists in test directory`,
          async () => {
            expect(fs.existsSync(SRC_IMG)).toBe(true);
            expect(fs.existsSync(DST_IMG)).toBe(false);
            expect(await fileService.putImage(testFileArray)).toBe(DST_IMG);
            expect(fs.existsSync(SRC_IMG)).toBe(false);
            expect(fs.existsSync(DST_IMG)).toBe(true);
      });
      it(`should return false if unsuccessful and test directory is empty`,
        async () => {
          createMockFs();
          testFileArray = getTestFileArray(SRC_IMG, false);
          expect(fs.existsSync(SRC_IMG)).toBe(true);
          expect(fs.existsSync(DST_IMG)).toBe(false);
          expect(await fileService.putImage(testFileArray)).toBe(SYS_ERR_FILE_UPLOAD);
          expect(fs.existsSync(SRC_IMG)).toBe(true);
          expect(fs.existsSync(DST_IMG)).toBe(false);
        });
    });

    //TODO Test getFilePath function
    describe.skip('getFilePath(filename: string) function', () => {
      it(`should return filepath containing both testDir and srcImage`,
          async () => {
      });
    });

    //TODO Test checkFileExist function
    describe('checkFileExist(filePath: string) function', () => {
      it(`should return true if file exists`,
          async () => {
            createMockFs();
            logger = configureAndGetLogger();
            fileService = getFileServiceMock(TEST_DIR, logger);
            expect(fs.existsSync(SRC_IMG)).toBe(true);
            expect(await fileService.checkFileExist(SRC_IMG))
                .toBe(true);
          });
    });

    afterAll(async () => {
      mockFs.restore();
    });
});

function getTestFileArray(filename: string, successful: boolean): FileArray {
  let moveFunc: Function  = async (path: string): Promise<void> => {
        fs.renameSync(filename, path);
  };
  if(!successful) {
    moveFunc  = (path: string): Promise<void> => {throw THROW_ERR_STR};
  }
  const testUploadedFile: UploadedFile = {
    name: filename,
    data: Buffer.from([8, 6, 7, 5, 3, 0, 9]),
    size: 67663,
    encoding: '7bit',
    tempFilePath: '',
    truncated: false,
    mimetype: 'image/png',
    md5: 'e9f3bde785b4ab81e015ff7b0d1588d4',
    // @ts-ignore
    mv: moveFunc,
  };
  const testFileArray: FileArray = {
    image: testUploadedFile
  };
  return testFileArray;
}

function getFileServiceMock(testDir: string, logger: Logger): FileServiceInterface {
  const fileService: FileServiceInterface = new FileService(testDir, logger);
  const getFilePathStub : sinon.SinonStub = sinon.stub(fileService, "getFilePath")
      .callsFake((filename: string) => testDir + "/" + filename);
  fileService.getFilePath = getFilePathStub;
  return fileService;
}