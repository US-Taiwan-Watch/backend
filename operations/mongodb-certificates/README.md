# MongoDB certificate renewal

The database host checks its certificate daily at **07:00 UTC plus up to 15 minutes**, with missed runs caught up after boot. When **45 days or fewer** remain, it issues a new **90-day** leaf certificate and calls MongoDB `rotateCertificates`. Existing connections remain open; the database is not restarted. New connections must pass certificate trust, hostname, fingerprint and authenticated primary/health checks. A failed check restores the previous certificate files and reloads them.

## Trust and keys

- The original root CA and backend trust file are unchanged. The root signing key remains offline in the protected USTW workspace; it was not copied to the database host.
- A dedicated RSA3072 issuer key is generated on `ustw-db-prod`. Its signed intermediate has a critical `pathlen:0` constraint, TLS server/client purposes, and critical DNS/IP constraints permitting only the current database hostname, `localhost`, `45.61.62.229` and `127.0.0.1`. It cannot issue subordinate CAs. Normal DNS constraint semantics also permit subdomains of the listed DNS names; the renewal script pins the exact existing leaf SAN set and subject.
- The issuer directory is root-only (0700); its private key is 0600. The MongoDB process cannot read the signing key. The existing leaf private key stays on the server and is reused; this task renews certificates rather than rotating the leaf key.
- The leaf retains its exact subject/SANs and both serverAuth/clientAuth purposes. The active PEM contains the existing private key, leaf certificate and intermediate chain. MongoDB's CA file remains the original root.
- Pinning in `/etc/ustw-certificate-renewal.json` prevents unnoticed root/issuer changes. No paid service, new public endpoint, application permission, database user or firewall change is involved.

The issuer expires **November 1, 2031 at 03:30 UTC** and needs a new offline-root signing step before then. The original root expires October26,2036. A DNS/IP move also requires an intentional issuer/leaf configuration update; do not bypass its name constraints.

## Installed components

| Component | Location |
| --- | --- |
| Renewal command | `/usr/local/libexec/ustw-renew-certificate.py` |
| MongoDB reload helper | `/usr/local/libexec/ustw-rotate-certificate.js` |
| Existing database administrator credential | Read in place from root-only `/root/ustw-provisioning/database-auth.json`; never passed on the command line |
| Issuer certificate and private key | `/etc/mongodb/renewal-issuer/` |
| Pinned public identities | `/etc/ustw-certificate-renewal.json` |
| Daily service and timer | `ustw-certificate-renewal.service` / `.timer` |
| Result, lock and interruption journal | `/var/lib/ustw-certificate-renewal/` |
| Previous certificate versions | Root-only `history/` within that directory |
| Pre-installation certificate/checker copies | `/root/ustw-provisioning/certificate-renewal-before/` |

The service's explicit **Group=mongodb** differs from the passwd entry's primary group on this host. Certificate installation and rollback use the explicit `mongodb` group, with MongoDB ownership and 0600 permissions; never infer file access from the account's default group. No systemd restart of mongod is part of renewal.

## Failure detection

The existing five-minute database health report now includes:

| Check | Failure condition |
| --- | --- |
| `certificateRenewalHealthy` | Latest run failed, is missing, or is 40 hours old |
| `certificateRenewalTimerActive` | Daily timer is inactive |
| `certificateIssuerValidBeyond90Days` | Issuer expires within 90 days |

The daily job requires at least100 days of issuer validity before it proceeds, providing margin for a90-day leaf. A shorter issuer lifetime therefore raises the failed-renewal signal earlier than the direct90-day warning. All failures feed the existing **ustw-production-health** Azure rule and `contact@ustw.watch`; the monitor logs retain these specific boolean names. No new alert rule or additional metric signal is required. The original leaf-expiry warning at30 days remains.

## Inspect or run

```sh
systemctl status ustw-certificate-renewal.timer
journalctl -u ustw-certificate-renewal.service
cat /var/lib/ustw-certificate-renewal/status.json
python3 /usr/local/libexec/ustw-renew-certificate.py --check-only
systemctl start ustw-certificate-renewal.service
```

`--check-only` issues/validates a temporary candidate without installing it. If an interrupted prior rotation left a pending journal, it first recovers the previous certificate. `--force` performs a renewal even when it is not yet due; use it only for an intentional live rotation. An exclusive lock prevents concurrent jobs. Atomic file replacement, fsync and the pending journal protect interrupted updates. Previous PEM files contain the leaf private key: keep every snapshot root-only.

Verification uses OpenSSL with the original root, explicit hostname and `-verify_return_error`, followed by a new authenticated mongosh connection. It does not disable TLS verification. The old root lacks a keyUsage extension, so Python's newer default strict-X509 policy rejects even the original certificate; the OpenSSL/MongoDB/Node checks use the existing production trust policy. A separate Node22 driver check with the backend's actual database configuration and bundled CA also passed after activation.

For manual rollback, stop the renewal timer, preserve the current files, restore both `server.crt` and `server.pem` from a chosen still-valid history directory with `mongodb:mongodb` ownership/0600, and run the reload helper over validated TLS. Verify a fresh connection and health before re-enabling the timer. Keep the existing CA and leaf private key. If no valid previous certificate exists, issue a valid leaf through the approved issuer; do not relax TLS or authentication.

## Validation and evidence

Four Python tests cover the renewal boundary, atomic replacement, ownership, successful rotation and rollback. Six monitor test groups cover existing reports and optional renewal diagnostics. On the host, a candidate passed both TLS purposes and all four identities; an unrelated DNS/IP certificate was rejected by the constrained trust chain. Live activation kept the same mongod PID and all database health checks passed. A fresh Node22/application-credential connection read an existing article through a temporary SSH tunnel using the unchanged backend CA; public website/backend/monitor reads returned200. No database content was written.

Local restricted rollout receipts: `mongodb-migration/reports/certificate-renewal-verification.json`, `certificate-renewal-node-connection.json`, `certificate-renewal-constraints.json`, and `certificate-renewal-issuer.json`. Key values are absent from this repository and Pages.

MongoDB behavior: https://www.mongodb.com/docs/manual/reference/command/rotateCertificates/ ; certificate constraints: https://docs.openssl.org/3.5/man5/x509v3_config/ .
