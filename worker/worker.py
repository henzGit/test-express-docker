import os
import functools
from pika import BlockingConnection, ConnectionParameters
from logging import Logger
from redis import Redis


def getRedisConn(host: str, port: int) -> Redis:
    r: Redis = Redis(host=host, port=port)
    return r

def onMessage(channel, method_frame, header_frame, body, args=None):
    logger: Logger = args["logger"]
    jobId: str = body.decode("utf-8")
    logger.info("---------------- receiving job: %s ---------------"%jobId)

    # Update job status in redis


    channel.basic_ack(delivery_tag=method_frame.delivery_tag)


def processJob(queueConfig: dict, logger: Logger):
    """
    Process job from the queue server
    """
    logger.info("------------- processJob by pid: %s-------------" % os.getpid())
    logger.info("queueConfig: %s"%queueConfig)

    parameters = ConnectionParameters(host=queueConfig["queue"]["host"],
                                      port=queueConfig["queue"]["port"])
    onMessageCB = functools.partial(onMessage, args={"logger": logger})

    try:
        logger.info("------------- creating redis connection with params: %s-------------"
                    % queueConfig["kvs"])
        redisConn: Redis = getRedisConn(queueConfig["kvs"]["host"], queueConfig["kvs"]["port"])
    except Exception as exc:
        logger.critical(exc)
    finally:
        redisConn.close()
        exit(1)

    try:
        logger.info("---------------- creating RabbitMQ blocking connection -------------------")
        conn: BlockingConnection = BlockingConnection(parameters)
        channel = conn.channel()
        channel.queue_declare(queueConfig["queueName"], durable=True)
        channel.basic_consume(queueConfig["queueName"], onMessageCB)
        logger.info("--------------------- start_consuming -----------------------")
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            channel.stop_consuming()
    except Exception as exc:
        logger.critical(exc)
    finally:
        conn.close()
        exit(1)
