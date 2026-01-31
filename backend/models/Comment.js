import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  reelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reel",
    index: true,
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
  },

  text: String,

  likes: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },

  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Comment", commentSchema);
