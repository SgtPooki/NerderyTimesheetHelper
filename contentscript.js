var scriptsArray = [
    "jquery-1.9.1.min.js",
    "Date.js",
    "NerderyTimesheetHelper.js"
];

var b = document.createElement('script');
b.src = chrome.extension.getURL(scriptsArray[1]);
(document.head || document.documentElement).appendChild(b);
b.onload = function() {
    var currentScript = b;
    console.log(currentScript);
    currentScript.parentNode.removeChild(currentScript);
};
var c = document.createElement('script');
c.src = chrome.extension.getURL(scriptsArray[2]);
(document.head||document.documentElement).appendChild(c);
c.onload = function() {
    var currentScript = c;
    console.log(currentScript);
    currentScript.parentNode.removeChild(currentScript);
};