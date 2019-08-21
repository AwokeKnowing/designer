var DesignerTemplateChooserDialogPage = (function() {
// Template Chooser Dialog Page is responsible for:
// -- Loading and displaying a list of templates to choose from
// -- Browsing, filtering, and providing details
// -- Returning the information needed for the editor to load the user's choice

// Note: it's a 'page' because it's structured that way, vs a 'popup'.  But it's still a dialog
// because it 'pops up' when no lesson is specified, and returns the result of the user's choice.

    var designer;
    var templateChooserDialog;

    var $page;
    var $parentPage;
    var templates;

    function DesignerTemplateChooserDialogPage(designerInstance) {

        designer = designerInstance;
        templateChooserDialog = this;
        $page = null; 
        $parentPage = null; //track the page that launched the dialog, to return when done.

        templates = []; // data about each of the templates we know about

    }

    DesignerTemplateChooserDialogPage.prototype.load = function(config) {
        // When the page component is initially loaded in the Designer, we just
        // set up the basic structure. 
        // We wait for display to be called to actually load and display the template list.
        templateChooserDialog.waitForLoad = $.Deferred();
        $.when(
            loadTemplateChooserContent(config)
        ).done(function(){

            addEventHandlers(config);
            onTemplateChooserLoaded(config);

            console.log("Template Dialog: page loaded")
            templateChooserDialog.waitForLoad.resolve();
        }).fail(function(){
            console.log("Template Dialog: page not loaded")
        });

        return templateChooserDialog.waitForLoad;
    }

    DesignerTemplateChooserDialogPage.prototype.display = function(options) {
        // This deplays the template page

        configureDialog(options);

        // this promise is 'global' because we wait for user input and 
        // only when user actions done does it resolve.
        templateChooserDialog.waitForUserChooseTemplate = $.Deferred();

        // hide the page that launched us, and display this dialog page. 
        $parentPage = $('.pages > div:not(.hidden)');
        $parentPage.addClass('hidden');
        $page.removeClass("hidden");

        // load the data for templates and display them
        loadTemplates({lessonLang:designer.settings.lessonLang,filters:{}}).done(function(){
            console.log('Template Dialog: loaded template list')

            // we don't resolve until user chooses template
        });

        return templateChooserDialog.waitForUserChooseTemplate; // resolved in useThisTemplate_click()
    }


    //private methods

    function configureDialog(options) {
        var settings = {canCancel:false}

        settings = $.extend(true, settings, options)

        var $cancelBtn = $page.find(".cancel-change");
        if(settings.canCancel)
            $cancelBtn.show();
        else
            $cancelBtn.hide();


    }


    function onTemplateChooserLoaded(config) {
        // placeholder for what to do as soon as page is loaded
       
    }

    function addEventHandlers(config) {
        // add events that are only added once and persist for life of page

        $page.on('click', '.prev-button.use-this-template', useThisTemplate_click);
        $page.on('click', '.prev-button.cancel-change', cancelDialogButton_click);
    }

    function loadTemplateChooserContent(config) {
        //load any content needed to load once. (loadTemplates runs each time displayed)
        $page = $('.pg-templ');
    }

    function loadTemplates(options) {
        // Load the template data and render into view.  template data looks like:
        /*
        {
            "templates": [
                {
                    "txtid": "text_question_text_multi_answer",
                    "version": "1",
                    "tags": ["quizzes"],
                    "lang": "en",
                    "image": "img/posters/text_question_text_multi_answer_en.png",
                    "source":"lessontemplates/en/text_question_text_multi_answer/v1/",
                    "title": "Text Question - Text Answers",
                    "about": "User will read a question and select from multiple-choices."
                },
                ...
        }
        */

        var prom = $.Deferred()

        //
        $.ajax({
            "url": "json/templates"+designer.rvt+".json", "dataType": "json", cache:false
        }).done(function(templatesjson) {
            // store the templates data
            templates = templatesjson.templates;

            // render them in the list view
            renderTemplates(templates, options);

            prom.resolve();

        }).fail(function(r){
            console.log("Template Dialog: error loading templates",r)
            prom.reject(r)
        });

        return prom;
    }

    function renderTemplates(templates, options) {
        // Here we render the template data into the template cards in the list view.
        // Sorry about jquery building, but mustache seemed overkill and template strings not fully supported yet.

        $page.find('.templates').empty(); //also clears click handlers if dialog loaded again later
        for(var i = 0; i < templates.length; i++) {
            //<div id="text_question_text_multi_answer" class="template tag-quizzes">
            //    <div class="prev-small" style="background-image:url(template1.png)"></div>
            //    <div class="info">
            //       <div class="tmpl-title">Text Question - Text Answers</div>
            //       <div class="tmpl-version">Version: 1.0</div>
            //       <div class="tmpl-about">User will read a question and select answer</div>
            //    </div>
            //</div>

            var td = templates[i];
            var $tmpl = $('<div class="template"></div>');
            $tmpl.attr('id', td.txtid);
            $tmpl.on('click', template_click);
            $tmpl.data("template-index", i)
            
            for (var ti = 0; ti < td.tags.length; ti++)
                $tmpl.addClass('tag-'+td.tags[ti]);

            $tmpl.append($('<div class="prev-small"></div>').css({"backgroundImage": "url("+td.image+")"}))

            var $info = $('<div class="info"></div>');
            $info.append($('<div class="tmpl-title">').text(td.title));
            $info.append($('<div class="tmpl-version">').text(designer.mui.uiLang['designer_ui_itemVersion']+": "+td.version));
            $info.append($('<div class="tmpl-lang tmpl-lang_'+td.lang+'">').text('('+designer.mui[td.lang]['designer_ui_thisLanguage']+')'));
            $info.append($('<div class="tmpl-about">').text(td.about));

            $tmpl.append($info);
            
            if(td.lang != options.lessonLang) // for now, only show lessons matching current lesson lang (not uiLang)
                $tmpl.addClass('hidden');     // this should always be the case if 'replacing' a lesson (replace with same lang)

            if(td.lang == 'ar')
                $tmpl.attr('dir', 'rtl');     //regardless of ui lang, we show ar templates rtl


            $page.find('.templates').append($tmpl);
        }

        // TODO: setup template filters (quiz, game, informational, favorite, etc)
    }

    function template_click() {
        // when a template is clicked, show its details in the preview pane on the left
        
        $page.find(".templates .selected").removeClass('selected');
        $(this).addClass("selected");

        $page.find(".prev-button.use-this-template").removeClass("disabled");

        // extract the choice
        var selected = $(this).data("template-index"); 
        var tmpl = templates[selected];

        // show in preview pane
        $page.find('.preview-pane .prev-img-large > div').css('backgroundImage', 'url('+tmpl.image+')');
        $page.find('.preview-pane .tmpl-title').html(tmpl.title);
        $page.find('.preview-pane .tmpl-version').html(designer.mui.uiLang['designer_ui_itemVersion']+": "+tmpl.version);;
        $page.find('.preview-pane .tmpl-about').html(tmpl.about);
    }

    function useThisTemplate_click() {
        // When user click "use this template" on preview pane, close dialog 
        // and return the choice to calling page

        // get the selected templates index
        var selected = $page.find('.templates .selected').data("template-index");

        console.log("Template Dialog: selected template: " + templates[selected].txtid);

        // restore the page that launched us
        $page.addClass("hidden");
        $parentPage.removeClass("hidden");

        // resolve dialog promise with choice data (see display())
        templateChooserDialog.waitForUserChooseTemplate.resolve(templates[selected])
    }

    function cancelDialogButton_click(e) {
        // restore the page that launched us
        $page.addClass("hidden");
        $parentPage.removeClass("hidden");
        templateChooserDialog.waitForUserChooseTemplate.resolve(null);
    }

    return DesignerTemplateChooserDialogPage;

}());