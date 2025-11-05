// src/components/Header.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);

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

  const checkLoginStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }
      const res = await axios.post(
        `${API_BASE_URL}/api/user/verify-token`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.isValid && res.data?.user) {
        setUser(res.data.user);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  useEffect(() => {
    const rerun = () => checkLoginStatus();
    const onStorage = (e) => {
      if (e.key === 'token') checkLoginStatus();
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
      await axios.post(`${API_BASE_URL}/api/user/logout`, {}, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* noop */ }
    finally {
      localStorage.removeItem('token');
      setUser(null);
      window.dispatchEvent(new Event('auth:changed'));
      alert('로그아웃 되었습니다.');
      navigate('/');
    }
  };

  // 🔎 검색: 오른쪽 영역에 배치 (username 왼쪽)
  const submitSearch = () => {
    const name = searchName.trim();
    if (!name) return;
    setLoadingSearch(true);
    const target = `/lostinfo?name=${encodeURIComponent(name)}`;
    if (location.pathname === '/lostinfo') {
      navigate(target, { replace: false });
    } else {
      navigate(target);
    }
    setLoadingSearch(false);
  };

  const onKeyDownSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSearch();
    }
  };

  return (
    <div className="header">
      <div className="logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
        <img src="./lostinfo.png" alt="LostInfo" />
      </div>

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
        {/* 🔎 검색창: username/로그인 버튼 왼쪽에 고정 배치 */}
        <div className="search right-search">
          <input
            className="search-input"
            type="text"
            placeholder="캐릭터명 검색"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={onKeyDownSearch}
            aria-label="캐릭터명 검색"
          />
          <button
            className="search-btn"
            onClick={submitSearch}
            disabled={loadingSearch || !searchName.trim()}
          >
            {loadingSearch ? '검색 중...' : '검색'}
          </button>
        </div>

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
