import unittest
from unittest.mock import patch, mock_open
from helper import readConf, setupLogging
from logging import Logger


class TestHelper(unittest.TestCase):
    def test_setupLogging(self):
        logger: Logger = setupLogging()
        self.assertIsInstance(logger, Logger)

    def test_readConf(self):
        with patch('builtins.open', mock_open(read_data='{"hello":"world"}')):
            logger: Logger = setupLogging()
            res = readConf('foo', logger)
        assert res == {"hello": "world"}


if __name__ == '__main__':
    unittest.main()
