import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(function () {
    // 從 Local Storage 獲取評論所需資訊
    const reviewId = local.getItem("reviewId");
    const productId = local.getItem("productId");
    const token = local.getItem("jwtToken");
    const userId = getUserIdFromToken(token);

    if (!reviewId || !productId || !userId) {
        showErrorMessage("無法載入評論資訊，缺少必要資料");
        console.error("缺少 reviewId、productId 或 userId，無法載入評論資訊");
        return;
    }

    console.log("準備刪除評論 ID:", reviewId);

    // 綁定確認刪除按鈕的點擊事件
    $w("#submitButton").onClick(() => {
        console.log("確認刪除評論");
        deleteReview(reviewId, productId);
    });

    // 綁定返回按鈕的點擊事件
    $w("#cancelButton").onClick(() => {
        wixLocation.to(`/shang-pin-ping-lun/`);
    });
});

// 刪除評論的函數
function deleteReview(reviewId, productId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/deleteReview/${reviewId}`;
    const token = local.getItem("jwtToken");

    if (!token) {
        showErrorMessage("未登入，請重新登入");
        return;
    }

    fetch(apiUrl, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("評論刪除失敗");
            }
            return response.json();
        })
        .then(() => {
            console.log("評論刪除成功");
            showSuccessMessage("評論刪除成功！");
            // 跳轉回評論頁面
            setTimeout(() => {
                wixLocation.to(`/shang-pin-ping-lun/`);
            }, 2000);
        })
        .catch((error) => {
            console.error("評論刪除失敗:", error);
            showErrorMessage("評論刪除失敗，請稍後再試");
        });
}

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

// 從 JWT Token 中解析 userId
function getUserIdFromToken(token) {
    if (!token) return null;

    try {
        const base64Payload = token.split('.')[1]; // 提取 JWT 的 payload
        const payload = JSON.parse(atob(base64Payload)); // Base64 解碼並轉為 JSON
        return payload.id; // 返回 userId
    } catch (error) {
        console.error("Token 解析錯誤:", error);
        return null;
    }
}

