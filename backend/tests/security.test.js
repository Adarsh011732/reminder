/**
 * ============================================================================
 * Security Regression Tests - Student Deadline Radar
 * ============================================================================
 * Pure-node test runner (no test framework dependency): `node tests/security.test.js`
 * Covers: URL sanitization (XSS), public-host/IP validation (SSRF), HMAC session
 * tokens, CSRF double-submit, LLM output schema enforcement, cookie flags, and
 * live HTTP behavior (auth gating, CSP headers, CORS policy).
 * ============================================================================
 */

process.env.VERCEL = '1'; // require backend/server without auto-listening (proves app export works)
process.env.NODE_ENV = 'production';
process.env.SESSION_SECRET = 'unit-test-secret-unit-test-secret-1234567890';

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const {
  sanitizeExternalUrl,
  isPublicIp,
  isMailHostSyntaxAllowed,
  validatePublicMailHost,
  createSessionToken,
  verifySessionToken,
  getSessionSecret,
  safeEqualString,
  generateCsrfToken,
  parseCookies,
  buildCookieString,
  verifyCsrfDoubleSubmit,
  sanitizeExtracted,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME
} = require('../security');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err && err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err && err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. URL SANITIZATION (stored-XSS kill switch)
// ---------------------------------------------------------------------------
console.log('\n[1] sanitizeExternalUrl');
test('blocks javascript: scheme', () => {
  assert.strictEqual(sanitizeExternalUrl('javascript:alert(1)'), null);
});
test('blocks mixed-case javascript:', () => {
  assert.strictEqual(sanitizeExternalUrl('JaVaScRiPt:alert(1)'), null);
});
test('blocks data: scheme', () => {
  assert.strictEqual(sanitizeExternalUrl('data:text/html;base64,PHNjcmlwdD4='), null);
});
test('blocks vbscript:/file:/blob:', () => {
  for (const u of ['vbscript:msgbox(1)', 'file:///etc/passwd', 'blob:https://x.com/1']) {
    assert.strictEqual(sanitizeExternalUrl(u), null, u);
  }
});
test('blocks leading-whitespace scheme tricks', () => {
  assert.strictEqual(sanitizeExternalUrl('   javascript:alert(1)'), null);
});
test('blocks CR/LF injection', () => {
  assert.strictEqual(sanitizeExternalUrl('https://a.com/x\r\nSet-Cookie: pwn=1'), null);
});
test('blocks >800 chars and non-strings', () => {
  assert.strictEqual(sanitizeExternalUrl('https://a.com/' + 'x'.repeat(900)), null);
  assert.strictEqual(sanitizeExternalUrl(12345), null);
  assert.strictEqual(sanitizeExternalUrl(null), null);
});
test('accepts normal https URL and normalizes', () => {
  assert.strictEqual(sanitizeExternalUrl('https://forms.gle/abc?next=1'), 'https://forms.gle/abc?next=1');
});
test('caps scheme-less URLs to https://', () => {
  assert.strictEqual(sanitizeExternalUrl('oncampus.tcs.com/codevita2026'), 'https://oncampus.tcs.com/codevita2026');
});
test('rejects unknown custom schemes', () => {
  assert.strictEqual(sanitizeExternalUrl('chrome-extension://abc/x'), null);
  assert.strictEqual(sanitizeExternalUrl('ws://abc.com'), null);
});

