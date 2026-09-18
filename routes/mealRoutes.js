const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const upload = multer({ dest: 'uploads/' });

// --- FATSECRET API LOGIC ---
let fatSecretToken = null;
let tokenExpiry = null;

const getFatSecretToken = async () => {
  // Return cached token if valid
  if (fatSecretToken && tokenExpiry && Date.now() < tokenExpiry) {
    return fatSecretToken;
  }

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

    fatSecretToken = response.data.access_token;
    // Set expiry 5 minutes before actual expiry (which is usually 3600s/1hr)
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
    console.log('FatSecret Token Refreshed successfully');
    return fatSecretToken;
  } catch (error) {
    console.error('FatSecret OAuth Error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with FatSecret API');
  }
};

const searchFatSecret = async (searchQuery) => {
  try {
    const token = await getFatSecretToken();
    
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
      console.error('FatSecret API Error:', response.data.error.message);
      throw new Error(`FatSecret API Error: ${response.data.error.message}`);
    }

    if (!response.data.foods || !response.data.foods.food) return null;
    
    // Handle array or single object response from FatSecret
    const foodItem = Array.isArray(response.data.foods.food) 
      ? response.data.foods.food[0] 
      : response.data.foods.food;
      
    // FatSecret description format: "Per 100g - Calories: 160kcal | Fat: 10.00g | Carbs: 15.00g | Protein: 2.00g"
    const desc = foodItem.food_description;
    
    // Regex parsing to extract macros
    const calMatch = desc.match(/Calories:\s*(\d+)kcal/);
    const fatMatch = desc.match(/Fat:\s*([\d.]+)g/);
    const carbMatch = desc.match(/Carbs:\s*([\d.]+)g/);
    const proteinMatch = desc.match(/Protein:\s*([\d.]+)g/);

    return {
      name: foodItem.food_name,
      calories: calMatch ? parseInt(calMatch[1]) : 0,
      fats: fatMatch ? parseFloat(fatMatch[1]) : 0,
      carbs: carbMatch ? parseFloat(carbMatch[1]) : 0,
      protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
      // Estimating sugar as a fraction of carbs for this integration
      sugar: carbMatch ? Math.round(parseFloat(carbMatch[1]) * 0.15) : 0 
    };
  } catch (error) {
    console.error('FatSecret Search Error:', error.response?.data || error.message);
    throw error;
  }
};

// --- AI ROUTING ENGINE ---

