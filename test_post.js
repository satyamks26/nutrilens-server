const axios = require('axios');
axios.post('http://localhost:5000/api/meals', {
  name: "Test Food",
  calories: 100,
  sugar: 5,
  protein: 2,
  carbs: 10,
  fats: 5,
  suggestion: "Test"
}).then(res => console.log("Success:", res.data)).catch(err => console.log("Error:", err.response ? err.response.data : err.message));
