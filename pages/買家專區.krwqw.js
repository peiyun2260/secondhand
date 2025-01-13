// Velo API 參照： https://www.wix.com/velo/reference/api-overview/introduction

import wixLocation from 'wix-location';

$w.onReady(function () {
    $w('#button2').onClick(() => {
        wixLocation.to("/shang-pin-ping-lun/"); 
    });
});