import { local } from "wix-storage";

$w.onReady(function () {
    const token = getTokenFromLocalStorage();
    const userId = getUserIdFromToken(token);

    if (userId && token) {
        getUserName(userId, token);
        getUserEmail(userId, token);
        getUserScore(userId, token);
    } else {
        console.error("無法獲取使用者 ID 或 token");
        $w("#Name").text = "N/A";
        $w("#email").text = "N/A";       
        $w("#score").text = "N/A";
    }
    $w("#updateNameButton").onClick(() => {
        const newUsername = $w("#usernameInput").value;
        if (!newUsername) {
            console.error("新名稱不能為空！");
            return;
        }
        updateUsername(userId, token, newUsername);
    });

    $w("#updateEmailButton").onClick(() => {
        const newEmail = $w("#emailInput").value;
        if (!isValidEmail(newEmail)) {
            console.error("請輸入有效的 Email！");
            return;
        }
        updateUserEmail(userId, token, newEmail);
    });
});

// 獲取存儲的 JWT Token
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

function getUserName(userId, token) {
    fetch(`https://secondhand-xtsy.onrender.com/Users/${userId}/username`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // 使用 JWT Token
        }
    })
        .then(handleResponse)
        .then(data => {
            if (data.username) {
                $w("#Name").text = data.username;
            } else {
                $w("#Name").text = "N/A";
            }
        })
        .catch(error => {
            console.error("抓取用戶名稱錯誤:", error);
            $w("#Name").text = "N/A";
        });
}

// 更新用戶名稱
function updateUsername(userId, token, newUsername) {
    fetch(`https://secondhand-xtsy.onrender.com/Users/${userId}/updateUsername`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
    })
        .then(handleResponse)
        .then(data => {
            $w("#Name").text = data.newUsername;
        })
        .catch(error => {
            console.error("更新用戶名稱錯誤:", error);
        });
}

function getUserEmail(userId, token) {
    fetch(`https://secondhand-xtsy.onrender.com/Users/${userId}/email`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
        .then(handleResponse)
        .then(data => {
            if (data.email) {
                $w("#email").text = data.email;
            } else {
                $w("#email").text = "N/A";
            }
        })
        .catch(error => {
            console.error("抓取用戶 email 錯誤:", error);
            $w("#email").text = "N/A";
        });
}

function updateUserEmail(userId, token, newEmail) {
    fetch(`https://secondhand-xtsy.onrender.com/Users/${userId}/updateEmail`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
    })
        .then(handleResponse)
        .then(data => {
            $w("#email").text = data.newEmail;
        })
        .catch(error => {
            console.error("更新用戶 Email 錯誤:", error);
        });
}

function getUserScore(userId, token) {
    fetch(`https://secondhand-xtsy.onrender.com/Users/${userId}/reputation_score`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
        .then(handleResponse)
        .then(data => {
            if (data.score !== undefined) {
                $w("#score").text = data.score.toString();
            } else {
                $w("#score").text = "N/A";
            }
        })
        .catch(error => {
            console.error("抓取分數錯誤:", error);
            $w("#score").text = "N/A";
        });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function handleResponse(response) {
    if (!response.ok) {
        return response.json().then(err => {
            throw new Error(err.error || "伺服器錯誤！");
        });
    }
    return response.json();
}
