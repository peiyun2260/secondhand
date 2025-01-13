// Velo API 參照： https://www.wix.com/velo/reference/api-overview/introduction

import { fetch } from 'wix-fetch';
import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const myId = getUserIdFromToken(token);
    
    
    if (!token || !myId) {
        console.warn("User not logged in or invalid token");
        wixLocation.to("/login");
        return;
    }

    // 獲取URL參數
    const query = wixLocation.query;
    const otherId = query.otherId;
    const otherName = query.otherName;

    if (!otherId) {
        console.warn("No otherId provided");
        return;
    }

    // 初始化聊天
    initializeChat(myId, otherId, otherName);

    // 綁定發送按鈕事件
    $w('#sendButton').onClick(() => {
        sendMessage(myId, otherId);
    });
});

function initializeChat(myId, otherId, otherName) {
    // 顯示用戶名稱
    if (otherName) {
        $w('#otherNameText').text = decodeURIComponent(otherName);
        loadChatData(myId, otherId);
    } else {
        getUserInfo(otherId)
            .then((userInfo) => {
                $w('#otherNameText').text = userInfo.username || "No Name";
                return loadChatData(myId, otherId);
            })
            .catch((error) => {
                console.error("Failed to get user info:", error);
                $w('#otherNameText').text = "Unknown User";
                return loadChatData(myId, otherId);
            });
    }
}

function loadChatData(myId, otherId) {
    loadMessages(myId, otherId)
        .then(() => {
            return markAsRead(otherId, myId);
        })
        .catch((error) => {
            console.error("載入聊天數據失敗:", error);
        });
}

function getUserInfo(userId) {
    const url = `https://secondhand-xtsy.onrender.com/Users/${userId}`;
    
    return fetch(url, { method: "GET" })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Fail to fetch user info");
            }
            return response.json();
        });
}

function loadMessages(myId, otherId) {
    const url = `https://secondhand-xtsy.onrender.com/messages?senderId=${myId}&receiverId=${otherId}`;
    
    return fetch(url, { method: "GET" })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to load messages");
            }
            return response.json();
        })
        .then((messages) => {
            const postData = {
                type: "CHAT_MESSAGES",
                payload: messages.map(m => ({
                    content: m.content,
                    isMine: (m.sender_id === myId),
                    createdAt: m.sent_at,    // 使用 sent_at
                    status: m.status         // 添加 status
                }))
            };
            $w('#htmlChatBox').postMessage(JSON.stringify(postData));
        });
}

function markAsRead(senderId, receiverId) {
    const url = "https://secondhand-xtsy.onrender.com/messages/read";
    const body = { senderId, receiverId };
    
    return fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to mark messages as read");
            }
            return response.json();
        })
        .then((data) => {
            console.log("markAsRead updated:", data.updated);
        });
}

function sendMessage(myId, otherId) {
    const text = $w('#messageInput').value;
    if (!text) return;

    const url = "https://secondhand-xtsy.onrender.com/messages";
    const body = { 
        senderId: myId, 
        receiverId: otherId, 
        content: text 
    };
    
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to send message");
            }
            return response.json();
        })
        .then((newMsg) => {
            // 後端回傳的是完整的 Messages 表格資料
            const singleMsg = {
                type: "NEW_MESSAGE",
                payload: {
                    content: newMsg.content,
                    isMine: true,
                    createdAt: newMsg.sent_at,    // 使用 sent_at
                    status: newMsg.status         // 添加 status
                }
            };
            $w('#htmlChatBox').postMessage(JSON.stringify(singleMsg));
            $w('#messageInput').value = "";
        })
        .catch((error) => {
            console.error("sendMessage error:", error);
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
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.id || decoded.sub || null;
    } catch (e) {
        console.error("解析 JWT 失敗:", e);
        return null;
    }
}