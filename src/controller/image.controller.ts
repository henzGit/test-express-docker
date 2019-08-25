import * as HttpCodes from 'http-status-codes';
import BaseControllerInterface from "../lib/interface/base.controller.interface";
import { Router } from "express";
import { Request, Response } from "express";
import { postImageValidator, getImageValidator }
  from "../lib/validator/image.controller.validator"
import {
  SYS_ERR_FILE_UPLOAD,
  SUCCESS_IMG_PROCESSING,
  SUCCESS_GET_IMG_THUMBNAIL,
  ERR_CODE_MINUS_ONE,
  ERR_FILE_UPLOAD,
  ERR_SAVE_IMAGE_INFO_KVS,
  ERR_PUT_JOB_QUEUE,
  ERR_GET_IMAGE_INFO_KVS,
  INDEX_JOBSTATUS,
  INDEX_THUMBNAILPATH,
  ERR_NOT_EXIST_IMAGE_ID,
  INFO_READY_FOR_PROCESSING,
  INFO_PROCESSING,
  INFO_ERROR_DURING_PROCESSING,
  ERR_THUMBNAIL_FILE_PATH_EMPTY,
  ERR_THUMBNAIL_FILE_NOT_EXIST
} from "../lib/constant/constants";
import { validationResult, Result, ValidationError } from "express-validator";

import KvsServiceInterface from "../lib/interface/kvs.service.interface";
import FileServiceInterface from "../lib/interface/file.service.interface";
import QueueServiceInterface from "../lib/interface/queue.service.interface";
import { Logger } from "log4js";
import { JOB_STATUS } from "../lib/constant/jobStatus.enum";
import { GetImageRetDto } from "../lib/dto/get.image.ret.dto";

export default class ImageController implements BaseControllerInterface {
  constructor (
      private readonly fileService: FileServiceInterface,
      private readonly kvsService: KvsServiceInterface,
      private readonly queueService: QueueServiceInterface,
      private readonly logger: Logger
  ) {
    this.fileService = fileService;
    this.kvsService = kvsService;
    this.logger = logger;
    this.queueService = queueService;
  }

  /**
   * @swagger
   *
   * definitions:
   *   Image:
   *      type: object
   *      properties:
   *        msg:
   *          type: string
   *          description: Successful image creation message.
   *        imageId:
   *          type: integer
   *          description: The image ID.
   *   Thumbnail:
   *      type: object
   *      properties:
   *        msg:
   *          type: string
   *          description: Successful thumbnail retrieval message.
   *        jobStatus:
   *          type: integer
   *          description: The job status.
   */

