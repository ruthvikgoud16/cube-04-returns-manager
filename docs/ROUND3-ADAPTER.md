# Round 3 adapter (Returns)

This Returns Manager stays a Round 2 agent. Round 3 integration is a **thin HTTP boundary**.

## Endpoint

`POST /v1/run` — accepts Round 3 **Agent Input**, returns **Agent Output** with Evidence Record v1.0.

`GET /health` — reports `round3.run = /v1/run`.

## Orchestrator wiring

In the Pod repo `agents/returns/agent.json`:

```json
{
  "stage": "returns",
  "agent_id": "returns-manager@0.1.0",
  "owner": "@ruthvikgoud16",
  "mode": "http",
  "url": "http://localhost:8787",
  "implementation": "Claude one-call + Zod + policy_v1; Round 3 via POST /v1/run"
}
```

Set `RETURNS_URL=http://localhost:8787` (or your deploy URL). The starter posts to `{url}/run` — either:

1. proxy `/run` → `/v1/run` in front of this service, or
2. put a tiny Python `handle()` / FastAPI shim in `agents/returns/app.py` that forwards to this `/v1/run`.

## Input mapping

| Round 3 field | Returns capture |
|---|---|
| `subject.org_id` | `organization_id` |
| `subject.subject_id` | `unit_id` |
| `context.product_name` / sku / asin / parts_list | capture fields |
| `inputs[].data_base64` or readable `ref` path | photos |
| `previous_evidence[].record_id` | `upstream_refs` |

## Output mapping

| Internal | Round 3 |
|---|---|
| checks `identity` | `identity_match` |
| disposition | `decision.outcome` |
| `pending_review` / failure | `status: pending\|error`, UNCERTAIN, fail-open |
| Amazon grade / parts | `payload` |

## Invariants kept

- One model call per unit
- `policy_v1` chooses disposition; model does not
- Confidence never upgrades UNCERTAIN to PASS
- `dispose` is not produced by policy
- `content_hash` is SHA-256, not tamper-proof
- Fail-open: errors return a pending Agent Output, not a crash

## Provenance

When copying into the Pod repo, add `agents/returns/PROVENANCE.md` pointing at:

- Repo: `https://github.com/ruthvikgoud16/cube-04-returns-manager`
- Commit: the Round 2 submission commit / current main tip used for the adapter
