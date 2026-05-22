# opencli-plugin-bonc-oa

OpenCLI plugin scaffold for a BONC OA command surface. This repository is a publishable, sanitized skeleton: do not commit real cookies, tokens, captures, employee names, workflow payloads, reimbursement details, HAR files, or attachment samples.

The command implementations use generic DOM heuristics and configurable URLs. Keep verified private selectors, endpoint notes, field maps, and private fixtures under `~/.opencli/sites/bonc-oa/`, not in this repository.

## Commands

```bash
opencli bonc-oa status
opencli bonc-oa todos --limit 20
opencli bonc-oa todo <taskId>
opencli bonc-oa approve <taskId> --comment "同意" --confirm true
opencli bonc-oa reject <taskId> --comment "原因" --confirm true
opencli bonc-oa submit-expense --title "差旅报销" --amount 128.50 --date 2026-05-11 --category "travel" --description "客户现场支持" --attachments /tmp/a.pdf,/tmp/b.jpg --confirm true
```

### Todo List Output

`opencli bonc-oa todos` logs in or reuses the current Chrome session, opens the BONC OA workbench, then reads the pending-task table inside the workbench frame. The public command intentionally returns only the fields needed for follow-up actions:

```json
[
  {
    "taskId": "5d92488c-49ff-4736-8e27-e860d6ab25ea",
    "title": "(填写报销单)的日常费用报销单:",
    "type": "日常费用报销申请单",
    "receivedAt": "2026-05-22 10:41:17"
  }
]
```

The command does not print session IDs, cookies, detail URLs, employee profile metadata, or workflow payloads. Use the returned `taskId` with `todo`, `approve`, or `reject` after verifying the target task in Chrome.

Write commands are safe by default. Without `--confirm true`, they only return a preview row and do not click the final submit button.

`--confirm true` is the explicit high-risk switch for real workflow actions. Use it only after checking the preview output and the target task or form in Chrome.

For browser login, the plugin first reuses an existing Chrome/OA session. If needed, pass one-shot credentials to the command:

```bash
opencli bonc-oa status --username "$BONC_OA_USERNAME" --password "$BONC_OA_PASSWORD"
opencli bonc-oa todos --username "$BONC_OA_USERNAME" --password "$BONC_OA_PASSWORD" --limit 3 -f json
```

Do not commit real credentials. Command-line arguments can be visible in shell history or process listings; prefer shell variables or an interactive wrapper in private local tooling.

## Configuration

Create a local `.env` or export variables in your shell:

```bash
export BONC_OA_BASE_URL=https://oa.bonc.com.cn
export BONC_OA_EXPENSE_FLOW_NAME="真实报销流程名称"
```

The plugin reuses your Chrome login session through OpenCLI Browser Bridge. If Chrome has already filled the username and password on the OA login page, the plugin will click the login button once and then re-check login state. If `--username` and `--password` are passed together, they are used for that command only. Credentials are not stored or printed by this plugin.

Optional public-safe URL configuration:

```bash
export BONC_OA_TODO_LIST_URL=https://oa.bonc.com.cn/
export BONC_OA_TODO_DETAIL_URL_TEMPLATE='https://oa.bonc.com.cn/workflow/todo/{taskId}'
export BONC_OA_EXPENSE_URL=https://oa.bonc.com.cn/
```

Use generic placeholder URLs in committed files. Put real recon notes and private mappings in `~/.opencli/sites/bonc-oa/`.

## Local Development

```bash
opencli plugin install file://$(pwd)
opencli plugin list
npm test
```

Suggested local acceptance flow:

```bash
npm test
opencli plugin install file://$(pwd)
opencli bonc-oa status
opencli bonc-oa todos --limit 3 -f json
```

Use `~/.opencli/sites/bonc-oa/` for local endpoint notes, private fixtures, and verified field maps. Keep real captures out of this repository.
