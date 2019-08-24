# Overview
This is a REST API based on Express and Typescript.

# Routes
There are two routes available
## POST /image
Post an image file to get its thumbnail

## GET /image/{imageId}/thumbnail
Get thumbnail given an imageId

# How to install
1. clone repository
2. run `yarn install`

# Available commands
- Run system: `docker-compose up`
- Run API only: `docker-compose up api`
- Run worker only: `docker-compose up worker`
- start application (local-dev): `yarn run dev`
- run test: `yarn test`

# Available paths
- The application runs on `http://localhost:3000/`
- Swagger documentation for the API can be found on `http://localhost:3000/docs/`
