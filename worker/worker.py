import os
from pika import BlockingConnection, ConnectionParameters, BasicProperties
from logging import Logger
from redis import Redis
from typing import Union, List, Tuple
from constants import FILE_PATH_REDIS_KEY, JOB_STATUS_REDIS_KEY, \
    JOB_STATUS_INDEX, FILE_PATH_INDEX, ERROR_SAME_JOB_STATUS
from job_status_enum import JobStatusEnum


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
            currentJobStatus, filePath = self.getRedisClient().hmget(jobId, [JOB_STATUS_REDIS_KEY, FILE_PATH_REDIS_KEY])
            currentJobStatus: int = int(currentJobStatus.decode(self.encoding))
            filePath: str = filePath.decode(self.encoding)
            self.logger.info("-------------------- data from redis: [%s,%s] ----------" % (currentJobStatus, filePath))
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

        # Update job status in redis to ongoing
        currentJobStatus = self.updateJobStatus(jobId, JobStatusEnum(currentJobStatus), JobStatusEnum.PROCESSING)

        # Use ImageMagick to make thumbnail

        # Put thumbnail into thumbnail folder

        # Update Job status in redis to finished
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
