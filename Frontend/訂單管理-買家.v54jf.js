import { local } from "wix-storage";
import wixWindow from "wix-window"; 
import wixLocation from "wix-location";

$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);
    getOrdersBuyer(userId);

    if (!token) {
        // 如果未登入，跳轉到登入頁面
        wixWindow.openLightbox("請先登入會員"); 
        $w("#noOrdersMessage").show();
        $w("#pendingRepeater").hide();
        $w("#completedRepeater").hide();
        $w("#cancelledRepeater").hide();
        $w("#pendingtext").hide();
        $w("#completedtext").hide();
        $w("#cancelledtext").hide();
        return;
    }
});

function getOrdersBuyer(buyerId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/getOrders/buyer/${buyerId}`;

    fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error("無法獲取訂單");
            }
            return response.json();
        })
        .then((data) => {
            if (data.length === 0) {
                $w("#noOrdersMessage").text = "目前無訂單";
                $w("#noOrdersMessage").show();
                $w("#pendingRepeater").hide();
                $w("#completedRepeater").hide();
                $w("#cancelledRepeater").hide();
                $w("#pendingtext").hide();
                $w("#completedtext").hide();
                $w("#cancelledtext").hide();
                return;
            }

            $w("#noOrdersMessage").hide();

            // 將訂單分為三類
            const pendingOrders = data
                .filter((order) => order.order_status === "pending")
                .map((order, index) => ({ ...order, _id: `pending-${index}` }));

            const completedOrders = data
                .filter((order) => order.order_status === "completed")
                .map((order, index) => ({ ...order, _id: `completed-${index}` }));

            const cancelledOrders = data
                .filter((order) => order.order_status === "cancelled")
                .map((order, index) => ({ ...order, _id: `cancelled-${index}` }));

            // 更新 Pending Repeater 的資料
            $w("#pendingRepeater").data = pendingOrders;
            $w("#pendingRepeater").onItemReady(($item, itemData) => {
                const { product_name, order_id, seller_name, product_image_url, order_date, trade_location, trade_time } = itemData;

                $item("#pendingProductName").text = product_name;
                $item("#pendingSeller").text = `賣家: ${seller_name}`;
                $item("#pendingTime").text =  `訂單成立時間: ${formatDate(order_date)}`;
                $item("#pendingLocation").text = `面交地點: ${trade_location}`;
                $item("#pendingTradeTime").text = `面交時間: ${trade_time}`;

                $item("#pendingProductButton").onClick(() => {
                    local.setItem("orderId", order_id);
                    wixLocation.to("/商品狀態更新-買家"); // 跳轉至買家狀態更新頁面
                });

                if (product_image_url) {
                    $item("#pendingProductImage").src = product_image_url;
                    $item("#pendingProductImage").show();
                } else {
                    $item("#pendingProductImage").hide();
                }
            });

            // 更新 Completed Repeater 的資料
            $w("#completedRepeater").data = completedOrders;
            $w("#completedRepeater").onItemReady(($item, itemData) => {
                const { product_name, seller_name, product_image_url, updated_date, trade_location, trade_time, product_id } = itemData;

                $item("#completedProductName").text = product_name;
                $item("#completedBuyer").text = `賣家: ${seller_name}`;
                $item("#completedTime").text = `訂單完成時間: ${formatDate(updated_date)}`;
                $item("#completedLocation").text = `面交地點: ${trade_location}`;
                $item("#completedTradeTime").text = `面交時間: ${trade_time}`;

                // 配置「查看評論」按鈕
                $item("#completedReviewButton").onClick(() => {
                    // 存儲 product_id 到 Local Storage，然後跳轉到評論頁
                    local.setItem("productId", product_id);
                    wixLocation.to("/shang-pin-ping-lun"); // 跳轉至評論頁面
                });

                if (product_image_url) {
                    $item("#completedProductImage").src = product_image_url;
                    $item("#completedProductImage").show();
                } else {
                    $item("#completedProductImage").hide();
                }
            });

            // 更新 Cancelled Repeater 的資料
            $w("#cancelledRepeater").data = cancelledOrders;
            $w("#cancelledRepeater").onItemReady(($item, itemData) => {
                const { product_name, seller_name, product_image_url, updated_date } = itemData;

                $item("#cancelledProductName").text = product_name;
                $item("#cancelledBuyer").text = `賣家: ${seller_name}`;
                $item("#cancelledTime").text = `訂單取消時間: ${formatDate(updated_date)}`;

                if (product_image_url) {
                    $item("#cancelledProductImage").src = product_image_url;
                    $item("#cancelledProductImage").show();
                } else {
                    $item("#cancelledProductImage").hide();
                }
            });
        })
        .catch((error) => {
            console.error("查詢訂單失敗：", error);
            $w("#noOrdersMessage").text = "查詢訂單時發生錯誤，請稍後再試";
            $w("#noOrdersMessage").show();
        });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTokenFromLocalStorage() {
    const token = local.getItem("jwtToken");
    if (!token) {
        console.error("無法從 local storage 獲取 token");
    }
    return token;
}

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
