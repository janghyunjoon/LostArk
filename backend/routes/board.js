// backend/routes/board.js
const express = require("express");
const multer = require("multer");
const Post = require("../models/Post");
const Comment = require("../models/comment");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

/** 멀터: 파일은 메모리 (S3 등은 추후) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB, 10개
});

// 진단용
router.get("/ping", (_req, res) => res.json({ ok: true }));

/** 목록 */
router.get("/", async (req, res) => {
  try {
    const { category = "전체", page = 1, pageSize = 20, keyword = "" } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 50);

    const filter = {};
    if (category !== "전체") filter.category = category;
    if (keyword) filter.title = { $regex: keyword, $options: "i" };

    const [total, items] = await Promise.all([
      Post.countDocuments(filter),
      Post.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * size)
        .limit(size)
        .lean(),
    ]);

    res.json({ total, page: p, pageSize: size, items });
  } catch (err) {
    console.error("GET /api/board error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 상세 */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Post.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "존재하지 않는 게시글" });
    res.json(doc);
  } catch (err) {
    console.error("GET /api/board/:id error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 글 작성 (multipart/form-data + 인증) */
router.post("/", requireAuth, upload.array("files"), async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ message: "필수 값 누락" });
    }

    const created = await Post.create({
      title: String(title).trim(),
      content: String(content).trim(),
      category,
      author: { _id: req.user.userId, username: req.user.username },
    });

    return res.status(201).json(created); // {_id,...}
  } catch (err) {
    console.error("POST /api/board error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 조회수 +1 */
router.patch("/:id/view", async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/board/:id/view error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 추천 +1 (인증) */
router.patch("/:id/like", requireAuth, async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/board/:id/like error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 삭제 (작성자 본인만) */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const doc = await Post.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "존재하지 않는 게시글" });

    const isOwner =
      (doc.author && doc.author._id && String(doc.author._id) === String(req.user.userId)) ||
      (doc.author && doc.author.username && doc.author.username === req.user.username);

    if (!isOwner) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    // 게시글 삭제 시 연결된 댓글도 함께 삭제
    await Promise.all([
      Comment.deleteMany({ postId: doc._id }),
      doc.deleteOne(),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/board/:id error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/* ==============================
   댓글 API
   ============================== */

/** 댓글 목록: 추천 30↑ '핀' 우선, 그 다음 최신순 */
router.get("/:id/comments", async (req, res) => {
  try {
    const postId = req.params.id;
    const list = await Comment.find({ postId }).sort({ createdAt: 1 }).lean();

    // likes/dislikes 계산 + pin 여부 필드 부여
    const decorated = list.map((c) => {
      const likes = (c.likedBy || []).length;
      const dislikes = (c.dislikedBy || []).length;
      return { ...c, likes, dislikes, pinned: likes >= 30 };
    });

    // pinned 먼저, pinned 내부는 오래된 순, 나머지도 오래된 순 (원하면 정렬 변경 OK)
    decorated.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // pinned 우선
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    res.json(decorated);
  } catch (err) {
    console.error("GET /api/board/:id/comments error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 댓글 작성 */
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "내용을 입력하세요." });
    }
    const created = await Comment.create({
      postId,
      content: content.trim(),
      author: { _id: req.user.userId, username: req.user.username },
      likedBy: [],
      dislikedBy: [],
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/board/:id/comments error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 댓글 삭제(작성자만) */
router.delete("/:id/comments/:cid", requireAuth, async (req, res) => {
  try {
    const { id: postId, cid } = req.params;
    const doc = await Comment.findOne({ _id: cid, postId });
    if (!doc) return res.status(404).json({ message: "존재하지 않는 댓글" });

    const isOwner =
      (doc.author && doc.author._id && String(doc.author._id) === String(req.user.userId)) ||
      (doc.author && doc.author.username && doc.author.username === req.user.username);

    if (!isOwner) return res.status(403).json({ message: "삭제 권한이 없습니다." });

    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/board/:id/comments/:cid error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 댓글 추천 토글 */
router.patch("/:id/comments/:cid/like", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: postId, cid } = req.params;

    const doc = await Comment.findOne({ _id: cid, postId });
    if (!doc) return res.status(404).json({ message: "존재하지 않는 댓글" });

    const hasLiked = doc.likedBy.some((u) => String(u) === String(userId));
    const hasDisliked = doc.dislikedBy.some((u) => String(u) === String(userId));

    if (hasLiked) {
      // 좋아요 취소
      doc.likedBy = doc.likedBy.filter((u) => String(u) !== String(userId));
    } else {
      // 좋아요 추가 + 싫어요 제거
      doc.likedBy.push(userId);
      if (hasDisliked) {
        doc.dislikedBy = doc.dislikedBy.filter((u) => String(u) !== String(userId));
      }
    }
    await doc.save();

    res.json({
      ok: true,
      likes: doc.likedBy.length,
      dislikes: doc.dislikedBy.length,
      pinned: doc.likedBy.length >= 30,
    });
  } catch (err) {
    console.error("PATCH /api/board/:id/comments/:cid/like error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/** 댓글 비추천 토글 */
router.patch("/:id/comments/:cid/dislike", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: postId, cid } = req.params;

    const doc = await Comment.findOne({ _id: cid, postId });
    if (!doc) return res.status(404).json({ message: "존재하지 않는 댓글" });

    const hasLiked = doc.likedBy.some((u) => String(u) === String(userId));
    const hasDisliked = doc.dislikedBy.some((u) => String(u) === String(userId));

    if (hasDisliked) {
      // 비추천 취소
      doc.dislikedBy = doc.dislikedBy.filter((u) => String(u) !== String(userId));
    } else {
      // 비추천 추가 + 좋아요 제거
      doc.dislikedBy.push(userId);
      if (hasLiked) {
        doc.likedBy = doc.likedBy.filter((u) => String(u) !== String(userId));
      }
    }
    await doc.save();

    res.json({
      ok: true,
      likes: doc.likedBy.length,
      dislikes: doc.dislikedBy.length,
      pinned: doc.likedBy.length >= 30,
    });
  } catch (err) {
    console.error("PATCH /api/board/:id/comments/:cid/dislike error:", err);
    res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

module.exports = router;
