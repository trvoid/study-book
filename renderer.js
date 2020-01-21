////////////////////////////////////////////////////////////////////////////////
// Modules                                                                    //
////////////////////////////////////////////////////////////////////////////////
const {remote} = require('electron');
const jsonfile = require('jsonfile');
const path = require('path');

////////////////////////////////////////////////////////////////////////////////
// Constants                                                                  //
////////////////////////////////////////////////////////////////////////////////
const SNOTE_FILE_EXTENSION = '.snote';

const JSONFILE_OPTIONS = {spaces:2, EOL:'\r\n'};

////////////////////////////////////////////////////////////////////////////////
// Utilities                                                                  //
////////////////////////////////////////////////////////////////////////////////
var ById = function(id) {
    return document.getElementById(id);
}

////////////////////////////////////////////////////////////////////////////////
// Variables                                                                  //
////////////////////////////////////////////////////////////////////////////////
const dialog = remote.dialog;
const mainWindow = remote.getCurrentWindow();

const materialArea = ById('material-area'),
    navNewNote = ById('nav-new-note'),
    navOpenNote = ById('nav-open-note'),
    navMinimizeNote = ById('nav-minimize-note'),
    view = ById('view'),
    studyArea = ById('study-area'),
    studyAreaHeader = ById('study-area-header'),
    studyAreaBody = ById('study-area-body'),
    studyAreaFooter = ById('study-area-footer'),
    studyMemoPanel = ById('study-memo-panel'),
    studyQuizPanel = ById('study-quiz-panel'),
    studyPropertiesPanel = ById('study-properties-panel'),
    studyMemo = ById('study-memo'),
    studyQuiz = ById('study-quiz'),
    switchMemo = ById('switch-memo'),
    switchQuiz = ById('switch-quiz'),
    switchHighlight = ById('switch-highlight'),
    switchProperties = ById('switch-properties'),
    createNoteButton = ById('create-note-button'),
    studyMemoMde = new SimpleMDE({element: studyMemo, spellChecker: false, status: false}),
    studyQuizMde = new SimpleMDE({element: studyQuiz, spellChecker: false, status: false});

let studyNoteFilePath;
let studyNoteObj;
let studyNoteSaveTimer;

////////////////////////////////////////////////////////////////////////////////
// Functions                                                                  //
////////////////////////////////////////////////////////////////////////////////
function createStudyNote(event) {
    document.getElementById('new-note-dialog').style.display = 'block';
}

function loadStudyNote(filePath) {
    studyNoteFilePath = filePath;

    jsonfile.readFile(studyNoteFilePath, function(err, obj) {
        if (err) {
            console.error(err);
            return;
        }

        studyNoteObj = obj;
        let title = obj.title;
        let link = obj.material.link;
        let study = obj.study;
        if (study.memo === undefined) {
            study.memo = {
                'created-when': '',
                'modified-when': '',
                'content': '',
            };
        }
        if (study.quiz === undefined) {
            study.quiz = {
                'created-when': '',
                'modified-when': '',
                'content': '',
            };
        }

        document.getElementById('file-name').innerHTML = path.basename(studyNoteFilePath, '.snote');
        document.getElementById('file-value').innerHTML = studyNoteFilePath;
        document.getElementById('url-value').innerHTML = link;
        document.getElementById('title-value').innerHTML = title;

        view.loadURL(link);
        if (study.memo !== undefined) {
            studyMemoMde.value(study.memo.content);

            studyMemoMde.codemirror.on("change", function() {
                if (studyNoteSaveTimer !== undefined) {
                    clearTimeout(studyNoteSaveTimer);
                }
            	studyNoteSaveTimer = setTimeout(saveStudyNote, 5000);
            });
        }
        if (study.quiz !== undefined) {
            studyQuizMde.value(study.quiz.content);

            studyQuizMde.codemirror.on("change", function() {
                if (studyNoteSaveTimer !== undefined) {
                    clearTimeout(studyNoteSaveTimer);
                }
            	studyNoteSaveTimer = setTimeout(saveStudyNote, 5000);
            });
        }
    });

    studyArea.style.height = '440px';
    studyAreaBody.style.display = 'block';
    studyAreaFooter.style.display = 'block';
}

