import FileServiceInterface from "../lib/interface/file.service.interface";
import { FileArray, UploadedFile } from "express-fileupload";
import { Logger } from "log4js";
import { SYS_ERR_FILE_UPLOAD } from "../lib/constant/constants";

/**
 * FileService is a service class that deals with file system
 */
export default class FileService implements FileServiceInterface {
    constructor (
        // Path to store file
        private readonly dirPath: string,
        private readonly logger: Logger
    ) {
        this.dirPath = dirPath;
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
        return this.dirPath + currTime + '_' + filename;
    }
}