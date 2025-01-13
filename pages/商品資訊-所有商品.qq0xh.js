import wixLocation from 'wix-location';
import { local } from 'wix-storage';
import { fetch } from 'wix-fetch';


$w.onReady(() => {
    // 從 Local Storage 或 URL 中獲取 productId
    const productId = local.getItem("productId");

    if (!productId) {
        console.error("無法獲取商品 ID");
        $w('#errorMessage').text = "無法獲取商品資訊，請返回上一頁重試。";
        $w('#errorMessage').show();
        
        return;
    }

    console.log("商品詳情頁商品 ID:", productId);

    // 使用 API 獲取商品詳情
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/getProductsWithImages?productId=${productId}`;

    fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error("商品詳情加載失敗，狀態碼：" + response.status);
            }
            return response.json();
        })
        .then((products) => {
            if (products && products.length > 0) {
                const product = products[0]; // 獲取第一個匹配的商品
                console.log("商品詳情：", product);

                // 更新商品詳情內容
                $w('#productName').text = product.product_name;
                $w('#productDescription').text = product.description || "暫無描述";
                

                // 更新圖片
                if (product.images && product.images.length > 0) {
                    $w('#productImage').src = product.images[0];
                    $w('#productImage').show();
                } else {
                    $w('#productImage').hide();
                }

                $w('#errorMessage').hide();
                
            } else {
                console.error("未找到該商品的詳情");
                $w('#errorMessage').text = "未找到該商品的詳情，請返回重試。";
                $w('#errorMessage').show();
                
            }
        })
        .catch((error) => {
            console.error("商品詳情加載失敗：", error);
            $w('#errorMessage').text = "商品詳情加載失敗，請稍後再試。";
            $w('#errorMessage').show();
            
        });
});

$w.onReady(function () {
    const productId = local.getItem("productId");
    $w('#button5').onClick(() => {
        local.setItem("selectedProduct",productId); 
        wixLocation.to('/購買商品')
    });
});

$w.onReady(function () {
    $w('#button3').onClick(() => {
        wixLocation.to("/copy-of-shang-pin-ping-lun-1/");
    });
});

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