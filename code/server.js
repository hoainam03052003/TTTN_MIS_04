require("dotenv").config();

const app = require("./app");
const pool = require("./config/database");

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
    try {
        await pool.query("SELECT 1");
        console.log("Database connected");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Cannot connect to MySQL:", error.message);
        process.exit(1);
    }
}

startServer();
