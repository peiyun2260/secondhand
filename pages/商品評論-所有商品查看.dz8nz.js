import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(() => {
    // 從 Local Storage 獲取 productId
    const productId = local.getItem("productId");

    if (!productId) {
        console.error("無法獲取商品 ID");
        $w('#noReviewsMessage').text = "無法獲取商品資訊，請返回上一頁重試。";
        $w('#noReviewsMessage').show();
        $w('#reviewRepeater').hide();
        return;
    }

    console.log("評論頁商品 ID:", productId);

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
                    _id: `review-${index}`,
                }));

                // 綁定評論數據到 Repeater
                $w("#reviewRepeater").data = reviewsWithId;

                // 配置 Repeater 中的項目內容
                $w("#reviewRepeater").onItemReady(($item, itemData) => {
                    const { reviewer_id, content, rating, review_date } = itemData;

                    // 顯示評論內容
                    $item("#reviewerName").text = `用戶: ${reviewer_id}`;
                    $item("#reviewText").text = content || "暫無評論內容";
                    $item("#reviewRating").text = `評分: ${rating} / 5`;
                    $item("#reviewDate").text = formatDate(review_date);

                    // 隱藏編輯和刪除按鈕

                });

                $w('#noReview').hide();
                $w('#reviewRepeater').show();
            } else {
                console.log("該商品暫無評論");
                $w('#noReviewMessage').text = "該商品暫無評論";
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

    // 配置 "返回" 按鈕跳轉邏輯
    $w("#gobackButton").onClick(() => {
        wixLocation.to("/商品資訊-所有商品"); // 替換為返回的頁面路徑
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






