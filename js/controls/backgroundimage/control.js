var EditorControl_backgroundimage = (function() {

    var editor;
    var control;

    function EditorControl_backgroundimage(editorInstance) {
        editor = editorInstance; 
        control = this;
    }

    // any one-time actions, when plugin is loaded
    EditorControl_backgroundimage.load = function() {

        return $.when();
    }

    //called each time this type of control is encountered
    EditorControl_backgroundimage.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
    	
    	var inp = $('<input type="text">');
    	inp.attr('data-bind', "value: "+ panelKey + "." + controlKey + ".val, valueUpdate: 'afterkeydown'");
        $control.append(inp);
        
        return $.when();
    }

    return EditorControl_backgroundimage;

}());