const fs = require('fs');
const auth = JSON.parse(fs.readFileSync('/root/ustw-provisioning/database-auth.json')).admin;
const admin = db.getSiblingDB('admin');
if (!admin.auth(auth.username, auth.password)) throw new Error('Administrator authentication failed');
const result = admin.runCommand({rotateCertificates:1,message:'USTW scheduled TLS certificate renewal'});
if (result.ok !== 1) throw new Error('Certificate reload failed');
print(JSON.stringify({ok:result.ok}));
