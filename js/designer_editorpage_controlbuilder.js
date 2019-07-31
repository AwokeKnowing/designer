var DesignerEditorPageControlBuilderModule = (function() {
// Control Builder Module is responsible for:
// -- loading plugins for each type of control (textarea, image, color) specified in data from template
// -- building panels and controls html (using plugins) based on data from template
//
// Note: this module does not handle binding. The plugins build controls with binding hooks in html, but 
// the binding actually is handled by the editor page. This module just adds html to the panel sidebar.
// The plugins may actually load additonal js/css to run their control type, such as the colorpicker tool.

// See loadControlPlugin for an example of a minimal control plugin
// See buildControlPanels for what the data (from template) used to build the panels looks like
// The plugins are loaded dynamically when buildControlPanels is called. 
// The controls (plugin class) are actually instantiated in addControl.

    var designer;
    var editor;
    var controlBuilder;

    function DesignerEditorPageControlBuilderModule(designerInstance, editorInstance, config) {
        designer = designerInstance;
        editor = editorInstance; //we could get off designer, but editor is not guaranteed to be public on designer
        controlBuilder = this;
        editor.controls = {};
        
        controlBuilder.settings = {};
        controlBuilder.controlPlugins = {}; //contains loaded function that build each control type

    }

     DesignerEditorPageControlBuilderModule.prototype.load = function(config) {
        // When the module is loaded, it does not load any plugins or build anything. It just
        // loads any one-time setup items.  When buildControls is called, that builds the sidebar.

        var prom = $.Deferred();

        $.when(
            loadControlBuilderModule(config)
        ).done(function() {
            
            console.log("Editor Page - Control Builder: module loaded")
            prom.resolve();
        }).fail(function() {

            console.log("Editor Page - Control Builder: module not loaded")
            prom.reject();
        });

        return prom
    }

    DesignerEditorPageControlBuilderModule.prototype.buildControls = function(el, dataFromTemplate) {
        // This builds the sidebar of panels and controls based on data from template.
        // First it loads plugins based on the data, then builds the sidebar and resolves the promise.
        
        var prom = $.Deferred();

        console.log("Editor Page - Control Builder: building controls...");

        // Plugins are loaded depending on which controls are needed
        loadControlBuilderPlugins(dataFromTemplate).done(function(){
            
            // Panels such as appearance and content are added with the controls such as question, image.
            buildControlPanels(el, dataFromTemplate).done(function(){
                console.log("Editor Page - Control Builder: done building controls");
                prom.resolve();
            });

        }).fail(function(){
            prom.reject();
        });

        return prom;
    }

   
    //private methods

    function loadControlBuilderModule(config) {
        //placeholder for things the module needs to load at start
        //please rename to something else when actually using
        return true;
    }


    function loadControlBuilderPlugins(dataFromTemplate) {
        // Identify missing control types and load their builder plugin. 
        // The plugins may load additional dependencies

        var newPluginPromises = [];

        //load any plugins needed for the controls
        for (var panel in dataFromTemplate.bind) {

            //for each named control...
            for (var controlName in dataFromTemplate.bind[panel]) {
                // get the control type 
                var control = dataFromTemplate.bind[panel][controlName].control || {};
                var type = control.type || "text";

                //if we haven't yet loaded the plugin for that type, load it
                if(!(type in controlBuilder.controlPlugins)) {
                    controlBuilder.controlPlugins[type] = null; //placeholder to avoid duplicates
                    newPluginPromises.push(loadControlPlugin(type, dataFromTemplate.controlPlugins))
                }
            }
        }

        // return promise that resolves when all plugins are loaded
        return $.when.apply(null, newPluginPromises);
    }

    function loadControlPlugin(type, templateControlPlugins) {
        // type is string name of the control type, such a textarea, color, image
        //
        // templateControlPlugins is an object that may be present on template data to specify custom plugins:
        //        { bind: {...}, controlPlugins: {fancytext: "https://...fancytextcontrol.js"} }

        // Here's an example plugin which handles editing text.
        // -- must define EditorControl_somecontrol
        // -- must define EditorControl_somecontrol.load (return promise)
        // -- must define EditorControl_somecontrol.prototype.build (return promise)
        /*
        EditorControl_text = function() {
            function EditorControl_text(editorInstance) { }

                EditorControl_text.load = function() { return $.when(); }

                EditorControl_text.prototype.build = function(ctlid, panelKey, controlKey, settings) {
                    var $control = $('#' + ctlid);
                    var inp = $('<input type="text">');
                    inp.attr('data-bind', "value: "+ panelKey + "." + controlKey + ".val, valueUpdate: 'afterkeydown'");
                    $control.append(inp);
                    return $.when();
                }
            return EditorControl_text;
        }();
        */

        var prom = $.Deferred();

        var pluginjs = 'js/controls/' + type + "/control"+designer.rvt+".js";

        // not tested yet. But a tempalate can specify it's own plugin to handle a custom control type
        if(templateControlPlugins && (type in templateControlPlugins))
            pluginjs = templateControlPlugins[type];

        
        //load plugin script, and call it's "static" load method.
        $.getScript(pluginjs).done(function() {
            controlClass = window['EditorControl_'+type];
            controlBuilder.controlPlugins[type] = controlClass;
            
            //we loaded the script, now we let it load it's own dependencies
            controlClass.load().done(function(){
                console.log("Editor Page - Control Builder: loaded control plugin: " + type);
                prom.resolve();
            }).fail(function() {
                console.log("Editor Page - Control Builder: failed to load plugin:", type);
                prom.reject();
            });
        }).fail(function(){
            console.log("Editor Page - Control Builder: failed to load plugin script: ", pluginjs);
            prom.reject();
        });
        
        return prom;
    }

    function buildControlPanels(el, dataFromTemplate) {
        //build the sidebar

        //the data looks like this (here content and appearance are panels):
        /* 
        {
            "bind": {
                "content": {
                    "question": {
                        "val": "Which group has grown the most since 2010?",
                        "control": {"type":"textarea", "rows": 5}
                    },
                    "instructions": {"val": "Click on the best choice"},
                    "answer1":      {"val": "infants and children age 0-15"}, 
                    "answer1Image": {"val": "school_children1.jpg", "control": {"type":"image"}},
                    "answer2":      {"val": "young people age 15-25"},
                    "answer2Image": {"val": "engineeringstudent.jpg", "control": {"type":"image"}},
                },
                "appearance": {
                    "themeBackgroundColor": {
                        "val": "rgb(240, 240, 240)",
                        "control": {"type":"color"}
                    },
                    "themeAccentColor": {
                        "val": "rgb(163, 47, 59)",
                        "control": {"type":"color"}
                    }
                }
            }
        }  
        
        */
        
        //in case we built and a reloading, remove any past events/data
        el.children().remove();
        el.unbind();
        
        editor.controls = {};

        for(var panel in dataFromTemplate.bind) {
            
            //create the panel, such as "content" or "appearance"
            var $panel = addPanel(el, panel, dataFromTemplate.bind[panel]);

            // add the controls to the panel, such as question1, backgroundColor, etc
            var controlsInPanel = dataFromTemplate.bind[panel];
            var $panelControls = $panel.find(".controls");

            var controlPromises = [];
            for (var control in controlsInPanel) {
                //each control returns a promise (they are built in parallel), resolved when it's done building.
                var prom = addControl($panelControls, panel, control, controlsInPanel[control]);
                controlPromises.push(prom);
            }
        }

        return $.when.apply(null, controlPromises);
    }


    function addPanel(el /*dom*/, panelKey /*string*/) {
        // Add a panel (group of controls to sidebar)
        // A panel is just a grouping of controls.
        var id = 'panel-' + panelKey;
        $('<div class="panel"></div>').attr('id', id).appendTo(el);

        var $panel = $(el).find('#' + id);
        var title = designer.mui.uiLang['designer_panel_'+panelKey] || panelKey
        $('<div class="ptitle"></div>').html(title).appendTo($panel);
        $('<div class="controls"></div>').appendTo($panel);
        
        $panel.on('click', '.ptitle', function(){
            $(this).parent().toggleClass('collapsed')
        });

        editor.controls[panelKey] = {};

        return $panel;
    }

    function addControl(el, panelKey, controlKey, settings) {
        // Add a control (eg text input) to a panel in the sidebar. Returns a promise.
        // A control is an instance of a control builder plugin.
        // The control allows the user to edit some content, style, or settings of the template.
        // The Editor Page will bind the control (via KnockoutJS) to the data from the template, 
        // so changes in the control will be reflected in the template.

        var prom = $.Deferred();

        // Get control type. If editable data is specified without type, we use simple text input
        var config = settings['control'] || {};
        var type = config['type'] || "text";
        
        // Add the html wrap around the control. 
        // The control uses ctlid to know where to insert itself
        var ctlid = 'panel-'+panelKey+'-'+controlKey;
        var title = (designer.mui.uiLang['designer_control_'+controlKey]||controlKey)
        var ctl = $('<div class="control"></div>');
        ctl.attr('id', ctlid);
        ctl.append('<div class="title">'+title+'</div>');
        ctl.appendTo(el);

        // extract the control builder function from loaded plugins
        var Control = controlBuilder.controlPlugins[type];
        control = new Control(editor)

        // keep the reference of all controls 
        editor.controls[panelKey][controlKey] = control;
        
        // the panelKey and controlKey are to bind the data from the 
        // template (data.bind.panelKey.controlKey.val) to the control
        control.build(ctlid, panelKey, controlKey, settings).done(function() {
            console.log("Editor Page - Control Builder: added control: " + ctlid + " ("+type+")");
            prom.resolve();
        }).fail(function(){
            console.log("Editor Page - Control Builder: failed to add control: " + ctlid + " ("+type+")");
            prom.reject();
        });

        return prom;
    }

    return DesignerEditorPageControlBuilderModule;

}());