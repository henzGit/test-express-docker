import * as swaggerJSDoc from "swagger-jsdoc";
import * as swaggerUi from "swagger-ui-express";
import * as Express from "express";

const swaggerDefinition = {
  info: {
    title: "REST API for my App", // Title of the documentation
    version: "1.0.0", // Version of the app
    description: "This is the REST API of my application", // short description of the app
  },
};

// options for the swagger docs
const options = {
  // import swaggerDefinitions
  swaggerDefinition,
  explorer: true,

  // path to the API docs
  apis: ["**/*.ts"],
};

// initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default function configureSwagger(app: Express.Express) {
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