// 1. Gatekeeper Logic (Powered by Gemini 1.5 Flash Vision)
const classifyImage = async (imageFile, recentHistory) => {
  if (!imageFile) return { bucket: 'NON_FOOD', query: null };
  
  let processedImagePath = imageFile.path;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-3.6-flash or environment-configured model
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Ensure the image is JPEG using sharp to support avif, heic, webp, etc.
    const tempConvertedPath = path.join('uploads', `converted-${Date.now()}.jpg`);
    await sharp(imageFile.path)
      .jpeg({ quality: 80 })
      .toFile(tempConvertedPath);
      
    processedImagePath = tempConvertedPath;

    // Convert processed file to base64
    const imageData = fs.readFileSync(processedImagePath);
    const imagePart = {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType: 'image/jpeg'
      }
    };

    const prompt = `You are a highly empathetic, practical Indian Health Coach AI. Analyze this image carefully.
    Classify the image into exactly one of these buckets: 'PACKAGED_FOOD', 'PLATED_MEAL', 'WATER', or 'NON_FOOD'.
    CRITICAL RULE 1: If there is ANY food, dish, edible item, or beverage in the image (like Biryani, curries, fast food, etc.), no matter the angle or container, you MUST classify it as 'PLATED_MEAL'. NEVER classify edible items as NON_FOOD.
    CRITICAL RULE 2: Shiny plastic bags, branded snack packets (like Lays, Doritos), boxes, and wrappers ARE food and MUST be classified as 'PACKAGED_FOOD'.
    If it is a packaged food item or a plated meal, identify what it is specifically and provide a 'query' string (e.g., 'Chicken Biryani', 'Lays Chips').
    If it is strictly water or completely non-edible items, set query to null.
    If it is food, you MUST estimate the macronutrients based on the visual portion size and provide a 'macros' object (calories, protein, carbs, fats, sugar in grams).
    You MUST provide 'healthTags': an array of exactly 2 short strings summarizing the health impact (e.g., ["High Protein", "Watch Portion Size"] or ["Good for Digestion", "High Glycemic Index"]).
    You MUST provide a 'suggestion': Practical, culturally relevant advice (e.g., "Good protein, but missing fiber. Add some cucumber raita or salad next time.").
    ${recentHistory ? `CRITICAL RULE 3: The user has recently eaten: [${recentHistory}]. If they are repeating heavy/unhealthy meals, gently point it out in your suggestion. If they are eating better, praise them!` : ''}
    You MUST provide a 'betterAlternative': A 1-tap healthier swap (e.g., "Air-fried version = 400 kcal less" or "Swap white rice for brown rice for steady energy").
    You MUST return ONLY a raw JSON object.
    Format: {"bucket": "BUCKET_NAME", "query": "food name or null", "macros": {"calories": 0, "protein": 0, "carbs": 0, "fats": 0, "sugar": 0}, "healthTags": ["tag1", "tag2"], "suggestion": "...", "betterAlternative": "..."}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{text: prompt}, imagePart] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    const responseText = result.response.text();
    console.log("Raw Gemini Output:", responseText);
    
    // Parse the guaranteed JSON
    const classification = JSON.parse(responseText.trim());
    
    // Cleanup files from disk safely (prevent EBUSY crashes on Windows)
    try { if (fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path); } catch (e) { console.warn('Could not delete temp file:', e.message); }
    try { if (fs.existsSync(processedImagePath)) fs.unlinkSync(processedImagePath); } catch (e) { console.warn('Could not delete processed file:', e.message); }
    
    console.log('Gemini Classification:', classification);
    
    return classification;
  } catch (error) {
    console.log('\n--- GATEKEEPER ERROR ---');
    console.log('Error Message:', error.message);
    if (error.response) {
      console.log('Error Response Data:', error.response.data || error.response);
    }
    console.log('------------------------\n');
    console.error('Full Gemini Vision Error trace:', error);
    
    try { if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path); } catch(e){}
    try { if (fs.existsSync(processedImagePath)) fs.unlinkSync(processedImagePath); } catch(e){}
    
    // Throw the error explicitly so we can see it in the frontend!
    throw new Error(`Gemini Gatekeeper failed: ${error.message}`);
  }
};

// 2. Specialized Handlers hitting REAL FatSecret Database (With Gemini Fallback)
const handleFoodSearch = async (classification, defaultSuggestion) => {
  try {
    // Attempt to hit FatSecret first (Primary DB)
    const fatSecretData = await searchFatSecret(classification.query);
    
    if (!fatSecretData) throw new Error('Food not found in FatSecret database.');

    console.log('--- USING FATSECRET DATA ---');
    return {
      type: 'success',
      data: {
        name: fatSecretData.name,
        calories: fatSecretData.calories,
        sugar: fatSecretData.sugar,
        protein: fatSecretData.protein,
        carbs: fatSecretData.carbs,
        fats: fatSecretData.fats,
        suggestion: classification.suggestion || defaultSuggestion,
        healthTags: classification.healthTags || [],
        betterAlternative: classification.betterAlternative || ''
      }
    };
  } catch (error) {
    console.log(`--- FATSECRET FAILED: Falling back to Gemini Estimates --- | Reason: ${error.message}`);
    // Fallback to Gemini's estimated macros if FatSecret is blocked/fails
    return {
      type: 'success',
      data: {
        name: classification.query,
        calories: classification.macros?.calories || 0,
        sugar: classification.macros?.sugar || 0,
        protein: classification.macros?.protein || 0,
        carbs: classification.macros?.carbs || 0,
        fats: classification.macros?.fats || 0,
        suggestion: classification.suggestion || defaultSuggestion,
        healthTags: classification.healthTags || [],
        betterAlternative: classification.betterAlternative || ''
      }
    };
  }
};

// --- ROUTES ---

router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meals = await Meal.find({ date: { $gte: today } }).sort({ date: -1 });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const meals = await Meal.find().sort({ date: -1 });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// The Intelligent Scanner Endpoint
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    const recentHistory = req.body.recentHistory;
    // STEP 1: Pass to Gatekeeper Vision Model
    const classification = await classifyImage(req.file, recentHistory);

    // STEP 2: Route based on classification
    switch (classification.bucket) {
      case 'PACKAGED_FOOD':
        const packagedData = await handleFoodSearch(
          classification, 
          'Packaged foods often contain hidden sodium. Make sure to stay hydrated!'
        );
        return res.json(packagedData);
        
      case 'PLATED_MEAL':
        const platedData = await handleFoodSearch(
          classification,
          'Great choice! Consider replacing regular rice with brown rice for a lower sugar spike.'
        );
        return res.json(platedData);
        
      case 'WATER':
        return res.json({
          type: 'water_detected',
          message: 'Hydration detected! Would you like to log 1 glass of water?',
          data: null
        });
        
      case 'NON_FOOD':
        return res.status(400).json({
          type: 'error',
          message: 'No food detected in this image. Please try scanning your meal again!',
          data: null
        });
        
      default:
        return res.status(500).json({ type: 'error', message: 'Routing failed' });
    }

  } catch (error) {
    console.error('Scan Endpoint Error:', error);
    res.status(500).json({ type: 'error', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newMeal = new Meal(req.body);
    const savedMeal = await newMeal.save();
    res.status(201).json(savedMeal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
