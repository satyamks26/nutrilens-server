const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const ProgressPhoto = require('../models/ProgressPhoto');

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const upload = multer({ dest: 'uploads/' });

// GET all progress photos
router.get('/', async (req, res) => {
  try {
    const photos = await ProgressPhoto.find().sort({ date: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new progress photo
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  try {
    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'nutrilens_progress'
    });

    // Clean up local temp file
    try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) { console.warn('Could not delete temp file:', e.message); }

    // Save to database
    const newPhoto = new ProgressPhoto({
      imageUrl: result.secure_url,
      weight: req.body.weight ? parseFloat(req.body.weight) : undefined
    });
    
    const savedPhoto = await newPhoto.save();
    res.status(201).json(savedPhoto);

  } catch (error) {
    // Clean up local temp file on error too
    try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
});

module.exports = router;
