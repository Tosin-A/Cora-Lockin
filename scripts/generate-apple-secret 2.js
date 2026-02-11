/**
 * Generate Apple Client Secret for Supabase
 * Uses jsonwebtoken library for reliable JWT generation
 */

const jwt = require('jsonwebtoken');

// Configuration
const TEAM_ID = '6C383NJ99X';
const KEY_ID = 'KFDBT5F3HB';
const SERVICE_ID = 'com.coresense.web';

// Private key in PEM format
const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgVEQhji/jDpv+rJqk
kPnPkX20Zbc8/Dnuw/HIMxkshwmgCgYIKoZIzj0DAQehRANCAAQVBHTShuYsPvHo
v5uQrAqvm/eWwjKrnDPwODrvOafzgylYLLpQu8sNCCXruaYUpCwZ95P+pR4+X6Uy
qA1/L3on
-----END PRIVATE KEY-----`;

const now = Math.floor(Date.now() / 1000);

const claims = {
  iss: TEAM_ID,
  iat: now,
  exp: now + (86400 * 180), // 180 days
  aud: 'https://appleid.apple.com',
  sub: SERVICE_ID,
};

const token = jwt.sign(claims, privateKey, {
  algorithm: 'ES256',
  header: {
    alg: 'ES256',
    kid: KEY_ID,
  },
});

console.log('\n========== APPLE CLIENT SECRET ==========\n');
console.log(token);
console.log('\n==========================================');
console.log('\nConfiguration:');
console.log(`  Team ID: ${TEAM_ID}`);
console.log(`  Key ID: ${KEY_ID}`);
console.log(`  Service ID: ${SERVICE_ID}`);
console.log(`  Expires: ${new Date((now + 86400 * 180) * 1000).toISOString()}\n`);
