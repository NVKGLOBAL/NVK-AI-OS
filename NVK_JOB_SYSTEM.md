# NVK OS — Job System

## Overview
The NVK Job System manages long-running tasks, multi-step execution graphs, retries, and human approval checkpoints.

## Job States
- `QUEUED`
- `PLANNING`
- `WAITING_PERMISSION`
- `EXECUTING`
- `VERIFYING`
- `COMPLETED`
- `FAILED`
- `BLOCKED`
- `CANCELLED`
