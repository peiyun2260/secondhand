import wixLocation from 'wix-location';

$w.onReady(function () {
    $w('#button2').onClick(() => {
        wixLocation.to("/訂單管理-買家");
    });
});