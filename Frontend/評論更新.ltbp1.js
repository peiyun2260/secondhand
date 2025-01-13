import { local } from 'wix-storage';
import wixLocation from 'wix-location';

$w.onReady(function () {
    // 從 Local Storage 獲取評論相關資訊
    const reviewId = local.getItem("reviewId");
    const content = local.getItem("content");
    const rating = local.getItem("rating");

    if (!reviewId) {
        showErrorMessage("無法載入評論資訊，缺少必要資料");
        return;
    }

    console.log("更新評論頁面 - reviewId:", reviewId);

    // 預填評論內容和評分
    $w("#commentInput").value = content || "";
    $w("#ratings").value = rating || "3";

    // 配置提交按鈕的邏輯
    $w("#submitButton").onClick(() => {
        const updatedContent = $w("#commentInput").value.trim();
        const updatedRating = parseInt($w("#ratings").value.trim(), 10);

        // 驗證輸入內容是否合法
        if (!updatedContent || isNaN(updatedRating) || updatedRating < 1 || updatedRating > 5) {
            showErrorMessage("請填寫所有必填欄位，並確保評分在 1 到 5 之間");
            return;
        }

        // 發送更新評論請求
        updateReview(reviewId, updatedContent, updatedRating);
    });
});

// 更新評論的函數
function updateReview(reviewId, content, rating) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/updateReview/${reviewId}`;
    const token = local.getItem("jwtToken");

    if (!token) {
        showErrorMessage("未登入，請重新登入");
        return;
    }

    console.log("即將發送更新請求：", apiUrl);

    fetch(apiUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, rating }),
    })
        .then((response) => {
            console.log("後端響應狀態碼：", response.status);
            if (!response.ok) {
                return response.json().then((data) => {
                    throw new Error(data.error || "更新評論失敗");
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log("更新成功：", data.message);
            showSuccessMessage(data.message || "評論更新成功！");
            wixLocation.to(`/shang-pin-ping-lun`);
        })
        .catch((error) => {
            console.error("更新評論時發生錯誤：", error);
            showErrorMessage(error.message || "更新評論失敗，請稍後再試");
        });
}


$w("#cancelButton").onClick(() => {
    wixLocation.to(`/shang-pin-ping-lun/`);
});


// 顯示錯誤訊息
function showErrorMessage(message) {
    $w("#errorMessage").text = message;
    $w("#errorMessage").show();
    setTimeout(() => $w("#errorMessage").hide(), 5000);
}

// 顯示成功訊息
function showSuccessMessage(message) {
    $w("#successMessage").text = message;
    $w("#successMessage").show();
    setTimeout(() => $w("#successMessage").hide(), 3000);
}
