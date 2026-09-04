require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes =
    require("./routes/auth.routes");

const eventRoutes =
    require("./routes/event.routes");

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "TTTN_MIS_04 API is running"
    });

});


app.use(
    "/api/auth",
    authRoutes
);


app.use(
    "/api/events",
    eventRoutes
);


const registrationRoutes = require("./routes/registration.routes");
app.use("/api", registrationRoutes);

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });

});


module.exports = app;