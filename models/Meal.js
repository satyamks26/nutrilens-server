const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  calories: {
    type: Number,
    required: true,
  },
  sugar: {
    type: Number,
    required: true,
  },
  protein: {
    type: Number,
    default: 0,
  },
  carbs: {
    type: Number,
    default: 0,
  },
  fats: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    default: 'Snack',
  },
  suggestion: {
    type: String,
  },
  healthTags: {
    type: [String],
    default: [],
  },
  betterAlternative: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Meal', mealSchema);
