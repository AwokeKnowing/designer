var EditorControl_color = (function() {

    var editor;
    var control;

    function EditorControl_color(editorInstance) {
        editor = editorInstance; 
        control = this;
        control.pickr=null;
        
    }

    // any one-time actions, when plugin is loaded
    EditorControl_color.load = function() {
        $('head').append('<link rel="stylesheet" href="vendor/pickr/0.5.1/pickr.min.css" />');//todo, wait for css executed
        return $.getScript('vendor/pickr/0.5.1/pickr.min.js');
    }

    //called each time this type of control is encountered
    EditorControl_color.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
    	
    	var inp = $('<input type="text" style="cursor:pointer;border-left: 25px solid transparent">');
        var inpid = ctlid + '-text'
    	inp.attr('data-bind', "style:{ 'border-left-color': "+ panelKey + "." + controlKey + ".val}, value: "+ panelKey + "." + controlKey + ".val, valueUpdate: 'afterkeydown'");
        inp.attr('id', inpid);

        inp.on('click',function(){
            //in case field was updated externally, make sure pickr starts with color currently in input field
            pickr.options.default = $(this).val();
            pickr.openColor = $(this).val(); //this is referenced in initColorPicker save handler (scopes are pretty crazy)
            pickr.setColor($(this).val(),true);
        })

        $control.append(inp);

        let pickr = initColorPicker(inpid, settings);


        
        return $.when();
    }

    //private methods
    function initColorPicker(id, settings)
    {
        
        var startColor = settings.val;

        var pickr = Pickr.create({
            el: '#'+id,
            default: startColor,
            useAsButton: true,
            saveButton:true,
            comparison:true,
            components: {
                preview: true, opacity: true,  hue: true, //Main components
                interaction: {  // Input / output Options
                    hex: true, rgba: true, hsla: false, hsva: true, cmyk: false, input: true, clear: true, save: true
                }
            },
            strings: {
                save:  'OK',
                clear: 'Cancel'
            }
        });

        pickr.on('save', function (hsva, instance) {
            if(hsva){
                startColor = hsva.toRGBA().toString()
            } else { //they clicked clear
                startColor = instance.openColor;
            }
            instance.options.default=startColor;
            $(instance._root.button).val(startColor).trigger('keydown').change(); //update input field
        });
        pickr.on('change', function (hsva, instance) {
            $(instance._root.button).val(hsva.toRGBA().toString()).trigger('keydown').change(); //update input field
        })

        return pickr;
    }

    return EditorControl_color;

}());