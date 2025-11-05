// App.jsx
import { Routes, Route } from 'react-router-dom';
import Main from './components/main';
import Header from './components/Header';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import RequireAuth from './components/RequireAuth';
import Board from './pages/Board';
import Upload from './pages/Upload';
import PostDetail from './pages/PostDetail'; // ✅ 추가
import LostInfo from './pages/LostInfo';

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/" element={<Main />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/board/:id" element={<PostDetail />} /> {/* ✅ 추가 */}
        <Route path="/lostinfo" element={<LostInfo />} />

        {/* 보호 라우트 */}
        <Route path="/board" element={
          <RequireAuth><Board /></RequireAuth>
        }/>
        <Route path="/upload" element={
          <RequireAuth><Upload /></RequireAuth>
        }/>
      </Routes>
    </>
  );
}
