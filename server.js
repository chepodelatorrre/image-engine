const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Image Engine funcionando");
});

app.post("/enhance", (req, res) => {
    res.json({
        success: true,
        message: "Servicio operativo"
    });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});