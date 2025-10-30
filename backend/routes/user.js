const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const User = require("../models/User");

const COOKIE_NAME = 'token';
const isProd = process.env.NODE_ENV === 'production';
const SAME_SITE = isProd ? 'none' : 'lax';
const SECURE = isProd ? true : false;
const COOKIE_PATH = '/';
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

// ✅ 토큰 검증 미들웨어
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "접근 권한이 없습니다. (토큰 없음)" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.decodedToken = decoded;
        next();
    } catch (error) {
        res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: SECURE, sameSite: SAME_SITE, path: COOKIE_PATH });
        return res.status(401).json({ message: "유효하지 않거나 만료된 토큰입니다." });
    }
};

// ✅ 로그인한 사용자 전용 접근
const authRequired = async (req, res, next) => {
    verifyToken(req, res, async () => {
        if (res.headersSent) return;

        try {
            const user = await User.findById(req.decodedToken.userId).select('-password');
            if (!user || !user.isActive) {
                res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: SECURE, sameSite: SAME_SITE, path: COOKIE_PATH });
                return res.status(401).json({ message: '유효하지 않은 사용자 또는 비활성화된 계정입니다.' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error("DB 조회 오류", error);
            res.status(500).json({ message: "서버 오류 발생" });
        }
    });
};

// ✅ 관리자 권한 확인
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (res.headersSent) return;

        if (req.decodedToken.role !== 'admin') {
            return res.status(403).json({ message: "관리자 권한이 필요합니다." });
        }
        
        req.user = req.decodedToken;
        next();
    });
};

// ✅ 회원가입
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (password.length < 6) {
            return res.status(400).json({ message: "비밀번호는 최소 6자 이상이어야 합니다." });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "이미 존재하는 사용자입니다." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: "회원가입이 완료 되었습니다." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 오류 발생" });
    }
});

// ✅ 로그인 (axios 제거됨)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username }).select("+password");

        if (!user) return res.status(401).json({ message: "사용자 없음" });

        if (!user.isActive) {
            if (user.failedLoginAttempts >= 5 && user.lastLoginAttempt) {
                const timeElapsed = new Date() - new Date(user.lastLoginAttempt);

                if (timeElapsed > LOCKOUT_DURATION_MS) {
                    user.isActive = true;
                    user.failedLoginAttempts = 0;
                } else {
                    const remainingMinutes = Math.ceil((LOCKOUT_DURATION_MS - timeElapsed) / (60 * 1000));
                    return res.status(401).json({
                        message: `계정이 잠금 상태입니다. ${remainingMinutes}분 후 다시 시도해 주세요.`
                    });
                }
            } else {
                return res.status(401).json({ message: "비활성계정입니다. 관리자에게 문의하세요." });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempts += 1;
            user.lastLoginAttempt = new Date();
            if (user.failedLoginAttempts >= 5) {
                user.isActive = false;
                await user.save();
                return res.status(401).json({ message: "비밀번호 5회 이상 오류, 계정이 잠겼습니다." });
            }
            await user.save();
            return res.status(401).json({
                message: "비밀번호가 틀렸습니다.",
                failedAttempt: user.failedLoginAttempts
            });
        }

        user.failedLoginAttempts = 0;
        user.lastLoginAttempt = new Date();
        user.isLoggedIn = true;

        await user.save();

        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role || "user" },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: SECURE,
            sameSite: SAME_SITE,
            maxAge: 24 * 60 * 60 * 1000,
            path: COOKIE_PATH
        });

        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        return res.status(200).json({
            message: "로그인 성공",
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "서버오류" });
    }
});

// ✅ 로그아웃
router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(400).json({ message: '이미 로그아웃된 상태입니다.' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (user) {
                user.isLoggedIn = false;
                await user.save();
            }
        } catch (err) {
            console.log("토큰 검증 오류", err);
        }

        res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: SECURE, sameSite: SAME_SITE, path: COOKIE_PATH });
        res.json({ message: '로그아웃 되었습니다.' });
    } catch (error) {
        console.error("로그아웃중 서버오류", error);
        res.status(500).json({ message: "서버 오류가 발생" });
    }
});

// ✅ 전체 유저 조회
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).select('-password -__v');
        return res.status(200).json({ message: "전체 유저 가져오기 성공", users });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "서버오류" });
    }
});

// ✅ 유저 삭제
router.delete('/delete/:userId', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return res.status(200).json({ message: "사용자 삭제 성공" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "서버오류" });
    }
});

// ✅ 토큰 유효성 검증
router.post('/verify-token', verifyToken, (req, res) => {
    return res.status(200).json({ isValid: true, user: req.decodedToken });
});

// ✅ 내 정보 조회
router.get('/me', authRequired, (req, res) => {
    const userWithoutPassword = req.user.toObject();
    delete userWithoutPassword.password;

    res.status(200).json({
        message: '현재 로그인된 사용자 정보입니다.',
        user: userWithoutPassword
    });
});

// ✅ 관리자 계정 잠금 해제
router.post('/unlock/:userId', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

        user.isActive = true;
        user.failedLoginAttempts = 0;
        await user.save();

        return res.status(200).json({ message: "계정 잠금이 해제되었습니다.", userId: user._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 오류 발생" });
    }
});

module.exports = router;
