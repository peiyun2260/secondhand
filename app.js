const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();
const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: [
      "https://secondhandhand22.wixsite.com",
      "https://secondhandhand22.wixsite.com/my-site-1",
      "http://localhost:3000",
    ],

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// 明確處理預檢請求
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get("/", (req, res) => {
  res.send("伺服器已啟動");
});

// 用戶管理 API
const JWT_SECRET = process.env.JWT_SECRET;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// 查詢所有 user
app.get("/users", (req, res) => {
  db.query("SELECT * FROM Users", (err, results) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(results);
    }
  });
});

// 註冊 API
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // 驗證輸入資料
  if (!username || !email || !password) {
    return res.status(400).send({ error: "所有欄位都是必填的！" });
  }

  try {
    // 檢查用戶是否已存在
    const userCheck = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Users WHERE email = ?",
        [email],
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    if (userCheck.length > 0) {
      return res.status(400).send({ error: "該電子郵件已被註冊！" });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用戶資料到資料庫
    const result = await new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO Users (username, email, password_hash, registered_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [username, email, hashedPassword],
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    const userId = result.insertId;
    // 生成 JWT Token
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).send({
      message: "註冊成功！",
      userId: userId,
      token: token,
    });
  } catch (error) {
    console.error("註冊錯誤:", error);
    res.status(500).send({ error: "伺服器錯誤！" });
  }
});

// 登入 API
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // 驗證輸入資料
  if (!email || !password) {
    return res.status(400).send({ error: "電子郵件和密碼是必填的！" });
  }

  try {
    // 查詢用戶
    const user = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Users WHERE email = ?",
        [email],
        (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        }
      );
    });

    if (!user) {
      return res.status(404).send({ error: "用戶不存在！" });
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).send({ error: "密碼錯誤！" });
    }

    // 生成 JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).send({ message: "登入成功！", token });
  } catch (error) {
    console.error("登入錯誤:", error);
    res.status(500).send({ error: "伺服器錯誤！" });
  }
});

// 查詢 reputation_score
app.get("/Users/:userId/reputation_score", (req, res) => {
  const { userId } = req.params;

  db.query(
    "SELECT reputation_score FROM Users WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("查詢分數錯誤:", err);
        return res.status(500).send({ error: "伺服器錯誤" });
      }

      if (results.length > 0) {
        // 如果找到該用戶，返回其 reputation_score
        res.json({ score: results[0].reputation_score });
      } else {
        res.status(404).send({ error: "用戶不存在" });
      }
    }
  );
});

// 建立訂單 API
app.post("/api/createOrder", (req, res) => {
  const { productId, buyerId, tradeTime, tradeLocation } = req.body;

  // 驗證輸入資料是否完整
  if (!productId || !buyerId || !tradeTime || !tradeLocation) {
    return res.status(400).send("缺少必要的訂單資訊");
  }

  const fetchProductQuery = `
          SELECT seller_id, price AS totalAmount
          FROM Products
          WHERE product_id = ?
      `;

  const insertOrderQuery = `
          INSERT INTO Orders (product_id, seller_id, buyer_id, total_amount, trade_time, trade_location)
          VALUES (?, ?, ?, ?, ?, ?)
      `;

  const updateProductQuery = `
          UPDATE Products
          SET status = 'sold'
          WHERE product_id = ?
      `;

  db.getConnection((err, connection) => {
    if (err) {
      console.error("無法獲取連接：", err);
      return res.status(500).send("建立訂單時發生錯誤");
    }

    connection.query(fetchProductQuery, [productId], (fetchErr, results) => {
      if (fetchErr || results.length === 0) {
        console.error("無法獲取產品資訊：", fetchErr);
        connection.release();
        return res.status(404).send("無法找到該產品");
      }

      const sellerId = results[0].seller_id;
      const totalAmount = results[0].totalAmount;

      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          console.error("無法啟動事務：", transactionErr);
          connection.release();
          return res.status(500).send("建立訂單時發生錯誤");
        }

        connection.query(
          insertOrderQuery,
          [productId, sellerId, buyerId, totalAmount, tradeTime, tradeLocation],
          (insertErr, result) => {
            if (insertErr) {
              console.error("無法建立訂單：", insertErr);
              return connection.rollback(() => {
                connection.release();
                res.status(500).send("建立訂單時發生錯誤");
              });
            }

            connection.query(updateProductQuery, [productId], (updateErr) => {
              if (updateErr) {
                console.error("無法更新商品狀態：", updateErr);
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).send("建立訂單時發生錯誤");
                });
              }

              connection.commit((commitErr) => {
                if (commitErr) {
                  console.error("無法提交事務：", commitErr);
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).send("建立訂單時發生錯誤");
                  });
                }

                connection.release();
                res.status(201).send({
                  message: "訂單已成功建立，商品狀態已更新",
                  orderId: result.insertId,
                });
              });
            });
          }
        );
      });
    });
  });
});

