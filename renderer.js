var ById = function(id) {
    return document.getElementById(id);
}

const {remote} = require('electron');
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();

var jsonfile = require('jsonfile');
var path = require('path');

var materialArea = ById('material-area'),
    navMenu = ById('nav-menu'),
    navOpen = ById('nav-open'),
    view = ById('view'),
    studyArea = ById('study-area'),
    studyContent = ById('study-content'),
    studyText = ById('study-text'),
    studyMde = new SimpleMDE({element: studyText});

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

    //while (studyContent.lastChild) {
    //    studyContent.removeChild(studyContent.lastChild);
    //}
    studyMde.value('');

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
            studyMde.value(study.memo.content);
        }
    });
}

navOpen.addEventListener('click', openStudyBook);
