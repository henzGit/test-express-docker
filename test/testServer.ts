import * as Express from "express";
import * as config from "config";
import BaseControllerInterface from "../src/lib/interface/base.controller.interface";
import * as bodyParser from "body-parser";
import * as expressFileUpload from "express-fileupload";

export default class TestServer {
    app: Express.Express;
    testPort: number;
    router: Express.Router;

    constructor() {
      this.app = Express();
      this.router = Express.Router();
      this.testPort = parseInt(config.get('App.server.port')) + 1;
    }

    public addController(controller: BaseControllerInterface): void {
        controller.setup(this.router);
    }

    public setMiddleWares(): void {
      this.app.use(bodyParser.json());
      this.app.use(expressFileUpload());
      this.app.use('/', this.router);
    }

    public getInstance(): Express.Express {
        return this.app;
    }

    public getPort(): number {
      return this.testPort;
    }

}

