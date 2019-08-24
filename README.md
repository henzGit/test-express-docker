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
NodeJS with TypeScript
## Worker
### Language
Python3.7

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

# Notes
* Python is chosen for the worker language due to its simplicity and available binding with Image Magick 
* Many optimizations are omitted due to time constraint