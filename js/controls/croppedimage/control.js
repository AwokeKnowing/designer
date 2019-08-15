var EditorControl_croppedimage = (function() {

    var editor;
    var control;

    function EditorControl_croppedimage(editorInstance) {
        editor = editorInstance; 
        control = this;
    }

    // any one-time actions, when plugin is loaded
    EditorControl_croppedimage.load = function() {
        $('head').append('<link rel="stylesheet" href="vendor/croppie/2.6.3/croppie.css" />');//todo, wait for css executed
        $('head').append('<link rel="stylesheet" href="js/controls/croppedimage/control'+designer.rvt+'.css" />');
        return $.getScript('vendor/croppie/2.6.3/croppie.js');
    }

    // Called each time this type of control is encountered. 
    EditorControl_croppedimage.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
        $control.addClass('croppedimage');

        var val = "valueUpdate: 'afterkeydown', value: " + panelKey + "." + controlKey + ".val";

        $control.append($('<input type="text" disabled>').attr('data-bind', val + ".src"));        //relative to lesson folder
        $control.append($('<input type="hidden">').attr('data-bind', val + ".width"));      //post-scale (final) width
        $control.append($('<input type="hidden">').attr('data-bind', val + ".height"));
        $control.append($('<input type="hidden">').attr('data-bind', val + ".crop.x"));     //crop points, in image space
        $control.append($('<input type="hidden">').attr('data-bind', val + ".crop.y"));
        $control.append($('<input type="hidden">').attr('data-bind', val + ".crop.width")); //pre-scale width (ie x2 - x1)
        $control.append($('<input type="hidden">').attr('data-bind', val + ".crop.height"));
        $control.append($('<input type="hidden">').attr('data-bind', val + ".crop.zoom"));  //scale cropped section up/down to fit final size


        var thumbnail = createThumbnail(panelKey, controlKey, editor.currentLesson.ref.sourcePath);
        $control.append(thumbnail);
        $control.append('<div style="clear:both">');

        $control.click(control.control_click)

        //NOTE: only the filename, crop points, size and zoom are bound. 
        //The html/image data is not bound. it's retreived/built in the editor and in the lesson.

        return $.when();
    }

    EditorControl_croppedimage.prototype.control_click = function(e) {

        var $control = $(this);
        
        // get the current crop points/zoom to pass to the dialog box
        var src =       $control.find("[data-bind$='val.src']"          ).eq(0).val() || '';
        var width =     $control.find("[data-bind$='val.width']"        ).eq(0).val() * 1;
        var height =    $control.find("[data-bind$='val.height']"       ).eq(0).val() * 1;
        var x =         $control.find("[data-bind$='val.crop.x']"       ).eq(0).val() * 1;
        var y =         $control.find("[data-bind$='val.crop.y']"       ).eq(0).val() * 1;
        var cropW =     $control.find("[data-bind$='val.crop.width']"   ).eq(0).val() * 1;
        var cropH =     $control.find("[data-bind$='val.crop.height']"  ).eq(0).val() * 1;
        var cropZ =     $control.find("[data-bind$='val.crop.zoom']"    ).eq(0).val() * 1;
       
        var $dialog = $('<div class="croppie-dialog"><div class="croppie-tool"></div></div>');
        
        $('<div class="croppie-controls">')
            .append('<div class="croppie-save" data-mui="designer_ui_save" >Save</div>')
            .append('<div class="croppie-cancel" data-mui="designer_ui_cancel">Cancel</div')
            .appendTo($dialog);

        $('<div class="croppie-controls left">')
            .append('<div class="croppie-chooseimage" data-mui="designer_ui_changeImage">Change Image...</div>')
            .appendTo($dialog);

        designer.applyMui($dialog);
       
        $('.pg-edit').append($dialog);

        var crop = $('.croppie-tool').croppie({viewport: {width: width, height: height}});

        // all images must currently be same domain because croppie uses canvas (no crossdomain). 
        // However since we do html and don't get data we could modify croppie to show with left/offset  
        // or use our own croppie and get around this.
        // that said, even if crop tool doesn't work, image does render, and other image can be chosen
        crop.croppie('bind', {
            url: (/\/\/|^\//.test(src)?'':editor.currentLesson.ref.sourcePath) + src, 
            points: [x, y, x + cropW, y + cropH],       // convert x,y,width,height to x1,y1,x2,y2 for croppie
            zoom: cropZ
        });

        $dialog.on('click', '.croppie-cancel', function() {
            crop.croppie('destroy');
            $dialog.remove();
        });

        $dialog.on('click', '.croppie-save', function() {
            crop.croppie('result', {type:'html'}).then(function(html) {
                var tr = crop.croppie('get'); //get the crop points and zoom data

                //write the data back to the inputs (which are databound to the lesson) and trigger update
                $control.find("[data-bind$='.src']"          ).eq(0).val(src                        ).trigger('keydown');
                $control.find("[data-bind$='.crop.x']"       ).eq(0).val(tr.points[0]               ).trigger('keydown');
                $control.find("[data-bind$='.crop.y']"       ).eq(0).val(tr.points[1]               ).trigger('keydown');
                $control.find("[data-bind$='.crop.width']"   ).eq(0).val(tr.points[2] - tr.points[0]).trigger('keydown');
                $control.find("[data-bind$='.crop.height']"  ).eq(0).val(tr.points[3] - tr.points[1]).trigger('keydown');
                $control.find("[data-bind$='.crop.zoom']"    ).eq(0).val(tr.zoom                    ).trigger('keydown');
                //$control.find("[data-bind$='.width']"        ).eq(0).val(); //image size not modified (technically could be)
                //$control.find("[data-bind$='.height']"       ).eq(0).val();
                $control.change(); //trigger change event so ui knows needs save

                crop.croppie('destroy')
                $dialog.remove();
            });
        });

        $dialog.on('click', '.croppie-chooseimage', function() {
            openImageDialog(editor.currentLesson.ref.sourcePath, src).then(function(newsrc){
                // src here is the captured src from the surrounding code (local to control_click)
                src = newsrc;

                crop.croppie('destroy');
                crop = $('.croppie-tool').croppie({viewport: {width: width, height: height}});

                crop.croppie('bind', {
                    // if url has //  or starts with / don't prepend the lesson path as it's a full path. (demo uses / )
                    url: (/\/\/|^\//.test(src)?'':editor.currentLesson.ref.sourcePath) + src/*, // all images must be relative to lesson folder or fully qualified
                    points: [x, y, x + cropW, y + cropH],       // convert x,y,width,height to x1,y1,x2,y2 for croppie
                    zoom: cropZ*/
                });
            })
        })

    }


    function createThumbnail(panelKey, controlKey, lessonPath) {
        //thumnail (commented code below shows what croppie returns in html mode, wrappen in final size.)
        //the thumnail code is just a marked up version of this
        /*
        <div style="width: 200px; height: 150px; overflow: hidden;">
            <div class="croppie-result" style="width: 200px; height: 150px; transform: scale(1); transform-origin: left top 0px;">
                <img src="" style="left: -18px; top: -101px;">
            </div>
        </div>
        */
        
        var lessonPath = lessonPath || '';
        var thumbSize = 108; //inputs are 27px so 108 is 27 * 4 to have the expanded view on hover.
        var val = panelKey + "." + controlKey + ".val";
        var w = val + '.crop.width()*1';
        var h = val + '.crop.height()*1';

        // we build the thumbnail by scaling the image and centering it in a box.  Also shows how to use and work with the results of croppie
        var thumbnail = $( 
            ('<div class="thumbnail" tabindex="0">' +
                '<div>' +
                    '<div data-bind="style:{ '+ 
                        "width:     ( ("+w+" > "+h+")?48:(48 * ("+w+"  /    "+h+") )         )+'px'," +
                        "height:    ( ("+w+" > "+h+")?   (48 * ("+h+"  /    "+w+") )      :48)+'px'," +
                        "marginTop: ( ("+w+" > "+h+")?   (48/2-("+h+" * (48/"+w+") ) / 2 ): 0)+'px' " +
                    '}">' +
                        '<div data-bind="style:{'+ 
                                "width:  (" + w +") + 'px'," + 
                                "height: (" + h +") + 'px'," +
                                "transform: 'scale('+ ( ("+w+" > "+h+")?(48/"+w+"):(48/"+h+") ) +')'" + 
                         '}">' +
                            '<img data-bind="'+
                                "attr:{src:((/\\/\\/|^\\//.test("+val+".src()))?'':('"+lessonPath+"'))+"+val+".src()},"+
                                "style:{left:-("+val+".crop.x())+'px',top:-("+val+".crop.y())+'px'" +
                            '}">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>').replace(/48/g, thumbSize)
        );

        return thumbnail;
    }

    function openImageDialog(lessonPath, currentSrc) {
        var prom = $.Deferred();

        designer.pages.assetManager.displayAndGetChoice({"types":["image"]}, currentSrc).done(function(asset){

            prom.resolve(asset.file)
        })

        

        return prom;
    }


    return EditorControl_croppedimage;

}());