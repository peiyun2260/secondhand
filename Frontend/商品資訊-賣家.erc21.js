import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(function () {
    const query = wixLocation.query;
    const productId = query.productId;

    if (!productId) {
        showErrorMessage("無法載入商品資訊，請返回商品管理頁面");
        console.error("缺少 productId，無法載入商品資訊");
        return;
    }

    console.log("Fetching product details for product ID:", productId);

    const apiUrl = `https://secondhand-xtsy.onrender.com/Products/${productId}`;
    fetch(apiUrl, {
        method: 'GET',
    })
        .then(response => {
            console.log("API 回應狀態碼:", response.status);
            if (!response.ok) {
                throw new Error('無法載入商品資訊');
            }
            return response.json();
        })
        .then(product => {
            console.log("商品詳細資訊:", product);

            // 顯示商品圖片
            if (product.image_url) {
                $w("#image1").src = product.image_url;
                $w("#image1").show();
                console.log("商品圖片已顯示:", product.image_url);
            } else {
                $w("#image1").hide();
                console.warn("商品圖片不存在");
            }

            // 顯示商品名稱與描述
            $w("#text21").text = product.name || "無名稱";
            console.log("商品名稱顯示:", $w("#text21").text);

            $w("#text22").text = product.description || "無描述";
            console.log("商品描述顯示:", $w("#text22").text);

            // 設定下拉選單的初始值
            $w("#dropdown1").value = product.status || "未設定";
            console.log("下拉選單初始值:", $w("#dropdown1").value);

            // 綁定下拉選單變更事件
            $w("#dropdown1").onChange(() => {
                const newStatus = $w("#dropdown1").value;
                console.log(`商品狀態變更為: ${newStatus}`);
                updateProductStatus(product.product_id, newStatus);
            });
        })
        .catch(error => {
            console.error("載入商品資訊失敗:", error);
            showErrorMessage("載入商品資訊失敗，請稍後再試");
        });

    // 處理 "更新商品資訊" 按鈕點擊事件
    $w("#button1").onClick(() => {
        if (!productId) {
            showErrorMessage("無法跳轉到更新資訊頁面，缺少 productId");
            return;
        }

        console.log(`Navigating to 更新商品資訊表單 with product ID: ${productId}`);
        wixLocation.to(`/商品更新資訊表單?productId=${productId}`);
    });

    // 處理 "返回商品管理" 按鈕點擊事件
    $w("#button2").onClick(() => {
        console.log("返回按鈕被點擊，準備跳轉到商品管理頁面");

        const token = local.getItem("jwtToken");
        console.log("攜帶的 token:", token);

        if (!token) {
            showErrorMessage("未登入，無法返回商品管理頁面");
            console.error("返回失敗：缺少 token");
            return;
        }

        // 攜帶 token 跳轉到商品管理頁面
        wixLocation.to(`/我的商品-賣家?token=${encodeURIComponent(token)}`);
    });
});

// 更新商品狀態
function updateProductStatus(productId, status) {
    const apiUrl = 'https://secondhand-xtsy.onrender.com/Products/update';
    const token = local.getItem("jwtToken");

    console.log("檢查 JWT Token:", token);
    if (!token) {
        showErrorMessage("未登入，請重新登入");
        return;
    }

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, status }),
    })
        .then(response => {
            console.log("API 回應狀態碼:", response.status);
            if (!response.ok) {
                throw new Error('商品狀態更新失敗');
            }
            return response.json();
        })
        .then(() => {
            console.log("商品狀態更新成功");
            showSuccessMessage("商品狀態更新成功！");
        })
        .catch(error => {
            console.error("更新商品狀態失敗:", error);
            showErrorMessage("更新商品狀態失敗，請稍後再試");
        });
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    console.log("顯示錯誤訊息:", message);
    $w("#errorMessage").text = message;
    $w("#errorMessage").show();
    setTimeout(() => $w("#errorMessage").hide(), 5000); // 5秒後自動隱藏
}

// 顯示成功訊息
function showSuccessMessage(message) {
    console.log("顯示成功訊息:", message);
    $w("#successMessage").text = message;
    $w("#successMessage").show();
    setTimeout(() => $w("#successMessage").hide(), 3000); // 3秒後自動隱藏
}
