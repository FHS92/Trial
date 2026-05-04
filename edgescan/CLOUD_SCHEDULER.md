# Cloud Scheduler — Scan Schedule Setup

Runs every 15 minutes between 9:00 and 16:45 UTC, Monday–Friday.

---

## Option A: Google Cloud Console (no CLI needed)

1. Go to **Google Cloud Console → Cloud Scheduler → Create Job**
2. Fill in:

| Field | Value |
|---|---|
| Name | `edgescan-scan-15min` |
| Region | `europe-west1` |
| Frequency | `*/15 9-16 * * 1-5` |
| Timezone | `Coordinated Universal Time (UTC)` |
| Target type | `HTTP` |
| URL | `https://edgescan-754322842495.europe-west1.run.app/api/scan/trigger` |
| HTTP method | `POST` |
| Body | `{}` |
| Timeout (optional settings) | `600` seconds |

3. Under **Auth header**, add two HTTP headers:
   - `X-Scan-Secret` = `edgescan-local-secret`
   - `Content-Type` = `application/json`

4. Click **Create**.

---

## Option B: gcloud CLI

```bash
gcloud scheduler jobs create http edgescan-scan-15min \
  --location=europe-west1 \
  --schedule="*/15 9-16 * * 1-5" \
  --uri="https://edgescan-754322842495.europe-west1.run.app/api/scan/trigger" \
  --http-method=POST \
  --headers="X-Scan-Secret=edgescan-local-secret,Content-Type=application/json" \
  --message-body='{}' \
  --attempt-deadline=600s \
  --time-zone="UTC" \
  --description="EdgeScan 15-min scan Mon-Fri 9am-4pm UTC"
```

---

## Security note

`edgescan-local-secret` is the hardcoded default — visible in the source code.
To harden it, add a `SCAN_SECRET` environment variable in Cloud Run with a strong
random value (e.g. a UUID), then update the header above to match.

---

## Manual trigger (test it immediately)

```bash
curl -X POST \
  "https://edgescan-754322842495.europe-west1.run.app/api/scan/trigger" \
  -H "X-Scan-Secret: edgescan-local-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or from Cloud Console: **Cloud Scheduler → edgescan-scan-15min → Force run**.
