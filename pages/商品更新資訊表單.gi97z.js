import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(function () {
    const query = wixLocation.query;
    const productId = query.productId;

    if (!productId) {
        showErrorMessage("無法載入商品資訊，缺少 productId");
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

            // 填入資料到表單與元件
            $w("#ProductName").value = product.name || ""; // 確保非空值
            console.log("已填入商品名稱:", $w("#ProductName").value);

            $w("#ProductPrice").value = product.price || "0.00";
            console.log("已填入商品價格:", $w("#ProductPrice").value);

            $w("#ProductDescribe").value = product.description || "無描述";
            console.log("已填入商品描述:", $w("#ProductDescribe").value);

            $w("#image").value = product.image_url || "";
            console.log("已填入商品圖片:", $w("#image").value);

            // 原有商品資訊顯示
            $w("#text26").text = product.name || "無名稱";
            $w("#text27").text = product.price ? `$${product.price}` : "無價格";
            $w("#text28").text = product.description || "無描述";

            if (product.image_url) {
                $w("#image1").src = product.image_url;
                $w("#image1").show();
                console.log("商品圖片顯示完成:", product.image_url);
            } else {
                $w("#image1").hide();
                console.warn("原商品圖片不存在");
            }
        })
        .catch(error => {
            console.error("載入商品資訊失敗:", error);
            showErrorMessage("載入商品資訊失敗，請稍後再試");
        });

    // 提交更新邏輯
    $w("#button1").onClick(() => {
        console.log("提交按鈕被點擊");

        const productName = $w("#ProductName").value?.trim();
        const productPrice = $w("#ProductPrice").value?.trim();
        const productDescribe = $w("#ProductDescribe").value?.trim();
        const productImage = $w("#image").value?.trim();

        console.log("檢查提交的資料:", {
            productName,
            productPrice,
            productDescribe,
            productImage,
        });

        // 檢查所有必填項
        if (!productName || !productPrice || !productImage) {
            showErrorMessage("請填寫所有必填欄位");
            console.warn("提交失敗：必填欄位未完成");
            return;
        }

        const updatedProduct = {
            product_id: productId,
            name: productName,
            price: parseFloat(productPrice),
            description: productDescribe,
            image_url: productImage,
        };

        console.log("準備提交的更新資料:", updatedProduct);

        // 提交更新資料
        updateProductDetails(updatedProduct);
    });

    // 返回按鈕邏輯
    $w("#button2").onClick(() => {
        console.log("返回按鈕被點擊，準備跳轉至商品資訊-賣家頁面");
        if (productId) {
            const targetUrl = `/商品資訊-賣家?productId=${productId}`;
            console.log("跳轉目標 URL:", targetUrl);
            wixLocation.to(targetUrl);
        } else {
            showErrorMessage("缺少 productId，無法返回");
            console.error("返回失敗：productId 未定義");
        }
    });
});

// 更新商品資訊
function updateProductDetails(product) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/Products/updateDetails`;
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
        body: JSON.stringify(product),
    })
        .then(response => {
            console.log("API 更新回應狀態碼:", response.status);
            if (!response.ok) {
                throw new Error("商品資訊更新失敗");
            }
            return response.json();
        })
        .then(result => {
            console.log("商品資訊更新成功，回應資料:", result);
            showSuccessMessage("商品資訊更新成功！");
        })
        .catch(error => {
            console.error("商品資訊更新失敗:", error);
            showErrorMessage("商品資訊更新失敗，請稍後再試");
        });
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    console.log("顯示錯誤訊息:", message);
    $w("#errorMessage").text = message;
    $w("#errorMessage").show();
    setTimeout(() => $w("#errorMessage").hide(), 5000);
}

// 顯示成功訊息
function showSuccessMessage(message) {
    console.log("顯示成功訊息:", message);
    $w("#successMessage").text = message;
    $w("#successMessage").show();
    setTimeout(() => $w("#successMessage").hide(), 3000);
}
