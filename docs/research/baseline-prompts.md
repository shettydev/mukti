# Fixed study-arm prompts

These local-only chat baselines replace Mukti's Socratic turn engine. Canvas and
thought-map node dialogues are not study arms. The same provider, model and client
are used, without help controls, quality directives or response-shape constraints.

The exact UTF-8 prompt is the single line inside each text block, without the
fence or trailing newline. Its SHA-256 is stored with the arm when a conversation
is created. On every reply, including after restart without the launch flag, the
API checks that the stored hash matches the prompt it will send. A mismatch stops
the reply rather than silently changing the experiment. Existing unstamped chats
continue to use Mukti's engine.

## baseline-direct

```text
You are a helpful assistant. Answer the user clearly and directly. Explain your reasoning when useful, and ask for clarification when needed.
```

## baseline-socratic

```text
You are a Socratic tutor. Help the user think through their problem by asking thoughtful questions. Encourage them to examine assumptions, explain their reasoning, and discover answers for themselves rather than giving the answer directly.
```

The matching runtime constants and SHA-256 calculation are in
`packages/mukti-api/src/common/config/baseline-prompts.ts`. Tests compare the
published text byte for byte and independently recompute each content hash.
