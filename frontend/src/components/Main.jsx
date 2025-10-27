import React, { useEffect, useState } from "react";
import "./Main.css";

const Main = () => {
  const [data, setData] = useState({ notices: {}, events: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/news");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">불러오는 중...</div>;

  // ✅ 안전한 날짜 변환 함수
  const toSafeDate = (value) => {
    if (!value || typeof value !== "string") return null;
    const str = value.trim();
    if (str.length < 8) return null;

    // Z(UTC) 표시가 없으면 자동 추가
    const hasZone = /[zZ]|([+\-]\d{2}:\d{2})$/.test(str);
    const date = new Date(hasZone ? str : str + "Z");

    return isNaN(date.getTime()) ? null : date;
  };

  // ✅ 날짜 표시 로직
  const formatDate = (item, section) => {
    const now = new Date();

    if (section === "notices" && item.Date) {
      const d = toSafeDate(item.Date);
      return d ? d.toLocaleDateString("ko-KR") : "날짜 정보 없음";
    }

    if (section === "events") {
      const start = toSafeDate(item.StartDate);
      const end = toSafeDate(item.EndDate);

      if (start && end) {
        let status = "";
        if (now >= start && now <= end) status = "🟢 진행 중";
        else if (now < start) status = "🕓 예정";
        else if (now > end) status = "🔴 종료됨";

        return `${start.toLocaleDateString("ko-KR")} ~ ${end.toLocaleDateString("ko-KR")} ${status}`;
      }

      if (start) return `시작: ${start.toLocaleDateString("ko-KR")}`;
      if (end) return `종료: ${end.toLocaleDateString("ko-KR")}`;
    }

    return "날짜 정보 없음";
  };

  return (
  <div className="main-container">
    <h1 className="title">Lost Info</h1>

    <div className="sections-wrapper">
      {/* 📢 공지사항 */}
      <section className="section notice">
        <h2>공지사항</h2>
        <ul>
          {Array.isArray(data.notices?.list) && data.notices.list.length > 0 ? (
            data.notices.list.map((item, idx) => (
              <li key={idx}>
                <a href={item.Link} target="_blank" rel="noreferrer">
                  {item.Title}
                </a>
                <span>{formatDate(item, "notices")}</span>
              </li>
            ))
          ) : (
            <li>공지사항이 없습니다.</li>
          )}
        </ul>
      </section>

      {/* 🎉 이벤트 */}
      <section className="section event">
        <h2>이벤트</h2>
        <ul>
          {Array.isArray(data.events?.list) && data.events.list.length > 0 ? (
            data.events.list.map((item, idx) => (
              <li key={idx}>
                <a href={item.Link} target="_blank" rel="noreferrer">
                  {item.Title}
                </a>
                <span>{formatDate(item, "events")}</span>
              </li>
            ))
          ) : (
            <li>진행 중인 이벤트가 없습니다.</li>
          )}
        </ul>
      </section>
    </div>
  </div>
);
};

export default Main;
