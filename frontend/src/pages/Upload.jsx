// src/pages/Upload.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./Upload.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const CATEGORIES = ["잡담", "정보", "웃긴글", "기타"]; // "전체" 제외

export default function Upload() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  // 쿼리에서 카테고리 기본값
  const rawCat = sp.get("category") || "";
  const defaultCat = CATEGORIES.includes(rawCat) ? rawCat : "잡담";

  const token = useMemo(() => localStorage.getItem("token"), []);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCat);
  const [content, setContent] = useState("");

  // 파일 & 미리보기
  const [files, setFiles] = useState([]);         // File[]
  const [previews, setPreviews] = useState([]);   // [{url,name,size,type,idx}]
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  // 미리보기 생성/정리
  useEffect(() => {
    const next = [];
    files.forEach((f, idx) => {
      const url = URL.createObjectURL(f);
      next.push({ url, name: f.name, size: f.size, type: f.type, idx });
    });
    setPreviews(next);
    return () => next.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);

  // 파일 선택
  const onPickFiles = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setFiles((prev) => [...prev, ...list]);
    e.target.value = ""; // 같은 파일 재선택 가능
  };

  // 드래그 앤 드롭
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const list = Array.from(e.dataTransfer.files || []);
    if (list.length === 0) return;
    setFiles((prev) => [...prev, ...list]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/signin");
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      fd.append("category", category);
      files.forEach((f) => fd.append("files", f)); // 서버: upload.array('files')

      const { data } = await axios.post(`${API}/api/board`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Content-Type 은 브라우저가 자동 설정(boundary 포함)
        },
      });

      const newId = data?._id || data?.id;
      if (newId) navigate(`/board/${newId}`);
      else navigate("/board");
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      alert(`등록 실패: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="upload-wrap">
      <h1 className="upload-title">글쓰기</h1>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="row">
          <label className="label" htmlFor="title">제목</label>
          <input
            id="title"
            className="input"
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <div className="hint">{title.length}/120</div>
        </div>

        <div className="row">
          <label className="label" htmlFor="category">카테고리</label>
          <select
            id="category"
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <label className="label" htmlFor="content">내용</label>
          <textarea
            id="content"
            className="textarea"
            placeholder="본문을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
          />
          <div className="hint">{content.length.toLocaleString()} chars</div>
        </div>

        <div
          ref={dropRef}
          className={`dropzone ${dragOver ? "over" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <p className="drop-title">이미지/파일 드래그&드롭 또는 클릭하여 선택</p>
          <p className="drop-sub">PNG, JPG, GIF, PDF 등 (여러 개 가능)</p>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            multiple
            onChange={onPickFiles}
            accept="image/*,application/pdf"
          />
        </div>

        {previews.length > 0 && (
          <div className="preview-grid">
            {previews.map((p, i) => (
              <div key={i} className="preview-item">
                {p.type.startsWith("image/") ? (
                  <img src={p.url} alt={p.name} />
                ) : (
                  <div className="file-thumb">
                    <span className="file-name">{p.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            취소
          </button>
          <button type="submit" className="btn primary" disabled={!canSubmit}>
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
