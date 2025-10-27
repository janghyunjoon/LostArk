import React from 'react';
import './Header.css';

function Header() {
  return (
    <div className="header">
      <div className="logo">logo</div>

      <div className="middle">
        <div className="ranking">랭킹</div>
        <div className="merchant">떠돌이 상인</div>
      </div>

      <div className="login">로그인</div>
    </div>
  );
}

export default Header;
