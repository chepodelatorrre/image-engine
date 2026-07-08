const express = require("express");
const OpenAI = require("openai");
const { toFile } = require("openai/uploads");
const { v2: cloudinary } = require("cloudinary");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "20mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ===========================
   IMAGE ENGINE CONFIGURATION
=========================== */

const CONFIG = {

  MODEL: "gpt-image-1",

  ENHANCE_PROMPT:
    "Improve the lighting, sharpness and colors while preserving the original photograph. Keep the same composition, people and identity. Produce a realistic high-quality result.",

  VALID_MODES: [
    "enhance",
    "generate",
    "branding"
  ],

  CLOUDINARY_FOLDER: "AI/Enhanced",

  INPUT_FILENAME: "photo.jpg",

  INPUT_MIME_TYPE: "image/jpeg",

  OUTPUT_FORMAT: "png",

  OUTPUT_QUALITY: "high"

};

app.get("/", (req, res) => {
  res.send("Image Engine funcionando");
});

app.post("/enhance", async (req, res) => {
  console.log("POST /enhance recibido");  

try {

const {
  image_url,
  mode = "enhance"
} = req.body;

if (!CONFIG.VALID_MODES.includes(mode)) {
  return res.status(400).json({
    success: false,
    error: "Modo no válido"
  });
}

    if (!image_url) {
      return res.status(400).json({
        success: false,
        error: "Falta image_url"
      });
    }

    const response = await axios.get(image_url, {
      responseType: "arraybuffer"
    });

    console.log("Imagen descargada");

  const imageBuffer = Buffer.from(response.data);

  const imageFile = await toFile(
  imageBuffer,
  CONFIG.INPUT_FILENAME,
  {
    type: CONFIG.INPUT_MIME_TYPE
  }
);

  const result = await client.images.edit({
  model: CONFIG.MODEL,
  image: imageFile,
  prompt: CONFIG.ENHANCE_PROMPT,
});

console.log("OpenAI completado");

const uploadResult = await cloudinary.uploader.upload(
  `data:image/png;base64,${result.data[0].b64_json}`,
  {
    folder: CONFIG.CLOUDINARY_FOLDER
  }
);

console.log("Cloudinary completado");

console.log("Respuesta enviada");

res.json({
  success: true,
  image_url: uploadResult.secure_url
});

  } catch (error) {

    res.status(500).json({
  success: false,
  error: {
    code: "INTERNAL_ERROR",
    message: error.message
  }
});

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});