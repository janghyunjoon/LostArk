import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config(); // ✅ .env 파일 로드

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));

// ✅ 기본 설정
const BASE_URL = "https://developer-lostark.game.onstove.com";
const HEADERS = {
  accept: "application/json",
  authorization: `Bearer ${process.env.LOSTARK_API_KEY}`,
};

// ✅ 공지사항
app.get("/api/notices", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/news/notices`, { headers: HEADERS });
    const data = await response.json();
    res.json({ list: data });
  } catch (err) {
    console.error("공지사항 API 오류:", err);
    res.status(500).json({ error: "공지사항 데이터를 불러올 수 없습니다." });
  }
});

// ✅ 이벤트
app.get("/api/events", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/news/events`, { headers: HEADERS });
    let data = await response.json();

    // ✅ StartDate / EndDate 뒤에 Z 자동 추가 (ISO 보정)
    if (Array.isArray(data)) {
      data = data.map((item) => ({
        ...item,
        StartDate: item.StartDate ? item.StartDate + "Z" : null,
        EndDate: item.EndDate ? item.EndDate + "Z" : null,
        RewardDate: item.RewardDate ? item.RewardDate + "Z" : null,
      }));
    }

    res.json({ list: data });
  } catch (err) {
    console.error("이벤트 API 오류:", err);
    res.status(500).json({ error: "이벤트 데이터를 불러올 수 없습니다." });
  }
});

// ✅ 공지 + 이벤트 통합 라우트
app.get("/api/news", async (req, res) => {
  try {
    const [noticesRes, eventsRes] = await Promise.all([
      fetch(`${BASE_URL}/news/notices`, { headers: HEADERS }),
      fetch(`${BASE_URL}/news/events`, { headers: HEADERS }),
    ]);

    const [notices, eventsRaw] = await Promise.all([
      noticesRes.json(),
      eventsRes.json(),
    ]);

    // ✅ 이벤트 날짜 보정
    const events = Array.isArray(eventsRaw)
      ? eventsRaw.map((item) => ({
          ...item,
          StartDate: item.StartDate ? item.StartDate + "Z" : null,
          EndDate: item.EndDate ? item.EndDate + "Z" : null,
          RewardDate: item.RewardDate ? item.RewardDate + "Z" : null,
        }))
      : [];

    const safeArray = (data) => (Array.isArray(data) ? data : [data]);

    res.json({
      notices: { list: safeArray(notices) },
      events: { list: safeArray(events) },
    });
  } catch (err) {
    console.error("API 병합 요청 실패:", err);
    res.status(500).json({ error: "Lost Ark API 요청 실패" });
  }
});

// ✅ 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Lost Ark API Proxy running on port ${PORT}`));
