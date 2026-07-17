require('dotenv').config();
const axios = require('axios');

async function testFatSecret() {
  try {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await axios.post(
      'https://oauth.fatsecret.com/connect/token',
      'grant_type=client_credentials&scope=basic',
      { headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const token = tokenRes.data.access_token;
    console.log("Token generated.");

    const response = await axios.post(
      'https://platform.fatsecret.com/rest/server.api',
      new URLSearchParams({
        method: 'foods.search',
        search_expression: 'Samosa',
        format: 'json',
        max_results: '1'
      }),
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log("FatSecret Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}

testFatSecret();
