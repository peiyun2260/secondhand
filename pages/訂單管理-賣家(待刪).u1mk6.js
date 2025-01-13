import { local } from "wix-storage";

$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);
    getOrdersSeller(userId);
    // getOrdersSeller(1);

});

// 查詢訂單
function getOrdersSeller(sellerId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/getOrders/seller/${sellerId}`;

    fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error("無法獲取訂單");
            }
            return response.json();
        })
        .then((data) => {
            if (data.length === 0) {
                $w("#pendingStatusText").text = "目前無訂單";
                $w("#completedStatusText").text = "目前無訂單";
                $w('#completedStatusText').show();
                $w('#pendingStatusText').show();
                return;
            }

            // 重置頁面元素
            $w("#pendingStatusText").hide();
            $w("#completedStatusText").hide();

            data.forEach((order) => {
                const { product_id, product_name, order_status, order_id } = order;

                if (order_status === "pending") {
                    // 未完成訂單顯示按鈕
                    $w("#pendingProduct1").text = `商品名稱: ${product_name}`;
                    $w("#pendingProduct1").show();
                    $w('#pendingProductImage1').show();

        
                } else if (order_status === "completed") {
                    // 完成訂單顯示商品名稱
                    $w("#completedProduct1").text = `商品名稱: ${product_name}`;
                    $w("#completedProduct1").show();
                    $w("#completedProductImage1").show();
                }
            });
        })
        .catch((error) => {
            console.error("查詢訂單失敗：", error);
                $w("#pendingStatusText").text = "查詢訂單時發生錯誤，請稍後再試";
                $w("#completedStatusText").text = "查詢訂單時發生錯誤，請稍後再試";
                $w('#completedStatusText').show();
                $w('#pendingStatusText').show();
        });
}

function getTokenFromLocalStorage() {
    const token = local.getItem("jwtToken");
    if (!token) {
        console.error("無法從 local storage 獲取 token");
    }
    return token;
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