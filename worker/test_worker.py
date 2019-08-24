import os
import unittest
from worker import Worker
from helper import setupLogging
from typing import Dict, Hashable, Any
from pika import BlockingConnection, ConnectionParameters
from logging import Logger
from redis import Redis
from unittest.mock import patch, MagicMock
from typing import List, Tuple
from job_status_enum import JobStatusEnum
from constants import THUMBNAIL_MAX_PIXEL, ERROR_PROCESSING_IMAGE

class TestWorker(unittest.TestCase):
    logger: Logger = setupLogging()
    config: Dict[Hashable, Any] = {
        'kvs': {'host': 'kvs', 'indexKey': 'redisIndexKey', 'port': 6379},
        'queue': {'host': 'queue', 'port': 5672, 'queueName': 'test_queue'},
        'fileStorage': {'thumbnailPath': '/img/thumbnail/'}
    }
    worker: Worker = Worker(config, logger)
    exception: Exception = Exception('Boom!')
    jobId: int = 1
    filePath: str = '/img/uploaded/1566650412191_test.png'
    thumbnailPath: str = '/img/thumbnail/1566650412191_test.png'
    width: int = 100
    height: int = 80

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
        mockRedis.assert_called_once_with(host=self.config["kvs"]["host"], port=self.config["kvs"]["port"])

    @patch('worker.Redis')
    def test_getRedisClientFailure(self, mockRedis):
        mockRedis.side_effect = self.exception
        with self.assertRaises(SystemExit):
            mockResult: Redis = self.worker.getRedisClient()
            self.assertEqual(None, mockResult)
        mockRedis.assert_called_once_with(host=self.config["kvs"]["host"], port=self.config["kvs"]["port"])

    @patch('worker.BlockingConnection')
    def test_getQueueConnectionSuccessful(self, mockQueueConn):
        # Get and create a new instance
        queueConn: BlockingConnection = self.worker.getQueueConnection()
        self.assertIsInstance(queueConn, MagicMock)
        self.assertEqual(queueConn, self.worker.queueConn)
        # Get existing instance
        queueConn2: BlockingConnection = self.worker.getQueueConnection()
        self.assertEqual(queueConn, queueConn2)
        parameters = ConnectionParameters(host=self.config["queue"]["host"],
                                          port=self.config["queue"]["port"])
        mockQueueConn.assert_called_once_with(parameters)

    @patch('worker.BlockingConnection')
    def test_getQueueConnectionFailure(self, mockQueueConn):
        mockQueueConn.side_effect = self.exception
        with self.assertRaises(SystemExit):
            queueConn: BlockingConnection = self.worker.getQueueConnection()
            self.assertEqual(None, queueConn)
        parameters = ConnectionParameters(host=self.config["queue"]["host"],
                                          port=self.config["queue"]["port"])
        mockQueueConn.assert_called_once_with(parameters)

    @patch.object(Worker, 'getRedisClient')
    def test_getJobInfoFromRedisSuccessful(self, mockGetRedisClient: MagicMock):
        returnValueHmget: List = [b'0', b'img/uploaded/1566620014076_test.png', b'']
        returnValueFunc: Tuple = (0, 'img/uploaded/1566620014076_test.png')
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
    def test_updateJobStatusUsingDifferentJobStatusDefaultThumbnailPath(self, mockGetRedisClient: MagicMock):
        returnValueFunc: JobStatusEnum = JobStatusEnum.PROCESSING
        mockGetRedisClient.return_value.hset.return_value = ''
        mockResult: JobStatusEnum = self.worker.updateJobInfo(
            self.jobId, JobStatusEnum.READY_FOR_PROCESSING, JobStatusEnum.PROCESSING
        )
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hset.assert_called_once()
        self.assertEqual(returnValueFunc, mockResult)

    @patch.object(Worker, 'getRedisClient')
    def test_updateJobStatusUsingDifferentJobStatusCustomThumbnailPath(self, mockGetRedisClient: MagicMock):
        returnValueFunc: JobStatusEnum = JobStatusEnum.PROCESSING
        mockGetRedisClient.return_value.hmset.return_value = ''
        mockResult: JobStatusEnum = self.worker.updateJobInfo(
            self.jobId, JobStatusEnum.READY_FOR_PROCESSING, JobStatusEnum.PROCESSING, self.thumbnailPath
        )
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hmset.assert_called_once()
        mockGetRedisClient().hset.assert_not_called()
        self.assertEqual(returnValueFunc, mockResult)


    @patch.object(Worker, 'getRedisClient')
    def test_updateJobStatusUsingSameJobStatus(self, mockGetRedisClient: MagicMock):
        with self.assertRaises(SystemExit):
            mockResult: JobStatusEnum = self.worker.updateJobInfo(
                self.jobId, JobStatusEnum.PROCESSING, JobStatusEnum.PROCESSING
            )
            self.assertEqual(None, mockResult)
        mockGetRedisClient().hset.assert_not_called()

    @patch.object(Worker, 'getRedisClient')
    def test_updateJobStatusRedisConnProblem(self, mockGetRedisClient: MagicMock):
        mockGetRedisClient.return_value.hset.side_effect = self.exception
        with self.assertRaises(SystemExit):
            mockResult: JobStatusEnum = self.worker.updateJobInfo(
                self.jobId, JobStatusEnum.READY_FOR_PROCESSING, JobStatusEnum.PROCESSING
            )
            self.assertEqual(None, mockResult)
        mockGetRedisClient.assert_called_once()
        mockGetRedisClient().hset.assert_called_once()

    def test_findThumbnailSizeResizeBothValuesMoreThanMax(self):
        width: int = 772
        height: int = 563
        tobeWidth, tobeHeight = self.worker.findThumbnailSize(width, height)
        self.assertEqual(tobeWidth, 96)
        self.assertEqual(tobeHeight, 70)
        self.assertLess(tobeWidth, THUMBNAIL_MAX_PIXEL, 'Width to be less than max pixel')
        self.assertLess(tobeHeight, THUMBNAIL_MAX_PIXEL, 'Height to be less than max pixel')
        self.assertIsInstance(tobeWidth, int)
        self.assertIsInstance(tobeHeight, int)

    def test_findThumbnailSizeResizeOnlyWidthMoreThanMax(self):
        width: int = 150
        height: int = 50
        tobeWidth, tobeHeight = self.worker.findThumbnailSize(width, height)
        self.assertEqual(tobeWidth, 75)
        self.assertEqual(tobeHeight, 25)
        self.assertLess(tobeWidth, THUMBNAIL_MAX_PIXEL, 'Width to be less than max pixel')
        self.assertLess(tobeHeight, THUMBNAIL_MAX_PIXEL, 'Height to be less than max pixel')
        self.assertIsInstance(tobeWidth, int)
        self.assertIsInstance(tobeHeight, int)

    def test_findThumbnailSizeResizeOnlyHeightMoreThanMax(self):
        width: int = 80
        height: int = 120
        tobeWidth, tobeHeight = self.worker.findThumbnailSize(width, height)
        self.assertEqual(tobeWidth, 40)
        self.assertEqual(tobeHeight, 60)
        self.assertLess(tobeWidth, THUMBNAIL_MAX_PIXEL, 'Width to be less than max pixel')
        self.assertLess(tobeHeight, THUMBNAIL_MAX_PIXEL, 'Height to be less than max pixel')
        self.assertIsInstance(tobeWidth, int)
        self.assertIsInstance(tobeHeight, int)

    def test_findThumbnailSizeResizeBothValuesEqualMax(self):
        width: int = THUMBNAIL_MAX_PIXEL
        height: int = THUMBNAIL_MAX_PIXEL
        tobeWidth, tobeHeight = self.worker.findThumbnailSize(width, height)
        self.assertEqual(tobeWidth, THUMBNAIL_MAX_PIXEL)
        self.assertEqual(tobeHeight, THUMBNAIL_MAX_PIXEL)
        self.assertIsInstance(tobeWidth, int)
        self.assertIsInstance(tobeHeight, int)

    def test_findThumbnailSizeNoResize(self):
        width: int = 80
        height: int = 63
        tobeWidth, tobeHeight = self.worker.findThumbnailSize(width, height)
        self.assertEqual(tobeWidth, width)
        self.assertEqual(tobeHeight, height)
        self.assertIsInstance(tobeWidth, int)
        self.assertIsInstance(tobeHeight, int)

    def test_getThumbnailPath(self):
        thumbnailPath: str = self.worker.getThumbnailPath(self.filePath)
        filename: str = os.path.basename(self.filePath)
        tobeThumbnailPath: str = self.config['fileStorage']['thumbnailPath'] + filename
        self.assertEqual(tobeThumbnailPath, thumbnailPath)

    @patch('worker.Image')
    def test_makeThumbnailExceptionOpenFile(self, mockImage: MagicMock):
        mockImage.side_effect = self.exception
        retMakeThumbnail: str = self.worker.makeThumbnail(self.filePath)
        self.assertEqual(ERROR_PROCESSING_IMAGE, retMakeThumbnail)
        mockImage.assert_called_once_with(filename=self.filePath)
        mockImage.resize.assert_not_called()
        mockImage.save.assert_not_called()

    @patch('worker.Image')
    def test_makeThumbnailExceptionResizeFile(self, mockImage: MagicMock):
        mockImgContextManager: MagicMock = MagicMock(width=self.width, height=self.height)
        mockImgContextManager.resize.side_effect = self.exception
        mockImage.return_value.__enter__.return_value = mockImgContextManager
        retMakeThumbnail: str = self.worker.makeThumbnail(self.filePath)
        self.assertEqual(ERROR_PROCESSING_IMAGE, retMakeThumbnail)
        mockImage.assert_called_once_with(filename=self.filePath)
        mockImgContextManager.resize.assert_called_once_with(self.width, self.height)
        mockImgContextManager.save.assert_not_called()

    @patch('worker.Image')
    def test_makeThumbnailExceptionSaveFile(self,  mockImage: MagicMock):
        mockImgContextManager: MagicMock = MagicMock(width=self.width, height=self.height)
        mockImgContextManager.save.side_effect = self.exception
        mockImage.return_value.__enter__.return_value = mockImgContextManager
        retMakeThumbnail: str = self.worker.makeThumbnail(self.filePath)
        self.assertEqual(ERROR_PROCESSING_IMAGE, retMakeThumbnail)
        mockImage.assert_called_once_with(filename=self.filePath)
        mockImgContextManager.resize.assert_called_once_with(self.width, self.height)
        mockImgContextManager.save.assert_called_once_with(filename=self.thumbnailPath)

    @patch('worker.Image')
    def test_makeThumbnailSuccessful(self,  mockImage: MagicMock):
        mockImgContextManager: MagicMock = MagicMock(width=self.width, height=self.height)
        mockImage.return_value.__enter__.return_value = mockImgContextManager
        retMakeThumbnail: str = self.worker.makeThumbnail(self.filePath)
        self.assertEqual(self.thumbnailPath, retMakeThumbnail)
        mockImage.assert_called_once_with(filename=self.filePath)
        mockImgContextManager.resize.assert_called_once_with(self.width, self.height)
        mockImgContextManager.save.assert_called_once_with(filename=self.thumbnailPath)

if __name__ == '__main__':
    unittest.main()
