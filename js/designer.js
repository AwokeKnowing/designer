var Designer = (function() {
// The Designer loads each of the pages, then shows the template chooser page. Once
// the template it selected, it shows the editor page and tell it which template to load.
// If an existing lesson is specified in url parameters, the the temaplate chooser page 
// is skipped and the lesson is loaded directly into the editor.
// 
// "Loading the page" just means
//   -- get/insert the main structural html
//   -- create a page object and keep a reference
//   -- run the load  function of the page

// ---NOTES ABOUT THE LOAD PATTERN--(by AwokeKnowing)---------------------------------------------
// The common pattern across this app is for objects to have a 'load' function
// When you create a: new Something()  you get back the instance.  However in JS
// things often have async steps, eg to load some data and render templates.
// Since new Something() returns the obj instance, it does not return a promise
// Thus, we need a separate load function which returns a promise to really know
// that the object is fully loaded.  
//
// Rather than have an 'onReady' event to hook into, we make the load an explicit
// call to the object's load method. It is similar to doing 
// s = Something(); s.onReady(function(){})
//
// Using the load pattern has advantages over onReady. First, it allows more control. 
// You can create the object, set some settings, and then load.  This can allow robust 
// separation of parameter validation.  Second, the explicit load carries a more clear 
// idea that the load may very well fail, and should be handled.  Contrast that with
// an 'onReady', which maybe never is ready due to a loading problem.
// It also allows for the concept of reloading an object. There are other advantages
// not discussed here related to dependencies and debugging. Overall it's just a 
// pattern that encourages a clear creating/loading of components, which separates the 
// successful instantiation of an object from the execution of its initialization steps.
// ----------------------------------------------------------------------------------------------

// --- NOTES ABOUT PAGE LOADING -----------------------------------------------------------------
// We insert the structural html and start its JS (instantiate and load)  
// We don't load the structural html in the page class itself.  This has advantages. First, it
// allows more control because we could choose to only wait for structural html and then move
// on to showing other pages while it loads. Also, it allows the js code to have a typical
// feel of just a static html page with js at the end.  That makes it easy to prototype pages
// then add them in. Overall it just gives the designer an explicit hook into the content, and
// allows the page code to focus on creating the page with basic structural html already present.
// Concerns about encapsulation are unfounded, because the Designer is creating iself and has a
// right to work the the basic structural html of itself. It doesn't need to know what goes on 
// deeper inside the pages, but the Designer is in charge of the overall look/structure of the app.
// The structural html can be as simple as a div, and the designer can add classes/attributes, set
// postion, size and z-index etc on the page. The structural html forms the shared space that
// the designer and the pages can work with, without getting in eachother's ways.
// As an example, think if the app was loading a simple static 'about us' page.  This way, the
// designer would just pull the html and insert it as a page, and it wouldn't need any JS. 
// That has a good feel since the html is static and needs nothing. Otherwise, if you load the 
// html in the page object, you have this complicated feeling async js and forces the page to
// be expressed as an async JavaScript component with dependencies and a lifecylce instead of
// just being a simple html page.
// -----------------------------------------------------------------------------------------------

    //var designer; //commented on purpose to make point that we choose to keep designer exposed on page

    function Designer () {
        designer = this; 
        designer.pages = {};
        designer.settings = {};
        designer.rvt = null;
        designer.settings.uiLang = "en";
        designer.settings.accountId = "";
        designer.settings.lessonId = "";
        designer.settings.courseId = "";
        designer.settings.lessonLang = "en";
        designer.settings.lessonFolder = null; //eg DES1001-abv21
        designer.settings.token = "";
        designer.originalConfig = {};

    }

    Designer.prototype.load = function(config) {
        //this function loads pages then calls onDesignerLoaded. Returns a promise.

        // We also provide a global promise so any component or external code that wants
        // to be sure the app is loaded can use the designer.waitForLoad promise.
        designer.waitForLoad = $.Deferred();

        $.extend(designer.settings, config);
        designer.originalConfig = $.extend(true, {}, designer.settings); //keep copy of original config at start.

        // if a version is supplied we'll insert it before cachable things eg "image--v2342334.jpg" to make use of cache but be able to bust it.
        designer.rvt = config.rvt?(/--v/.test(config.rvt)?config.rvt:"--v"+config.rvt):"";

        $.when(                 //core depedencies which pages may rely upon
            loadDesigner()     //if we wanted to load designer html instead of having on landing page html, we'd do it here
        ).then(function(){
                                //other dependencies            
            return $.when(
                loadEditorPage(config), 
                loadAssetManagerPage(config), 
                loadTemplateChooserDialogPage(config)
            );

        }).then(function() {
            console.log('Designer: designer loaded');
            designer.waitForLoad.resolve()

            //here starts the 'control logic' of the app, ie what to do once loaded.
            designer.onDesignerLoaded(config)

        }).fail(function(e){
            console.log("designer load failed")
            designer.waitForLoad.reject(e)
        });

        return designer.waitForLoad;
    }

    //------ This function starts the 'control logic' of the app that runs once the app is loaded.---//
    Designer.prototype.onDesignerLoaded = function(config) {
       
        console.log('Designer: loading lesson');

        $.extend(designer.settings, config); //not needed, but is chance to pass new settings on a 'reload' (see Designer.prototype.load)

        var lessonInfo = {
            "isDemo"  :   designer.settings.isDemo || false,
            "courseId":   designer.settings.courseId,
            "lessonId":   designer.settings.lessonId,
            "lessonLang": designer.settings.lessonLang,
            "ownerAuth":  {"token": designer.settings.token}
        };

        if(designer.settings.isDemo && designer.settings.lessonId=="new")
            return designer.chooseNewTemplate()
        
        designer.loadLesson(lessonInfo);
    }

    Designer.prototype.loadLesson = function (lessonInfo) {
        // What we do here is load a lesson into the editor. 
        // If the lesson is not specified in parameters, we start the template chooser dialog and wait
        // Once we know what lesson to load (from params or template chooser), we load it into the editor.
        $(".loading").show();
        getLessonRef(lessonInfo).done(function(lessonRef) {

            //pull out any extra lesson info we want to know at global level
            designer.settings.lessonFolder = lessonRef.lessonFolder; //eg DES1001-7sdf

            designer.pages.editor.display().loadLesson(lessonRef).done(function(designerData) {

                // if this is a new (placeholder) template (newly created lesson) we load the template chooser.
                if(designerData['template'] && designerData.template.txtid=="new") {
                    designer.chooseNewTemplate();
                }
                console.log("Designer: lesson loaded");
            }).fail(function(){
                console.log("Designer: failed to load lesson");
            }).always(function(){
                $(".loading").hide();
            });
            
        });

    }

    Designer.prototype.setUserInterfaceLanguage = function(lang) {
        // We want to be able to explicitly change languages without reloading the page
        // This function will handle getting that done.
        // Note, actual functionality is not yet implemented. Currently it just
        // Sets the language variable and remaps the uiLang mui object to the current language
        if (lang in designer.mui) {
            desiger.settings.uiLang = lang;

            //convenience var for current language mui.  For example in a template you can use
            // {{designer.mui.uiLang.some_mui_key}}  and uiLange will be the mui for current lang.
            desiger.mui.uiLang = desiger.mui[desiger.settings.uiLang];
        }

        //todo notify subscribers. onInterfaceLanguageChanged
    }

    Designer.prototype.applyMui = function($el, lang, noChildren) {
        // This method is a helper to apply/reapply mui
        // $el is a jquery object: designer.applyMui($('#my-template'))
        // lang is optional. by default is current ui lang
        // exchludeChildren means only apply to $el, not it's children
        // NOTE: avoid applying when child will also apply

        lang = lang || designer.settings.uiLang;
        $el = noChildren?$el:$el.find('[data-mui], [data-muitip]').addBack('[data-mui], [data-muitip]');//addBack to includ $el itself

        $el.each(function(i,o) {
            let muiKey    = $(this).data('mui');
            let muiTipKey = $(this).data('muitip');
            let text    = designer.mui[lang][muiKey];
            let textTip = designer.mui[lang][muiTipKey];
            if(text)
                $(this).html(text)
            if(textTip)
                $(this).attr('title', textTip)
        });
    }

    Designer.prototype.chooseNewTemplate = function(options) {
        console.log("Designer: choosing template for new lesson");
        
        var currentTemplate = "";
        
        try {currentTemplate = designer.pages.editor.currentLesson.data.template; }catch(e){};


        designer.pages.templateChooserDialog.display(options).done(function(chosenTemplate) {
            // if they canceled
            if(!chosenTemplate)
                if(options && options.canCancel)
                    return;
                else
                    return alert("There is a problem with the chosen template. Please contact KnowledgeCity support");
            
            // if they didn't choose a different template, just exit
            if(chosenTemplate.txtid == currentTemplate.txtid)
                return;
            //this is path to local template.  we don't actually update anything until they save.
            //this makes it way easier to switch templates at the beginning before committing.

            //todo: changing template waiting dialog (possibly triggered automatically in changeTemplate)
            $(".loading").show();
            designer.pages.editor.changeTemplate(chosenTemplate).done(function(result){
                //update AssetIndex

                designer.pages.assetManager.updateAssetIndex("account",result.assetIndex)

                //reload everything
                designer.onDesignerLoaded(designer.settings)
            }).always(function(){
                $(".loading").hide();
            });
        });
    }


    //private methods

    function getLessonRef(lessonInfo) {
        // This helper method for Designer. It returns an object that contains everything needed to
        // load a lesson.  The way it works is check/parse URL params which come in lessonInfo if
        // available, or if not, ask the user to specify the lesson via the template chooser dialog
        var prom = $.Deferred();
        if(lessonInfo.isDemo) {
            prom.resolve({
                "sourcePath": "demodata/Protected/courses/"+lessonInfo.courseId+"/"+lessonInfo.lessonLang+"/"+lessonInfo.lessonId+"/", 
                "lessonFolder":lessonInfo.lessonId
            });
            return prom;
        }

        if(lessonInfo.lessonId) {
            // if we have lesson id then it's an existing lesson. need to return following:
            // { "sourcePath":"lessontemplates/en/text_question_text_multi_answer/v1/" } 

            //todo: move LMS access to a module.
            $.ajax({/*note in course page it uses 'videos' endpoint here we use files, incase it's not published*/
                //"url":"https://api.knowledgecity.com/v2/courses/0" + lessonInfo.courseId + "/lessons/" + lessonInfo.lessonId + "/videos/0" + lessonInfo.lessonLang,
                "url":"https://api.knowledgecity.com/v2/courses/0" + lessonInfo.courseId + "/lessons/" + lessonInfo.lessonId + "/files/0" + lessonInfo.lessonLang,
                "data": {"token":lessonInfo.ownerAuth.token},
                "dataType": "json",
                "cache":false
            }).done(function(r){
                //this version when using 'videos' endpoint
                //var sourcePath = r.response.link[0].file.replace(/index[^\/]*.html/g,'');
                //var la = r.response.link[0].file.split('/')


                //this version when using files endpoint
                var sourcePath = r.response.replace(/index[^\/]*.html/g,'');
                var la = r.response.split('/')
                

                var lessonFolder = la[la.length-2]; //eg DES1001-5s4df
                prom.resolve({"sourcePath": sourcePath, "lessonFolder":lessonFolder});

            }).fail(function(){
                alert("Unable to load lesson.  Please return to the LMS and try again. If the problem persists, please contact your administrator")
                $('body').empty().html("Error: Please return to the LMS");
                history.back();
            });

        } else {
            //this is really just for demo purposes, or for a future version where you start with the designer, 
            //not the LMS.  
            designer.pages.templateChooserDialog.display().done(function(chosenTemplate) {
                // here actually create if in LMS mode, so that then 'editing' it will be same from here on out.

                // now just sourcePath is needed currently

                prom.resolve({"sourcePath": chosenTemplate.sourcePath});
            });

        }

        return prom;
    }


    function loadDesigner() {
        var prom = $.Deferred();

        //start loading mui, so will load while scripts include/execute
        loadMui().then(function(){
            setTimeout(function(){
                designer.applyMui($('body')); // OK because we have not loaded any other pages, so just static html landing page.
                
                prom.resolve()//this is where loadDesigner 'ends'
            },1); //let event loop run one time == 10 years of JS experience
        }) 

        // this is just as though it were in main html landing page, but needed so we can add rvt
        var vendorScripts =
        '<!-- Dependencies needed by pages.  Plugin controls should load their own dependencies -->'+
        '<script src="vendor/knockout/3.2.0/knockout.js"></script>'+
        '<script src="vendor/knockout.mapping/2.4.1/knockout.mapping.js"></script>'
        
        var ourScripts =     
        '<!-- Core code of this project -->'+
        '<link rel="stylesheet" href="css/designer.css"/>'+
        '<link rel="stylesheet" href="css/editorpage.css"/>'+
        '<link rel="stylesheet" href="css/assetmanagerpage.css"/>'+
        '<link rel="stylesheet" href="css/templatechooserdialogpage.css"/>'+
        '<script src="js/upload.js"></script>'+ //here because can provide upload for any page
        '<script src="js/designer_editorpage.js"></script>'+
        '<script src="js/designer_editorpage_controlbuilder.js"></script>'+
        '<script src="js/designer_assetmanagerpage.js"></script>'+
        '<script src="js/designer_templatechooserdialogpage.js"></script>'

        ourScripts = ourScripts.replace(/\.js\"/g, designer.rvt+'.js"').replace(/\.css\"/g, designer.rvt+'.css"');

        $('head').append(vendorScripts + ourScripts);

        return prom; //resolved after loadMui above

    }


    function loadMui() {
        // load the strings for the multi-lingual user interface
        var prom = $.Deferred();

        //TODO: move paths to config
        //currently we specify app strings locally. We should keep it that way until we have some gui tool
        $.ajax({url: "json/mui"+designer.rvt+".json", cache:true, dataType:'json'}).done(function(response) {
            designer.mui = response;
            //for convenience, map mui.uiLang to the current language strings
            designer.mui.uiLang = designer.mui[designer.settings.uiLang]; 
            prom.resolve()
        });

        return prom;
    }


    function loadEditorPage() {
        // load the editor page. (see NOTES ABOUT PAGE LOADING at start of this file.)

        var prom = $.Deferred();

        //TODO: move paths to config
        $.ajax({url: "html/editorpage"+designer.rvt+".html", cache:true, dataType:'text'}).done(function(response) {
            response = $(response);
            designer.applyMui(response);
            $('.pg-edit').empty().append(response)

            designer.pages.editor = new DesignerEditorPage(designer);
            designer.pages.editor.load(designer.settings).done(function(){
                prom.resolve()
            });
            
        });

        return prom;
    }

    function loadAssetManagerPage(config) {
        // load the asset manager page. (see NOTES ABOUT PAGE LOADING at start of this file.)

        var prom = $.Deferred();

        //TODO: move paths to config
        $.ajax({url: "html/assetmanagerpage"+designer.rvt+".html", cache:true, dataType:'text'}).done(function(response) {
            response = $(response);
            designer.applyMui(response);
            $('.pg-assetmanager').empty().append(response)

            designer.pages.assetManager = new DesignerAssetManagerPage(designer);
            designer.pages.assetManager.load(config).done(function(){
                prom.resolve()
            });
            
        });

        return prom;
    }

    function loadTemplateChooserDialogPage(config) {
        // load the template chooser dialog page. (see NOTES ABOUT PAGE LOADING at start of this file.)

        // Note: it's a 'page' because it's structured that way, vs a 'popup'.  But it's still a dialog
        // because it 'pops up' when no lesson is specified, and returns the result of the user's choice.
        var prom = $.Deferred();

        //TODO: move paths to config
        $.ajax({url: "html/templatechooserdialogpage"+designer.rvt+".html", cache:true, dataType:'text'}).done(function(response) {
            response = $(response);
            designer.applyMui(response);
            $('.pg-templ').empty().append(response)

            designer.pages.templateChooserDialog = new DesignerTemplateChooserDialogPage(designer);
            designer.pages.templateChooserDialog.load(config).done(function(){
                prom.resolve()    
            });
            
        });

        return prom;
    }

    return Designer;

}());






