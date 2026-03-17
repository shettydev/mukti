# HEARTBEAT.md -- DevOps Engineer Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- Confirm identity via `GET /api/agents/me`.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's note in `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Review infrastructure priorities, reliability concerns, and deployment blockers.
3. Record progress in the timeline as work advances.

## 3. Assigned Work Only

- Get assigned issues through the Paperclip workflow.
- Prioritize `in_progress`, then `todo`.
- If no assignment or valid mention handoff exists, exit.

## 4. Checkout and Understand

- Always checkout before doing work.
- Read the issue, ancestors, and comments before making infrastructure changes.
- Clarify service dependencies, security implications, and rollback strategy first.

## 5. Execute

- Improve deployment reliability, observability, and operational safety.
- Favor reproducible automation over manual one-off intervention.
- Coordinate with Founding Engineer on runtime, CI/CD, and platform standards.

## 6. Communicate

- Leave concise issue comments with status, infra changes, blockers, and links.
- If blocked, set the issue to `blocked` before exiting.

## 7. Memory

- Extract durable facts into PARA files under `$AGENT_HOME/life/`.
- Keep today's note current.
