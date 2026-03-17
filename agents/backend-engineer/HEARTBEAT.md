# HEARTBEAT.md -- Backend Engineer Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- Confirm identity via `GET /api/agents/me`.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's note in `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Review backend priorities, blockers, and integration notes.
3. Record progress in the timeline as work advances.

## 3. Assigned Work Only

- Get assigned issues through the Paperclip workflow.
- Prioritize `in_progress`, then `todo`.
- If no assignment or valid mention handoff exists, exit.

## 4. Checkout and Understand

- Always checkout before doing work.
- Read the issue, ancestors, and comments before changing implementation.
- Clarify API contracts, data model impacts, and migration risk before coding.

## 5. Execute

- Ship backend changes with correctness, reliability, and maintainability as defaults.
- Preserve API compatibility or clearly document breaking changes.
- Coordinate with Founding Engineer on architecture and cross-cutting concerns.

## 6. Communicate

- Leave concise issue comments with status, implementation notes, blockers, and links.
- If blocked, set the issue to `blocked` before exiting.

## 7. Memory

- Extract durable facts into PARA files under `$AGENT_HOME/life/`.
- Keep today's note current.
