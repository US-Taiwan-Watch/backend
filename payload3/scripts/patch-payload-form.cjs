const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@payloadcms/ui/package.json'))).version;
if (version !== '3.92.1') throw Error('Review the bounded form retry patch for this Payload version');
const file = path.join(root, 'node_modules/@payloadcms/ui/dist/forms/Form/index.js');
const source = fs.readFileSync(file, 'utf8');
const hash = crypto.createHash('sha256').update(source).digest('hex');
const before = "      setDisabled(false);\n      if (typeof handleResponse === 'function') {", after = "      setDisabled(false);\n      // Retain the submitted draft after any failed save so editors can retry.\n      if (res.status >= 400) setModified(true);\n      if (typeof handleResponse === 'function') {";
if (hash !== "d74e2ae30ff76ebc4637ad6bcd81f6ece0e9a9ff6a699e1c555f6e1576e42815" && hash !== "0eee37c062db1452977f384df7431f4b5bba7eaf8f4c49a4780ca2b113446845") throw Error('Payload form source changed; review before applying the retry patch');
if (hash === "d74e2ae30ff76ebc4637ad6bcd81f6ece0e9a9ff6a699e1c555f6e1576e42815") fs.writeFileSync(file, source.replace(before, after));
console.log('Payload failed-save retry patch verified');

// The public client entry is prebundled; patch its matching form implementation too.
const bundle = path.join(root, 'node_modules/@payloadcms/ui/dist/exports/client/index.js');
const bundled = fs.readFileSync(bundle, 'utf8');
const bundledBefore = 'U(!1),typeof g=="function"){g(Io,An,Oo);return}';
const bundledAfter = 'U(!1),Io.status>=400&&Y(!0),typeof g=="function"){g(Io,An,Oo);return}';
const bundleHash = crypto.createHash('sha256').update(bundled).digest('hex');
if (bundleHash === '8cfa1662727eb9e11bed55200592569861ff6d183898dd97ac9e980e85a870f4') {
  if (bundled.split(bundledBefore).length !== 2) throw Error('Expected exactly one bundled form submit implementation');
  fs.writeFileSync(bundle, bundled.replace(bundledBefore, bundledAfter));
} else if (bundleHash !== 'ba47ca31f6a3604b4f81973798bb98a0db992614da95b7393133f5cedbdb4f69') throw Error('Bundled Payload form changed; review the retry patch');
console.log('Payload bundled failed-save retry patch verified');
