import unittest
from worker import Worker
from helper import setupLogging
from logging import Logger
from typing import Dict, Hashable, Any

class TestWorker(unittest.TestCase):
    def test_constructor(self):
        logger: Logger = setupLogging()
        config: Dict[Hashable, Any] = {
            'kvs': {'host': 'kvs', 'indexKey': 'redisIndexKey', 'port': 6379},
            'queue': {'host': 'queue', 'port': 5672, 'queueName': 'test_queue'},
        }
        worker: Worker = Worker(config, logger)
        self.assertEqual(worker.config, config)
        self.assertEqual(worker.logger, logger)
        self.assertEqual(worker.redisClient, None)
        self.assertEqual(worker.queueConn, None)

if __name__ == '__main__':
    unittest.main()
