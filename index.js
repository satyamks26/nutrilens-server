const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const mealRoutes = require('./routes/mealRoutes');
const progressRoutes = require('./routes/progressRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Root health & info endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NutriLens Backend API',
    endpoints: {
      health: '/api/health',
      meals: '/api/meals',
      scan: '/api/meals/scan',
      progress: '/api/progress'
    },
    message: 'Backend is active and running successfully!'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NutriLens Server is running' });
});

// Routes
app.use('/api/meals', mealRoutes);
app.use('/api/progress', progressRoutes);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nutrilens')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
