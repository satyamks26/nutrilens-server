const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function run() {
  try {
    // Download a sample Lays image
    const imgUrl = 'https://m.media-amazon.com/images/I/71Y88s7yA-L._SX679_.jpg';
    const response = await axios.get(imgUrl, { responseType: 'stream' });
    const tempPath = path.join(__dirname, 'temp_lays.jpg');
    
    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Upload it to the local API
    const form = new FormData();
    form.append('image', fs.createReadStream(tempPath));
    
    console.log("Uploading to backend...");
    const uploadRes = await axios.post('http://localhost:5000/api/meals/scan', form, {
      headers: form.getHeaders()
    });
    
    console.log("API Response:");
    console.log(JSON.stringify(uploadRes.data, null, 2));
    
  } catch (err) {
    if (err.response) {
      console.error("API Error Status:", err.response.status);
      console.error("API Error Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

run();
