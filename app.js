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
      "https://editor.wix.com",
      /\.dev\.wix-code\.com$/,
      /\.wixsite\.com$/,
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  })
);

app.options("*", (req, res) => {
  const allowedOrigins = [
    "https://secondhandhand22.wixsite.com",
    "https://secondhandhand22.wixsite.com/my-site-1",
    "http://localhost:3000",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// 明確處理預檢請求
// app.options("*", (req, res) => {
//   res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET, POST, PUT, DELETE, OPTIONS, PATCH"
//   );
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.setHeader("Access-Control-Allow-Credentials", "true");
//   res.sendStatus(204);
// });

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

// **插入 authenticate 中介層程式碼**
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error("未提供 Authorization Header");
    return res.status(401).send({ error: "未授權，請提供 Token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    console.error("Token 格式錯誤");
    return res.status(401).send({ error: "Token 格式錯誤" });
  }

  try {
    // 驗證 Token 並打印解碼內容
    const user = jwt.verify(token, process.env.JWT_SECRET);
    console.log("解碼的 Token 資訊：", user); // 確認是否包含 id
    req.user = user; // 將用戶資料附加到 req
    next(); // 繼續執行後續邏輯
  } catch (error) {
    console.error("Token 驗證失敗:", error.message);
    return res.status(403).send({ error: "無效的 Token" });
  }
};

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
    const token = jwt.sign(
      { id: user.user_id, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).send({ message: "登入成功！", token });
  } catch (error) {
    console.error("登入錯誤:", error);
    res.status(500).send({ error: "伺服器錯誤！" });
  }
});

//從user_id抓all
app.get("/Users/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT * 
    FROM Users 
    WHERE user_id = ?
    LIMIT 1
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("GET /users/:userId error:", err);
      return res.status(500).json({ error: "資料庫錯誤" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "用戶不存在" });
    }

    res.status(200).json(results[0]);
  });
});

// 查詢 username
app.get("/Users/:userId/username", (req, res) => {
  const { userId } = req.params;

  db.query(
    "SELECT username FROM Users WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("查詢用戶名稱錯誤:", err);
        return res.status(500).send({ error: "伺服器錯誤" });
      }

      if (results.length > 0) {
        // 如果找到該用戶，返回其 username
        res.json({ username: results[0].username });
      } else {
        res.status(404).send({ error: "用戶不存在" });
      }
    }
  );
});

// 更新 username
app.put("/Users/:userId/updateUsername", (req, res) => {
  const { userId } = req.params;
  const { username } = req.body;

  // 驗證輸入
  if (!username) {
    return res.status(400).send({ error: "用戶名稱為必填項！" });
  }

  // 更新 username
  db.query(
    "UPDATE Users SET username = ? WHERE user_id = ?",
    [username, userId],
    (err, results) => {
      if (err) {
        console.error("更新用戶名稱錯誤:", err);
        return res.status(500).send({ error: "伺服器錯誤" });
      }

      if (results.affectedRows > 0) {
        res.status(200).send({ message: "用戶名稱更新成功！" });
      } else {
        res.status(404).send({ error: "用戶不存在" });
      }
    }
  );
});

// 查詢 email
app.get("/Users/:userId/email", (req, res) => {
  const { userId } = req.params;

  db.query(
    "SELECT email FROM Users WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) {
        console.error("查詢用戶 email 錯誤:", err);
        return res.status(500).send({ error: "伺服器錯誤" });
      }

      if (results.length > 0) {
        // 如果找到該用戶，返回其 email
        res.json({ email: results[0].email });
      } else {
        res.status(404).send({ error: "用戶不存在" });
      }
    }
  );
});

