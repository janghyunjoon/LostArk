const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

const COOKIE_NAME = "token";
const isProd = process.env.NODE_ENV === "production";
const SAME_SITE = isProd ? "none" : "lax";
const SECURE = isProd;

// 회원가입
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "아이디와 비밀번호를 모두 입력하세요." });
    if (password.length < 6)
      return res.status(400).json({ message: "비밀번호는 최소 6자 이상이어야 합니다." });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "이미 존재하는 사용자입니다." });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashed });
    res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (e) {
    console.error("회원가입 오류:", e);
    res.status(500).json({ message: "서버 오류 발생" });
  }
});

// 로그인
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password");
    if (!user) return res.status(401).json({ message: "존재하지 않는 사용자입니다." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastLoginAttempt = new Date();
      await user.save();
      return res.status(401).json({ message: `비밀번호가 틀렸습니다. (${user.failedLoginAttempts}회 실패)` });
    }

    user.failedLoginAttempts = 0;
    user.isActive = true;
    user.isLoggedIn = true;
    user.lastLoginAttempt = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "24h"
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: SECURE,
      sameSite: SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000
    });

    const plain = user.toObject();
    delete plain.password;

    res.json({ message: "로그인 성공", token, user: plain });
  } catch (e) {
    console.error("로그인 오류:", e);
    res.status(500).json({ message: "서버 오류 발생" });
  }
});

// 토큰 검증
router.post("/verify-token", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const [, token] = auth.split(" ");
    if (!token) return res.json({ isValid: false });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("_id username email role isActive");
    if (!user) return res.json({ isValid: false });

    res.json({
      isValid: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch {
    res.json({ isValid: false });
  }
});

// 로그아웃
router.post("/logout", (_req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: SECURE, sameSite: SAME_SITE });
    res.json({ message: "로그아웃 성공" });
  } catch (e) {
    console.error("로그아웃 오류:", e);
    res.status(500).json({ message: "서버 오류 발생" });
  }
});

module.exports = router;
