require("dotenv").config();
const mongoose = require("mongoose");

// MODELS
const User = require("./models/User");
const ChessGame = require("./models/ChessGame");
const Reel = require("./models/Reel");
const Comment = require("./models/Comment");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      ChessGame.deleteMany(),
      Reel.deleteMany(),
      Comment.deleteMany(),
    ]);

    console.log("Old data cleared");

    // USERS
    const [admin, user1] = await User.insertMany([
      {
        username: "admin_gm",
        email: "admin@chessreels.com",
        profile: {
          name: "Chess Admin",
          avatarUrl: "https://cdn.app.com/avatar/admin.png",
          bio: "GM games curator",
          chessRating: 2500
        }
      },
      {
        username: "pawncrusher",
        email: "user@chessreels.com",
        profile: {
          name: "Pawn Crusher",
          avatarUrl: "https://cdn.app.com/avatar/user.png",
          bio: "Learning tactics",
          chessRating: 1200
        }
      }
    ]);

    console.log("Users created");

    // CHESS GAME
    const game = await ChessGame.create({
      whitePlayer: "Garry Kasparov",
      blackPlayer: "Anatoly Karpov",
      event: "World Championship",
      year: 1985,
      result: "1-0",
      pgn: "1.e4 c5 2.Nf3 d6 3.d4..."
    });

    console.log("Chess game created");

    // REEL
    const reel = await Reel.create({
      createdBy: admin._id,
      video: {
        url: "https://cdn.app.com/videos/kasparov.mp4",
        thumbnail: "https://cdn.app.com/thumbs/kasparov.jpg",
        durationSec: 45
      },
      content: {
        title: "Kasparov's Brutal Opening",
        description: "Can you find the best move?",
        tags: ["opening", "kasparov", "sicilian"],
        difficulty: "intermediate"
      },
      gameId: game._id,
      engagement: {
        likes: 10,
        views: 100
      },
      status: "published"
    });

    console.log("Reel created");

    // COMMENT
    const comment = await Comment.create({
      reelId: reel._id,
      userId: user1._id,
      text: "Wow, that central break is powerful!"
    });

    console.log("Comment created");


    console.log("SEEDING COMPLETE");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
