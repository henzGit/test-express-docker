import * as Express from "express";
import BaseControllerInterface from "./lib/interface/base.controller.interface";
import { Router } from "express";
import { controllers } from "./controllerList";

export function installControllers(router: Router, controllers: BaseControllerInterface[]): void {
  controllers.forEach(controller => controller.setup(router));
}

const router: Router = Express.Router();

// setup all controllers
installControllers(router, controllers);

export default router;