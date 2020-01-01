var ById = function(id) {
    return document.getElementById(id);
}

var jsonfile = require('jsonfile');
var path = require('path');
var studyBook = path.join(__dirname, 'sample.sbook');

var materialArea = ById('material-area'),
    material = ById('material-1');
    view = ById('view'),
    studyArea = ById('study-area');
    memo = ById('memo');

function openStudyBook(event) {
    jsonfile.readFile(studyBook, function(err, obj) {
        if (err) {
            console.error(err);
            return;
        }

        let title = obj.title;
        let link = obj.material.link;
        let study = obj.study;
        view.loadURL(link);
        if (study.length !== 0) {
            memo.innerText = study[0].contents;
        }
    });
}

material.addEventListener('click', openStudyBook);
