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

const db = mysql.createPool({
  host: "secondhandhand22.cbwq8kceejp8.ap-southeast-1.rds.amazonaws.com",
  port: 3306,
  user: "admin",
  password: "password",
  database: "SecondHandMarket",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// const db = mysql.createPool({
//   host: "localhost",
//   port: 3306,
//   user: "secondhand",
//   password: "12345678",
//   database: "SecondHandMarket",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

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

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`伺服器正在 http://localhost:${PORT} 運行`);
});
