const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // 檢查是否有 Authorization Header
    if (!authHeader) {
        return res.status(401).send({ error: "未授權，請提供 Token" });
    }

    // 提取 Token
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).send({ error: "Token 格式錯誤" });
    }

    try {
        // 驗證 Token
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user; // 將解碼後的用戶信息附加到 req
        console.log("Authenticated user:", req.user); // 可選：日誌記錄
        next(); // 繼續執行
    } catch (error) {
        console.error("Token 驗證失敗:", error);
        res.status(403).send({ error: "無效的 Token" });
    }
};

module.exports = authenticate;