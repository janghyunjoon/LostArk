import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const SignIn = () => {
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const res = await axios.post(`${BASE_URL}/api/user/login`, formData, {
        // Bearer 토큰 방식이면 withCredentials는 꼭 필요하진 않음(있어도 무방)
        withCredentials: true,
      });

      // ⚠️ 백엔드 응답 키 확인: token / user
      const { token, user } = res.data || {};
      if (!token) throw new Error('토큰이 응답에 없습니다.');

      localStorage.setItem('token', token);
      if (user) localStorage.setItem('auth_user', JSON.stringify(user)); // (선택)

      // ✅ 로그인 알림 → Header에서 재검증
      window.dispatchEvent(new Event('auth:changed'));   // <<<<<< 추가

      setMessage('로그인 성공!')
      navigate('/'); // 굳이 1초 지연 필요 없음
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || '로그인 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="auth-container">
      <h2>로그인</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          name="username"
          placeholder="아이디"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit">로그인</button>
      </form>

      {message && <p className="auth-message">{message}</p>}

      <p className="auth-switch">
        계정이 없나요? <span onClick={() => navigate('/signup')}>회원가입하기</span>
      </p>

      <button className="back-button" onClick={() => navigate('/')}>
        ← 메인으로 돌아가기
      </button>
    </div>
  )
}

export default SignIn
