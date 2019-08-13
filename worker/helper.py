import pprint
from yaml import YAMLError, safe_load
from typing import Dict
from logging import Logger, FileHandler, StreamHandler, Formatter, DEBUG, getLogger

def setupLogging() -> Logger:
    """
    Setup logging for the worker
    There are two types of handlers: console handler and file handler.
    Both are used by the same logger object
    :return: main logger object
    """

    logger: Logger = getLogger('worker')
    logger.setLevel(DEBUG)

    # create file handler which logs even debug messages
    fh: FileHandler = FileHandler('worker.log')
    fh.setLevel(DEBUG)

    # create console handler
    ch: StreamHandler = StreamHandler()

    # create formatter and add it to the handlers
    formatter: Formatter = Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)

    # add the handlers to the logger
    logger.addHandler(fh)
    logger.addHandler(ch)

    return logger


def readConf(path: str, logger: Logger) -> Dict:
    """
    Read values from configuration YAML file
    :param logger: main logger object for logging purpose
    :return: config data in the form of Dict
    """
    logger.info("Trying to open config YAML file")
    pp = pprint.PrettyPrinter(indent=2)
    with open(path, 'r') as stream:
        try:
            config: Dict = safe_load(stream)
            logger.info("config: \n%s" %pp.pformat(config))
            return config
        except YAMLError as exc:
            logger.critical(exc)
            exit(1)
