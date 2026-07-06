const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

app.use(express.json());

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

    res.json({
      success: true,
      message: "Imagen recibida correctamente",
      image_url: image_url
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