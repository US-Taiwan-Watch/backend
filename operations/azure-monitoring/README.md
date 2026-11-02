# USTW production alerts

Production monitor: `ustw-ops-monitor`, resource group `ustw-cms-rg`, existing one-worker P1v2 plan `ASP-ustwrg-a4b0` in `ustw-rg`. It shares existing compute; there is no additional plan, instance, Application Insights resource, workspace, paid availability test, SMS or log-ingestion setup. Business applications are not redeployed by these files.

## Checks and delivery

- Every two minutes: HTTPS checks of `https://www.ustw.watch/en-US` and the deployed backend's `/api/health` (`status: ok` required). Redirects, HTTP errors, malformed backend responses and timeouts fail closed.
- Every five minutes: root systemd timer `ustw-report-health.timer` on `ustw-db-prod` reruns the existing read-only database checker, then sends only timestamps and boolean checks by authenticated HTTPS. It checks MongoDB service/primary/authentication/TLS, the approved firewall/bind addresses, root disk below 85%, full backup less than 27 hours old and valid checksum, and certificate expiry more than 30 days away. No database records or service credentials are transmitted.
- A missing/stale database heartbeat becomes unhealthy after ten minutes. Initial installation has a ten-minute heartbeat grace period. Azure evaluation/metric ingestion adds delay; these are not instantaneous checks.
- `/probe` exposes only a generic healthy/unhealthy response. Its standard App Service `Http5xx` metric drives `ustw-production-health`. The helper requests it through its public HTTPS origin every two minutes, so failures become standard platform metrics without custom telemetry ingestion.
- `/ready` tests the monitor process independently. Azure Health Check and `ustw-monitor-unavailable` use it. A backup/certificate warning must not recycle a worker shared with the website.
- The free Resource Health activity-log rule `ustw-production-platform-health` also watches Azure-reported active Unavailable/Degraded events for the website, backend and monitor. This supplies a separate platform signal when the shared worker stops producing metrics; it depends on Azure recognizing and publishing the incident.
- Action group `ustw-production-email` sends email to **contact@ustw.watch**. It is dedicated to current production monitoring. Historical Smart Detection groups and their empty role recipients were preserved; they are not part of this coverage.
- Two static stateful metric signals, evaluated every five minutes with a six-hour window. First failure can trigger on the next evaluation; Azure sends a resolved notification only after six quiet hours. This deliberately prevents repeated flapping emails and keeps the two rules under roughly 500 emails/month even with repeated incidents. Persistent failures remain one open alert. New problems while that alert is open require checking current diagnostic output.

Azure's published allowance at setup: ten standard metric time series and 1,000 emails/month free per subscription. These rules use two signals, one recipient and no dimensions/dynamic thresholds. Additional future rules/recipients or unrelated subscription usage can consume the shared allowance. No paid budget or scale change was authorized. Pricing: https://azure.microsoft.com/en-us/pricing/details/monitor/ ; hosting: https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans .

## Responding to an alert

Open Azure Monitor > Alerts, then `ustw-ops-monitor` > Log stream for boolean website/backend/database results and failed database check names. For database detail, use the existing restricted SSH procedure and `journalctl -u ustw-mongodb-health.service -u ustw-report-health.service`; the root-only `/var/lib/ustw-mongodb-health/status.json` contains backup age/disk use. The pre-existing health checker may still label delivery as local: the separate reporter supplies Azure delivery.

Certificate warnings mean renew the MongoDB leaf certificate before expiry; do not turn off TLS or broaden the firewall. Backup warnings require inspecting the daily backup service and checksum before considering recovery. Alert email is generic; detailed data stays on the servers. Bills and newsletters remain disabled.

This is basic monitoring, not a full browser transaction or every URL's uptime guarantee. A shared-plan outage can prevent metric samples; the independent Resource Health rule covers Azure-reported platform incidents, but cannot guarantee detection of every outage. Azure regional/control-plane/mail outages can delay notification. There is no automatic rollback, certificate renewal or repair. Do not claim these alerts prove article publishing, Google login or restore correctness continuously.

## Maintain and deploy

Node 22, no dependencies: `npm test` and `npm start`. `HEARTBEAT_TOKEN` is an independently generated monitor-only token, at least 32 characters. It exists only in Azure monitor app settings and `/etc/ustw-monitor.json` (root, mode 600). It grants heartbeat posting only. Never put it in Git, URLs, images or logs. Durable boolean state is `/home/data/ustw-monitor/heartbeat.json`.

Other settings: `WEBSITE_URL`, `BACKEND_URL`, `PROBE_URL=https://ustw-ops-monitor.azurewebsites.net/probe`, `NODE_ENV=production`, `SCM_DO_BUILD_DURING_DEPLOYMENT=false`. Startup: `node --max-old-space-size=64 server.mjs`; Always On enabled; Health Check `/ready`; HTTPS only; minimum TLS 1.2; FTP disabled. Do not attach Application Insights automatically.

Package only `server.mjs` and `package.json` at ZIP root; deploy that ZIP to the existing `ustw-ops-monitor` app using Azure Web App ZIP deployment. `report-database.py` belongs at `/usr/local/libexec/ustw-report-health.py`. Its root-owned oneshot service runs Python with a 150-second timeout and UMask 0077; timer has OnBootSec=2m and OnUnitActiveSec=5m. The original database health timer/backup service remains intact.

Reversible removal: disable the two metric rules and platform health rule first, disable/stop only `ustw-report-health.timer`, remove its new service/script/config, then delete only the new monitoring app/action group. Preserve the shared plan, business apps, original database health/backup timers, databases and historical Smart Detection rules. Local restricted rollout receipts are in `mongodb-migration/reports/azure-*` and protected monitor settings in `mongodb-migration/private/azure-monitoring/` in the USTW workspace; no secret values are in this repository.
