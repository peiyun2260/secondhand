import { local } from 'wix-storage';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);

    if (!token) {
        // 若未登入，跳轉到登入頁面
        wixWindow.openLightbox("請先登入會員");
        $w("#noProductsMessage").text = "請先登入會員";
        $w("#noProductsMessage").show();
        $w("#repeater1").hide();
        return;
    }

    // 請求使用者的商品資料
    fetchProducts(userId, token);
});

// 獲取商品資料
function fetchProducts(userId, token) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/Products`;

    fetch(apiUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('無法取得商品資料');
            }
            return response.json();
        })
        .then(products => {
            if (!products || products.length === 0) {
                $w("#noProductsMessage").text = "目前沒有商品";
                $w("#noProductsMessage").show();
                $w("#repeater1").hide();
                return;
            }

            $w("#noProductsMessage").hide();
            $w("#repeater1").show(); // 顯示 Repeater
            bindProductsToRepeater(products);
        })
        .catch(error => {
            console.error('商品資料加載失敗:', error);
            $w("#noProductsMessage").text = "商品資料載入失敗，請稍後再試";
            $w("#noProductsMessage").show();
            $w("#repeater1").hide();
        });
}

// 綁定資料到 Repeater
function bindProductsToRepeater(products) {
    $w("#repeater1").data = products.map((product, index) => ({
        _id: `product-${index}`,
        product_id: product.product_id,
        name: product.name,
        status: product.status,
        sellerId: product.seller_id, // 確保 API 返回 seller_id 並綁定到 repeater
        firstImageUrl: product.images?.length > 0
            ? formatImageUrl(product.images[0].url)
            : 'https://via.placeholder.com/300?text=No+Image'
    }));

    $w("#repeater1").onItemReady(($item, itemData) => {
        // 設定商品名稱
        $item("#productName").text = itemData.name || "無名稱";
        $item("#productName").show(); // 顯示名稱元件

        // 設定商品圖片
        if (itemData.firstImageUrl) {
            $item("#productImage").src = itemData.firstImageUrl;
            $item("#productImage").show(); // 顯示圖片元件
        } else {
            $item("#productImage").hide(); // 隱藏圖片元件
        }

        // 設定商品詳情按鈕
        $item("#detailsButton").onClick(() => {
            if (itemData.product_id) {
                console.log(`Navigating to 商品資訊-賣家 with product ID: ${itemData.product_id}`);
                // 攜帶商品 ID 跳轉到商品資訊頁面
                wixLocation.to(`/商品資訊-賣家?productId=${itemData.product_id}`);
            } else {
                console.error("商品 ID 不存在，無法跳轉到商品資訊頁面");
            }
        });
        $item("#detailsButton").show(); // 顯示詳情按鈕

        // 設定瀏覽評價按鈕
        $item("#viewReviewsButton").onClick(() => {
            if (itemData.product_id) {
                console.log(`Navigating to 商品評論-查看 with product ID: ${itemData.product_id}`);
                // 儲存商品 ID 至 Local Storage
                local.setItem("productId", itemData.product_id.toString());
                // 動態頁面跳轉
                const dynamicPageUrl = `/copy-2-of-shang-pin-ping-lun-1/`;
                console.log(`動態頁面 URL: ${dynamicPageUrl}`);
                wixLocation.to(dynamicPageUrl);
            } else {
                console.error("商品 ID 不存在，無法跳轉到商品評論頁面");
            }
        });
        $item("#viewReviewsButton").show(); // 顯示評價按鈕

        // 設定狀態下拉選單
        $item("#statusDropdown").value = itemData.status;
        $item("#statusDropdown").show(); // 顯示狀態下拉選單
        $item("#statusDropdown").onChange(() => {
            const newStatus = $item("#statusDropdown").value;
            updateProductStatus(itemData.product_id, newStatus);
        });
    });
}

// 更新商品狀態
function updateProductStatus(product_id, status) {
    const token = getTokenFromLocalStorage();
    const apiUrl = 'https://secondhand-xtsy.onrender.com/Products/update';

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ product_id, status })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('商品狀態更新失敗');
            }
            return response.json();
        })
        .then(() => {
            showSuccessMessage("商品狀態已更新！");
        })
        .catch(error => {
            console.error('商品狀態更新失敗:', error);
            showErrorMessage("商品狀態更新失敗，請稍後再試");
        });
}

// 顯示成功訊息
function showSuccessMessage(message) {
    $w("#successMessage").text = message;
    $w("#successMessage").show();
    setTimeout(() => {
        $w("#successMessage").hide();
    }, 3000);
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    $w("#errorMessage").text = message;
    $w("#errorMessage").show();
    setTimeout(() => {
        $w("#errorMessage").hide();
    }, 3000);
}

// 格式化圖片 URL
function formatImageUrl(url) {
    if (url.includes("drive.google.com")) {
        const match = url.match(/id=([^&]+)/);
        return match ? `https://drive.google.com/uc?id=${match[1]}` : url;
    }
    return url;
}

// 從 local storage 獲取 token
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
        const base64Payload = token.split(".")[1];
        const payload = JSON.parse(atob(base64Payload));
        return payload.id;
    } catch (error) {
        console.error("Token 解析錯誤:", error);
        return null;
    }
}
