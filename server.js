const express = require("express");
const OpenAI = require("openai");
const { toFile } = require("openai/uploads");
const { v2: cloudinary } = require("cloudinary");
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

ENHANCE_PROMPT: `
Enhance the technical quality of the original photograph only.

PRESERVE THE PERSON EXACTLY AS SHOWN IN THE SOURCE IMAGE.
Do not regenerate, reconstruct, beautify, retouch, reshape or reinterpret the person's face.
Do not change facial identity, facial structure, proportions, skin texture, skin tone, eyes, eyebrows, nose, mouth, lips, teeth, cheeks, jawline, chin, ears, hairline or hairstyle.
Do not change age, expression, gaze, pose, body shape or physical appearance.
Do not smooth or artificially perfect the skin.
Do not make the person look younger, more attractive or different.

The person's face and body must remain visually identical to the source photograph.

ONLY improve technical photographic quality:
- exposure
- lighting balance
- dynamic range
- white balance
- natural color
- moderate sharpness
- noise reduction
- recovery of existing image detail
- overall image clarity

Do not invent details that are not present in the original.
Do not add, remove, replace or alter objects, people or scenery.

The result must look like the SAME photograph captured with a better camera and better processing, not like a newly generated or reconstructed photograph.

If improving image quality conflicts with preserving the person's appearance, PRIORITIZE PRESERVING THE ORIGINAL PERSON.
`,

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

/* ===========================
HEALTH CHECK
=========================== */

app.get("/", (req, res) => {
  res.send("Image Engine funcionando");
});

/* ===========================
START IMAGE JOB
=========================== */

app.post("/enhance", async (req, res) => {

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

  const start = Date.now();

  const logTime = (mensaje) => {
    console.log(
      `${Date.now() - start} ms | ${mensaje}`
    );
  };

  try {

    logTime("Procesamiento iniciado");

    logTime(`URL recibida: ${image_url}`);

    const response = await fetch(image_url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    logTime(`Descarga HTTP status ${response.status}`);

    logTime(
      `Descarga HTTP content-type ${response.headers.get("content-type")}`
    );

    if (!response.ok) {
      throw new Error(
        `Descarga de imagen falló con HTTP ${response.status}`
      );
    }

    const imageBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    logTime("Imagen descargada");

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
      quality: CONFIG.OUTPUT_QUALITY,
    });

    logTime("OpenAI completado");

    const uploadResult = await cloudinary.uploader.upload(
      `data:image/png;base64,${result.data[0].b64_json}`,
      {
        folder: CONFIG.CLOUDINARY_FOLDER
      }
    );

    logTime("Cloudinary completado");

    logTime("Trabajo completado");

    return res.status(200).json({
      success: true,
      status: "completed",
      image_url: uploadResult.secure_url
    });

  } catch (error) {

    logTime(`Error: ${error.message}`);

    return res.status(500).json({
      success: false,
      status: "failed",
      image_url: null,
      error: error.message
    });

  }

});

/* ===========================
SERVER
=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});