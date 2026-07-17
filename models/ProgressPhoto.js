const mongoose = require('mongoose');

const progressPhotoSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  weight: {
    type: Number,
    required: false
  }
});

module.exports = mongoose.model('ProgressPhoto', progressPhotoSchema);
