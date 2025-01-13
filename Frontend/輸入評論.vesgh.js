import wixLocation from "wix-location";
import { local } from "wix-storage";

$w.onReady(function () {
  const productId = local.getItem("productId");
  const orderId = local.getItem("orderId");

  if (!productId || !orderId) {
    console.error("無法獲取 productId 或 orderId");
    $w("#errorMessage").text = "評論提交失敗，缺少必要資訊";
    $w("#errorMessage").show();
    return;
  }

  console.log("商品 ID：", productId, "訂單 ID：", orderId);

  $w("#submitButton").onClick(() => {
    const reviewerId = $w("#buyerIdInput").value.trim();
    const reviewText = $w("#commentInput").value.trim();
    const rating = parseInt($w("#ratings").value.trim(), 10);

    if (!reviewerId || !reviewText || !rating || isNaN(rating) || rating < 1 || rating > 5) {
      console.error("評論提交失敗：請填寫完整且正確的資料");
      $w("#errorMessage").text = "請填寫所有必填項，並確保評分在 1 到 5 之間。";
      $w("#errorMessage").show();
      return;
    }

    const reviewData = {
      product_id: parseInt(productId, 10),
      order_id: parseInt(orderId, 10),
      reviewer_id: parseInt(reviewerId, 10),
      content: reviewText,
      rating: rating,
    };

    console.log("提交的評論資料：", reviewData);

    submitReview(reviewData, productId);
  });
});

function submitReview(reviewData, productId) {
  const apiUrl = "https://secondhand-xtsy.onrender.com/api/addReview";

  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reviewData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`評論提交失敗，狀態碼：${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("評論提交成功：", data);

      // 顯示成功訊息
      $w("#successMessage").text = "評論提交成功！即將返回評論頁面...";
      $w("#successMessage").show();

      // 清空輸入框
      $w("#buyerIdInput").value = "";
      $w("#commentInput").value = "";
      $w("#ratings").value = "";

      // 延遲 2 秒後跳轉回評論頁面
      setTimeout(() => {
        wixLocation.to(`/shang-pin-ping-lun/`);
      }, 2000);
    })
    .catch((error) => {
      console.error("評論提交時發生錯誤：", error);
      $w("#errorMessage").text = "評論提交失敗，請稍後再試。";
      $w("#errorMessage").show();
    });
}


