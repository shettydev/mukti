# HEARTBEAT.md -- Frontend Engineer Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- Confirm identity via `GET /api/agents/me`.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's note in `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Review current frontend priorities, blockers, and handoff notes.
3. Record progress in the timeline as work advances.

## 3. Assigned Work Only

- Get assigned issues through the Paperclip workflow.
- Prioritize `in_progress`, then `todo`.
- If no assignment or valid mention handoff exists, exit.

## 4. Checkout and Understand

- Always checkout before doing work.
- Read the issue, its ancestors, and comments before changing code.
- Clarify whether the task is implementation, debugging, accessibility, or UI polish.

## 5. Execute

- Ship frontend changes with strong attention to correctness, responsive behavior, accessibility, and performance.
- Coordinate with the Founding Engineer on architecture or integration risks.
- Ask the UI/UX Engineer for design clarification when interaction or visual direction is ambiguous.

## 6. Communicate

- Leave concise issue comments with status, changes, blockers, and links.
- If blocked, set the issue to `blocked` before exiting.

## 7. Memory

- Extract durable facts into PARA files under `$AGENT_HOME/life/`.
- Keep today's note current.
