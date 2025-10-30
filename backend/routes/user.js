import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const router = express.Router();

const COOKIE_NAME = "token";
const isProd = process.env.NODE_ENV === "production";
const SAME_SITE = isProd ? "none" : "lax";
const SECURE = isProd;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30분 잠금

// ✅ 회원가입
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "아이디와 비밀번호를 모두 입력하세요." });

    if (password.length < 6)
      return res.status(400).json({ message: "비밀번호는 최소 6자 이상이어야 합니다." });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "이미 존재하는 사용자입니다." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    return res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생" });
  }
});

// ✅ 로그인
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password");

    if (!user) return res.status(401).json({ message: "존재하지 않는 사용자입니다." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastLoginAttempt = new Date();

      if (user.failedLoginAttempts >= 5) {
        user.isActive = false;
        await user.save();
        return res.status(403).json({ message: "비밀번호 5회 이상 오류로 계정이 잠겼습니다." });
      }

      await user.save();
      return res.status(401).json({
        message: `비밀번호가 틀렸습니다. (${user.failedLoginAttempts}회 실패)`
      });
    }

    // ✅ 로그인 성공
    user.failedLoginAttempts = 0;
    user.isActive = true;
    user.isLoggedIn = true;
    user.lastLoginAttempt = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: SECURE,
      sameSite: SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000,
    });

    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return res.status(200).json({
      message: "로그인 성공",
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생" });
  }
});

// ✅ 로그아웃
router.post("/logout", async (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: SECURE,
      sameSite: SAME_SITE,
    });
    return res.status(200).json({ message: "로그아웃 성공" });
  } catch (error) {
    console.error("로그아웃 오류:", error);
    return res.status(500).json({ message: "서버 오류 발생" });
  }
});

export default router;
