async function verifyHttpEndpoints() {
  const BASE_URL = 'http://localhost:3001/api';
  console.log('=== VERIFYING LIVE HTTP API ENDPOINTS (http://localhost:3001) ===\n');

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  console.log('[1/8] Health Check:', healthRes.status, healthJson);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Demo Login
  console.log('\n[2/8] Testing POST /api/auth/demo...');
  const demoRes = await fetch(`${BASE_URL}/auth/demo`, { method: 'POST' });
  const demoJson = await demoRes.json();
  console.log('Status:', demoRes.status);
  console.log('Demo Merchant:', demoJson.merchant?.name, `(MID: ${demoJson.merchant?.id}, Currency: ${demoJson.merchant?.currency})`);
  console.log('Demo User:', demoJson.user?.name, `(${demoJson.user?.email}, Role: ${demoJson.user?.role})`);
  console.log('Token received:', !!demoJson.token);
  if (!demoJson.token) throw new Error('No token returned from /auth/demo');

  const token = demoJson.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // 3. GET /api/auth/me
  console.log('\n[3/8] Testing GET /api/auth/me with Bearer token...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
  const meJson = await meRes.json();
  console.log('Status:', meRes.status);
  console.log('Verified User:', meJson.user?.email, 'Merchant:', meJson.merchant?.name);
  if (meRes.status !== 200) throw new Error('/auth/me verification failed');

  // 4. Invalid Login attempt
  console.log('\n[4/8] Testing POST /api/auth/login with wrong credentials...');
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@desigadgets.in', password: 'WrongPassword123' })
  });
  console.log('Status (expected 401):', badLoginRes.status);
  const badLoginJson = await badLoginRes.json();
  console.log('Error message:', badLoginJson.error);
  if (badLoginRes.status !== 401) throw new Error('Expected 401 for wrong credentials');

  // 5. Valid Login attempt
  console.log('\n[5/8] Testing POST /api/auth/login with correct credentials...');
  const goodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@desigadgets.in', password: 'Demo@123Password' })
  });
  console.log('Status:', goodLoginRes.status);
  const goodLoginJson = await goodLoginRes.json();
  console.log('Logged in user:', goodLoginJson.user?.email);
  if (goodLoginRes.status !== 200) throw new Error('Expected 200 for correct credentials');

  // 6. Overview endpoint with dynamic metrics
  console.log('\n[6/8] Testing GET /api/overview...');
  const overviewRes = await fetch(`${BASE_URL}/overview`, { headers: authHeaders });
  const overviewJson = await overviewRes.json();
  console.log('Status:', overviewRes.status);
  console.log('Metrics:', {
    revenueAtRisk: overviewJson.metrics?.revenueAtRisk,
    recoveredRevenue: overviewJson.metrics?.recoveredRevenue,
    recoveryRate: overviewJson.metrics?.recoveryRate,
    activeCases: overviewJson.metrics?.activeCases
  });
  console.log(`7-Day Trend data count: ${overviewJson.trendData?.length}`);
  console.log(`Payment method rails count: ${overviewJson.methodData?.length}`);
  if (!overviewJson.trendData || overviewJson.trendData.length !== 7) {
    throw new Error('Trend data missing or not 7 items');
  }

  // 7. Recovery Stats endpoint
  console.log('\n[7/8] Testing GET /api/recovery/stats...');
  const statsRes = await fetch(`${BASE_URL}/recovery/stats`, { headers: authHeaders });
  const statsJson = await statsRes.json();
  console.log('Status:', statsRes.status);
  console.log('Recovery Stats:', statsJson);
  if (statsRes.status !== 200) throw new Error('/recovery/stats failed');

  // 8. Merchant Profile endpoint
  console.log('\n[8/8] Testing GET /api/merchant/profile...');
  const profileRes = await fetch(`${BASE_URL}/merchant/profile`, { headers: authHeaders });
  const profileJson = await profileRes.json();
  console.log('Status:', profileRes.status);
  console.log('Merchant Profile:', profileJson.merchant?.name, 'Users count:', profileJson.users?.length);
  if (profileRes.status !== 200) throw new Error('/merchant/profile failed');

  console.log('\n=== ALL LIVE HTTP ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY ===');
}

verifyHttpEndpoints().catch(err => {
  console.error('\n❌ HTTP VERIFICATION FAILED:', err);
  process.exit(1);
});
