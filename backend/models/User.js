const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },

  profile: {
    name: String,
    avatarUrl: String,
    bio: String,
    chessRating: { type: Number, default: 800 }
  },

  stats: {
    reelsWatched: { type: Number, default: 0 },
    puzzlesSolved: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 }
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model("User", userSchema);
