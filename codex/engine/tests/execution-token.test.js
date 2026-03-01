const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function mkTmpPubKey(publicKey) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vyrdon-key-'));
  const filePath = path.join(dir, 'execution_ed25519.pub');
  fs.writeFileSync(filePath, publicKey.export({ type: 'spki', format: 'pem' }));
  fs.chmodSync(filePath, 0o600);
  return filePath;
}

test('execution token verifies with ed25519 signature', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  process.env.EXECUTION_PUBLIC_KEY_FILE = mkTmpPubKey(publicKey);

  const intent = {
    intent_id: 'intent-123',
    payload: { amount: 42, symbol: 'VRDN' }
  };

  const scope = {
    type: 'DEPLOYMENT',
    intent_id: 'intent-123',
    payload: { amount: 42, symbol: 'VRDN' }
  };
  const scopeHash = crypto.createHash('sha256').update(JSON.stringify(scope)).digest('hex');

  const tokenBase = {
    intent_id: 'intent-123',
    approved_by: 'anchor',
    timestamp: new Date().toISOString(),
    scope_hash: scopeHash
  };

  const signature = crypto.sign(null, Buffer.from(JSON.stringify(tokenBase)), privateKey).toString('hex');
  intent.executionToken = { ...tokenBase, signature };

  const { requireValidExecutionToken } = require('../dist/security/executionToken.js');
  assert.doesNotThrow(() => requireValidExecutionToken(intent, 'DEPLOYMENT'));
});

test('execution token rejects scope mismatch', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  process.env.EXECUTION_PUBLIC_KEY_FILE = mkTmpPubKey(publicKey);

  const intent = {
    intent_id: 'intent-321',
    payload: { amount: 10 },
    executionToken: {
      intent_id: 'intent-321',
      approved_by: 'anchor',
      timestamp: new Date().toISOString(),
      scope_hash: '00'.repeat(32),
      signature: ''
    }
  };

  const signable = {
    intent_id: 'intent-321',
    approved_by: 'anchor',
    timestamp: intent.executionToken.timestamp,
    scope_hash: intent.executionToken.scope_hash
  };
  intent.executionToken.signature = crypto.sign(null, Buffer.from(JSON.stringify(signable)), privateKey).toString('hex');

  const { requireValidExecutionToken } = require('../dist/security/executionToken.js');
  assert.throws(() => requireValidExecutionToken(intent, 'DEPLOYMENT'), /scope hash mismatch/);
});