// ---------------------------------------------------------------------------
// 2. SSRF: PUBLIC IP / HOST VALIDATION
// ---------------------------------------------------------------------------
console.log('\n[2] isPublicIp / host checks');
test('public IPv4 allowed', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '142.250.183.202']) assert.ok(isPublicIp(ip), ip);
});
test('private/internal IPv4 blocked', () => {
  for (const ip of ['192.168.1.1', '10.0.0.1', '172.16.5.5', '127.0.0.1', '0.0.0.0', '169.254.169.254']) {
    assert.strictEqual(isPublicIp(ip), false, ip);
  }
});
test('172.32.x.x is public, 172.16-31.x.x is private', () => {
  assert.strictEqual(isPublicIp('172.32.0.1'), true);
  assert.strictEqual(isPublicIp('172.31.255.255'), false);
});
test('CGNAT + multicast + test-ranges blocked', () => {
  for (const ip of ['100.64.0.5', '100.127.255.255', '224.0.0.1', '192.0.2.9', '203.0.113.9', '198.51.100.9']) {
    assert.strictEqual(isPublicIp(ip), false, ip);
  }
});
test('IPv6 loopback/ULA/link-local blocked, public IPv6 allowed', () => {
  assert.strictEqual(isPublicIp('::1'), false);
  assert.strictEqual(isPublicIp('fd00::1'), false);
  assert.strictEqual(isPublicIp('fe80::1'), false);
  assert.strictEqual(isPublicIp('2001:4860:4860::8888'), true);
});
test('IPv4-mapped IPv6 respects IPv4 verdict', () => {
  assert.strictEqual(isPublicIp('::ffff:127.0.0.1'), false);
  assert.strictEqual(isPublicIp('::ffff:8.8.8.8'), true);
});
test('host syntax: localhost/lan/arpa blocked, public FQDN & public IP allowed', () => {
  assert.strictEqual(isMailHostSyntaxAllowed('imap.gmail.com'), true);
  assert.strictEqual(isMailHostSyntaxAllowed('localhost'), false);
  assert.strictEqual(isMailHostSyntaxAllowed('mail.corp'), false);
  assert.strictEqual(isMailHostSyntaxAllowed('intranet'), false);
  assert.strictEqual(isMailHostSyntaxAllowed('169.254.169.254'), false);
  assert.strictEqual(isMailHostSyntaxAllowed('8.8.8.8'), true);
});
testAsync('validatePublicMailHost rejects internal IP literals without DNS/network', async () => {
  const a = await validatePublicMailHost('169.254.169.254');
  assert.strictEqual(a.ok, false);
  const b = await validatePublicMailHost('192.168.0.10');
  assert.strictEqual(b.ok, false);
  const c = await validatePublicMailHost('localhost');
  assert.strictEqual(c.ok, false);
  const d = await validatePublicMailHost('corp.internal');
  assert.strictEqual(d.ok, false);
});

