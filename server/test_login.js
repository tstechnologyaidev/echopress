import fetch from 'node-fetch';

async function testLogin(username, password) {
  console.log(`Testing login for ${username}...`);
  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      console.log("✅ Login successful!");
      console.log("User data:", data.user);
    } else {
      console.log("❌ Login failed:", data.error);
    }
  } catch (err) {
    console.error("❌ Error connecting to server:", err.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const res = await fetch('http://localhost:3000/api/weather');
    if (res.ok) {
      console.log("Server is running.");
      await testLogin('Lucas Knight', 'EchoPressSupervisor!');
    } else {
      console.log("Server is not running on port 3000.");
    }
  } catch (err) {
    console.log("Server is not running on port 3000.");
  }
}

checkServer();
