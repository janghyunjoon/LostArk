// index.js
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

// 라우트
const userRoutes = require("./routes/user");
const boardRoutes = require("./routes/Board"); // ⬅️ 파일명/경로 소문자 일치 확인
const lostarkRoutes = require("./routes/lostark"); // ⬅️ 추가

const app = express();

/* =========================
   CORS
   ========================= */
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: FRONT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================
   공통 미들웨어
   ========================= */
app.use(express.json({ limit: "10mb" })); // JSON 요청 본문
app.use(cookieParser());

// (디버그) 들어오는 요청 간단 로깅
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

/* =========================
   Lost Ark API 프록시 (공지/이벤트)
   ========================= */
const BASE_URL = "https://developer-lostark.game.onstove.com";
const HEADERS = {
  accept: "application/json",
  // 권장 표기: bearer (소문자)
  authorization: `bearer ${process.env.LOSTARK_API_KEY}`,
};

// 공지사항
app.get("/api/notices", async (_req, res) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/news/notices`, {
      headers: HEADERS,
      timeout: 10000,
    });
    res.json({ list: Array.isArray(data) ? data : [] });
  } catch (err) {
    console.error("공지사항 API 오류:", err.message);
    res.status(500).json({ error: "공지사항 데이터를 불러올 수 없습니다." });
  }
});

// 이벤트
app.get("/api/events", async (_req, res) => {
  try {
    const { data: raw } = await axios.get(`${BASE_URL}/news/events`, {
      headers: HEADERS,
      timeout: 10000,
    });
    const data = Array.isArray(raw)
      ? raw.map((item) => ({
          ...item,
          StartDate: item.StartDate ? item.StartDate + "Z" : null,
          EndDate: item.EndDate ? item.EndDate + "Z" : null,
          RewardDate: item.RewardDate ? item.RewardDate + "Z" : null,
        }))
      : [];
    res.json({ list: data });
  } catch (err) {
    console.error("이벤트 API 오류:", err.message);
    res.status(500).json({ error: "이벤트 데이터를 불러올 수 없습니다." });
  }
});

// 공지 + 이벤트 합본
app.get("/api/news", async (_req, res) => {
  try {
    const [nRes, eRes] = await Promise.all([
      axios.get(`${BASE_URL}/news/notices`, { headers: HEADERS, timeout: 10000 }),
      axios.get(`${BASE_URL}/news/events`, { headers: HEADERS, timeout: 10000 }),
    ]);
    const notices = Array.isArray(nRes.data) ? nRes.data : [];
    const events = Array.isArray(eRes.data)
      ? eRes.data.map((item) => ({
          ...item,
          StartDate: item.StartDate ? item.StartDate + "Z" : null,
          EndDate: item.EndDate ? item.EndDate + "Z" : null,
          RewardDate: item.RewardDate ? item.RewardDate + "Z" : null,
        }))
      : [];
    res.json({ notices: { list: notices }, events: { list: events } });
  } catch (err) {
    console.error("API 병합 요청 실패:", err.message);
    res.status(500).json({ error: "Lost Ark API 요청 실패" });
  }
});

/* =========================
   기능 라우트
   ========================= */
app.use("/api/user", userRoutes);
app.use("/api/board", boardRoutes);

// 🔹 Lost Ark OpenAPI 캐릭터/아머리 프록시 라우트 (신규)
app.use("/api/lostark", lostarkRoutes);

/* =========================
   헬스체크
   ========================= */
app.get("/", (_req, res) => res.send("API OK"));

/* =========================
   404 핸들러
   ========================= */
app.use((req, res) => {
  console.warn("404:", req.method, req.originalUrl);
  res.status(404).json({ error: "Not Found" });
});

/* =========================
   서버 시작
   ========================= */
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 CORS Origin: ${FRONT_ORIGIN}`);
});

/* =========================
   MongoDB 연결
   ========================= */
const MONGO_URI = process.env.MONGO_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err.message));
