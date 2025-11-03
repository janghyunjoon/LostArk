// components/RequireAuth.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function RequireAuth({ children }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/signin');

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/user/verify-token`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.isValid) setOk(true);
        else navigate('/signin');
      } catch {
        navigate('/signin');
      }
    };
    check();
  }, [navigate]);

  return ok ? children : null; // 검증 전엔 렌더링 보류
}
