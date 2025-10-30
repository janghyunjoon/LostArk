import { Routes, Route } from 'react-router-dom';
import './App.css';
import Main from './components/Main';
import Header from './components/Header';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp'; 

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </>
  );
}

export default App;
