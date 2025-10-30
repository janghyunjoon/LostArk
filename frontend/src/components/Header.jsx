import React from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ 페이지 이동용
import './Header.css';

function Header() {
  const navigate = useNavigate();

  // ✅ 로그인 버튼 클릭 시 /signin 페이지로 이동
  const handleLoginClick = () => {
    navigate('/signin');
  };

  return (
    <div className="header">
      <div className="logo">logo</div>

      <div className="middle">
        <div className="ranking">랭킹</div>
        <div className="merchant">떠돌이 상인</div>
      </div>

      {/* ✅ 로그인 버튼 클릭 시 handleLoginClick 실행 */}
      <button className="login" onClick={handleLoginClick}>
        로그인
      </button>
    </div>
  );
}

export default Header;
