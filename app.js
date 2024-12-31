const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: ["https://secondhandhand22.wixsite.com/", "http://localhost:3000"],
  })
);

// 設定 MySQL 資料庫連接
const db = mysql.createConnection({
  host: "localhost", // 替換為你的 MySQL 主機
  port: 3306,
  user: "secondhand", // 資料庫用戶名
  password: "12345678", // 資料庫密碼
  database: "SecondHandMarket", // 資料庫名稱
});

// 連接到 MySQL 資料庫
db.connect((err) => {
  if (err) {
    console.error("無法連接到 MySQL 資料庫：", err);
    return process.exit(1); // 停止伺服器
  }
  console.log("已成功連接到 MySQL 資料庫");
});

// 根路徑處理
app.get("/", (req, res) => {
  res.send("伺服器已啟動");
});

// API: 建立訂單
app.post("/api/orders", (req, res) => {
  const {
    productId,
    sellerId,
    buyerId,
    totalAmount,
    tradeTime,
    tradeLocation,
  } = req.body;

  // 驗證輸入資料是否完整
  if (
    !productId ||
    !sellerId ||
    !buyerId ||
    !totalAmount ||
    !tradeTime ||
    !tradeLocation
  ) {
    return res.status(400).send("缺少必要的訂單資訊");
  }

  // 插入資料到資料表
  const query = `
        INSERT INTO Orders (product_id, seller_id, buyer_id, total_amount, trade_time, trade_location)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
  const values = [
    productId,
    sellerId,
    buyerId,
    totalAmount,
    tradeTime,
    tradeLocation,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("無法建立訂單：", err);
      return res.status(500).send("建立訂單時發生錯誤");
    }
    res
      .status(201)
      .send({ message: "訂單已成功建立", orderId: result.insertId });
  });
});

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`伺服器正在 http://localhost:${PORT} 運行`);
});
