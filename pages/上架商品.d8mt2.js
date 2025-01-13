import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { local } from 'wix-storage';

$w.onReady(() => {
    // 初始化訊息框和圖片預覽
    $w('#textMessage').hide();
    $w('#imagePreview').hide(); // 預設隱藏圖片預覽

    // 檢查 token 並在 Console 輸出
    const token = getTokenFromLocalStorage();
    console.log("Retrieved token:", token);

    const userId = getUserIdFromToken(token);
    console.log("Decoded userId:", userId);

    if (!token || !userId) {
        // 顯示未登入訊息
        $w("#textMessage").text = "你目前尚未登入，無法上架！";
        $w("#textMessage").style.color = "red";
        $w("#textMessage").show();

        // 隱藏提交按鈕
        $w("#submit").hide();

        // 中止後續執行
        return;
    }

    // 動態更新圖片預覽
    $w('#ImageUpload').onInput(() => {
        const imageUrl = $w('#ImageUpload').value.trim();

        // 驗證 URL 是否有效
        if (isValidImageURL(imageUrl)) {
            $w('#imagePreview').src = imageUrl; // 更新圖片的 src
            $w('#imagePreview').show();        // 顯示圖片
            console.log("Valid image URL. Preview updated:", imageUrl);
        } else {
            $w('#imagePreview').hide();        // 隱藏圖片
            console.log("Invalid image URL. Preview hidden.");
        }
    });

    $w('#submit').onClick(() => {
        $w('#textMessage').hide(); // 清除舊訊息

        // 收集資料時檢查表單值
        const product = collectProductData();
        console.log("Collected product data:", product);

        const validationMessage = validateProductFields(product);
        if (validationMessage) {
            showErrorMessage(validationMessage);
            console.error("Validation error:", validationMessage);
            return;
        }

        uploadProduct(product, token);
    });
});

// 收集表單資料
function collectProductData() {
    const name = $w('#ProductName').value?.trim();
    const price = $w('#ProductPrice').value?.trim();
    const description = $w('#ProductDescribe').value?.trim();
    const image_url = $w('#ImageUpload').value?.trim();

    console.log("Form fields - name:", name, "price:", price, "description:", description, "image_url:", image_url);

    return {
        name,
        price: parseFloat(price),
        description,
        image_url: formatImageUrl(image_url),
        status: 'listed',
    };
}

// 驗證商品欄位
function validateProductFields(product) {
    const { name, price, description, image_url } = product;

    // 驗證必填欄位
    if (!name || !price || !description || !image_url) {
        return '所有欄位皆為必填';
    }
    // 驗證價格是否為有效數字
    if (isNaN(price)) {
        return '價格必須是數值';
    }
    // 驗證圖片 URL 格式
    if (!isValidImageURL(image_url)) {
        return '請輸入有效的圖片 URL（例如 .jpg 或 .png）';
    }
    return null;
}

// 上傳商品到後端 API
function uploadProduct(product, token) {
    const apiUrl = 'https://secondhand-xtsy.onrender.com/Products/add';
    console.log("Uploading product to API:", apiUrl, product);

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(product)
    })
        .then((response) => {
            console.log("API response status:", response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    console.error("API response error:", err);
                    throw new Error(err.error || '上架失敗！');
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log("API response success data:", data);
            clearFormFields();
            showSuccessMessage('商品已成功上架！');
            setTimeout(() => {
                wixLocation.to('/我的商品-賣家'); // 跳轉到商品管理頁面
            }, 2000);
        })
        .catch((error) => {
            console.error('上傳商品失敗:', error);
            handleApiError(error);
        });
}

// 清空表單欄位
function clearFormFields() {
    console.log("Clearing form fields");
    $w('#ProductName').value = '';
    $w('#ProductPrice').value = '';
    $w('#ProductDescribe').value = '';
    $w('#ImageUpload').value = '';
    $w('#imagePreview').hide(); // 隱藏圖片預覽
}

// 格式化圖片 URL
function formatImageUrl(url) {
    if (url.includes('drive.google.com')) {
        const match = url.match(/id=([^&]+)/);
        return match ? `https://drive.google.com/uc?id=${match[1]}` : url;
    }
    return url;
}

// 驗證圖片 URL 格式
function isValidImageURL(url) {
    const urlPattern = /\.(jpeg|jpg|gif|png|webp)$/i;
    return urlPattern.test(url);
}

// 顯示成功訊息
function showSuccessMessage(message) {
    console.log("Success message:", message);
    $w('#textMessage').text = message;
    $w('#textMessage').style.color = 'green';
    $w('#textMessage').show();
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    console.error("Error message:", message);
    $w('#textMessage').text = message;
    $w('#textMessage').style.color = 'red';
    $w('#textMessage').show();
}

// 處理 API 錯誤
function handleApiError(error) {
    console.error("Handling API error:", error.message);
    if (error.message.includes("token")) {
        showErrorMessage("驗證失敗，請重新登入");
    } else if (error.message.includes("缺少必要的商品資訊")) {
        showErrorMessage("請確認填寫完整的商品資料");
    } else {
        showErrorMessage("伺服器錯誤，請稍後再試");
    }
}

// 獲取 local storage 中的 token
function getTokenFromLocalStorage() {
    const token = local.getItem('jwtToken');
    console.log("Retrieved token from local storage:", token);
    if (!token) {
        console.error('無法從 local storage 獲取 token');
    }
    return token;
}

// 從 JWT Token 中解析 userId
function getUserIdFromToken(token) {
    if (!token) return null;

    try {
        const base64Payload = token.split('.')[1]; // 提取 JWT 的 payload
        const payload = JSON.parse(atob(base64Payload)); // Base64 解碼並轉為 JSON
        console.log("Decoded payload:", payload);
        return payload.id; // 返回 userId
    } catch (error) {
        console.error("Token 解析錯誤:", error);
        return null;
    }
}
