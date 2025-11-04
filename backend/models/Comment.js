// backend/models/Comment.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    content: { type: String, required: true, trim: true },
    author: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
    },
    // 추천/비추천 중복 방지용
    likedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
