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
### Main dependencies
List of dependencis for app can be found in the file ```package.json``` in the main directory
```
"amqplib": "^0.5.5",
"bluebird": "^3.5.5",
"body-parser": "^1.18.2",
"config": "^3.2.2",
"express": "^4.16.3",
"express-fileupload": "^1.1.5",
"express-validator": "^6.1.1",
"http-status-codes": "^1.3.2",
"ioredis": "^4.14.0",
"js-yaml": "^3.13.1",
"log4js": "^5.0.0",
"swagger-jsdoc": "^3.4.0",
"swagger-ui-express": "^4.0.7"
```

## Worker
### Language
```Python3.7```
### Main dependencies
List of dependencis for worker can be found in the file ```requirements.txt``` in ```worker``` folder
```
pika==1.1.0
redis==3.3.7
pyyaml==5.1.2
Wand==0.5.6
```
## Code Structure
```
config: directory for config YAML files
dockerfiles: directory for all docker files
img: 
    thumbnail: directory to store thumbnail image files
    uploaded: directory to store original uploaded files
scripts: directory to store all necessary scripts for booting up application
src (Node): 
    controller: directory containing source code for main controllers
    lib:
        constant: directory containing all constants used in the appliacation
        dto: directory containing Data Transfer Object (DTO) for request and response of web server
        interface: directory containing all interfaces in the application
        validator: directory containing source code of custom validator logic
    service: directory containing source code for main services
test (Node):
    mock: directory containing custom mock files
    unit:
        controller: directory containing unit tests for controller
        service: directory containing unit tests for services
worker (Python3): directory containing source code of worker
```


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
* Only one configuration file is given ```default.yaml``` due to time constraint. Normally we need to have multiple configuration files based on each environment such as staging and production. 
* ```yarn``` is used instead of ```npm``` for installing node modules 
* Application runs on pure ```HTTP``` for development purpose. A certificate is needed to run on ```HTTPS``` (Future consideration)
* No security vulnerabilities is currently known for both worker and app. (checked using ```yarn audit``` and ```safety -r worker/requirements.txt```)