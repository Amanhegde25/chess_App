import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { MONGO_URI } from "./config/env.js";

// Models
import User from "./models/User.js";
import ChessGame from "./models/ChessGame.js";
import Reel from "./models/Reel.js";
import Comment from "./models/Comment.js";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      ChessGame.deleteMany(),
      Reel.deleteMany(),
      Comment.deleteMany(),
    ]);

    console.log("Old data cleared");

    // Hash passwords for seed users
    const userPassword = await bcrypt.hash("user123", 10);

    // USERS
    const [user1] = await User.insertMany([
      {
        username: "pawncrusher",
        email: "user@chessreels.com",
        password: userPassword,
        profile: {
          name: "Pawn Crusher",
          avatarUrl: "https://cdn.app.com/avatar/user.png",
          bio: "Learning tactics",
          chessRating: 1200,
        },
      },
    ]);

    console.log("Users created");

    // CHESS GAME
    const game = await ChessGame.create({
      whitePlayer: "Garry Kasparov",
      blackPlayer: "Anatoly Karpov",
      event: "World Championship",
      year: 1985,
      result: "1-0",
      pgn: "1.e4 c5 2.Nf3 d6 3.d4...",
    });

    console.log("Chess game created");

    // REELS (Videos)
    const reels = await Reel.insertMany([
      {
        video: {
          url: "https://cdn.app.com/videos/kasparov.mp4",
          thumbnail: "https://cdn.app.com/thumbs/kasparov.jpg",
          durationSec: 45,
        },
        content: {
          title: "Kasparov's Brutal Opening",
          description: "Can you find the best move?",
          tags: ["opening", "kasparov", "sicilian"],
          difficulty: "intermediate",
        },
        gameId: game._id,
        engagement: { likes: 10, views: 100 },
        status: "published",
      },
      {
        video: {
          url: "https://cdn.app.com/videos/italian-game.mp4",
          thumbnail: "https://cdn.app.com/thumbs/italian.jpg",
          durationSec: 60,
        },
        content: {
          title: "Italian Game for Beginners",
          description: "Learn the classic Italian Game opening",
          tags: ["opening", "italian", "beginner"],
          difficulty: "beginner",
        },
        gameId: game._id,
        engagement: { likes: 25, views: 200 },
        status: "published",
      },
      {
        video: {
          url: "https://cdn.app.com/videos/queens-gambit.mp4",
          thumbnail: "https://cdn.app.com/thumbs/queens-gambit.jpg",
          durationSec: 90,
        },
        content: {
          title: "Queen's Gambit Masterclass",
          description: "Advanced strategies in the Queen's Gambit",
          tags: ["opening", "queens-gambit", "advanced"],
          difficulty: "advanced",
        },
        gameId: game._id,
        engagement: { likes: 50, views: 500 },
        status: "published",
      },
      {
        video: {
          url: "https://cdn.app.com/videos/endgame-basics.mp4",
          thumbnail: "https://cdn.app.com/thumbs/endgame.jpg",
          durationSec: 120,
        },
        content: {
          title: "Endgame Essentials",
          description: "Master the king and pawn endgame",
          tags: ["endgame", "basics", "beginner"],
          difficulty: "beginner",
        },
        gameId: game._id,
        engagement: { likes: 15, views: 150 },
        status: "draft",
      },
    ]);

    const reel = reels[0];
    console.log(`${reels.length} Reels/Videos created`);

    // COMMENTS - Parent with nested replies for testing
    const parentComment = await Comment.create({
      reelId: reel._id,
      userId: user1._id,
      text: "Wow, that central break is powerful!",
    });

    const reply1 = await Comment.create({
      reelId: reel._id,
      userId: user1._id,
      text: "I agree! Kasparov was a genius.",
      parentCommentId: parentComment._id,
    });

    await Comment.create({
      reelId: reel._id,
      userId: user1._id,
      text: "This reply is nested under reply1",
      parentCommentId: reply1._id,
    });

    await Comment.create({
      reelId: reel._id,
      userId: user1._id,
      text: "Another reply to the parent",
      parentCommentId: parentComment._id,
    });

    // Update parent's repliesCount
    await Comment.findByIdAndUpdate(parentComment._id, { repliesCount: 2 });
    await Comment.findByIdAndUpdate(reply1._id, { repliesCount: 1 });

    // Update reel's comment count
    await Reel.findByIdAndUpdate(reel._id, { "engagement.comments": 4 });

    console.log("4 Comments created (1 parent + 3 replies)");

    console.log("SEEDING COMPLETE");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
