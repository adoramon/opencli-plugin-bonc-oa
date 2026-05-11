# opencli-plugin-bonc-oa

OpenCLI plugin scaffold for a BONC OA command surface. The public repository is intentionally sanitized: do not commit real cookies, tokens, captures, employee names, workflow payloads, or attachment files.

## Commands

```bash
opencli bonc-oa status
opencli bonc-oa todos --limit 20
opencli bonc-oa todo <taskId>
opencli bonc-oa approve <taskId> --comment "同意" --confirm true
opencli bonc-oa reject <taskId> --comment "原因" --confirm true
opencli bonc-oa submit-expense --title "差旅报销" --amount 128.50 --date 2026-05-11 --category "travel" --description "客户现场支持" --attachments /tmp/a.pdf,/tmp/b.jpg --confirm true
```

Write commands are safe by default. Without `--confirm true`, they only return a preview row and do not click the final submit button.

## Configuration

Create a local `.env` or export variables in your shell:

```bash
export BONC_OA_BASE_URL=https://oa.bonc.com.cn
export BONC_OA_EXPENSE_FLOW_NAME="真实报销流程名称"
```

The plugin reuses your Chrome login session through OpenCLI Browser Bridge. Log in to the OA site in Chrome first; credentials are not stored by this plugin.

## Local Development

```bash
opencli plugin install file://$(pwd)
opencli plugin list
npm test
```

Use `~/.opencli/sites/bonc-oa/` for local endpoint notes, private fixtures, and verified field maps. Keep real captures out of this repository.
