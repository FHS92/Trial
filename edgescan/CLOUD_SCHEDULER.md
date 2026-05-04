# Cloud Scheduler — Daily Scan Setup

Run this once from your terminal (replace the two placeholder values).

```bash
# 1. Set your values
export CLOUD_RUN_URL="https://YOUR_SERVICE_URL"   # e.g. https://edgescan-abc123-ew.a.run.app
export SCAN_SECRET="YOUR_SCAN_SECRET"              # value of SCAN_SECRET env var in Cloud Run

# 2. Create the scheduler job (runs Mon–Fri at 21:00 UTC = 4 pm ET after market close)
gcloud scheduler jobs create http edgescan-daily-scan \
  --location=europe-west1 \
  --schedule="0 21 * * 1-5" \
  --uri="${CLOUD_RUN_URL}/api/scan/trigger" \
  --http-method=POST \
  --headers="X-Scan-Secret=${SCAN_SECRET},Content-Type=application/json" \
  --message-body='{}' \
  --attempt-deadline=600s \
  --time-zone="UTC" \
  --description="EdgeScan daily S&P 500 scan after market close"
```

**Notes:**
- `attempt-deadline=600s` gives the scan 10 minutes to complete (full S&P 500 takes ~2-4 min).
- Change `--location` to match your Cloud Run region.
- `0 21 * * 1-5` = 9 pm UTC weekdays. Adjust to taste:
  - `0 21 * * *` to include weekends
  - `0 16 * * 1-5` for 4 pm UTC (noon ET)
- The endpoint `/api/scan/trigger` is synchronous — Cloud Scheduler waits for the 200 response before marking the job successful.

**To update the schedule later:**
```bash
gcloud scheduler jobs update http edgescan-daily-scan \
  --schedule="0 21 * * 1-5" \
  --location=europe-west1
```

**To run it manually right now:**
```bash
gcloud scheduler jobs run edgescan-daily-scan --location=europe-west1
```

**Or trigger directly without Cloud Scheduler:**
```bash
curl -X POST "${CLOUD_RUN_URL}/api/scan/trigger" \
  -H "X-Scan-Secret: ${SCAN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```