  /**
   * @swagger
   * /image:
   *   post:
   *     summary: Upload a new image
   *     description: Send a new image for thumbnail processing
   *     consumes:
   *       - multipart/form-data
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: image
   *         description: image file to be processed
   *         in: formData
   *         required: true
   *         type: file
   *     responses:
   *       '200':
   *          description: Successful image creation
   *          schema:
   *            $ref: '#/definitions/Image'
   *       '400':
   *          description: No input image file
   *       '500':
   *          description: Error in image creation
   */
  public async postImage(req: Request, res: Response) {
    this.logger.info("postImage API");

    // Put image file into file storage system
    this.logger.info("put image into file storage system");
    // @ts-ignore file is already validated to exist
    const filePath: string = await this.fileService.putImage(req.files);
    if (filePath === SYS_ERR_FILE_UPLOAD) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_FILE_UPLOAD);
      return res;
    }

    // Put image info into KVS server
    this.logger.info("put image info into kvs server");
    const imageId: number = await this.kvsService.putImageInfo(filePath);
    if (imageId === ERR_CODE_MINUS_ONE) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_SAVE_IMAGE_INFO_KVS);
      return res;
    }

    // Send job to queue
    this.logger.info("send job to queue");
    const statusPutJob: boolean = await this.queueService.putJob(imageId);
    if (!statusPutJob) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_PUT_JOB_QUEUE);
      return res;
    }

    res.json({
      msg: SUCCESS_IMG_PROCESSING,
      imageId: imageId
    });
  }

  /**
   * @swagger
   * /image/{imageId}/thumbnail:
   *   get:
   *     summary: Get thumbnail image
   *     description: Get thumbnail image of specified imageId
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: imageId
   *         description: imageId of which the thumbnail belongs
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       '200':
   *         description: Request successful
   *         schema:
   *          $ref: '#/definitions/Thumbnail'
   *       '400':
   *          description: Invalid imageId param
   *       '404':
   *         description: Requested imageId does not exist
   *       '500':
   *          description: Error in getting image thumbnail
   */
  public async getImageThumbnail(req: Request, res: Response) {
    this.logger.info("getImageThumbnail API");

    this.logger.info("validate input parameters");
    const errors: Result<ValidationError> = validationResult(req);
    // Input validation
    if (!errors.isEmpty()) {
      return res.status(HttpCodes.BAD_REQUEST)
          .json({errors: errors.array()});
    }

    const imageId: number = parseInt(req.params.imageId);
    // Get image info from KVS Server
    this.logger.info("get image info from KVS server");
    const imageInfo: string[]|undefined = await this.kvsService.getImageInfo(imageId);
    // Case of KVS Server returns nothing
    if (!imageInfo) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_GET_IMAGE_INFO_KVS);
      return res;
    }
    // Case for non existing imageId
    if (!imageInfo[INDEX_JOBSTATUS]) {
      res.status(HttpCodes.NOT_FOUND).send(ERR_NOT_EXIST_IMAGE_ID);
      return res;
    }
    // Get return DTO
    this.logger.info("get thumbnail return dto from image info");
    let getThumbnailRetDto: GetImageRetDto = this.getThumbnailRetDtoFromImageInfo(imageInfo);
    let jobStatus: number = getThumbnailRetDto.jobStatus;
    let thumbnailPath: string = getThumbnailRetDto.thumbnailPath;

    if (jobStatus === JOB_STATUS.COMPLETE && !thumbnailPath) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_THUMBNAIL_FILE_PATH_EMPTY);
      return res;
    }
    if (jobStatus === JOB_STATUS.COMPLETE && thumbnailPath) {
      // TODO Check file exists in file storage
      let thumbnailExistFlg: boolean = await this.fileService.checkFileExist(thumbnailPath);
      if (!thumbnailExistFlg) {
        res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_THUMBNAIL_FILE_NOT_EXIST);
        return res;
      }
      // Fetch image from file storage and return it to API caller
      this.logger.info("fetching image and return it to API caller");
      return res.sendFile(thumbnailPath);
    }
    res.send(getThumbnailRetDto);
  }

  /**
   * Get return DTO given image info
   * @param imageInfo image info from Redis KVS
   * @returns DTO response object for Get thumbnail image route
   */
  public getThumbnailRetDtoFromImageInfo(imageInfo: string[]): GetImageRetDto {
    let jobStatus: number = parseInt(imageInfo[INDEX_JOBSTATUS]);
    let thumbnailPath: string = imageInfo[INDEX_THUMBNAILPATH];
    let msg: string = "";

    switch (jobStatus) {
      case JOB_STATUS.READY_FOR_PROCESSING:
        msg = INFO_READY_FOR_PROCESSING;
        break;
      case JOB_STATUS.PROCESSING:
        msg = INFO_PROCESSING;
        break;
      case JOB_STATUS.ERROR_DURING_PROCESSING:
        msg = INFO_ERROR_DURING_PROCESSING;
        break;
      case JOB_STATUS.COMPLETE:
        msg = SUCCESS_GET_IMG_THUMBNAIL;
        break;
    }
    return {
      msg: msg,
      jobStatus: jobStatus,
      thumbnailPath: thumbnailPath
    };
  }

  /**
   * Setup each route to corresponding controller function
   * @param router : main router object to which routes are attached
   */
  public setup(router: Router): void {
    router.post(
      '/image',
      postImageValidator,
      (req: Request, res: Response) => this.postImage(req, res)
    );
    router.get(
      '/image/:imageId/thumbnail',
      getImageValidator,
      (req: Request, res: Response) => this.getImageThumbnail(req, res)
    );
  }
}
