import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // ✅ 로그인 유저 정보 저장

  // ✅ 마운트 시 로그인 여부 확인
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return; // 토큰 없으면 로그인 전 상태

        // 백엔드에서 토큰 검증 (선택)
        const res = await axios.post(
          'http://localhost:5000/api/user/verify-token',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.isValid) {
          setUser(res.data.user);
        }
      } catch (error) {
        console.error('로그인 상태 확인 실패:', error);
        setUser(null);
      }
    };

    checkLoginStatus();
  }, []);

  // ✅ 로그인 페이지로 이동
  const handleLoginClick = () => {
    navigate('/signin');
  };

  // ✅ 로그아웃
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/user/logout', {}, { withCredentials: true });
      localStorage.removeItem('token');
      setUser(null);
      alert('로그아웃 되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 문제가 발생했습니다.');
    }
  };

  return (
    <div className="header">
      <div className="logo" onClick={() => navigate('/')}>logo</div>

      <div className="middle">
        <div className="ranking">랭킹</div>
        <div className="merchant">떠돌이 상인</div>
        <div className="board">게시판</div>
      </div>

      {/* ✅ 로그인 상태에 따라 버튼 전환 */}
      {user ? (
        <div className="login-section">
          <span className="welcome">{user.username}님</span>
          <button className="logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      ) : (
        <button className="login" onClick={handleLoginClick}>
          로그인
        </button>
      )}
    </div>
  );
}

export default Header;