function openStudyNote(event) {
    let options = {
        title : 'Open a study note',
        defaultPath : '.',
        buttonLabel : 'Open',
        filters : [
            {name: 'Study notes', extensions: ['snote']}
        ],
        properties: ['openFile']
    };

    let filePaths = dialog.showOpenDialogSync(mainWindow, options);

    if (filePaths === undefined) {
        return;
    }

    studyAreaBody.style.display = 'none';
    studyAreaFooter.style.display = 'none';

    if (studyNoteSaveTimer !== undefined) {
        clearTimeout(studyNoteSaveTimer);
        studyNoteSaveTimer = undefined;
        saveStudyNote();
    }
    studyMemoMde.codemirror.on('change', function() {});
    studyMemoMde.value('');
    studyQuizMde.codemirror.on('change', function() {});
    studyQuizMde.value('');

    loadStudyNote(filePaths[0]);
}

function saveStudyNote() {
    studyNoteObj.study.memo.content = studyMemoMde.value();
    studyNoteObj.study.quiz.content = studyQuizMde.value();
    jsonfile.writeFile(studyNoteFilePath, studyNoteObj, JSONFILE_OPTIONS, function(err) {
        if (err) console.error(err);
    });
}

function minimizeStudyNote(event) {
    if (studyArea.style.height === '42px') {
        studyArea.style.height = '440px';
        studyAreaBody.style.display = 'block';
        studyAreaFooter.style.display = 'block';
    } else {
        studyArea.style.height = '42px';
        studyAreaBody.style.display = 'none';
        studyAreaFooter.style.display = 'none';
    }
}

function dragElement(elem) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elem.id + '-header')) {
        document.getElementById(elem.id + '-header').onmousedown = dragMouseDown;
    } else {
        elem.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        elem.style.top = (elem.offsetTop - pos2) + 'px';
        elem.style.left = (elem.offsetLeft - pos1) + 'px';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

////////////////////////////////////////////////////////////////////////////////
// Main                                                                       //
////////////////////////////////////////////////////////////////////////////////
view.addEventListener('dom-ready', () => {
    //view.openDevTools();
});

view.addEventListener('ipc-message', function(event) {
    console.log(event);
    console.info(event.channel);
});

navNewNote.addEventListener('click', createStudyNote);
navOpenNote.addEventListener('click', openStudyNote);
navMinimizeNote.addEventListener('click', minimizeStudyNote);

switchMemo.addEventListener('click', function() {
    studyMemoPanel.style.display = 'block';
    studyQuizPanel.style.display = 'none';
    studyPropertiesPanel.style.display = 'none';
});

switchQuiz.addEventListener('click', function() {
    studyMemoPanel.style.display = 'none';
    studyQuizPanel.style.display = 'block';
    studyPropertiesPanel.style.display = 'none';
});

switchHighlight.addEventListener('click', function() {
    //view.send('request');
    view.send('highlight-on', {
        id: 'myelementID',
        text: 'browser',
        startContainerPath: 'p[3]',
        startOffset: 3,
        endContainerPath: 'p[3]',
        endOffset: 6
    });
});

switchProperties.addEventListener('click', function() {
    studyMemoPanel.style.display = 'none';
    studyQuizPanel.style.display = 'none';
    studyPropertiesPanel.style.display = 'block';
});

createNoteButton.addEventListener('click', function() {
    var file = document.getElementById('note-file').value;
    var url = document.getElementById('note-url').value;
    var title = document.getElementById('note-title').value;

    document.getElementById('new-note-dialog').style.display = 'none';

    studyAreaBody.style.display = 'none';
    studyAreaFooter.style.display = 'none';

    if (studyNoteSaveTimer !== undefined) {
        clearTimeout(studyNoteSaveTimer);
        studyNoteSaveTimer = undefined;
        saveStudyNote();
    }
    studyMemoMde.codemirror.on('change', function() {});
    studyMemoMde.value('');
    studyQuizMde.codemirror.on('change', function() {});
    studyQuizMde.value('');

    var newNoteObj = {
        'title': title,
        'material': {
            'type': 'web',
            'link': url
        },
        'study': {
            'memo': {
                'created-when': '',
                'modified-when': '',
                'content': ''
            },
            'quiz': {
                'created-when': '',
                'modified-when': '',
                'content': ''
            }
        }
    };

    studyNoteFilePath = name + '.snote';
    studyNoteObj = newNoteObj;
    saveStudyNote();

    loadStudyNote(name + '.snote');
});

studyAreaBody.style.display = 'none';
studyAreaFooter.style.display = 'none';
studyQuizPanel.style.display = 'none';
studyPropertiesPanel.style.display = 'none';

dragElement(document.getElementById('study-area'));
