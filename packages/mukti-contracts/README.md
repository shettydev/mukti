# @muktiai/contracts

Type-only wire contracts shared by `@muktiai/api` and `@muktiai/web`. Private to the
workspace and never published.

| File                   | What it pins                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/stream-events.ts` | SSE events for chat, canvas/map node dialogue, branch suggestions and conversation-to-map extraction. |

## How it is enforced

- The API's stream services alias these types, so the server cannot emit another shape.
- The web compiles `src/types/stream-contract.check.ts`, a two-way equality check
  between the client's event types and these, so drift fails the web `type-check` and
  `next build`.

## Rules

- Types only: no runtime values, no imports from other packages. Consumers use
  `import type { ... } from '@muktiai/contracts'`.
- The API compiles to CommonJS and must not need this package at runtime. Because the
  imports are type-only they are erased, so the published API does not depend on it.
