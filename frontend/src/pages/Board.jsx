// src/pages/Board.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Board.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const CATEGORIES = ["전체", "잡담", "정보", "웃긴글", "기타"];

export default function Board() {
  const navigate = useNavigate();

  const [category, setCategory] = useState("전체");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/board`, {
        params: { category, page, pageSize },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("게시판 목록 불러오기 실패:", e?.message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page]);

  // 전체글 기준 역순 번호 계산
  const computeNo = (idx) => total - (page - 1) * pageSize - idx;

  const formatDate = (iso) => {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${mi}`;
  };

  const goWrite = () => {
    const cat = category === "전체" ? "잡담" : category;
    navigate(`/upload?category=${encodeURIComponent(cat)}`);
  };

  // 제목 클릭/Enter로 상세 이동
  const goDetail = (id) => {
    if (!id) return;
    navigate(`/board/${id}`);
  };

  return (
    <div className="board-wrap">
      <div className="board-header">
        <div className="tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`tab ${c === category ? "active" : ""}`}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="actions">
          <button className="tab" onClick={goWrite}>글쓰기</button>
        </div>
      </div>

      <div className="board-table">
        <div className="thead">
          <div className="th no">번호</div>
          <div className="th title">제목</div>
          <div className="th author">글쓴이</div>
          <div className="th date">등록일</div>
          <div className="th views">조회</div>
          <div className="th likes">추천</div>
        </div>

        {loading ? (
          <div className="loading">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="empty">게시글이 없습니다.</div>
        ) : (
          rows.map((row, idx) => (
            <div key={row._id || row.id || idx} className="tr">
              <div className="td no">{computeNo(idx)}</div>

              {/* ✅ 제목을 클릭/Enter로 상세 이동 */}
              <div
                className="td title clickable"
                role="button"
                tabIndex={0}
                onClick={() => goDetail(row._id || row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goDetail(row._id || row.id);
                }}
                title="상세 보기"
              >
                <span className="cat">[{row.category}]</span>{" "}
                <span className="t">{row.title}</span>
              </div>

              <div className="td author">{row.author?.username || "익명"}</div>
              <div className="td date">{formatDate(row.createdAt)}</div>
              <div className="td views">{row.views ?? 0}</div>
              <div className="td likes">{row.likes ?? 0}</div>
            </div>
          ))
        )}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          이전
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}
