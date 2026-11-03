# Current production CMS

This directory contains the Payload **3.92.1** application accepted and deployed November 1, 2026, against MongoDB **9.0.4**. `deployed-source.json` records the copied production input hashes and original immutable image. The older backend at repository root is retained as historical source, not the running CMS.

Use Node22.23.4 and the exact `package-lock.json`:

```sh
npm ci --no-audit --no-fund
npm run typecheck
USTW_BUILD_ONLY=1 AZURE_STORAGE_ACCOUNT_BASEURL=https://ustwcmsstorage.blob.core.windows.net npm run build
```

`USTW_BUILD_ONLY=1` is a build guard: it supplies nonfunctional configuration without database/provider writes. It must never be present at runtime. `Dockerfile` produces the standalone, non-root production image. `scripts/patch-payload-form.cjs` is a hash-guarded fix for failed Save retry in pinned Payload3.92.1; do not drop it silently when upgrading.

For local image packaging:

```sh
docker build --platform linux/amd64 -t ustw-cms:reviewed .
```

Production credentials are runtime bindings managed in Azure App Service `ustw-cms-backend`. Never commit `.env`, a database URI/password, storage/search write keys, Auth0 client secrets, provider tokens, private TLS keys, database backups or uploaded content. The bundled `mongodb-ca.crt` is public trust material only. The runtime validates the approved TLS replica-set target and refuses rehearsal flags, insecure TLS options, missing secrets and unexpected storage/search origins.

The deployed database is the single-member authenticated/TLS `ustw-rs0` at `45-61-62-229.us-se-cloud-xip.com`. The firewall restricts it to backend outbound addresses. Member submission storage is private `ustw-taiwan-records-private-v3`; do not reuse the old public container binding. Existing article files/URLs are retained.

Bill/legislator ingestion and newsletters remain disabled. No cron is started by CI. Public `/api/health` reports healthy status and both disabled flags. Do not rerun billable AI tests or send emails as part of source checks.

Releases are built/published and explicitly deployed from the [website repository's deployment workflow](https://github.com/US-Taiwan-Watch/website/tree/main/deployment). The backend source workflow checks types/build only; it does not load service secrets or publish/deploy images. Image rollback only covers compatible Payload3 application changes; database migrations require a separate recovery plan. Old Payload2 images and the old database remain external protected rollback material. See [Engineering and operations](../operations/README.md) for the production architecture, access and recovery locations.
