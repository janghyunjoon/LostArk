const express = require("express");
const Post = require("../models/Post");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// 진단용 핑
router.get("/ping", (_req, res) => res.json({ ok: true }));

// 목록
router.get("/", async (req, res) => {
  const { category = "전체", page = 1, pageSize = 20, keyword = "" } = req.query;

  const p = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 50);

  const filter = {};
  if (category !== "전체") filter.category = category;
  if (keyword) filter.title = { $regex: keyword, $options: "i" };

  const total = await Post.countDocuments(filter);
  const items = await Post.find(filter)
    .sort({ createdAt: -1 })
    .skip((p - 1) * size)
    .limit(size)
    .lean();

  res.json({ total, page: p, pageSize: size, items });
});

// 글 작성 (인증)
router.post("/", requireAuth, async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content || !category)
    return res.status(400).json({ message: "필수 값 누락" });

  const doc = await Post.create({
    title,
    content,
    category,
    author: { _id: req.user.userId, username: req.user.username }
  });
  res.status(201).json({ message: "등록 완료", post: doc });
});

// 조회수 +1
router.patch("/:id/view", async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
  res.json({ ok: true });
});

// 추천 +1 (인증)
router.patch("/:id/like", requireAuth, async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.json({ ok: true });
});

module.exports = router;
