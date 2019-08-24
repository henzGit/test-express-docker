import os
from pika import BlockingConnection, ConnectionParameters
from logging import Logger
from redis import Redis

class Worker:
    def __init__(self, config: dict, logger: Logger):
        self.config = config
        self.logger = logger
        self.redisClient: Redis = None
        self.queueConn: BlockingConnection = None

    def getRedisClient(self) -> Redis:
        """
        Get redis client if exists else create a new client
        :return: current or new Redis client instance
        """
        if self.redisClient is not None:
            self.logger.info("--------------- getting existing redis client -------------")
            return self.redisClient
        try:
            self.logger.info("--------------- creating new redis client -------------")
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
            self.logger.info("---------------- creating new RabbitMQ connection -------------------")
            self.queueConn: BlockingConnection = BlockingConnection(parameters)
        except Exception as exc:
            self.logger.critical(exc)
            exit(1)
        return self.queueConn

    def _onMessage(self, channel, method_frame, header_frame, body):
        """
        Callback when receiving a message
        :param channel: channel from which the message comes
        :param method_frame: method frame of the message
        :param header_frame: header frame of the message
        :param body: body of the message
        """
        jobId: str = body.decode("utf-8")
        self.logger.info("---------------- receiving job: %s ---------------"%jobId)

        # Update job status in redis

        # acknowledge message if treatment is finished
        channel.basic_ack(delivery_tag=method_frame.delivery_tag)


    def processJob(self):
        """
        Process job from the queue server
        """
        self.logger.info("------------- processJob by pid: %s-------------" % os.getpid())

        redisCLient: Redis = self.getRedisClient()
        queueConn: BlockingConnection = self.getQueueConnection()

        try:
            channel = queueConn.channel()
            queueName: str = self.config["queue"]["queueName"]
            channel.queue_declare(queueName, durable=True)
            channel.basic_consume(queueName, self._onMessage)
            self.logger.info("--------------------- start_consuming -----------------------")
            try:
                channel.start_consuming()
            except KeyboardInterrupt:
                channel.stop_consuming()
        except Exception as exc:
            self.logger.critical(exc)
        finally:
            self.queueConn.close()
            exit(1)
