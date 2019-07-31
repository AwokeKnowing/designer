var EditorControl_wysiwyg = (function() {

    var editor;
    var control;

    function EditorControl_wysiwyg(editorInstance) {
        editor = editorInstance; 
        control = this;
        control.activePromise = null;
    }

    // any one-time actions, when plugin is loaded
    EditorControl_wysiwyg.load = function() {
        $('head').append('<link rel="stylesheet" href="js/controls/wysiwyg/control'+designer.rvt+'.css" />');
        $('head').append('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">');

        return $.when();
    }

    //called each time this type of control is encountered
    EditorControl_wysiwyg.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
        $control.addClass("wysiwygcontrol");
        
        var config = settings['control'] || {};
        
        var editBtn = $('<div class="widebutton">Edit Content</div>');
        editBtn.click(function(e,t){editButton_click(ctlid, panelKey, controlKey, settings)} );
        $control.append(editBtn);

        var inp = $('<textarea></textarea>').attr('rows', 3);
    	inp.attr('data-bind', "valueUpdate: 'afterkeydown', value: "+ panelKey + "." + controlKey + ".val");
        $control.append(inp);
        
        return $.when();
    }

    function editButton_click(ctlid, panelKey, controlKey, settings) {
        var $control = $('#' + ctlid);
        var content = $control.find("[data-bind$='val']"          ).eq(0).val() || '';

        displayEditor(content, ctlid, panelKey, controlKey, settings).done(function(newContent) {
            if(newContent === null) //if canceled. user may add empty text and save, so must be ===null
                return;

            $control.find("[data-bind$='val']"          ).eq(0).val(newContent).trigger('keydown')
        }).fail(function(e){
            console.log(e);
        }).always(function(){
            destroyEditor();
        })
        
    }

    function displayEditor(content, ctlid, panelKey, controlKey, settings) {
        //build the editor and insert it into the page (will be removed after save/cancel)
        var dialogTemplate = 
        '<div class="wysiwyg container">'+
            '<div class="editor-area">'+
                '<div class="panel-buttons">'+
                    '<div class="button-group">'+
                        '<button type="button" id="bold"><i class="fa fa-bold"></i></button>'+
                        '<button type="button" id="italic"><i class="fa fa-italic"></i></button>'+
                        '<button type="button" id="underline"><i class="fa fa-underline"></i></button>'+
                        '<button type="button" id="strikethrough"><i class="fa fa-strikethrough"></i></button>  '+                 
                    '</div>'+
                    '<div class="button-group">'+
                      '<button type="button" id="text_h1" data-role="h1" ><div><b>T</b></div></button>'+
                      '<button type="button" id="text_h2" data-role="h2" ><div>T</div></button>'+
                      '<button type="button" id="text_p"  data-role="p"><div>T</div></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                        '<button type="button" id="justifyleft"><i class="fa fa-align-left"></i></button>'+
                        '<button type="button" id="justifycenter"><i class="fa fa-align-center"></i></button>'+
                        '<button type="button" id="justifyright"><i class="fa fa-align-right"></i></button>'+
                        '<button type="button" id="justifyfull"><i class="fa fa-align-justify"></i></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                        '<button type="button" id="insertunorderedlist"><i class="fa fa-list-ul"></i></button>'+
                        '<button type="button" id="insertorderedlist"><i class="fa fa-list-ol"></i></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                        '<button type="button" id="indent"><i class="fa fa-indent"></i></button>'+
                        '<button type="button" id="outdent"><i class="fa fa-outdent"></i></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                        '<button type="button" id="undo"><i class="fa fa-undo"></i></button>'+
                        '<button type="button" id="redo"><i class="fa fa-undo"></i></button>'+
                        '<button type="button" id="delete"><i class="fa fa-eraser"></i></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                        '<button type="button" id="createLink"><i class="fa fa-link"></i></button>'+
                        '<button type="button" id="insertImage"><i class="fa fa-picture-o"></i></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                        '<button type="button" id="forecolor"><i class="fa fa-tint"></i></button>'+
                    '</div>'+
                '</div>'+
                '<div class="editor" contentEditable ></div>'+
                '<div class="htmlview"></div>'+
            '</div>'+
        '</div>';

        var $dialog = $('<div class="wsw-dialog"><div class="wsw-tool"></div></div>');
        
        $('<div class="wsw-controls">')
            .append('<div class="wsw-save" >Save</div>')
            .append('<div class="wsw-cancel">Cancel</div')
            .appendTo($dialog);



        var wsw=$(dialogTemplate);
        //wsw.css({top:50,right:280,left:100,bottom:0});
        
        $dialog.find(".wsw-tool").append(wsw);

        var $shape = $('.pg-edit .lesson.preview > div');
        var top =    $shape.offset().top*1;
        var left =   $shape.offset().left*1;
        var width =  $shape.width();
        var height = $shape.height();

        //if control provides custom size (to overlay just the area) apply it
        if(settings.control['position']) { 
            let type = settings.control.position.type || "default";
            
            if(type == "default") {
                let p  = settings.control.position;
                top   += p.top*1;
                left  += p.left*1;
                width  = p.width*1;
                height = p.height*1;
            }
            //top +=0;left+=0;width-=0;height-=280;
        }

        var tool= $dialog.find(".wsw-tool .editor");
        tool.offset({top:top,left:left})
        tool.width(width);
        tool.height(height);

        tool.append(content);

        $('.pg-edit').append($dialog);

        control.activePromise = $.Deferred();
        return control.activePromise;

    }

    // these functions control stuff that happens while the editor is open. they assume there is 
    // only ever one editor in the page. The editor is created and destroyed each time it opens, 
    // so it is correct.

    $('.pg-edit').on('click', '.wsw-save', function() {
        var html = $('.pg-edit .wsw-tool .editor').html();
        $('.htmlview').text(html)
        html = $('.htmlview').text();
        //post process the html

        //TODO:post process html

        control.activePromise.resolve(html);
    });

    $('.pg-edit').on('click', '.wsw-cancel', function() {
        control.activePromise.resolve(null);
    });

    function destroyEditor() {
        $('.wsw-dialog').remove();
    }

    function command(name, argument) {
        if (typeof argument === 'undefined') {
            argument = '';
        }
        document.execCommand(name, false, argument);
    }


    function refresh(){
      var val = $('.editor').html();
      $('.htmlview').text(val);
    }

    $('.pg-edit').on('click', '.editor-area button', function(){
        var id = $(this).attr('id');
        switch(id){
          case "createLink":
            var sel = window.getSelection().getRangeAt(0);
            argument = prompt("Enter the link URL");
            window.getSelection().addRange(sel);
            command(id, 'LINK_TO_CHANGE');

            if($('.pg-edit a[href="LINK_TO_CHANGE"]').text()=="LINK_TO_CHANGE")
                $('.pg-edit a[href="LINK_TO_CHANGE"]').text(argument);
            $('.pg-edit a[href="LINK_TO_CHANGE"]').attr('target', "_blank")
            $('.pg-edit a[href="LINK_TO_CHANGE"]').attr('href', argument);
            
            break;
          case "insertImage":
            argument = prompt("Enter the image URL");
            command(id, argument);
            break;

          case "forecolor":
            argument = prompt("Enter the HTML color code");
            command(id, argument);
            break;
          case "text_h1":
            command("formatBlock",'h1')
            break;
          case "text_h2":
            command("formatBlock",'h2')
            break;
          case "text_p":
            command("formatBlock",'p')
            break;

          default:
            command(id);
            break;
        }
        refresh();
    });

    $('.pg-edit').on('keyup','.editor',function(){
        refresh();
    });

    $('.pg-edit').on('click','#save',function(){
        $('.message-popup').remove();
        $('.wysiwyg').append('<div class="message-popup">All changes saved.</div>');
        setTimeout(function(){
          $('.message-popup').css("opacity", ".8");
        }, 100);
        setTimeout(function(){
          $('.message-popup').remove();
        }, 3500);
    });



    return EditorControl_wysiwyg;

}());