import { FileArray } from "express-fileupload";

export default interface FileServiceInterface {
    putImage(files: FileArray): Promise<string>;
    getFilePath(filename: string): string;
    checkFileExist(filePath: string): Promise<boolean>;
}