from enum import Enum


class JobStatusEnum(Enum):
    READY_FOR_PROCESSING = 0
    PROCESSING = 1
    COMPLETE = 2
