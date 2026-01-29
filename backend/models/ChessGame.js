const mongoose = require("mongoose");

const chessGameSchema = new mongoose.Schema({
  whitePlayer: { type: String, required: true },
  blackPlayer: { type: String, required: true },
  event: String,
  year: Number,

  result: String,   
  pgn: { type: String, required: true }
});

module.exports = mongoose.model("ChessGame", chessGameSchema);
