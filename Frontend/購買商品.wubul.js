import wixWindow from 'wix-window'; 
import { local } from 'wix-storage';

$w.onReady(function () {
    $w("#createOrder").onClick(() => {
        const token = getTokenFromLocalStorage();
        const userId = getUserIdFromToken(token);
        const time = ($w("#timePicker1").value).split(":")
        const orderData = {
            // productId: 2,
            product_id: local.getItem("selectedProduct"),        
            buyer_id: userId,
            tradeTime: `${time[0]}:${time[1]}`,
            tradeLocation: $w("#TradingPlace").value
        };

        createOrder(orderData);
        console.log(orderData); 
    });
});


function createOrder(orderData) {
    const apiUrl = "https://secondhand-xtsy.onrender.com/api/createOrder"; 

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("建立訂單失敗");
        }
        return response.json();
    })
    .then(data => {
        console.log("訂單建立成功：", data);
        wixWindow.openLightbox("訂單成功");
    })
    .catch(error => {
        console.error(error);
        wixWindow.openLightbox("訂單失敗");
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
