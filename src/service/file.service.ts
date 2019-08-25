import FileServiceInterface from "../lib/interface/file.service.interface";
import { FileArray, UploadedFile } from "express-fileupload";
import { Logger } from "log4js";
import { SYS_ERR_FILE_UPLOAD } from "../lib/constant/constants";
import * as fs from "fs";
import * as util from "util";


/**
 * FileService is a service class that deals with file system
 */
export default class FileService implements FileServiceInterface {
    constructor (
        // Path to store file
        private readonly uploadedPath: string,
        private readonly logger: Logger
    ) {
        this.uploadedPath = uploadedPath;
        this.logger = logger;
    }

    /**
     * Put image to dirPath specified in the constructor
     * @param files - The file(s) to be moved to dirPath
     * @returns true if move is successful else false
     */
    public async putImage(files: FileArray) : Promise<string> {
        const image: UploadedFile | UploadedFile[] = files.image;
        let filePath: string;

        if (!(image instanceof Array)) {
            filePath = this.getFilePath(image.name);

            this.logger.info(`trying to move file to: ${filePath}`);
            try {
                // Use the mv() method to place the file to dirPath
                await image.mv(filePath);
            } catch (err) {
                // TODO handle error
                this.logger.error(err);
                return SYS_ERR_FILE_UPLOAD;
            }
        }

        // TODO case of multiple files
        // @ts-ignore
        return filePath;
    }

    /**
     * Get file path to which the file should be moved
     * @param filename - The file name of the file to be moved
     * @returns The destination file path
     */
    public getFilePath(filename: string) : string {
        const currTime: number = new Date().getTime();
        return this.uploadedPath + currTime + '_' + filename;
    }

    /**
     * Check if file exists or not
     * @param filePath to be checked
     * @returns true if file exists, else false
     */
    public async checkFileExist(filePath: string): Promise<boolean> {
        const fsExistAsync = util.promisify(fs.exists);
        return await fsExistAsync(filePath);
    }
}