# NutriLens Server 🖥️⚙️

Welcome to the backend server of **NutriLens**. This is an **Express** API backend that processes meal logs, stores nutrition history, uploads progress photos, and connects with **Gemini AI** to scan food photos.

---

## 🛠️ Features & Endpoints

### 1. Meal Routes (`/api/meals`)
-   `POST /api/meals/scan` - Accepts an uploaded image of a meal, sends it to Gemini AI for image recognition, and returns calorie/macro breakdowns.
-   `POST /api/meals` - Logs a new meal to the database.
-   `GET /api/meals` - Retrieves historical meal logs.

### 2. Progress Routes (`/api/progress`)
-   `POST /api/progress/upload` - Uploads user progress photos to Cloudinary.
-   `GET /api/progress` - Retrieves a list of uploaded progress photos with timestamps.

### 3. Health Check
-   `GET /api/health` - Simple check to ensure the backend is running.

---

## 📦 Technology Stack

-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB + Mongoose ORM
-   **AI Integration**: Google Gemini API (`@google/generative-ai`)
-   **Image Uploads**: Cloudinary + Multer (multipart form handling)
-   **Image Processing**: Sharp (for image compression/formatting)

---

## 💻 Getting Started

### Prerequisites

Make sure you have:
-   [Node.js](https://nodejs.org/) installed
-   A running [MongoDB](https://www.mongodb.com/) instance (local or Mongo Atlas Atlas cluster)
-   A Google Gemini API Key
-   A Cloudinary account (for progress picture storage)

### Installation

1.  Navigate to the `server/` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

Create a `.env` file in the `server/` directory (you can copy from `.env.example`):

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FATSECRET_CLIENT_ID=your_fatsecret_id
FATSECRET_CLIENT_SECRET=your_fatsecret_secret
```

### Running the Server

Start the server in development mode:

```bash
npm start
```

The server will run at `http://localhost:5000`.
