// Velo API 參照： https://www.wix.com/velo/reference/api-overview/introduction

// ContactsPage.js
import { fetch } from 'wix-fetch';
import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);
    getContactsList(userId);
    //getContactsList(51)
});

// 查詢聯絡人列表
function getContactsList(userId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/contacts/${userId}`;

    fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error("無法獲取聯絡人列表");
            }
            return response.json();
        })
        .then((data) => {
            // 初始化時隱藏所有元素
            $w("#contactsRepeater").hide();
            $w("#noContactsMsg").hide();

            if (data.length === 0) {
                $w("#noContactsMsg").text = "目前無聯絡人";
                $w("#noContactsMsg").show();
                
            }else {
            $w("#contactsRepeater").show();
            // 增加 `_id` 屬性
        const processedData = data.map(contact => ({
            ...contact,
            _id: contact.contact_id.toString()
        }));

            // 隱藏無聯絡人訊息
            $w("#noContactsMsg").hide();

            // 設置 Repeater 數據
            const contactsRepeater = $w("#contactsRepeater");
            contactsRepeater.data = processedData;

            // 處理每個聯絡人項目
            contactsRepeater.onItemReady(($item, contactData) => {
                // 設置聯絡人資訊
                $item("#contactName").text = contactData.contact_name || "未知用戶";
                $item("#lastMessage").text = contactData.last_message || "尚無訊息";

                // 點擊處理
                $item("#contactButton").onClick(() => {
                    wixLocation.to(`/chatpage?otherId=${contactData.contact_id}&otherName=${encodeURIComponent(contactData.contact_name)}`);
                });

                // 刪除按鈕點擊處理
                $item("#deleteButton").onClick(() => {
                     {
                        deleteContact(userId, contactData.contact_id);
                    }
                });

                // 顯示聯絡人項目
                $item("#contactButton").show();
                $item("#deleteButton").show();
            });
            } 
        })
        .catch((error) => {
            console.error("查詢聯絡人列表失敗：", error);
            $w("#generalErrMsg").text = "查詢聯絡人列表時發生錯誤，請稍後再試";
            $w("#generalErrMsg").show();
        });
}

// 刪除聯絡人功能
function deleteContact(userId, contactId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/contacts/${userId}/${contactId}`;

    fetch(apiUrl, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("刪除失敗");
            }
            return response.json();
        })
        .then(() => {
            // 刪除成功後重新載入聯絡人列表
            getContactsList(userId);
            
            // 顯示成功訊息
            $w("#successMsg").text = "聯絡人已成功刪除";
            $w("#successMsg").show();
            setTimeout(() => $w("#successMsg").hide(), 3000);
        })
        .catch((error) => {
            console.error("刪除聯絡人失敗：", error);
            $w("#generalErrMsg").text = "刪除聯絡人時發生錯誤，請稍後再試";
            $w("#generalErrMsg").show();
            setTimeout(() => $w("#generalErrMsg").hide(), 3000);
        });
}

function getTokenFromLocalStorage() {
    const token = local.getItem("jwtToken");
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
        return payload.id;
    } catch (error) {
        console.error("Token 解析錯誤:", error);
        return null;
    }
}