const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, index: true },
    author: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String
    },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Post || mongoose.model("Post", PostSchema);
