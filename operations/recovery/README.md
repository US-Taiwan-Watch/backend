# Uploaded-media backup and recovery

This job backs up **uploaded images and private files only**. MongoDB is covered
by the existing Kamatera server backup and local database export. Source code
is held in GitHub. The job does not read, dump or upload the database.

| Detail | Configuration |
|---|---|
| Source | Six existing media containers in ustwcmsstorage |
| Destination | Private ustwcmsstorage/ustw-recovery-backups-v1 |
| Schedule | ustw-recovery.timer, daily at 08:15 UTC plus up to five minutes |
| Retention | 14-day lifecycle expiry, restricted to the backup container |
| Daily files | daily/<UTC timestamp>/media.tar.cms and receipt.json.cms |
| Receipt scope | media; no database archive or database checksum |
| Access | Read/list source media; create-only destination; HTTPS/server-IP restricted |
| Encryption | CMS AES-256-GCM with RSA-OAEP/SHA256; public certificate on writer only |
| Private key | Protected Mac recovery-validation/key/recipient.key; absent from writer/Azure |
| Configuration | /etc/ustw-recovery/config.json, root/0600 |
| Status/cache | /var/lib/ustw-recovery/, root/0700; cache objects are encrypted |
| Worker | /usr/local/lib/ustw-recovery/backup.py and seal.py |
| Resource bounds | 50% CPU, 1 GB RAM, idle I/O, one-hour timeout |
| Access expiry | November 2, 2027 UTC; health warning at 30 days remaining |

Each archive is complete. Encrypted cached files avoid downloading unchanged
source media again. ETag conditions and a second inventory reject a changing
snapshot. Original filenames, containers, content properties, metadata and
checksums are retained in the encrypted manifest. Azure validates Content-MD5
before accepting each upload. The writer cannot read, overwrite or delete
existing cloud objects.

## Restore media

1. Download media.tar.cms and receipt.json.cms from one successful timestamp
   into a protected directory. Obtain the private recovery key separately.
2. Decrypt the receipt, verify recipient-certificate and encrypted archive
   SHA256 values, then run the media restore command below.
3. Check the returned per-file checksums and manifest. Use new private Azure
   containers to validate a recovery before an authorized production switch.
4. Remove temporary decrypted data and disposable restore resources afterward.

```sh
umask 077
python3 seal.py decrypt --source receipt.json.cms --output receipt.json \
  --certificate recipient.crt --private-key recipient.key
python3 restore_media.py --archive media.tar.cms --output media-restored \
  --certificate recipient.crt --private-key recipient.key
```

The restore tool refuses an existing target, checks every encrypted/plaintext
SHA256 and rejects unsafe archive paths. Its manifest maps safe local filenames
back to original blob names and HTTP metadata. Private uploads remain private.
Earlier combined backups may also contain a database archive; that older format
is historical and must not be re-enabled as a scheduled duplicate DB backup.

## Cost and monitoring

The existing user-approved allowance is US$2/month. At ~705 MB, storage and
geo-replication are approximately US$1/month plus operations/source changes.
Limits stop runs above 800 MB media, 4,000 files, 830 MB per upload, 100 MB changed
source downloads per subsequent day, or 5 GB downloads per calendar month.
A completed same-day media-only rerun does not upload again. Initial fill may
fetch up to 800 MB; usage is reserved before downloads. The existing free
storage-account budget warnings go to contact@ustw.watch at US$1.50/US$2 actual
or US$2 forecast; these are not a hard billing cap.

Existing Azure health reporting covers failed/stale copies (30 hours), inactive
timer and credentials within 30 days of expiry. Inspect ustw-recovery.service
and /var/lib/ustw-recovery/status.json. A successful oneshot service normally
returns inactive; the timer stays enabled and active. The unchanged helper
recognizes the three offServerBackup* / backupCredentialValidBeyond30Days checks.

The Azure backup container shares an account with live media, so it does not
protect against loss of that whole account. Retained Mac archives are dated
copies. No new hosting plan, separate backup service or source/database backup
subscription is required.

## Source validation

```sh
python3 -m unittest discover -s operations/recovery -p 'test_*.py' -v
```
