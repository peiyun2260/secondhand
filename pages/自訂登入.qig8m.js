import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w.onReady(function () {
    $w("#loginButton").onClick(() => {
        const email = $w("#email").value;
        const password = $w("#password").value;

        fetch("https://secondhand-xtsy.onrender.com/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || "登入失敗！");
                    });
                }
                return response.json();
            })
            .then(data => {
                // 儲存 Token
                if (data.token) {
                    local.setItem("jwtToken", data.token);
                    $w("#generalErrMsg").text = "登入成功！";
                    wixLocation.to("/所有商品");
                } else {
                    $w("#generalErrMsg").text = "登入成功，但未返回 Token";
                }
            })
            .catch(error => {
                console.error("錯誤:", error);
                $w("#generalErrMsg").text = error.message || "伺服器錯誤，請稍後重試。";
            });
    });

    $w("#registerLink").onClick(() => {
        wixLocation.to("/register"); // 跳轉到註冊頁面的網址
    });
});
