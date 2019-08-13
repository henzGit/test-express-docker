import { param, } from "express-validator";
import {NextFunction, Request, Response} from "express";
import * as HttpCodes from "http-status-codes";
import { ERR_MSG_NO_FILE } from "../constant/constants";

export function postImageValidator(req: Request, res: Response, next: NextFunction):
    Response | void  {
  // check file existence
  if (!req.files) {
    return res.status(HttpCodes.BAD_REQUEST).send(ERR_MSG_NO_FILE);
  }
  // TODO check max file size
  next();
}

export const getImageValidator = [
  param('imageId').isString(),
];