var DesignerEditorPage = (function() {
    // The editor page is in charge of
    // -- diplaying the lesson
    // -- building controls  (controlBuilder module)
    // -- shuttling information back and forth bewteen controls and the lesson iframe
    // -- loading / saving the lesson  (probably need ContentManager module)

    var designer;
    var editor;
    
    var $page;
    var koLessonData;
    var updateDataInterval;
    var waitForLoadLesson;
    var loadFailedTimer;

    function DesignerEditorPage(designerInstance, config) {
        designer = designerInstance;
        editor = this;
        $page = null;
        editor.$page = $page; //expose for controls and modules
        editor.modules = {}
        editor.settings = {};
        editor.currentLesson = {};
        editor.currentLesson.id = null;
        editor.currentLesson.lang = null;
        editor.currentLesson.ref = null;  //reference to actual files. could include external connection info (host/token)
        editor.currentLesson.data = null; //the data from lessons's lesson.json: {designer:{....}}. for updated bindings data get from koLessonData

        // This is the data that is bound between the sidbar controls, and the lesson
        // It gets serialized/unserialized when passing to/from the lesson iframe
        //koLessonData = {};  

        
        updateDataInterval = null;

    }


    DesignerEditorPage.prototype.load = function(config) {
        // When initially loading the page into the Designer, we load the control builder,
        // and we set up events.  Later designer uses loadLesson to load some specific lesson.
        editor.waitForLoad = $.Deferred();
        
        $.when(
            loadEditorPageContent(config),
            loadControlBuilderModule(config)
        ).done(function(){
            addEventHandlers(config);
            
            onEditorPageLoaded(config);
            
            console.log('Editor Page: page loaded');
            editor.waitForLoad.resolve();
           
        }).fail(function() {
            console.log('Editor Page: page not loaded');
            editor.waitForLoad.reject();
        })

        return editor.waitForLoad;
    }

    DesignerEditorPage.prototype.loadLesson = function(lessonRef) {
        // Given information about a lesson (eg location, credentials, and settnigs), 
        // we load the lession into an iframe.  The lesson then should initiate communication
        // with the editor by sending a 'designerSettings' message, which is used to build
        // the panels and controls.
        waitForLoadLesson = $.Deferred();

        editor.currentLesson.ref = lessonRef;
        $page.find("#lesson").attr('src', lessonRef.sourcePath + 'index--v'+Date.now()+'.html?_='+Date.now());

        // Set a timer so if no message is received from lesson in 10 seconds, 
        // we reject the promise. If a valid designerSettings message is received,
        // onDesignerSettingsMessage will clear the timer and resolve the promise
        loadFailedTimer = setTimeout(function(){
            console.log("Editor Page: did not receive settings from template")
            editor.currentLesson.ref = null;
            waitForLoadLesson.reject(lessonRef);
        }, 10000);

        return waitForLoadLesson;  //resolved in onDesignerSettingsMessage

    }


    DesignerEditorPage.prototype.saveLessonSettings = function() {
        var prom = $.Deferred();

        var s = designer.settings;

        editor.currentLesson.data.bind = ko.mapping.toJS(koLessonData); //get most recent binded data changes

        //todo: move LMS access to a module.
        $.ajax({
            "url":"https://api.knowledgecity.com/v2/external/apps/designer/accounts/" + s.accountId + "/lessons/" + s.lessonId + "/settings",
            "method":"post",
            "data": {
                "token":    s.token,
                "lang":     s.lessonLang,
                "settings": editor.currentLesson.data
            },
            "dataType": "json",
            "cache": false
        }).done(function(r){
            //ok we replaced the template. return info which could be used to update local objects
            prom.resolve(r.response);
        }).fail(function(r){
            alert("Unable to save lesson.  Please return to the LMS and try again. If the problem persists, please contact your administrator")
            $('body').empty().html("Error: Please return to the LMS");
            //history.back();
        });

        return prom;

    }


    DesignerEditorPage.prototype.changeTemplate = function(chosenTemplate) {
        var prom = $.Deferred();

        if(designer.settings.isDemo){                                                                                           /*must always be fresh*/
            $.ajax({dataType: "json",url:"demodata/opencontent/accounts/" + designer.settings.accountId + "/designer/assets/assets"+"--v"+(Date.now())+".json"}).done(function(assetIndex){
                //update data as though a particular lesson is loaded
                
                designer.settings.lessonId     = chosenTemplate.txtid;
                designer.settings.lessonFolder = chosenTemplate.txtid;

                //we emulate what server does
                prom.resolve({
                    "assetIndex":assetIndex
                });
            });


            return prom;
        }

        var s= designer.settings;

        //todo: move LMS access to a module.
        $.ajax({
            "url":"https://api.knowledgecity.com/v2/external/apps/designer/accounts/" + s.accountId + "/lessons/" + s.lessonId + "/templates",
            "method":"post",
            "data": {
                "token":         s.token,
                "lang":          s.lessonLang,
                "newtmpltxtid": chosenTemplate.txtid,
                "version":       chosenTemplate.version,
                "merge":         true
            },
            "dataType": "json",
            "cache":false
        }).done(function(r){
            //ok we replaced the template. return info which could be used to update local objects
            prom.resolve(r.response);
        }).fail(function(r){
            alert("Unable to configure lesson template.  Please return to the LMS and try again. If the problem persists, please contact your administrator")
            $('body').empty().html("Error: Please return to the LMS");
            //history.back();
        });

        return prom;
    }


    DesignerEditorPage.prototype.display = function() {
        $('.pages > div').addClass('hidden');
        $page.removeClass('hidden');

        return editor; // for chaining
    }


    DesignerEditorPage.prototype.dirty = function(dirt) {
        
        //for now we just let anyone mark it dirty. dirty is used by controls which may not trigger 'change' event eg after a background task
        onLessonDataChanged();
    }

    //private methods
    function onEditorPageLoaded(config) {
        // placeholder for any steps to automatically do once page components are loaded
       

    }

    function addEventHandlers(config) {
        // add event handlers for editor page.  
        $page.on('click', '.savelessonbtn:not(.disabled)', onSaveLessonButton_click);
        $page.on('click', '.changetemplatebtn:not(.disabled)', onChangeTemplateButton_click);
        $page.on('change', '.props', onLessonDataChanged);
        $page.on('keydown','.props', function(e) {if((e.keyCode||e.which)!==9)editor.dirty()});

        // this handler is managed by editor but has to be global (window) since 
        // messages come from iframe via window.parent.postMessage(..) 
        window.addEventListener('message', onDesignerSettingsMessage);
    }

    function loadEditorPageContent(config) {
        //load any content needed to load once. (loadTemplates runs each time displayed)
        $page = $('.pg-edit');
    }

    function loadControlBuilderModule(config) {
        // Load Control Builder Module into Editor Page. 
        // Control Builder takes data from the lesson and builds the controls to edit the editable items.
        var prom = $.Deferred();

        editor.modules.controlBuilder = new DesignerEditorPageControlBuilderModule(designer, editor);
        editor.modules.controlBuilder.load(config).done(function() {
            prom.resolve()    
        }).fail(function() {
            prom.reject();
        });
        
        return prom;

    }

    function onLessonDataChanged(e) {

        //enable save button
        $page.find(".savelessonbtn").removeClass("disabled").parent().addClass("attention");
    }

    function onSaveLessonButton_click(e) {
        $page.find(".savelessonbtn").addClass("disabled").parent().removeClass("attention"); // will be enabled again by 'dirty' (when something to save)
        
        if(designer.settings.isDemo)
            return;

        editor.saveLessonSettings()
    }

    function onChangeTemplateButton_click(e) {
        if(designer.settings.isDemo)
            return location.reload(true);

        designer.chooseNewTemplate({canCancel:true});
    }

    function onDesignerSettingsMessage(e) {
        // When a template/lesson is loaded, it has to send a desginerSettings message via window.parent.postMessage
        
        // The message looks like:
        //   {"eventName": "designerSettings", "eventData": {"bind": {"content": {...}, "appearance":{...} }}}}
        // eventData.bind contains all the information about the editable data, for building controls and bind them.
        
        // make sure it's our message
        try {var data = JSON.parse(e.data);} catch(ev) { return false; }
            
        if(data['eventName'] !== "designerSettings")
            return false;

        clearTimeout(loadFailedTimer); // see loadLesson()
        console.log("Editor Page: template loaded")

        // build controls then set up databinding
        
        //if we already built before, we must clear the controls
        if(koLessonData)
            ko.cleanNode($page.find(".props")[0]);

        editor.modules.controlBuilder.buildControls($page.find(".props"), data['eventData']).done(function() {
            
            // Now that we've built the controls for editing the data in eventData.bind, we bind the 
            // data to those controls. This causes the koLessonData object to be updated automatically
            // any time the bound value in any control changes.
            
            //already initialized (eg changing template) so just update
            koLessonData = ko.mapping.fromJS(data['eventData'].bind); //notice .bind ko handles the bound data, not all data
            ko.applyBindings(koLessonData, $page.find(".props")[0]);
            
            //keep the data for being able to save lesson settings
            editor.currentLesson.data = data['eventData'];
            
            //resolve the call to editor.loadLesson()
            waitForLoadLesson.resolve(data['eventData']);

            //for now, just resend all data 5 times per sec  
            clearInterval(updateDataInterval);
            updateDataInterval = setInterval(function() {
                updateLessonBoundData();
            },200);

        });
            
        
    }

    function updateLessonBoundData() {
        // We are doing one-way binding from the controls to the template. 
        // If the template/lesson updates a bound value manually, we won't know it.

        // Knockout listens for events in sidebar controls, such as change, keydown, etc 
        // and immediately updates the koLessonData object. However, Knockout cannot bind 
        // across iframes, so we manually serialize the data and post it to iframe (works cross-domain)
        // The lesson (in iframe) receives the data and updates the values 

        //send data from side controls panel to lesson
        var data = ko.mapping.toJS(koLessonData)

        // may need to preprocess data but ideally controls store data in directly useful format
        //...

        //send to lesson frame
        try {
            var lesson = document.getElementById("lesson").contentWindow;
            lesson.postMessage(JSON.stringify({eventName:"bindUpdated",eventData: data}),'*');    
        } catch(e) {
            // this can happen if they lost contact with the lesson (eg was there, now 404). because there's a timer, it 
            // will trigger several times a second and throw console error for each one.
        }
        
    }

    return DesignerEditorPage;

}());