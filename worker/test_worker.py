import unittest
from worker import Worker
from helper import setupLogging
from typing import Dict, Hashable, Any
from pika import BlockingConnection, ConnectionParameters
from logging import Logger
from redis import Redis
from unittest.mock import patch, MagicMock


class TestWorker(unittest.TestCase):
    logger: Logger = setupLogging()
    config: Dict[Hashable, Any] = {
        'kvs': {'host': 'kvs', 'indexKey': 'redisIndexKey', 'port': 6379},
        'queue': {'host': 'queue', 'port': 5672, 'queueName': 'test_queue'},
    }

    def test_constructor(self):
        worker: Worker = Worker(self.config, self.logger)
        self.assertEqual(worker.config, self.config)
        self.assertEqual(worker.logger, self.logger)
        self.assertEqual(worker.redisClient, None)
        self.assertEqual(worker.queueConn, None)

    def test_getRedisClient(self):
        worker: Worker = Worker(self.config, self.logger)
        with patch('worker.Redis'):
            redisClient: Redis = worker.getRedisClient()
            self.assertIsInstance(redisClient, MagicMock)
            self.assertEqual(redisClient, worker.redisClient)
            redisClient2: Redis = worker.getRedisClient()
            self.assertEqual(redisClient, redisClient2)

    def test_getQueueConnection(self):
        worker: Worker = Worker(self.config, self.logger)
        with patch('worker.BlockingConnection'):
            queueConn: BlockingConnection = worker.getQueueConnection()
            self.assertIsInstance(queueConn, MagicMock)
            self.assertEqual(queueConn, worker.queueConn)
            queueConn2: BlockingConnection = worker.getQueueConnection()
            self.assertEqual(queueConn, queueConn2)


if __name__ == '__main__':
    unittest.main()
