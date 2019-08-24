import os
from pika import BlockingConnection, ConnectionParameters, BasicProperties
from logging import Logger
from redis import Redis
from typing import Union, List, Tuple
from constants import FILE_PATH_REDIS_KEY, JOB_STATUS_REDIS_KEY, \
    THUMBNAIL_PATH_REDIS_KEY, ERROR_SAME_JOB_STATUS, THUMBNAIL_MAX_PIXEL
from job_status_enum import JobStatusEnum
from wand.image import Image


class Worker:
    def __init__(self, config: dict, logger: Logger):
        self.config = config
        self.logger = logger
        self.redisClient: Union[Redis, None] = None
        self.queueConn: Union[BlockingConnection, None] = None
        self.encoding = "utf-8"

    def getRedisClient(self) -> Redis:
        """
        Get redis client if exists else create a new client
        :return: current or new Redis client instance
        """
        if self.redisClient is not None:
            self.logger.info("------------------------ getting existing redis client --------------------")
            return self.redisClient
        try:
            self.logger.info("------------------------ creating new redis client -----------------------")
            self.redisClient: Redis = Redis(host=self.config["kvs"]["host"], port=self.config["kvs"]["port"])
        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return self.redisClient

    def getQueueConnection(self) -> BlockingConnection:
        """
        Get queue connection if exists else create a new connection
        :return: current or new RabbitMQ connection
        """
        if self.queueConn is not None:
            self.logger.info("---------------- getting existing RabbitMQ connection -------------------")
            return self.queueConn
        parameters = ConnectionParameters(host=self.config["queue"]["host"],
                                          port=self.config["queue"]["port"])
        try:
            self.logger.info("---------------- creating new RabbitMQ connection -----------------------")
            self.queueConn: BlockingConnection = BlockingConnection(parameters)
        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return self.queueConn

    def getJobInfoFromRedis(self, jobId: str) -> Tuple[int, str]:
        """
        Get job information from Redis
        :param jobId: id of the job
        :return: job info of the job containing jobstatus and filepath
        """
        try:
            self.logger.info("--------------------- getting data from redis -----------------------")
            currentJobStatus, filePath, thumbnailPath = self.getRedisClient().hmget(
                jobId, [JOB_STATUS_REDIS_KEY, FILE_PATH_REDIS_KEY, THUMBNAIL_PATH_REDIS_KEY]
            )
            currentJobStatus: int = int(currentJobStatus.decode(self.encoding))
            filePath: str = filePath.decode(self.encoding)
            thumbnailPath: str = thumbnailPath.decode(self.encoding)

            self.logger.info("-------------------- data from redis: [%s,%s, %s] ----------"
                             % (currentJobStatus, filePath, thumbnailPath))
        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return currentJobStatus, filePath

    def updateJobStatus(self, jobId: str, currentJobStatus: JobStatusEnum, nextJobStatus: JobStatusEnum) \
            -> JobStatusEnum:
        """
        Update job status into Redis
        :param jobId: current job id
        :param currentJobStatus: current job status
        :param nextJobStatus: next job status
        :return: nextJobStatus if successful
        """
        if currentJobStatus == nextJobStatus:
            self.logger.critical(ERROR_SAME_JOB_STATUS)
            exit(1)
        try:
            self.logger.info("--------------------- updating job status into redis -----------------------")
            self.getRedisClient().hset(jobId, JOB_STATUS_REDIS_KEY, nextJobStatus.value)
            self.logger.info("-------- successfully updated job status from: %s to: %s ----------"
                             % (currentJobStatus, nextJobStatus))
        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return nextJobStatus

    def findThumbnailSize(self, width: int, height: int) -> Tuple[int, int]:
        """
        Function to find optimal thumbnail size (default: max width=100px and max height=100px)
        :param width: width in pixel
        :param height: height in pixel
        :return: tuple containing optimal value for width and height
        """
        self.logger.info("------ finding thumbnail size for width: %s and height: %s" % (width, height))
        tobeWidth: int = width
        tobeHeight: int = height
        while tobeWidth > THUMBNAIL_MAX_PIXEL or tobeHeight > THUMBNAIL_MAX_PIXEL:
            tobeWidth /= 2
            tobeHeight /= 2
        return int(tobeWidth), int(tobeHeight)

    def makeThumbnail(self, filePath: str) -> str:
        """
        Make thumbnail from image in filepath using ImageMagick Library binding for Python (Wand)
        :param filePath: input image file path
        :return: path of the resized image
        """
        try:
            self.logger.info("------ opening input image file in %s using Image Magick" % filePath)
            with Image(filename=filePath) as img:
                originalWidth: int = img.width
                originalHeight: int = img.height
                self.logger.info("image has originalWidth: %s px and originalHeight: %s px"
                                 % (originalWidth, originalHeight))
                tobeWidth, tobeHeight = self.findThumbnailSize(originalWidth, originalHeight)


        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return ""

    def executeProcess(self, channel, method_frame, header_frame: BasicProperties, body: bytes):
        """
        Callback when receiving a message
        This is the main logic of the worker
        :param channel: channel from which the message comes
        :param method_frame: method frame of the message
        :param header_frame: header frame of the message
        :param body: body of the message
        """
        jobId: str = body.decode(self.encoding)
        self.logger.info("------------------------- receiving job: %s -----------------------" % jobId)

        # Get data from redis
        currentJobStatus, filePath = self.getJobInfoFromRedis(jobId)

        # Update job status in redis to JobStatusEnum.PROCESSING
        currentJobStatus = self.updateJobStatus(jobId, JobStatusEnum(currentJobStatus), JobStatusEnum.PROCESSING)

        # Use ImageMagick to make thumbnail
        thumbnailPath: str = self.makeThumbnail(filePath)

        # Update Job status in redis to JobStatusEnum.COMPLETE
        currentJobStatus = self.updateJobStatus(jobId, currentJobStatus, JobStatusEnum.COMPLETE)

        # acknowledge message if treatment is finished
        if currentJobStatus == JobStatusEnum.COMPLETE:
            self.logger.info("-------------------------  job %s is finished -----------------------" % jobId)
            channel.basic_ack(delivery_tag=method_frame.delivery_tag)

    def processJob(self):
        """
        Process job from the queue server
        """
        self.logger.info("------------- processJob by pid: %s-------------" % os.getpid())
        try:
            channel = self.getQueueConnection().channel()
            queueName: str = self.config["queue"]["queueName"]
            channel.queue_declare(queueName, durable=True)
            channel.basic_consume(queueName, self.executeProcess)
            self.logger.info("--------------------- start_consuming -----------------------")
            channel.start_consuming()
        except Exception as exc:
            self.logger.critical(exc)
        finally:
            self.queueConn.close()
            exit(1)
