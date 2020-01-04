var ById = function(id) {
    return document.getElementById(id);
}

const {remote} = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();

var jsonfile = require('jsonfile');
var path = require('path');
var studyBook = path.join(__dirname, 'sample.sbook');

var materialArea = ById('material-area'),
    navMenu = ById('nav-menu'),
    navOpen = ById('nav-open'),
    view = ById('view'),
    studyArea = ById('study-area'),
    studyContent = ById('study-content');

function openStudyBook(event) {
    let options = {
        title : 'Open file',
        defaultPath : '.',
        buttonLabel : 'Open',
        filters : [
            {name: 'Study books', extensions: ['sbook']}
        ],
        properties: ['openFile']
    };

    var filePaths = dialog.showOpenDialogSync(mainWindow, options);

    if (filePaths === undefined) {
        return;
    }

    while (studyContent.lastChild) {
        studyContent.removeChild(studyContent.lastChild);
    }

    jsonfile.readFile(filePaths[0], function(err, obj) {
        if (err) {
            console.error(err);
            return;
        }

        let title = obj.title;
        let link = obj.material.link;
        let study = obj.study;
        view.loadURL(link);
        if (study.memo !== undefined) {
            var node = document.createElement('p');
            var text = document.createTextNode(study.memo.content);
            node.appendChild(text);
            studyContent.appendChild(node);
        }
    });
}

navOpen.addEventListener('click', openStudyBook);
