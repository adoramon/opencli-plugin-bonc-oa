# AGENTS.md

## Project

This repository is `opencli-plugin-bonc-oa`, an OpenCLI plugin for a sanitized BONC OA command surface.

The public repository must stay safe to publish. Do not commit real OA cookies, tokens, HAR files, private response captures, employee names, approval details, reimbursement documents, or attachment samples.

## Commands

Run tests with:

```bash
npm test
```

Install locally for manual testing:

```bash
opencli plugin install file://$(pwd)
```

Then test with a logged-in Chrome session:

```bash
opencli bonc-oa status
opencli bonc-oa todos --limit 3 -f json
```

## Development Rules

- Keep write commands preview-only by default.
- Require `--confirm true` before any approval or workflow submission action.
- Prefer Chrome login reuse through OpenCLI Browser Bridge; do not add password storage.
- Keep real site recon notes and private fixtures under `~/.opencli/sites/bonc-oa/`, not in this repo.
- Use `.env` for local values and keep `.env.example` sanitized.
- Public code should use generic selectors and configurable URLs until private recon hardens the real implementation.

## Important Files

- `status.js`, `todos.js`, `todo.js`: read-only OA commands.
- `approval.js`: approve/reject workflow commands.
- `submit-expense.js`: expense workflow submission command.
- `lib/validation.js`: argument validation and safety parsing.
- `lib/browser-scripts.js`: browser-side DOM automation snippets.
- `test/validation.test.js`: non-network unit tests.
