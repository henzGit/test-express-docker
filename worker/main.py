from concurrent.futures import ProcessPoolExecutor
from typing import Dict, Hashable, Any
from helper import readConf, setupLogging
from logging import Logger
from worker import Worker

if __name__ == "__main__":
    logger: Logger = setupLogging()
    config: Dict[Hashable, Any] = readConf("/config/default.yaml", logger)
    nbWorkers: int = config["App"]["worker"]["numberWorker"]
    logger.info("Starting pool executors with %s workers"%nbWorkers)
    executor: ProcessPoolExecutor = ProcessPoolExecutor(max_workers=nbWorkers)
    for workerId in range(0, nbWorkers):
        logger.info("Submitting job for worker: %s" %workerId)
        worker: Worker = Worker(config["App"], logger)
        executor.submit(worker.processJob)
