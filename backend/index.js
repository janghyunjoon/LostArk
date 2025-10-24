import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config(); // .env 파일 로드

const app = express();
app.use(cors());

// 기본 설정
const BASE_URL = "https://developer-lostark.game.onstove.com";
const HEADERS = {
  accept: "application/json",
  authorization: `Bearer ${process.env.LOSTARK_API_KEY}`, // ✅ 환경변수명 수정
};

// 🔹 공지사항
app.get("/api/notices", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/news/notices`, { headers: HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("공지사항 API 오류:", err);
    res.status(500).json({ error: "공지사항 데이터를 불러올 수 없습니다." });
  }
});

// 🔹 이벤트
app.get("/api/events", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/news/events`, { headers: HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("이벤트 API 오류:", err);
    res.status(500).json({ error: "이벤트 데이터를 불러올 수 없습니다." });
  }
});

// 🔹 알람
app.get("/api/alarms", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/news/alarms`, { headers: HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("알람 API 오류:", err);
    res.status(500).json({ error: "알람 데이터를 불러올 수 없습니다." });
  }
});

// 🔹 한 번에 세 가지 모두 반환
app.get("/api/news", async (req, res) => {
  try {
    const [noticesRes, eventsRes, alarmsRes] = await Promise.all([
      fetch(`${BASE_URL}/news/notices`, { headers: HEADERS }),
      fetch(`${BASE_URL}/news/events`, { headers: HEADERS }),
      fetch(`${BASE_URL}/news/alarms`, { headers: HEADERS }),
    ]);

    const [notices, events, alarms] = await Promise.all([
      noticesRes.json(),
      eventsRes.json(),
      alarmsRes.json(),
    ]);

    res.json({ notices, events, alarms });
  } catch (err) {
    console.error("API 병합 요청 실패:", err);
    res.status(500).json({ error: "Lost Ark API 요청 실패" });
  }
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Lost Ark API Proxy running on port ${PORT}`));