// ---------------------------------------------------------------------------
// 3. SESSION TOKENS (HMAC) + CSRF DOUBLE-SUBMIT
// ---------------------------------------------------------------------------
console.log('\n[3] sessions & CSRF');
test('create/verify roundtrip', () => {
  const token = createSessionToken('student@college.edu');
  const data = verifySessionToken(token);
  assert.ok(data, 'token should verify');
  assert.strictEqual(data.e, 'student@college.edu');
  assert.ok(data.exp > Date.now(), 'token should be future-expiring');
});
test('tampered payload rejected', () => {
  const token = createSessionToken('attacker-replay@x.com');
  const parts = token.split('.');
  const forged = Buffer.from(JSON.stringify({ e: 'evil@x.com', iat: Date.now(), exp: Date.now() + 99999 })).toString('base64url');
  assert.strictEqual(verifySessionToken(`${forged}.${parts[1]}`), null);
});
test('garbage tokens rejected', () => {
  for (const t of ['', 'not-a-token', 'a.b.c.d', createSessionToken('x@y.com') + 'x', 'x'.repeat(2000)]) {
    assert.strictEqual(verifySessionToken(t), null, t.slice(0, 24));
  }
});
test('expired token rejected', () => {
  const payload = Buffer.from(JSON.stringify({ e: 'x@y.com', iat: Date.now() - 1000, exp: Date.now() - 1 })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  assert.strictEqual(verifySessionToken(`${payload}.${sig}`), null);
});
test('cookie builder emits HttpOnly/Secure/SameSite/Max-Age', () => {
  const secureCookie = buildCookieString(SESSION_COOKIE_NAME, 'tok', { maxAgeSec: 3600, httpOnly: true, secure: true, sameSite: 'Lax' });
  assert.ok(/HttpOnly/.test(secureCookie) && /Secure/.test(secureCookie) && /SameSite=Lax/.test(secureCookie) && /Max-Age=3600/.test(secureCookie));
  const csrf = buildCookieString(CSRF_COOKIE_NAME, 'csrf', { maxAgeSec: 3600, httpOnly: false, secure: true, sameSite: 'Lax' });
  assert.ok(/radar_csrf=csrf/.test(csrf) && !/HttpOnly/.test(csrf) && /Secure/.test(csrf));
});
test('CSRF double-submit: only exact cookie/header pairs pass', () => {
  const token = generateCsrfToken();
  assert.strictEqual(verifyCsrfDoubleSubmit({ cookies: { radar_csrf: token }, headerToken: token }), true);
  assert.strictEqual(verifyCsrfDoubleSubmit({ cookies: { radar_csrf: token }, headerToken: token + 'a' }), false);
  assert.strictEqual(verifyCsrfDoubleSubmit({ cookies: {}, headerToken: token }), false);
  assert.strictEqual(verifyCsrfDoubleSubmit({ cookies: { radar_csrf: token }, headerToken: null }), false);
});
test('parseCookies decodes', () => {
  const parsed = parseCookies('radar_session=abc; radar_csrf=a%20b; junk');
  assert.deepStrictEqual(parsed, { radar_session: 'abc', radar_csrf: 'a b' });
});
test('safeEqualString is length-safe', () => {
  assert.strictEqual(safeEqualString('abc', 'abc'), true);
  assert.strictEqual(safeEqualString('abc', 'abd'), false);
  assert.strictEqual(safeEqualString('abc', 'abcd'), false);
  assert.strictEqual(safeEqualString(null, 'abc'), false);
});

// ---------------------------------------------------------------------------
// 4. LLM OUTPUT SCHEMA ENFORCEMENT (anti field-tampering / mass assignment)
// ---------------------------------------------------------------------------
console.log('\n[4] sanitizeExtracted');
test('schema whitelist drops unknown fields', () => {
  const out = sanitizeExtracted({
    title: 'Placement Drive', category: 'placement', admin: true, is_admin: true,
    role: 'root', password: 'x', priority_score: 2, is_actionable: true,
    action_required: 'Register', deadline_iso: new Date('2030-01-02T03:04:05Z').toISOString(),
    deadline_text_raw: 'Jan 2', deadline_exact: true, primary_link: 'https://a.com/x', confidence: 0.9
  }, { fallbackSubject: 'fallback' });
  assert.strictEqual(out.category, 'placement');
  assert.strictEqual(out.title, 'Placement Drive');
  assert.strictEqual(out.priority_score, 2);
  assert.ok(!('admin' in out) && !('is_admin' in out) && !('role' in out) && !('password' in out));
});
test('javascript: link stripped to null', () => {
  const out = sanitizeExtracted({ is_actionable: true, title: 'T', primary_link: 'javascript:alert(1)' }, { fallbackSubject: '' });
  assert.strictEqual(out.primary_link, null);
});
test('unknown category coerced to "other"', () => {
  const out = sanitizeExtracted({ is_actionable: true, title: 'T', category: 'root-admin' }, { fallbackSubject: '' });
  assert.strictEqual(out.category, 'other');
});
test('ranges clamped: priority 99->5, confidence 55->1', () => {
  const out = sanitizeExtracted({ is_actionable: true, title: 'T', priority_score: 99, confidence: 55 }, { fallbackSubject: '' });
  assert.strictEqual(out.priority_score, 5);
  assert.strictEqual(out.confidence, 1);
});
test('absurd deadline years rejected', () => {
  const out = sanitizeExtracted({ is_actionable: true, title: 'T', deadline_iso: new Date('3000-01-01').toISOString() }, { fallbackSubject: '' });
  assert.strictEqual(out.deadline_iso, null);
});
test('long strings clamped', () => {
  const out = sanitizeExtracted({ is_actionable: true, title: 'a'.repeat(500), action_required: 'b'.repeat(500) }, { fallbackSubject: '' });
  assert.strictEqual(out.title.length, 200);
  assert.strictEqual(out.action_required.length, 200);
});
test('null / non-object input returns null', () => {
  assert.strictEqual(sanitizeExtracted(null, {}), null);
  assert.strictEqual(sanitizeExtracted('string', {}), null);
});

// ---------------------------------------------------------------------------
// 5. LIVE HTTP INTEGRATION (Express app via api/index style invocation)
// ---------------------------------------------------------------------------
console.log('\n[5] HTTP integration');
async function runHttpTests() {
  // Keep in-memory DB seeded and avoid touching tmp sqlite for determinism
  process.env.DATABASE_PATH = ':memory:';
  const app = require('../server');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const req = (path, options = {}) => fetch(`${base}${path}`, {
    redirect: 'manual',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  await testAsync('GET /api/health -> 200 with hardened headers', async () => {
    const res = await req('/api/health');
    assert.strictEqual(res.status, 200);
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp && csp.includes("default-src 'self'"), 'CSP missing');
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(res.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.ok(res.headers.get('strict-transport-security'), 'HSTS missing in production');
  });

  await testAsync('CORS: foreign origins get no ACAO header in production', async () => {
    const res = await req('/api/health', { headers: { Origin: 'https://evil.example' } });
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null, 'wildcard CORS leaked!');
  });

  await testAsync('GET /api/deadlines -> public read (demo mode preserved) + sanitized links', async () => {
    const res = await req('/api/deadlines?status=all');
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    for (const task of body) {
      assert.ok(!task.primary_link || /^https?:\/\//i.test(task.primary_link), 'unsanitized link leaked');
    }
  });

  await testAsync('PATCH task action WITHOUT session -> 401 (auth enforced)', async () => {
    const res = await req('/api/deadlines/1/action', { method: 'PATCH', body: { action: 'delete' } });
    assert.strictEqual(res.status, 401);
  });

  await testAsync('POST telegram alert WITHOUT session -> 401 (relay locked)', async () => {
    const res = await req('/api/telegram/test-alert', { method: 'POST', body: { task_id: 1, bot_token: 'x', chat_id: 'y' } });
    assert.strictEqual(res.status, 401);
  });

  await testAsync('POST parse-raw auto_save WITHOUT session -> 401', async () => {
    const res = await req('/api/deadlines/parse-raw?auto_save=true', { method: 'POST', body: { subject: 'S', body: 'B', sender: 'a@b.com' } });
    assert.strictEqual(res.status, 401);
  });

  await testAsync('POST parse-raw preview (no save) still works without session', async () => {
    const res = await req('/api/deadlines/parse-raw', {
      method: 'POST',
      body: { subject: 'Assignment submission form', sender: 'hod.cse@college.edu', body: 'Submit the lab assignment at https://forms.gle/abc123 before Friday 5 PM.' }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.extracted, 'extraction payload missing');
    assert.ok(body.extracted.title.length <= 200);
    assert.ok(!body.extracted.primary_link || /^https?:\/\//i.test(body.extracted.primary_link));
  });

  await testAsync('IMAP SSRF guard: metadata IP rejected BEFORE any socket opens', async () => {
    const res = await req('/api/mailbox/test-connection', {
      method: 'POST',
      body: { email: 'student@college.edu', app_password: 'abcd efgh ijkl mnop', imap_server: '169.254.169.254', port: 993 }
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(!/169\.254/.test(JSON.stringify(body)), 'internal IP echoed back');
  });

  await testAsync('IMAP port whitelist: non-993 rejected', async () => {
    const res = await req('/api/mailbox/test-connection', {
      method: 'POST',
      body: { email: 'student@college.edu', app_password: 'abcd efgh ijkl mnop', imap_server: 'imap.gmail.com', port: 143 }
    });
    assert.strictEqual(res.status, 400);
  });

  server.close();
}
runHttpTests().then(() => {
  console.log(`\n════════════════════════════════════`);
  console.log(`Security tests: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════');
  process.exit(failed === 0 ? 0 : 1);
}).catch((fatal) => {
  console.error('FATAL test-runner error:', fatal);
  process.exit(1);
});
