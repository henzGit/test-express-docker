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
    worker: Worker = Worker(config, logger)

    def test_constructor(self):
        self.assertEqual(self.worker.config, self.config)
        self.assertEqual(self.worker.logger, self.logger)
        self.assertEqual(self.worker.redisClient, None)
        self.assertEqual(self.worker.queueConn, None)

    @patch('worker.Redis')
    def test_getRedisClient(self, mock_redis):
        redisClient: Redis = self.worker.getRedisClient()
        self.assertIsInstance(redisClient, MagicMock)
        self.assertEqual(redisClient, self.worker.redisClient)
        redisClient2: Redis = self.worker.getRedisClient()
        self.assertEqual(redisClient, redisClient2)

    @patch('worker.BlockingConnection')
    def test_getQueueConnection(self, mock_conn):
        queueConn: BlockingConnection = self.worker.getQueueConnection()
        self.assertIsInstance(queueConn, MagicMock)
        self.assertEqual(queueConn, self.worker.queueConn)
        queueConn2: BlockingConnection = self.worker.getQueueConnection()
        self.assertEqual(queueConn, queueConn2)

    # def test_getJobInfoFromRedis(self):
    #     with patch('worker.BlockingConnection'):
    #         queueConn: BlockingConnection = self.worker.getQueueConnection()
    #         self.assertIsInstance(queueConn, MagicMock)
    #         self.assertEqual(queueConn, self.worker.queueConn)
    #         queueConn2: BlockingConnection = self.worker.getQueueConnection()
    #         self.assertEqual(queueConn, queueConn2)


if __name__ == '__main__':
    unittest.main()
