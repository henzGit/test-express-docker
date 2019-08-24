import unittest
from worker import Worker
from helper import setupLogging
from typing import Dict, Hashable, Any
from pika import BlockingConnection
from logging import Logger
from redis import Redis
from unittest.mock import patch, MagicMock
from typing import List, Tuple


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
    def test_getRedisClient(self, mockRedis):
        redisClient: Redis = self.worker.getRedisClient()
        self.assertIsInstance(redisClient, MagicMock)
        self.assertEqual(redisClient, self.worker.redisClient)
        redisClient2: Redis = self.worker.getRedisClient()
        self.assertEqual(redisClient, redisClient2)

    @patch('worker.BlockingConnection')
    def test_getQueueConnection(self, mockQueueConn):
        queueConn: BlockingConnection = self.worker.getQueueConnection()
        self.assertIsInstance(queueConn, MagicMock)
        self.assertEqual(queueConn, self.worker.queueConn)
        queueConn2: BlockingConnection = self.worker.getQueueConnection()
        self.assertEqual(queueConn, queueConn2)

    @patch.object(Worker, 'getRedisClient')
    def test_getJobInfoFromRedis(self, mockGetRedisClient: MagicMock):
        returnValueHmget: List = [b'0', b'img/uploaded/1566620014076_test.png']
        returnValueFunc: Tuple = ('0', 'img/uploaded/1566620014076_test.png')
        mockGetRedisClient.return_value.hmget.return_value = returnValueHmget
        mockResult: Tuple = self.worker.getJobInfoFromRedis(1)
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hmget.assert_called_once()
        self.assertEqual(returnValueFunc, mockResult)


if __name__ == '__main__':
    unittest.main()
