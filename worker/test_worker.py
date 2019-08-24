import unittest
from worker import Worker
from helper import setupLogging
from typing import Dict, Hashable, Any
from pika import BlockingConnection
from logging import Logger
from redis import Redis
from unittest.mock import patch, MagicMock
from typing import List, Tuple
from job_status_enum import JobStatusEnum

class TestWorker(unittest.TestCase):
    logger: Logger = setupLogging()
    config: Dict[Hashable, Any] = {
        'kvs': {'host': 'kvs', 'indexKey': 'redisIndexKey', 'port': 6379},
        'queue': {'host': 'queue', 'port': 5672, 'queueName': 'test_queue'},
    }
    worker: Worker = Worker(config, logger)
    exception: Exception = Exception('Boom!')
    jobId: int = 1

    def test_constructor(self):
        self.assertEqual(self.worker.config, self.config)
        self.assertEqual(self.worker.logger, self.logger)
        self.assertEqual(self.worker.redisClient, None)
        self.assertEqual(self.worker.queueConn, None)

    @patch('worker.Redis')
    def test_getRedisClientSuccessful(self, mockRedis):
        # Get and create a new instance
        redisClient: Redis = self.worker.getRedisClient()
        self.assertIsInstance(redisClient, MagicMock)
        self.assertEqual(redisClient, self.worker.redisClient)
        # Get existing instance
        redisClient2: Redis = self.worker.getRedisClient()
        self.assertEqual(redisClient, redisClient2)

    @patch('worker.Redis')
    def test_getRedisClientFailure(self, mockRedis):
        mockRedis.side_effect = self.exception
        with self.assertRaises(SystemExit):
            mockResult: Redis = self.worker.getRedisClient()
            self.assertEqual(None, mockResult)
        mockRedis.assert_called_once()

    @patch('worker.BlockingConnection')
    def test_getQueueConnectionSuccessful(self, mockQueueConn):
        # Get and create a new instance
        queueConn: BlockingConnection = self.worker.getQueueConnection()
        self.assertIsInstance(queueConn, MagicMock)
        self.assertEqual(queueConn, self.worker.queueConn)
        # Get existing instance
        queueConn2: BlockingConnection = self.worker.getQueueConnection()
        self.assertEqual(queueConn, queueConn2)

    @patch('worker.BlockingConnection')
    def test_getQueueConnectionFailure(self, mockQueueConn):
        mockQueueConn.side_effect = self.exception
        with self.assertRaises(SystemExit):
            queueConn: BlockingConnection = self.worker.getQueueConnection()
            self.assertEqual(None, queueConn)
        mockQueueConn.assert_called_once()

    @patch.object(Worker, 'getRedisClient')
    def test_getJobInfoFromRedisSuccessful(self, mockGetRedisClient: MagicMock):
        returnValueHmget: List = [b'0', b'img/uploaded/1566620014076_test.png', b'']
        returnValueFunc: Tuple = (0, 'img/uploaded/1566620014076_test.png', '')
        mockGetRedisClient.return_value.hmget.return_value = returnValueHmget
        mockResult: Tuple = self.worker.getJobInfoFromRedis(self.jobId)
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hmget.assert_called_once()
        self.assertEqual(returnValueFunc, mockResult)

    @patch.object(Worker, 'getRedisClient')
    def test_getJobInfoFromRedisConnProblem(self, mockGetRedisClient: MagicMock):
        mockGetRedisClient.return_value.hmget.side_effect = self.exception
        with self.assertRaises(SystemExit):
            mockResult: Tuple = self.worker.getJobInfoFromRedis(self.jobId)
            self.assertEqual(None, mockResult)
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hmget.assert_called_once()


    @patch.object(Worker, 'getRedisClient')
    def test_updateJobStatusUsingDifferentJobStatus(self, mockGetRedisClient: MagicMock):
        returnValueFunc: Tuple = JobStatusEnum.PROCESSING
        mockGetRedisClient.return_value.hset.return_value = ""
        mockResult: JobStatusEnum = self.worker.updateJobStatus(
            self.jobId, JobStatusEnum.READY_FOR_PROCESSING, JobStatusEnum.PROCESSING
        )
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hset.assert_called_once()
        self.assertEqual(returnValueFunc, mockResult)

    @patch.object(Worker, 'getRedisClient')
    def test_updateJobStatusUsingSameJobStatus(self, mockGetRedisClient: MagicMock):
        with self.assertRaises(SystemExit):
            mockResult: JobStatusEnum = self.worker.updateJobStatus(
                self.jobId, JobStatusEnum.PROCESSING, JobStatusEnum.PROCESSING
            )
            self.assertEqual(None, mockResult)
        mockGetRedisClient().hset.assert_not_called()

    @patch.object(Worker, 'getRedisClient')
    def test_updateJobStatusRedisConnProblem(self, mockGetRedisClient: MagicMock):
        mockGetRedisClient.return_value.hset.side_effect = self.exception
        with self.assertRaises(SystemExit):
            mockResult: JobStatusEnum = self.worker.updateJobStatus(
                self.jobId, JobStatusEnum.READY_FOR_PROCESSING, JobStatusEnum.PROCESSING
            )
            self.assertEqual(None, mockResult)
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hset.assert_called_once()


if __name__ == '__main__':
    unittest.main()
