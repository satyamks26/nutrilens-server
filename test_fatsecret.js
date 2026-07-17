require('dotenv').config();
const axios = require('axios');

const getFatSecretToken = async () => {
  try {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://oauth.fatsecret.com/connect/token',
      'grant_type=client_credentials&scope=basic',
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('FatSecret OAuth Error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with FatSecret API');
  }
};

const searchFatSecret = async (searchQuery) => {
  try {
    const token = await getFatSecretToken();
    console.log('Got OAuth Token. Attempting to search:', searchQuery);
    
    const response = await axios.post(
      'https://platform.fatsecret.com/rest/server.api',
      new URLSearchParams({
        method: 'foods.search',
        search_expression: searchQuery,
        format: 'json',
        max_results: '1'
      }),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.error) {
       console.log('\n❌ FATSECRET IS STILL BLOCKED OR ERRORED:');
       console.log(response.data.error);
       return;
    }
    
    console.log('\n✅ FATSECRET IS WORKING! Data received:');
    console.log(JSON.stringify(response.data.foods, null, 2));

  } catch (error) {
    console.error('\n❌ FatSecret API Request failed:', error.response?.data || error.message);
  }
};

searchFatSecret('Paneer Butter Masala');
