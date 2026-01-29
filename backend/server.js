const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error(err));

app.use("/data", require("./routes/dataRoute"));

app.listen(process.env.PORT, () => {
    console.log("Server running on http://localhost:5000");
});
