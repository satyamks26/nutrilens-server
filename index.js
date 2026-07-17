const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const mealRoutes = require('./routes/mealRoutes');
const progressRoutes = require('./routes/progressRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/meals', mealRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NutriLens Server is running' });
});

// Database Connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nutrilens')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