// 更新訂單狀態API
app.patch("/api/updateOrder/:orderId", (req, res) => {
  const orderId = req.params.orderId;

  if (!orderId) {
    return res.status(400).send("缺少訂單 ID");
  }

  const query = `
          UPDATE Orders
          SET status = 'completed'
          WHERE order_id = ? AND status = 'pending'
      `;

  db.query(query, [orderId], (err, result) => {
    if (err) {
      console.error("無法更新訂單狀態：", err);
      return res.status(500).send("更新訂單狀態時發生錯誤");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("未找到待確認的訂單或訂單已更新");
    }

    res.status(200).send({ message: "訂單狀態已成功更新為 completed" });
  });
});

// 新增評論API
app.post("/api/addReview", (req, res) => {
  const { productId, buyerId, reviewText, rating } = req.body;

  // 驗證輸入的完整性
  if (!productId || !buyerId || !reviewText || !rating) {
    return res.status(400).send("缺少必要的評論資訊");
  }

  const addReviewQuery = `
    INSERT INTO Reviews (product_id, reviewer_id, content, rating)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    addReviewQuery,
    [productId, buyerId, reviewText, rating],
    (err, result) => {
      if (err) {
        console.error("無法新增評論：", err);
        return res.status(500).send("新增評論時發生錯誤");
      }

      res.status(201).send({
        message: "評論已成功提交",
        reviewId: result.insertId,
      });
    }
  );
});

// 讀取特定商品的評論API
app.get("/api/getReviews/:productId", (req, res) => {
  const { productId } = req.params;

  // 驗證商品 ID 是否存在
  if (!productId) {
    return res.status(400).send("缺少商品 ID");
  }

  const getReviewsQuery = `
    SELECT reviewer_id, content, rating, review_date
    FROM Reviews
    WHERE product_id = ?
    ORDER BY review_date DESC
  `;

  db.query(getReviewsQuery, [productId], (err, results) => {
    if (err) {
      console.error("無法讀取評論：", err);
      return res.status(500).send("讀取評論時發生錯誤");
    }

    res.status(200).send(results);
  });
});

// 讀取購買者的所有評論API
app.get("/api/getUserReviews/:buyerId", (req, res) => {
  const { buyerId } = req.params;

  // 驗證買家 ID 是否存在
  if (!buyerId) {
    return res.status(400).send("缺少買家 ID");
  }

  const getUserReviewsQuery = `
    SELECT product_id, content, rating, review_date
    FROM Reviews
    WHERE order_id = ?
    ORDER BY review_date DESC
  `;

  db.query(getUserReviewsQuery, [buyerId], (err, results) => {
    if (err) {
      console.error("無法讀取購買者的評論：", err);
      return res.status(500).send("讀取購買者評論時發生錯誤");
    }

    res.status(200).send(results);
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器正在運行在端口 ${PORT}`);
});
