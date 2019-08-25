# Overview
This is a REST API based on Express and Typescript.

# Routes
There are two available routes: 
## POST /image
Post an image file to get its thumbnail
## GET /image/{imageId}/thumbnail
Get thumbnail given an imageId

# Design Consideration
## Architecture
### Queuing System
Simple Queue using RabbitMQ
### Data Storage
Simple KVS using Redis
### File Storage
Local FileSystem 
## API
### Language
```NodeJS 10.6.2``` (LTS) with ```TypeScript 3.5.3```
## Worker
### Language
```Python3.7```

# Available commands
- Run system: `docker-compose up`
- Run API only: `docker-compose up api`
- Run worker only: `docker-compose up worker`
- run test (API): `yarn test`
- run test (worker-main): `python3.7 worker/test_worker.py`
- run test (worker-helper): `python3.7 worker/test_helper.py`

# Available paths
- The application runs on `http://localhost:3000/`
- Swagger documentation for the API can be found on `http://localhost:3000/docs/`

# Tested Version
* Docker version: ```Docker version 19.03.1, build 74b1e89e8a```
* Docker-compose version: ```docker-compose version 1.20.0, build ca8d3c6```

# Notes
* All configuration values (for both API and worker) are located in `default.yaml`
* Python is chosen for the worker language due to its simplicity and available binding with ```Image Magick``` via ```Wand``` library 
* As much as possible implementation is lazy for both Queue Server connection (RabbitMQ) and KVS Server (Redis)
* Many optimizations like retry mechanism, etc are omitted due to time constraint
* API security is not implemented due to time constraint. Normally each end point should be protected by ```JWT``` Access Token
* Unit tests are implemented and nearly cover 100% of code (except for some parts)
* Performance tests and benchmarking are not done due to time constraint