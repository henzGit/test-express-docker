import * as Express from "express";
import * as bodyParser from "body-parser";
import * as config from "config";
import * as expressFileUpload from "express-fileupload";
import defaultRouter from "./routes";
import configureSwagger from "./swagger";
import { logger } from "./logging";

// read config values
const port: number = config.get('App.server.port');

// create express app
const app: Express.Express = Express();

// Middlewares
app.use(bodyParser.json());
app.use(expressFileUpload());
app.use('/', defaultRouter);

// Configure swagger
configureSwagger(app);

// run app
app.listen(port);

logger.info(`Express application is up and running on port ${port}`);