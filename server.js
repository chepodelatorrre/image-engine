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

  ENHANCE_PROMPT: `
Improve the photographic quality while preserving the original image exactly.

Never modify the identity, facial features, age, expression or body of any person.

Never add, remove or replace objects or scenery.

Improve only lighting, exposure, dynamic range, white balance, sharpness, noise reduction and natural colors.

The output must remain a realistic professional photograph with no AI-generated appearance.
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
   TEMPORARY JOB STORAGE
=========================== */

const jobs = new Map();

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

  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  jobs.set(jobId, {
    status: "processing",
    image_url: null,
    error: null
  });

  /* Respuesta inmediata */
  res.status(202).json({
    success: true,
    job_id: jobId,
    status: "processing"
  });

  /* ===========================
     PROCESAMIENTO EN SEGUNDO PLANO
  =========================== */

  (async () => {

    const start = Date.now();

    const logTime = (mensaje) => {
      console.log(
        `${Date.now() - start} ms | ${mensaje} | job ${jobId}`
      );
    };

    try {

      logTime("Procesamiento iniciado");

      const response = await axios.get(image_url, {
  responseType: "arraybuffer",
  timeout: 10000,
  maxRedirects: 10,
  headers: {
    "User-Agent": "Mozilla/5.0"
  },
  validateStatus: () => true
});

logTime(`Descarga HTTP status ${response.status}`);
logTime(`Descarga HTTP content-type ${response.headers["content-type"]}`);

if (response.status !== 200) {
  throw new Error(`Descarga de imagen falló con HTTP ${response.status}`);
}

      logTime("Imagen descargada");

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

      jobs.set(jobId, {
        status: "completed",
        image_url: uploadResult.secure_url,
        error: null
      });

      logTime("Trabajo completado");

    } catch (error) {

      logTime(`Error: ${error.message}`);

      jobs.set(jobId, {
        status: "failed",
        image_url: null,
        error: error.message
      });

    }

  })();

});

/* ===========================
   CHECK JOB STATUS
=========================== */

app.get("/enhance/status/:jobId", (req, res) => {

  const jobId = req.params.jobId;

  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: "Trabajo no encontrado"
    });
  }

  if (job.status === "processing") {

    return res.json({
      success: true,
      job_id: jobId,
      status: "processing"
    });

  }

  if (job.status === "failed") {

    return res.status(500).json({
      success: false,
      job_id: jobId,
      status: "failed",
      error: job.error
    });

  }

  return res.json({
    success: true,
    job_id: jobId,
    status: "completed",
    image_url: job.image_url
  });

});

/* ===========================
   SERVER
=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});