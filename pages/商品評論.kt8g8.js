import wixLocation from 'wix-location';
import {local} from 'wix-storage';

$w.onReady(() => {
    // 從 Local Storage 獲取 productId 和 userId
    const productId = local.getItem("productId");
    const token = getTokenFromLocalStorage();
    const currentUserId = getUserIdFromToken(token);
    

    if (!productId) {
        console.error("無法獲取商品 ID");
        $w('#noReviewsMessage').text = "無法獲取商品資訊，請返回上一頁重試。";
        $w('#noReview').show();
        $w('#reviewRepeater').hide();
        return;
    }

    console.log("評論頁商品 ID:", productId);
    console.log("當前使用者 ID:", currentUserId);
        

    // 使用 API 獲取評論數據
    const getReviewsAPI = `https://secondhand-xtsy.onrender.com/api/getReviews/${productId}`;

    fetch(getReviewsAPI)
        .then((response) => {
            if (!response.ok) {
                throw new Error("評論加載失敗，狀態碼：" + response.status);
            }
            return response.json();
        })
        .then((reviews) => {
            if (reviews && reviews.length > 0) {
                console.log("商品評論：", reviews);

                // 為每個評論新增唯一的 _id 屬性
                const reviewsWithId = reviews.map((review, index) => ({
                    ...review,
                    _id:  `review-${index}`,
                }));

                // 綁定評論數據到 Repeater
                $w("#reviewRepeater").data = reviewsWithId;

                // 配置 Repeater 中的項目內容
                $w("#reviewRepeater").onItemReady(($item, itemData) => {
                    const { reviewer_id, content, rating, review_date, _id, review_id } = itemData;

                    // 顯示評論內容
                    $item("#reviewerName").text = `用戶: ${reviewer_id}`;
                    $item("#reviewText").text = content || "暫無評論內容";
                    $item("#reviewRating").text = `評分: ${rating} / 5`;
                    $item("#reviewDate").text = formatDate(review_date);

                    // 判斷是否顯示更新與刪除按鈕
                    if (currentUserId === reviewer_id) {
                        $item("#editButton").show();
                        $item("#deleteButton").show();

                        // 更新評論按鈕邏輯
                        $item("#editButton").onClick(() => {
                            local.setItem("reviewerId", reviewer_id)
                            local.setItem("reviewId", review_id);
                            local.setItem("content", content);
                            local.setItem("rating", rating.toString());
                            local.setItem("productId", productId);
                            
                            wixLocation.to(`/副本-輸入評論`);
                        });
                        $item("#deleteButton").onClick(() => {
                            local.setItem("reviewId", review_id);
                            console.log("即將儲存的 review_id:", itemData.review_id);
                            local.setItem("content", content);
                            local.setItem("rating", rating.toString());
                            local.setItem("productId", productId);
                            
                            wixLocation.to(`/評論刪除詢問`);
                        });
                    } else {
                        $item("#editButton").hide();
                        $item("#deleteButton").hide();
                    }
                });

                $w('#noReview').hide();
                $w('#reviewRepeater').show();
            } else {
                console.log("該商品暫無評論");
                $w('#noReviewsMessage').text = "該商品暫無評論";
                $w('#noReview').show();
                $w('#reviewRepeater').hide();
            }
        })
        .catch((error) => {
            console.error("評論加載失敗：", error);
            $w('#noReviewsMessage').text = "評論加載失敗，請稍後再試。";
            $w('#noReview').show();
            $w('#reviewRepeater').hide();
        });

    // 配置 "我要評論" 按鈕跳轉
    $w("#submitReviewButton").onClick(() => {
        wixLocation.to(`/輸入評論?productId=${productId}`);
    });
});

// 格式化日期函數
function formatDate(dateString) {
    if (!dateString) return "未知日期";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
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


