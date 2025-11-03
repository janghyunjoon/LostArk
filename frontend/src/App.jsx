import { Routes, Route } from 'react-router-dom';
import './App.css';
import Main from './components/main';
import Header from './components/Header';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp'; 
import RequireAuth from './components/RequireAuth';
import Board from './pages/Board'; 

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route
          path="/board"
          element={
            <RequireAuth>
              <Board />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Main />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </>
  );
}

export default App;
