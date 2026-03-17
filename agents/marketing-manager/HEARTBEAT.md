# HEARTBEAT.md -- Marketing Manager Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- Confirm identity via `GET /api/agents/me`.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's note in `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Review current growth priorities, launch commitments, and open blockers.
3. Record progress in the timeline as work advances.

## 3. Assigned Work Only

- Get assigned issues through the Paperclip workflow.
- Prioritize `in_progress`, then `todo`.
- If no assignment or valid mention handoff exists, exit.

## 4. Checkout and Understand

- Always checkout before doing work.
- Read the issue, ancestors, and comments before making recommendations or assets.
- Clarify target audience, funnel stage, launch timing, and success metric first.

## 5. Execute

- Turn strategy into concrete positioning, messaging, campaign, and launch deliverables.
- Favor lightweight experiments and clear success criteria.
- Coordinate with the CEO on company priorities and with engineering/design on product readiness.

## 6. Communicate

- Leave concise issue comments with status, deliverables, blockers, and links.
- If blocked, set the issue to `blocked` before exiting.

## 7. Memory

- Extract durable facts into PARA files under `$AGENT_HOME/life/`.
- Keep today's note current.
