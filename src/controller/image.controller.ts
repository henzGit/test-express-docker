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
  ERR_PUT_JOB_QUEUE
}
  from "../lib/constant/constants";
import KvsServiceInterface from "../lib/interface/kvs.service.interface";
import FileServiceInterface from "../lib/interface/file.service.interface";
import QueueServiceInterface from "../lib/interface/queue.service.interface";
import { Logger } from "log4js";

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
    this.logger.info("----------------- postImage API --------------");

    // Put image file into file storage system
    this.logger.info("--------------- put image into file storage system ------------");
    // @ts-ignore file is already validated to exist
    const filePath: string = await this.fileService.putImage(req.files);
    if (filePath === SYS_ERR_FILE_UPLOAD) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_FILE_UPLOAD);
      return res;
    }

    // Put image info into kvs server
    this.logger.info("------------- put image info into kvs server ----------------");
    const imageId: number = await this.kvsService.putImageInfo(filePath);
    if (imageId === ERR_CODE_MINUS_ONE) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_SAVE_IMAGE_INFO_KVS);
      return res;
    }

    // Send job to queue
    this.logger.info("------------- send job to queue ----------------");
    const statusPutJob: boolean = await this.queueService.putJob(imageId);
    if (!statusPutJob) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).send(ERR_PUT_JOB_QUEUE);
      return res;
    }

    const postImgRetDto: object = {
      msg: SUCCESS_IMG_PROCESSING,
      imageId: imageId
    };

    res.json(postImgRetDto);
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
   *       '404':
   *         description: Requested imageId does not exist
   */
  public async getImageThumbnail(req: Request, res: Response) {
    this.logger.info("----------------- getImageThumbnail API --------------");

    // Input validation
    // const errors: Result<ValidationError> = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res
    //     .status(HttpCodes.UNPROCESSABLE_ENTITY)
    //     .json({ errors: errors.array()});
    // }

    res.send(SUCCESS_GET_IMG_THUMBNAIL);
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
