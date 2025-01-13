import { local } from "wix-storage";
import wixWindow from "wix-window";
import wixLocation from "wix-location";

$w.onReady(function () {
    const testBuyerId = 55; // 測試用固定 Buyer ID（未登入時）

    // 從 Local Storage 或 Token 中獲取 Buyer ID
    const token = getTokenFromLocalStorage();
    const buyerId = token ? getUserIdFromToken(token) : testBuyerId;

    if (!buyerId) {
        // 如果未登入，顯示提示並隱藏內容
        wixWindow.openLightbox("請先登入會員");
        $w("#noOrdersMessage").text = "請先登入會員";
        $w("#noOrdersMessage").show();
        $w("#productRepeater").hide();
        return;
    }

    // 獲取買家的訂單資料
    getOrdersAndProducts(buyerId);
});

// 獲取訂單與商品資料
function getOrdersAndProducts(buyerId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/getOrders/buyer/${buyerId}`;

    fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error("無法獲取訂單資料");
            }
            return response.json();
        })
        .then((orders) => {
            if (orders.length === 0) {
                // 如果沒有訂單，顯示提示
                $w("#noOrdersMessage").text = "您尚未購買任何商品";
                $w("#noOrdersMessage").show();
                $w("#productRepeater").hide();
                return;
            }

            // 獲取訂單中的 product_id 列表
            const productIds = orders.map(order => order.product_id);

            // 獲取商品詳細資料
            fetchProducts(productIds, orders);
        })
        .catch((error) => {
            console.error("查詢訂單失敗：", error);
            $w("#noOrdersMessage").text = "查詢訂單時發生錯誤，請稍後再試";
            $w("#noOrdersMessage").show();
        });
}

// 獲取商品詳細資料
function fetchProducts(productIds, orders) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/products`;

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("無法獲取商品詳細資料");
            }
            return response.json();
        })
        .then((products) => {
            if (products.length === 0) {
                $w("#noOrdersMessage").text = "未找到相關商品資料";
                $w("#noOrdersMessage").show();
                $w("#productRepeater").hide();
                return;
            }

            $w("#noOrdersMessage").hide();
            $w("#productRepeater").show();

            // 合併訂單與商品資料
            const repeaterData = orders.map(order => {
                const product = products.find(p => p.product_id === order.product_id);
                return {
                    _id: order.product_id,
                    productName: product ? product.name : "未知商品",
                    productDescription: product ? product.description : "無描述",
                    productImage: product ? product.image_url : "",
                    productId: order.product_id, // 用於評論按鈕
                    tradeTime: order.trade_time,
                    tradeLocation: order.trade_location,
                };
            });

            // 將數據綁定到 Repeater
            $w("#productRepeater").data = repeaterData;

            // 配置 Repeater 元件
            $w("#productRepeater").onItemReady(($item, itemData) => {
                $item("#productName").text = itemData.productName;
                $item("#productDescription").text = itemData.productDescription


                if (itemData.productImage) {
                    $item("#productImage").src = itemData.productImage;
                    $item("#productImage").show();
                } else {
                    $item("#productImage").hide();
                }

                // 配置撰寫評論按鈕
                $item("#reviewButton").onClick(() => {
                    local.setItem("selectedProductId", itemData.productId); // 存儲商品 ID
                    wixLocation.to("/shang-pin-ping-lun"); // 跳轉至評論頁
                });
            });
        })
        .catch((error) => {
            console.error("查詢商品失敗：", error);
            $w("#noOrdersMessage").text = "查詢商品時發生錯誤，請稍後再試";
            $w("#noOrdersMessage").show();
        });
}

//跳chatpage
$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);
    
    console.log("初始化 - 用戶ID:", userId);
    
    // 寫死賣家資訊
    const sellerId = 2;  // 改為數字類型
    const sellerName = "cc";

    initializeContactButton(userId, sellerId, sellerName);
});

function initializeContactButton(userId, sellerId, sellerName) {
    console.log("綁定按鈕 - 用戶ID:", userId, "賣家ID:", sellerId);
    
    $w('#contactSellerButton').onClick(() => {
        console.log("按鈕被點擊");
        console.log("準備發送請求 - 發送者:", userId, "接收者:", sellerId);
        
        initiateContact(userId, sellerId)
            .then((response) => {
                console.log("請求成功:", response);
                wixLocation.to('/聯絡人');
            })
            .catch((error) => {
                console.error("詳細錯誤資訊:", error);
                if ($w('#errorMessage')) {
                    $w('#errorMessage').text = "建立聯絡失敗，請稍後再試";
                    $w('#errorMessage').show();
                } else {
                    console.error("建立聯絡失敗");
                }
            });
    });
}

function initiateContact(senderId, receiverId) {
    const url = "https://secondhand-xtsy.onrender.com/messages/initiate";
    const body = {
        senderId: parseInt(senderId),    // 確保是數字
        receiverId: parseInt(receiverId)  // 確保是數字
    };

    console.log("發送請求到:", url);
    console.log("請求內容:", body);

    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(body)
    })
        .then(async (response) => {
            const responseText = await response.text();
            console.log("API回應狀態:", response.status);
            console.log("API回應內容:", responseText);

            if (!response.ok) {
                throw new Error(`API錯誤: ${response.status} - ${responseText}`);
            }

            try {
                return JSON.parse(responseText);
            } catch (e) {
                return { message: responseText };
            }
        });
}

// 從 Local Storage 獲取 token
function getTokenFromLocalStorage() {
    const token = local.getItem("jwtToken");
    if (!token) {
        console.error("未找到 Token，請先登入");
    }
    return token;
}

// 從 JWT Token 中解析 buyerId
function getUserIdFromToken(token) {
    if (!token) return null;

    try {
        const base64Payload = token.split(".")[1]; // 提取 JWT 的 payload
        const payload = JSON.parse(atob(base64Payload)); // Base64 解碼並轉為 JSON
        return payload.id; // 返回 userId 作為 buyerId
    } catch (error) {
        console.error("Token 解析失敗:", error);
        return null;
    }
}
