from enum import Enum


class JobStatusEnum(Enum):
    ERROR_DURING_PROCESSING = -1
    READY_FOR_PROCESSING = 0
    PROCESSING = 1
    COMPLETE = 2
