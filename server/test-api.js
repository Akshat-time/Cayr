const API_URL = 'http://localhost:5000/api';

async function testApi() {
    try {
        console.log('--- Testing Health Check ---');
        const healthRes = await fetch(`${API_URL}/health`);
        const healthData = await healthRes.json();
        console.log('Status:', healthRes.status);
        console.log('Response:', healthData);
        if (!healthRes.ok) throw new Error('Health check failed');

        console.log('\n--- Testing Registration ---');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: `test_${Date.now()}@test.com`, // Unique email
                password: 'password123',
                role: 'PATIENT'
            })
        });
        const regData = await regRes.json();
        console.log('Status:', regRes.status);
        console.log('Response:', regData);
        if (!regRes.ok) throw new Error('Registration failed');

        console.log('\n--- Testing Login ---');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: regData.email || `test_${Date.now()}@test.com`, // Use correct email
                password: 'password123'
            }) // Note: Using the same email generated above would require passing it down. Let's fix this structure.
        });

        // Better flow:
        const email = `test_${Date.now()}@example.com`;
        // Register specific user
        await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test', email, password: 'password123', role: 'PATIENT' })
        });

        // Login specific user
        const loginRes2 = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        const loginData = await loginRes2.json();
        console.log('Login Status:', loginRes2.status);
        // console.log('Login Response:', loginData);
        if (!loginRes2.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));

        const token = loginData.token;
        console.log('Token received:', token ? 'YES' : 'NO');

        console.log('\n--- Testing /me ---');
        const meRes = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const meData = await meRes.json();
        console.log('Status:', meRes.status);
        console.log('Response:', meData);
        if (!meRes.ok) throw new Error('/me failed');

        console.log('\n✅ All Phase 1 tests passed!');

    } catch (err) {
        console.error('\n❌ Test Failed:', err.message);
        process.exit(1);
    }
}

testApi();
