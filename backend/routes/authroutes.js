const express = require("express")
const router = express.Router()
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const User = require("../models/User")
const { authenticateToken } = require('../middlewares/auth'); // ✅ 변경됨: auth → authenticateToken 명시적 미들웨어 사용


function makeToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
            jwtid: `${user._id}-${Date.now()}`,
        }

    )
}

router.post("/register", async (req, res) => {
    try {
        const { email, password, displayName, role } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "이메일/비밀번호 필요" })
        }

        const exists = await User.findOne({
            email: email.toLowerCase()
        })
        if (exists) {

            return res.status(400).json({ message: "이미 가입된 이메일" })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const validRoles = ["user", "admin"]
        const safeRole = validRoles.includes(role) ? role : "user"

        const user = await User.create({
            email,
            displayName,
            passwordHash,
            role: safeRole
        })

        res.status(201).json({ user: user.toSafeJSON() })

    } catch (error) {
        return res.status(500).json({
            message: "회원가입 실패",
            error: error.message
        })

    }
})

const LOCK_MAX = 5
router.post("/login", async (req, res) => {
    try {
        // 1) req.body에서 email, password를 꺼낸다(기본값은 빈 문자열).
        const { email, password } = req.body

        //  2) 이메일을 소문자로 바꿔 활성화된 유저(isActive: true)만 조회한다. .findOne() /.toLowerCase()
        const user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true
        })


        const invalidMsg = { message: "이메일 또는 비밀번호가 올바르지 않습니다." };


        // 3 사용자 없음
        if (!user) {
            return res.status(400).json({
                ...invalidMsg,
                loginAttempts: null,
                remainingAttempts: null,
                locked: false
            })
        }

        // 4)비밀번호 검증 (User 모델에 comparePassword 메서드가 있다고 가정)
        const ok = await user.comparePassword(password)

        // 5)비밀번호 불일치
        if (!ok) {
            user.loginAttempts += 1

            const remaining = Math.max(0, LOCK_MAX - user.loginAttempts)

            // 5-1 실패 누적 임계치 이상 일때 계정 잠금
            if (user.loginAttempts >= LOCK_MAX) {
                user.isActive = false//잠금처리

                await user.save()

                return res.status(423).json({
                    message: "유효성 검증 실패로 계정이 잠겼습니다. 관리자에게 문의하세요.",
                    loginAttempts: user.loginAttempts,
                    remainingAttempts: 0,
                    locked: true
                })
            }
            // 5-2 아직 잠금 전 400 현재 실패 남은 횟수 안내
            await user.save()
            return res.status(400).json({
                ...invalidMsg,
                loginAttempts: user.loginAttempts,
                remainingAttempts: remaining,
                locked: false
            })
        }


        // 6 로그인 성공: 실패 카운트 초기화 접속 정보 업데이트

        user.loginAttempts = 0
        user.isLoggined = true
        user.lastLoginAt = new Date()

        await user.save()

        // 7 JWT 발급 및 쿠키 설정
        const token = makeToken(user)


        res.cookie('token', token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })


        // 8 성공 응답: 사용자 정보 +토큰+ 참조용 카운트 
        return res.status(200).json({
            user: user.toSafeJSON(),
            token,
            loginAttempts: 0,
            remainingAttempts: LOCK_MAX,
            locked: false
        })

    } catch (error) {
        return res.status(500).json({
            message: "로그인 실패",
            error: error.message
        })
    }
})

router.use(authenticateToken)


router.get("/me", async (req, res) => {
    try {
        const me = await User.findById(req.user.id)

        if (!me) return res.status(404).json({ message: "사용자 없음" })

        return res.status(200).json(me.toSafeJSON())

    } catch (error) {

        res.status(401).json({ message: "조회 실패", error: error.message })
    }
})

router.get("/users", async (req, res) => {
    try {
        const me = await User.findById(req.user.id)
        if (!me) return res.status(404).json({ message: '사용자 없음' })


        if (me.role !== 'admin') {
            return res.status(403).json({ message: '권한 없음' })
        }
        const users = await User.find().select('-passwordHash')

        return res.status(200).json({ users })
    } catch (error) {
        res.status(401).json({ message: "조회 실패", error: error.message })

    }
})

router.post("/logout", async (req, res) => {
    try {
        await User.findByIdAndUpdate(
            req.user.id,
            { $set: { isLoggined: false }, },
            { new: true }
        )

        res.clearCookie('token', {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path:'/'
        })
        return res.status(200).json({ message: '로그아웃 성공' })
    } catch (error) {

        return res.status(500).json({ message: '로그아웃 실패', error: error.message })
    }
})

module.exports = router