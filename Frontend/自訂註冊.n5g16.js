let jwtToken = "";
import wixLocation from 'wix-location';
import { local } from 'wix-storage';

$w("#registerButton").onClick(() => {
    const username = $w("#username").value;
    const email = $w("#email").value;
    const password = $w("#password").value;

    if (!username || !email || !password) {
        $w("#text").text = "所有欄位皆為必填。";
        return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        $w("#text").text = "請輸入有效的電子郵件地址。";
        return;
    }    

    fetch("https://secondhand-xtsy.onrender.com/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password })
    })

    .then(response => {
        if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || "註冊失敗！");
                });
            }
            return response.json();
        })

    .then(data => {
    // 儲存 Token 到 localStorage
        jwtToken = data.token;
        local.setItem("jwtToken", jwtToken);
        
        $w("#text").text = data.message || "註冊成功！";
        wixLocation.to("/所有商品");

        $w("#username").value = "";
        $w("#email").value = "";
        $w("#password").value = "";

        })
        .catch(error => {
            console.error("錯誤:", error);
            $w("#text").text = error.message || "伺服器錯誤，請稍後重試。";
        })
        .finally(() => {
            $w("#registerButton").enable();
        });
});
