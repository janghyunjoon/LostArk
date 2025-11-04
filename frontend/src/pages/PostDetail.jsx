// src/pages/PostDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PostDetail.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const me = useMemo(() => {
    const p = token ? decodeJwtPayload(token) : null;
    return p ? { userId: p.userId, username: p.username } : null;
  }, [token]);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // comments
  const [comments, setComments] = useState([]);
  const [cmtInput, setCmtInput] = useState("");
  const [cmtSubmitting, setCmtSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/board/${id}`);
        if (res.status === 404) {
          if (mounted) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setPost(data);
        // 조회수 +1 (실패 무시)
        fetch(`${API}/api/board/${id}/view`, { method: "PATCH" }).catch(() => {});
      } catch (e) {
        console.error("상세 불러오기 실패:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchComments() {
      try {
        const res = await fetch(`${API}/api/board/${id}/comments`);
        const list = await res.json();
        if (mounted) setComments(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("댓글 불러오기 실패:", e);
      }
    }

    fetchDetail();
    fetchComments();

    return () => {
      mounted = false;
    };
  }, [id]);

  const canDeletePost = useMemo(() => {
    if (!me || !post) return false;
    return (
      (post.author && post.author._id && me.userId && String(post.author._id) === String(me.userId)) ||
      (post.author && post.author.username && me.username && post.author.username === me.username)
    );
  }, [me, post]);

  const onDeletePost = async () => {
    if (!confirm("정말 이 글을 삭제하시겠어요?")) return;
    if (!token) return alert("로그인이 필요합니다.");

    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/board/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `삭제 실패 (HTTP ${res.status})`);
      }
      alert("삭제되었습니다.");
      navigate("/board");
    } catch (e) {
      console.error(e);
      alert(e.message || "삭제 실패");
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${mi}`;
  };

  const reloadComments = async () => {
    try {
      const res = await fetch(`${API}/api/board/${id}/comments`);
      const list = await res.json();
      setComments(Array.isArray(list) ? list : []);
    } catch {}
  };

  const submitComment = async () => {
    if (!token) return alert("로그인이 필요합니다.");
    const text = cmtInput.trim();
    if (!text) return;

    setCmtSubmitting(true);
    try {
      const res = await fetch(`${API}/api/board/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `댓글 등록 실패 (HTTP ${res.status})`);
      }
      setCmtInput("");
      await reloadComments();
    } catch (e) {
      alert(e.message || "댓글 등록 실패");
    } finally {
      setCmtSubmitting(false);
    }
  };

  const toggleLike = async (cid) => {
    if (!token) return alert("로그인이 필요합니다.");
    try {
      const res = await fetch(`${API}/api/board/${id}/comments/${cid}/like`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await reloadComments();
    } catch {}
  };

  const toggleDislike = async (cid) => {
    if (!token) return alert("로그인이 필요합니다.");
    try {
      const res = await fetch(`${API}/api/board/${id}/comments/${cid}/dislike`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await reloadComments();
    } catch {}
  };

  const deleteComment = async (cid, author) => {
    if (!token) return alert("로그인이 필요합니다.");
    // 본인 확인 (프론트 가드, 백엔드에서도 검사함)
    const isMine =
      (author && author._id && me?.userId && String(author._id) === String(me.userId)) ||
      (author && author.username && me?.username && author.username === me.username);
    if (!isMine) return alert("삭제 권한이 없습니다.");
    if (!confirm("댓글을 삭제할까요?")) return;

    try {
      const res = await fetch(`${API}/api/board/${id}/comments/${cid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `삭제 실패 (HTTP ${res.status})`);
      }
      await reloadComments();
    } catch (e) {
      alert(e.message || "삭제 실패");
    }
  };

  if (loading) return <div className="detail-wrap">불러오는 중…</div>;
  if (notFound) {
    return (
      <div className="detail-wrap">
        <p>게시글이 존재하지 않습니다.</p>
        <button className="btn" onClick={() => navigate("/board")}>
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="detail-wrap">
      <div className="detail-head">
        <div className="detail-title">
          <span className="cat">[{post?.category}]</span>{" "}
          <span className="t">{post?.title}</span>
        </div>
        <div className="head-actions">
          <button className="btn ghost" onClick={() => navigate("/board")}>목록</button>
          {canDeletePost && (
            <button className="btn danger" disabled={deleting} onClick={onDeletePost}>
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>

      <div className="detail-meta">
        <span className="meta">{post?.author?.username || "익명"}</span>
        <span className="dot">·</span>
        <span className="meta">{fmt(post?.createdAt)}</span>
        <span className="dot">·</span>
        <span className="meta">조회 {post?.views ?? 0}</span>
        <span className="dot">·</span>
        <span className="meta">추천 {post?.likes ?? 0}</span>
      </div>

      <div className="detail-content">
        {post?.content}
      </div>

      {/* ===== 댓글 ===== */}
      <div className="cmt-wrap">
        <h2 className="cmt-title">댓글</h2>

        <div className="cmt-editor">
          <textarea
            placeholder="댓글을 입력하세요"
            value={cmtInput}
            onChange={(e) => setCmtInput(e.target.value)}
            rows={3}
          />
          <button className="btn primary" disabled={cmtSubmitting || !cmtInput.trim()} onClick={submitComment}>
            {cmtSubmitting ? "등록 중..." : "등록"}
          </button>
        </div>

        <div className="cmt-list">
          {comments.length === 0 ? (
            <div className="cmt-empty">아직 댓글이 없습니다.</div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className={`cmt-item ${c.pinned ? "pinned" : ""}`}>
                {c.pinned && <div className="pin-badge">고정</div>}
                <div className="cmt-head">
                  <div className="cmt-author">
                    <span className="name">{c.author?.username || "익명"}</span>
                    <span className="dot">·</span>
                    <span className="time">{fmt(c.createdAt)}</span>
                  </div>
                  <div className="cmt-actions">
                    <button className="pill" onClick={() => toggleLike(c._id)}>👍 {c.likes || 0}</button>
                    <button className="pill" onClick={() => toggleDislike(c._id)}>👎 {c.dislikes || 0}</button>
                    {me && (
                      ((c.author && c.author._id && String(c.author._id) === String(me.userId)) ||
                       (c.author && c.author.username && c.author.username === me.username)) && (
                        <button className="pill danger" onClick={() => deleteComment(c._id, c.author)}>삭제</button>
                      )
                    )}
                  </div>
                </div>
                <div className="cmt-body">{c.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
