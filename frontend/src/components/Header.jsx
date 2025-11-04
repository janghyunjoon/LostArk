import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
   const goBoard = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (confirm('로그인한 사용자만 이용 가능합니다. 로그인하시겠습니까?')) {
        navigate('/signin');
      }
      return;
    }
    navigate('/board');
  };

  // ✅ 토큰 재검증 함수 (항상 최신 토큰 사용)
  const checkLoginStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('[Header] checkLoginStatus() token =', token);

      if (!token) {
        setUser(null);
        return;
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/user/verify-token`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[Header] verify-token response =', res.data);
      if (res.data?.isValid && res.data?.user) {
        setUser(res.data.user);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (err) {
      console.warn('[Header] verify-token error =', err?.response?.data || err.message);
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [API_BASE_URL]);

  // ✅ 마운트 시 1회 검사
  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  // ✅ 로그인/로그아웃 직후 재검증 (이벤트 수신)
  useEffect(() => {
    const rerun = () => {
      console.log('[Header] auth:changed fired → recheck');
      checkLoginStatus();
    };
    const onStorage = (e) => {
      if (e.key === 'token') {
        console.log('[Header] storage change for token → recheck');
        checkLoginStatus();
      }
    };

    window.addEventListener('auth:changed', rerun);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('auth:changed', rerun);
      window.removeEventListener('storage', onStorage);
    };
  }, [checkLoginStatus]);

  const handleLoginClick = () => navigate('/signin');

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/user/logout`,
        {},
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
    } catch (e) {
      console.warn('[Header] logout warn =', e?.message);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      window.dispatchEvent(new Event('auth:changed')); // 🔔
      alert('로그아웃 되었습니다.');
      navigate('/');
    }
  };

  return (
    <div className="header">
      <div className="logo" onClick={() => navigate('/')}><img src='./lostinfo.png'/></div>

      <div className="middle">
        <div className="ranking">랭킹</div>
        <div className="merchant">떠돌이 상인</div>
        <div
          className="board"
          onClick={goBoard}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' ? goBoard() : null)}
        >
          게시판
        </div>
      </div>

      <div className="right">
        {user ? (
          <div className="auth-area">
            <span className="user-name">{user.username || user.name || user.email}님</span>
            <button className="logout" onClick={handleLogout}>로그아웃</button>
          </div>
        ) : (
          <button className="login" onClick={handleLoginClick}>로그인</button>
        )}
      </div>
    </div>
  );
}

export default Header;
