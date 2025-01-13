import wixLocation from 'wix-location';
import {local} from "wix-storage"

$w.onReady(() => {
    // API 取得所有商品及其圖片
    const getProductsAPI = "https://secondhand-xtsy.onrender.com/api/getProductsWithImages";

    fetch(getProductsAPI)
        .then((response) => {
            if (!response.ok) {
                throw new Error("無法獲取商品資料，狀態碼：" + response.status);
            }
            return response.json();
        })
        .then((products) => {
            if (products && products.length > 0) {
                // 只取出 status 為 "listed" 的商品
                const listedProducts = products.filter(product => product.status === 'listed');

                if (listedProducts.length === 0) {
                    // 若沒有任何商品是 listed，就顯示「暫無商品」
                    console.log("暫無 listed 狀態的商品數據");
                    $w("#noProductsMessage").text = "暫無商品數據";
                    $w("#noProductsMessage").show();
                    $w("#productRepeater").hide();
                    return;
                }

                console.log("所有 listed 商品數據：", listedProducts);

                // 為每個商品新增唯一的 `_id` 屬性，並確保其為字串類型
                const productsWithId = listedProducts.map((product) => ({
                    ...product,
                    _id: product.product_id.toString() // 確保 _id 為字串
                }));

                // 綁定數據到 Repeater
                $w("#productRepeater").data = productsWithId;

                // 配置 Repeater 中的項目內容
                $w("#productRepeater").onItemReady(($item, itemData) => {
                    const { product_name, description, price, images } = itemData;

                    $item("#productName").text = product_name;
                    $item("#productPrice").text = `價格：$${Math.floor(price)}`;

                    // 如果有圖片，顯示第一張作為展示圖片
                    if (images && images.length > 0) {
                        $item("#productImage").src = images[0];
                        $item("#productImage").show();
                    } else {
                        $item("#productImage").hide();
                    }

                    // 配置 "查看更多" 按鈕，點擊跳轉到商品詳情頁面
                    $item("#reviewButton").onClick(() => {
                        local.setItem("productId", itemData.product_id);
                        wixLocation.to(`/商品資訊-所有商品?productId=${itemData.product_id}`);
                    });
                });

                // 顯示 Repeater，隱藏無商品訊息
                $w("#noProductsMessage").hide();
                $w("#productRepeater").show();
            } else {
                // 如果後端回傳的陣列是空的（整體無商品資料）
                console.log("暫無商品數據");
                $w("#noProductsMessage").text = "暫無商品數據";
                $w("#noProductsMessage").show();
                $w("#productRepeater").hide();
            }
        })
        .catch((error) => {
            console.error("商品加載失敗：", error);
            $w("#noProductsMessage").text = "商品加載失敗，請稍後再試。";
            $w("#noProductsMessage").show();
            $w("#productRepeater").hide();
        });
});


//跳chatpage
$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);
    
    console.log("初始化 - 用戶ID:", userId);
    
    // 寫死賣家資訊
    const sellerId = 73;  // 改為數字類型
    const sellerName = "JerryChen";

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

function getTokenFromLocalStorage() {
    const token = local.getItem("jwtToken");
    console.log("取得Token:", token ? "成功" : "失敗");
    if (!token) {
        console.error("無法從 local storage 獲取 token");
    }
    return token;
}

function getUserIdFromToken(token) {
    if (!token) return null;

    try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        const userId = payload.id;
        console.log("解析出的用戶ID:", userId);
        return userId;
    } catch (error) {
        console.error("Token 解析錯誤:", error);
        return null;
    }
}


