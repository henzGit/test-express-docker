import os
from pika import BlockingConnection, ConnectionParameters, BasicProperties
from logging import Logger
from redis import Redis
from typing import Union, List
from constants import FILE_PATH_REDIS_KEY, JOB_STATUS_REDIS_KEY
from job_status_enum import JobStatusEnum

class Worker:
    def __init__(self, config: dict, logger: Logger):
        self.config = config
        self.logger = logger
        self.redisClient: Union[Redis, None] = None
        self.queueConn: Union[BlockingConnection, None] = None

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

    def getJobInfoFromRedis(self, jobId: str) -> List:
        """
        Get job information from Redis
        :param jobId: id of the job
        :return: job info of the job containing jobstatus anf filepath
        """
        try:
            self.logger.info("--------------------- getting data from redis -----------------------")

            jobInfo: List = self.getRedisClient().hmget(jobId, [JOB_STATUS_REDIS_KEY, FILE_PATH_REDIS_KEY])
            self.logger.info("------------------------ data from redis: %s ------------------------" % jobInfo)
        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return jobInfo

    def executeProcess(self, channel, method_frame, header_frame: BasicProperties, body: bytes):
        """
        Callback when receiving a message
        This is the main logic of the worker
        :param channel: channel from which the message comes
        :param method_frame: method frame of the message
        :param header_frame: header frame of the message
        :param body: body of the message
        """
        jobId: str = body.decode("utf-8")
        self.logger.info("------------------------- receiving job: %s -----------------------" % jobId)

        # Get data from redis
        jobInfo: List = self.getJobInfoFromRedis(jobId)

        # Update job status in redis to ongoing

        # Use ImageMagick to make thumbnail

        # Update Job status in redis to finished

        # acknowledge message if treatment is finished
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
