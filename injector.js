////////////////////////////////////////////////////////////////////////////////
// Modules                                                                    //
////////////////////////////////////////////////////////////////////////////////
const {ipcRenderer} = require('electron');

// Do something according to a request of your mainview
ipcRenderer.on('request', function() {
    let range = window.getSelection().getRangeAt(0);
    let element = document.createElement("h3");
    element.style.color="blue";
    range.surroundContents(element);
    ipcRenderer.sendToHost(range.toString());
});

ipcRenderer.on('highlight-on', function(event, data){
    let range = window.getSelection().getRangeAt(0);
    let elem = document.createElement('span');
    elem.style.color = 'red';
    range.surroundContents(elem);
});

/**
 * Simple function to return the source path of all the scripts in the document
 * of the <webview>
 *
 *@returns {String}
 **/
function getScripts() {
    var items = [];

    for(var i = 0;i < document.scripts.length;i++){
        items.push(document.scripts[i].src);
    }

    return JSON.stringify(items);
}