// 更新 email
app.put("/Users/:userId/updateEmail", (req, res) => {
  const { userId } = req.params;
  const { email } = req.body;

  // 驗證輸入
  if (!email) {
    return res.status(400).send({ error: "電子郵件為必填項！" });
  }

  // 檢查 email 格式是否有效
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send({ error: "無效的電子郵件地址！" });
  }

  // 更新 email
  db.query(
    "UPDATE Users SET email = ? WHERE user_id = ?",
    [email, userId],
    (err, results) => {
      if (err) {
        console.error("更新用戶 email 錯誤:", err);
        return res.status(500).send({ error: "伺服器錯誤" });
      }

      if (results.affectedRows > 0) {
        res.status(200).send({ message: "電子郵件更新成功！" });
      } else {
        res.status(404).send({ error: "用戶不存在" });
      }
    }
  );
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

app.post("/Products/add", authenticate, (req, res) => {
  const { name, price, description, status, image_url } = req.body;
  // 這裡前端會傳單張圖的 URL，如果是多張，可以改成 array
  const seller_id = req.user.id; // 從 token 拿到 user_id

  if (!name || !price || !description || !status || !image_url) {
    return res.status(400).send({ error: "缺少必要的商品資訊" });
  }

  // Step 1: 先插入 Products
  const queryProduct = `
    INSERT INTO Products (seller_id, name, price, description, status, created_at) 
    VALUES (?, ?, ?, ?, ?, NOW());
  `;
  db.query(
    queryProduct,
    [seller_id, name, price, description, status],
    (err, result) => {
      if (err) {
        console.error("新增商品失敗:", err);
        return res.status(500).send({ error: "伺服器錯誤，無法新增商品" });
      }

      const newproduct_id = result.insertId;
      console.log("新商品 ID:", newproduct_id);

      // Step 2: 再插入 ProductImages (這裡假設只有一張)
      const queryImage = `
        INSERT INTO ProductImages (product_id, image_url) 
        VALUES (?, ?);
      `;
      db.query(queryImage, [newproduct_id, image_url], (err2, result2) => {
        if (err2) {
          console.error("新增商品圖片失敗:", err2);
          return res.status(500).send({ error: "伺服器錯誤，無法新增圖片" });
        }

        return res
          .status(201)
          .send({ message: "商品與圖片已成功新增", product_id: newproduct_id });
      });
    }
  );
});

// 更新商品狀態 API
app.post("/Products/update", authenticate, (req, res) => {
  const { product_id, status } = req.body;
  const seller_id = req.user.id; // 從 Token 中獲取用戶 ID

  if (!product_id || !status) {
    return res.status(400).send({ error: "缺少必要的商品 ID 或狀態" });
  }

  const query = `
      UPDATE Products
      SET status = ?
      WHERE product_id = ? AND seller_id = ?;
  `;
  db.query(query, [status, product_id, seller_id], (err, result) => {
    if (err) {
      console.error("Error updating product status:", err);
      res.status(500).send({ error: "伺服器錯誤，無法更新商品狀態" });
    } else if (result.affectedRows === 0) {
      // 代表沒更新任何東西 (可能是商品不存在，或不是自己的商品)
      res.status(403).send({ error: "您無權修改此商品狀態" });
    } else {
      res.status(200).send({ message: "商品狀態更新成功" });
    }
  });
});

// 建立訂單 API
app.post("/api/createOrder", (req, res) => {
  const { product_id, buyer_id, tradeTime, tradeLocation } = req.body;

  // 驗證輸入資料是否完整
  if (!product_id || !buyer_id || !tradeTime || !tradeLocation) {
    return res.status(400).send("缺少必要的訂單資訊");
  }

  const getSellerIdQuery = `
        SELECT seller_id, price AS totalAmount FROM Products WHERE product_id = ? LIMIT 1
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

    connection.beginTransaction((transactionErr) => {
      if (transactionErr) {
        console.error("無法啟動事務：", transactionErr);
        connection.release();
        return res.status(500).send("建立訂單時發生錯誤");
      }

      // 查找 Seller ID 和 Total Amount
      connection.query(
        getSellerIdQuery,
        [product_id],
        (sellerErr, sellerResult) => {
          if (sellerErr || sellerResult.length === 0) {
            console.error("無法找到 Seller ID 或 Total Amount：", sellerErr);
            return connection.rollback(() => {
              connection.release();
              res.status(404).send("找不到與該商品 ID 關聯的商品");
            });
          }

          const sellerId = sellerResult[0].seller_id;
          const totalAmount = sellerResult[0].totalAmount;

          // 插入訂單記錄
          connection.query(
            insertOrderQuery,
            [
              product_id,
              sellerId,
              buyer_id,
              totalAmount,
              tradeTime,
              tradeLocation,
            ],
            (insertErr, result) => {
              if (insertErr) {
                console.error("無法建立訂單：", insertErr);
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).send("建立訂單時發生錯誤");
                });
              }

              // 更新商品狀態
              connection.query(
                updateProductQuery,
                [product_id],
                (updateErr) => {
                  if (updateErr) {
                    console.error("無法更新商品狀態：", updateErr);
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).send("建立訂單時發生錯誤");
                    });
                  }

                  // 提交事務
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
                }
              );
            }
          );
        }
      );
    });
  });
});

// 更新訂單狀態 API
app.post("/api/updateOrder/:orderId", (req, res) => {
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

// 取消訂單 API
app.post("/api/cancelOrder/:orderId", (req, res) => {
    const orderId = req.params.orderId;
  
    if (!orderId) {
      return res.status(400).send("缺少訂單 ID");
    }
  
    const query = `
              UPDATE Orders
              SET status = 'cancelled'
              WHERE order_id = ? AND status = 'pending'
          `;
  
    db.query(query, [orderId], (err, result) => {
      if (err) {
        console.error("無法取消訂單：", err);
        return res.status(500).send("取消訂單時發生錯誤");
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).send("未找到待確認的訂單或訂單已更新");
      }
  
      res.status(200).send({ message: "訂單已成功取消" });
    });
  });

// 找出訂單ID API
app.get("/api/products", (req, res) => {
  const { seller_id } = req.query; // 從查詢參數中獲取 seller_id

  // 基本查詢語句
  let query =
    "SELECT product_id, seller_id, description, price, status, created_at FROM Products";

  // 如果提供了 seller_id，則添加過濾條件
  if (seller_id) {
    query += " WHERE seller_id = ?";
  }

  // 執行查詢
  db.query(query, [seller_id], (err, results) => {
    if (err) {
      console.error("無法提取商品數據：", err);
      return res.status(500).send("無法提取商品數據");
    }

    // 返回查詢結果
    res.status(200).json(results);
  });
});

// 找出特定訂單ID API
app.get("/api/products/:product_id", (req, res) => {
  const { product_id } = req.params; // 從路徑參數中獲取 product_id

  // 查詢語句
  const query = `
    SELECT product_id, seller_id, description, price, status, created_at 
    FROM Products
    WHERE product_id = ?
  `;

  // 執行查詢
  db.query(query, [product_id], (err, results) => {
    if (err) {
      console.error("無法提取商品數據：", err);
      return res.status(500).send("無法提取商品數據");
    }

    // 如果沒有找到匹配的商品，返回 404
    if (results.length === 0) {
      return res.status(404).send("未找到指定的商品");
    }

    // 返回查詢結果（單個商品數據）
    res.status(200).json(results[0]);
  });
});

// 獲取買家訂單資訊 API
app.get("/api/getOrders/buyer/:buyerId", (req, res) => {
  const buyerId = req.params.buyerId;

  if (!buyerId) {
    return res.status(400).send("缺少買家 ID");
  }

  const query = `
          SELECT 
            o.order_id,
            DATE(o.order_date) AS order_date, 
            DATE(o.updated_date) AS updated_date,
            o.status AS order_status,
            o.product_id,
            p.name AS product_name,
            p.seller_id,
            u.username AS seller_name,
            pi.image_url AS product_image_url,
            o.trade_time,
            o.trade_location 
          FROM Orders o
          JOIN Products p ON o.product_id = p.product_id
          JOIN Users u ON p.seller_id = u.user_id
          LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
          WHERE o.buyer_id = ?
          ORDER BY o.order_date DESC
        `;

  db.query(query, [buyerId], (err, results) => {
    if (err) {
      console.error("查詢訂單失敗：", err);
      return res.status(500).send("查詢訂單失敗");
    }

    if (results.length === 0) {
      return res.status(404).send("目前無訂單");
    }

    res.status(200).json(results);
  });
});

// 獲取賣家訂單資訊 API
app.get("/api/getOrders/seller/:sellerId", (req, res) => {
  const sellerId = req.params.sellerId;

  if (!sellerId) {
    return res.status(400).send("缺少賣家 ID");
  }

  const query = `
          SELECT 
            o.order_id,
            DATE(o.order_date) AS order_date,
            DATE(o.updated_date) AS updated_date, 
            o.status AS order_status,
            o.product_id,
            p.name AS product_name,
            o.buyer_id,
            u.username AS buyer_name,
            pi.image_url AS product_image_url,
            o.trade_time,
            o.trade_location
          FROM Orders o
          JOIN Products p ON o.product_id = p.product_id
          JOIN Users u ON o.buyer_id = u.user_id
          LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
          WHERE o.seller_id = ?
          ORDER BY o.order_date DESC
        `;

  db.query(query, [sellerId], (err, results) => {
    if (err) {
      console.error("查詢訂單失敗：", err);
      return res.status(500).send("查詢訂單失敗");
    }

    if (results.length === 0) {
      return res.status(404).send("目前無訂單");
    }

    res.status(200).json(results);
  });
});

// 新增評論API
app.post("/api/addReview", (req, res) => {
  const { product_id, buyerId, reviewText, rating } = req.body;

  // 驗證輸入的完整性
  if (!product_id || !buyerId || !reviewText || !rating) {
    return res.status(400).send("缺少必要的評論資訊");
  }

  const addReviewQuery = `
    INSERT INTO Reviews (product_id, reviewer_id, content, rating)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    addReviewQuery,
    [product_id, buyerId, reviewText, rating],
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
app.get("/api/getReviews/:product_id", (req, res) => {
  const { product_id } = req.params;

  // 驗證商品 ID 是否存在
  if (!product_id) {
    return res.status(400).send("缺少商品 ID");
  }

  const getReviewsQuery = `
    SELECT reviewer_id, content, rating, review_date
    FROM Reviews
    WHERE product_id = ?
    ORDER BY review_date DESC
  `;

  db.query(getReviewsQuery, [product_id], (err, results) => {
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

app.get("/Products/:product_id", (req, res) => {
  const { product_id } = req.params;
  const sql = `
    SELECT 
      p.seller_id AS seller_id,
      u.username AS sellerName
    FROM Products p
    JOIN Users u ON p.seller_id = u.user_id
    WHERE p.product_id = ?
    LIMIT 1;
  `;
  db.query(sql, [product_id], (err, results) => {
    if (err) {
      console.error("GET /Products/:product_id error:", err);
      return res.status(500).json({ error: "資料庫錯誤" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "未找到商品或賣家資訊" });
    }
    res.status(200).json(results[0]);
  });
});

// 撈所有商品 + 其對應圖片
app.get("/Products", authenticate, (req, res) => {
  const seller_id = req.user.id; // 從 Token 解碼的 user_id

  const sql = `
    SELECT 
      p.product_id, 
      p.seller_id, 
      p.name, 
      p.description, 
      p.price, 
      p.status,
      p.created_at,
      p.updated_at,
      pi.image_id,
      pi.image_url
    FROM Products p
    LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
    WHERE p.seller_id = ? -- 篩選當前登入者的商品
    ORDER BY p.product_id DESC
  `;

  db.query(sql, [seller_id], (err, results) => {
    if (err) {
      console.error("GET /Products error:", err);
      return res.status(500).json({ error: "資料庫錯誤" });
    }

    // 將同一商品的多張圖片分組
    const productMap = {};
    for (const row of results) {
      if (!productMap[row.product_id]) {
        productMap[row.product_id] = {
          product_id: row.product_id,
          seller_id: row.seller_id,
          name: row.name,
          description: row.description,
          price: row.price,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          images: [],
        };
      }
      if (row.image_url) {
        productMap[row.product_id].images.push({
          image_id: row.image_id,
          url: row.image_url,
        });
      }
    }

    const finalData = Object.values(productMap);
    res.status(200).json(finalData);
  });
});

// POST /messages/initiate - 初始化聯絡人
app.post("/messages/initiate", (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId 和 receiverId 為必填參數" });
  }

  const sql = `
    INSERT IGNORE INTO Messages (sender_id, receiver_id, content, sent_at, status)
    VALUES (?, ?, '[開始新聊天]', CURRENT_TIMESTAMP, 'read')
  `;

  db.query(sql, [senderId, receiverId], (err, results) => {
    if (err) {
      console.error("POST /messages/initiate error:", err);
      return res.status(500).json({ error: "資料庫錯誤" });
    }

    res.status(201).json({ message: "聯絡初始化成功" });
  });
});

// GET /contacts/:userId - 獲取聯絡人列表
app.get("/contacts/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT 
      CASE 
        WHEN m.sender_id = ? THEN m.receiver_id 
        ELSE m.sender_id 
      END AS contact_id,
      u.username AS contact_name,
      MAX(m.sent_at) AS last_message_time,
      (
        SELECT content FROM Messages 
        WHERE 
          (sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END 
           AND receiver_id = ?) 
          OR 
          (sender_id = ? 
           AND receiver_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END)
        ORDER BY sent_at DESC
        LIMIT 1
      ) AS last_message
    FROM Messages m
    JOIN Users u ON u.user_id = CASE 
                                  WHEN m.sender_id = ? THEN m.receiver_id 
                                  ELSE m.sender_id 
                                END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY contact_id, u.username
    ORDER BY last_message_time DESC
  `;

  db.query(
    sql,
    [userId, userId, userId, userId, userId, userId, userId, userId],
    (err, results) => {
      if (err) {
        console.error("GET /contacts/:userId error:", err);
        return res.status(500).json({ error: "資料庫錯誤" });
      }

      res.json(results);
    }
  );
});

//取得訊息 (GET /messages?senderId=xxx&receiverId=yyy)
app.get("/messages", (req, res) => {
  const { senderId, receiverId } = req.query;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId 與 receiverId 為必填參數" });
  }

  const sql = `
    SELECT * FROM Messages
    WHERE 
      (sender_id = ? AND receiver_id = ?)
      OR
      (sender_id = ? AND receiver_id = ?)
    ORDER BY sent_at ASC
  `;
  db.query(
    sql,
    [senderId, receiverId, receiverId, senderId],
    (err, results) => {
      if (err) {
        console.error("GET /messages error:", err);
        return res.status(500).json({ error: "資料庫錯誤" });
      }
      res.json(results);
    }
  );
});

// 2) 新增訊息 (POST /messages)
app.post("/messages", (req, res) => {
  const { senderId, receiverId, content } = req.body;
  if (!senderId || !receiverId || !content) {
    return res
      .status(400)
      .json({ error: "senderId, receiverId, content 都是必填" });
  }

  const sql = `
    INSERT INTO Messages (sender_id, receiver_id, content, status)
    VALUES (?, ?, ?, 'unread')
  `;
  db.query(sql, [senderId, receiverId, content], (err, result) => {
    if (err) {
      console.error("POST /messages error:", err);
      return res.status(500).json({ error: "資料庫錯誤" });
    }

    const insertedId = result.insertId;
    // 回頭查詢剛插入的訊息，回傳給前端
    db.query(
      "SELECT * FROM Messages WHERE message_id = ?",
      [insertedId],
      (err2, rows) => {
        if (err2) {
          console.error("查詢新插入訊息時錯誤:", err2);
          return res
            .status(500)
            .json({ error: "插入成功但回傳訊息時發生錯誤" });
        }
        res.status(201).json(rows[0]);
      }
    );
  });
});

// 3) 標記已讀 (PATCH /messages/read)
// body: { senderId, receiverId }
// 這意思是「對方(sender) 傳給我(receiver) 的所有未讀訊息」，全部標記為 read
app.patch("/messages/read", (req, res) => {
  const { senderId, receiverId } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId、receiverId 都是必填" });
  }

  const sql = `
    UPDATE Messages
    SET status = 'read'
    WHERE sender_id = ?
      AND receiver_id = ?
      AND status = 'unread'
  `;
  db.query(sql, [senderId, receiverId], (err, result) => {
    if (err) {
      console.error("PATCH /messages/read error:", err);
      return res.status(500).json({ error: "資料庫錯誤" });
    }

    res.json({ updated: result.affectedRows });
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器正在運行在端口 ${PORT}`);
});
