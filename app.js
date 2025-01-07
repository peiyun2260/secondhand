const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: ["https://secondhandhand22.wixsite.com/", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

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

// API: 建立訂單
app.post("/api/createOrder", (req, res) => {
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

  const insertOrderQuery = `
          INSERT INTO Orders (product_id, seller_id, order_id, total_amount, trade_time, trade_location)
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

      // 插入訂單記錄
      connection.query(
        insertOrderQuery,
        [productId, sellerId, buyerId, totalAmount, tradeTime, tradeLocation],
        (insertErr, result) => {
          if (insertErr) {
            console.error("無法建立訂單：", insertErr);
            return connection.rollback(() => {
              connection.release(); // 回滾後釋放連接
              res.status(500).send("建立訂單時發生錯誤");
            });
          }

          // 更新商品狀態
          connection.query(updateProductQuery, [productId], (updateErr) => {
            if (updateErr) {
              console.error("無法更新商品狀態：", updateErr);
              return connection.rollback(() => {
                connection.release(); // 回滾後釋放連接
                res.status(500).send("建立訂單時發生錯誤");
              });
            }

            // 提交事務
            connection.commit((commitErr) => {
              if (commitErr) {
                console.error("無法提交事務：", commitErr);
                return connection.rollback(() => {
                  connection.release(); // 回滾後釋放連接
                  res.status(500).send("建立訂單時發生錯誤");
                });
              }

              // 提交成功後釋放連接並返回成功響應
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

// API：更新訂單狀態
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

  db.query(addReviewQuery, [productId, buyerId, reviewText, rating], (err, result) => {
    if (err) {
      console.error("無法新增評論：", err);
      return res.status(500).send("新增評論時發生錯誤");
    }

    res.status(201).send({
      message: "評論已成功提交",
      reviewId: result.insertId,
    });
  });
});

// API： 讀取特定商品的評論
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

// API：讀取購買者的所有評論
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
