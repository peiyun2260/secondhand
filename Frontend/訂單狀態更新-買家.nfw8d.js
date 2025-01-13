import wixWindow from "wix-window";
import { local } from 'wix-storage';

$w.onReady(function () {
  const orderId = local.getItem("orderId");
  console.log(orderId)
  // const orderId = JSON.parse(local.getItem("orderId"));
    if (!orderId) {
    console.error("orderId 未找到");
  } else {
    console.log(orderId)
  }
  const radioOptions = [
    { label: "是", value: "yes" },
    { label: "否", value: "no" },
  ];
  $w("#radioGroup1").options = radioOptions;

  $w("#radioGroup1").onChange(() => {
    const selectedValue = $w("#radioGroup1").value;
    console.log("選擇的值已改變為：", selectedValue);
  });

  $w("#updateOrderButton").onClick(() => {
    const selectedValue = $w("#radioGroup1").value;

    if (selectedValue === "yes") {
      // const orderId = 4; // 模擬訂單 ID
      updateOrderStatus(orderId);
    } else {
      // 如果選擇否，不執行任何操作
      console.log("訂單狀態未更新，因為選擇為否");
	  $w("#text24").text = "訂單狀態維持未完成。";
      $w("#text24").show();
    }
  });
  $w.onReady(function () {
    $w("#cancelButton").onClick(() => {
        if (!orderId) {
            wixWindow.openLightbox("未找到訂單 ID");
            return;
        }
        cancelOrder(orderId);
    });
});
});

function updateOrderStatus(orderId) {
  const apiUrl = `https://secondhand-xtsy.onrender.com/api/updateOrder/${orderId}`;

  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // credentials: "include"
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("更新訂單狀態失敗"：${response.status});
      }
      return response.json();
    })
    .then((data) => {
      console.log("訂單狀態更新成功：", data);
      wixWindow.openLightbox("更新訂單成功");
    })
    .catch((error) => {
      console.error("更新訂單狀態錯誤：", error);
      wixWindow.openLightbox("更新訂單失敗");
    });
}
// 取消訂單
function cancelOrder(orderId) {
    const apiUrl = `https://secondhand-xtsy.onrender.com/api/cancelOrder/${orderId}`;

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error("取消訂單失敗");
        }
        return response.json();
    })
    .then((data) => {
        console.log("訂單取消成功：", data);
        wixWindow.openLightbox("訂單取消成功");
    })
    .catch((error) => {
        console.error("取消訂單時發生錯誤：", error);
        wixWindow.openLightbox("取消訂單失敗");
    });
}


