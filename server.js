const express = require("express");
const OpenAI = require("openai");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "20mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Image Engine funcionando");
});

app.post("/enhance", async (req, res) => {
  try {

    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        success: false,
        error: "Falta image_url"
      });
    }

    const response = await axios.get(image_url, {
      responseType: "arraybuffer"
    });

    const imageBuffer = Buffer.from(response.data);

  const result = await client.images.edit({
  model: "gpt-image-1",
  image: imageBuffer,
  prompt: "Improve the lighting, sharpness and colors while preserving the original photograph. Keep the same composition, people and identity. Produce a realistic high-quality result."
});

res.json({
  success: true,
  result
});

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});