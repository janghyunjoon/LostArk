import React, { useEffect, useState } from "react";
import "./Main.css";

const Main = () => {
  const [data, setData] = useState({ notices: {}, events: {}, alarms: {} });
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

  return (
    <div className="main-container">
      <h1 className="title">Lost Ark 뉴스</h1>

      {/* 📢 공지사항 */}
      <section className="section">
        <h2>📢 공지사항</h2>
        <ul>
          {(data.notices?.list || []).map((item, idx) => (
            <li key={idx}>
              <a href={item.Link} target="_blank" rel="noreferrer">
                {item.Title}
              </a>
              <span>{new Date(item.Date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 🎉 이벤트 */}
      <section className="section">
        <h2>🎉 이벤트</h2>
        <ul>
          {(data.events?.list || []).map((item, idx) => (
            <li key={idx}>
              <a href={item.Link} target="_blank" rel="noreferrer">
                {item.Title}
              </a>
              <span>{new Date(item.Date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ⏰ 알람 */}
      <section className="section">
        <h2>⏰ 알람</h2>
        <ul>
          {(data.alarms?.list || []).map((item, idx) => (
            <li key={idx}>
              <a href={item.Link} target="_blank" rel="noreferrer">
                {item.Title}
              </a>
              <span>{new Date(item.Date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Main;
