var DesignerAssetManagerPage = (function() {
// Asset Manager Page is responsible for:
// -- Loading and displaying a list of templates to choose from
// -- Browsing, filtering, and providing details
// -- Returning the information needed for the editor to load the user's choice

// Note: it's a 'page' because it's structured that way, vs a 'popup'.  But it's still a dialog
// because it 'pops up' when no lesson is specified, and returns the result of the user's choice.

    var designer;
    var assetManager;

    var $page;
    var $parentPage;
    var assets;
    var assetIndexes;

    function DesignerAssetManagerPage(designerInstance) {

        designer = designerInstance;
        assetManager = this;
        $page = null;
        $parentPage = null; //track the page that launched as dialog, to return when done.

        assets = {}; // data about each of the assets we know about
        assetIndexes = {};

    }

   DesignerAssetManagerPage.prototype.load = function(config) {
        // When the page component is initially loaded in the Designer, we just
        // set up the basic structure. 
        // We wait for display to be called to actually load and display the template list.
        assetManager.waitForLoad = $.Deferred();
        $.when(
            loadAssetManagerContent(config)
        ).done(function(){

            addEventHandlers(config);
            onAssetManagerLoaded(config);

            console.log("Asset Manager: page loaded")
            assetManager.waitForLoad.resolve();
        }).fail(function(){
            console.log("Asset Manager: page not loaded")
        });

        return assetManager.waitForLoad;
    }

    DesignerAssetManagerPage.prototype.displayAndGetChoice = function(config, txtid) {
        // This deplays the template page
        
        // this promise is 'global' because we wait for user input and 
        // only when user actions done does it resolve.
        assetManager.waitForUserChooseAsset = $.Deferred();

        // hide the page that launched us, and display this dialog page. 
        $parentPage = $('.pages > div:not(.hidden)');
        $parentPage.addClass('hidden');
        $page.removeClass("hidden");

        //this timeout is needed so the page will show before it freezes during loadAssets
        setTimeout(function(){
            // rerender data for templates and display them. 
            loadAssets('lesson', config).done(function(){
                // Now try to select the asset they they're currently useing
                $page.find(".assets-list.assets-lesson .asset[data-txtid='"+txtid+"']").click()
                

                console.log('Asset Manager: loaded asset list')
                // we don't resolve until user chooses asset
            });
        }, 10);


        //reset the uploader
        //$page.find("#upload_file-upload-form").reset();

        return assetManager.waitForUserChooseAsset; // resolved in useThisAsset_click()
    }

    DesignerAssetManagerPage.prototype.addAssetToProject = function(assetIndexName /* "account" or "external"*/, txtid) {
        var prom = $.Deferred();

        getSelectedAssetInfo(assetIndexes[assetIndexName], txtid).done(function(asset){
            // Post the info.  if it's already in the lesson, it just returns same info
            // if it's in the course, it adds to curren lesson index. if library, add to course and lesson index
            // if it's external, it copies file to account assets and adds to library,course,lesson indexes
            // note that if there's already an asset with same txtid but different content, it will rename
            // the new asset. So if asset returns with different txtid, we must request index or do local update.
            
            // if already in lesson, return
            
            for(let i=0;i<assets['lesson'].length;i++)
                if(assets['lesson'][i].txtid === asset.txtid)
                    return prom.resolve(asset);
            
            if(assetIndexName === "account") {
                //already in account, so just add to course and/or lesson
                return assetManager.addAccountAssetsToLesson([asset]).done(function(response){
                    //TODO: we need to get asset from response, in case id was changed during upload (eg picture.jpg -> picture(1).jpg)
                    //update local indexes
                    addAssetToLocalIndex(asset, true)

                    //done adding account asset to project.
                    prom.resolve(asset);
                });
            } else if(assetIndexName === "external") {
                //public asset. will need to copy into account, and add to index
                return assetManager.addPublicAssetsToLesson([asset]).done(function(response){
                    //TODO: we need to get asset from response, in case id was changed during upload (eg picture.jpg -> picture(1).jpg)
                    
                    //update local indexes
                    addAssetToLocalIndex(asset, true)

                    //done adding account asset to project.
                    prom.resolve(asset);
                });
            }

            // if it got to here, something's wrong, we couldn't add it.
            prom.reject(asset);

        });

        return prom;
    }


    DesignerAssetManagerPage.prototype.addAccountAssetsToLesson = function(assets) {
        var prom = $.Deferred();

        //currently we only need the ids (since they're already in account)
        var txtids=[];
        for(let i=0;i<assets.length;i++)
            txtids.push(assets[i].txtid)

        var s = designer.settings;


        //todo: move LMS access to a module.
        $.ajax({
            "url":"https://api.knowledgecity.com/v2/external/apps/designer/accounts/" + s.accountId + "/lessons/" + s.lessonId + "/assets",
            "method":"post",
            "data": {
                "token":         s.token,
                "lang":          s.lessonLang,
                "txtids":        txtids
            },
            "dataType": "json",
            "cache":false
        }).done(function(r){
            //ok we replaced the template. return info which could be used to update local objects
            prom.resolve(r.response);
        }).fail(function(r){
            alert("Unable to add selected asset.  Please return to the LMS and try again. If the problem persists, please contact KnowledgeCity")
            $('body').empty().html("Error: Please return to the LMS");
            //history.back();
        });

        return prom;
    }


    DesignerAssetManagerPage.prototype.addPublicAssetsToLesson = function(assets) {
        var prom = $.Deferred();

        var s = designer.settings;

        //todo: move LMS access to a module.
        $.ajax({
            "url":"https://api.knowledgecity.com/v2/external/apps/designer/accounts/" + s.accountId + "/assets",
            "method":"post",
            "data": {
                "token":    s.token,
                "lang":     s.lessonLang,
                "assets":   assets,
                "lessonid": s.lessonId,
                "source":   assetIndexes['external'].assetBasePath
            },
            "dataType": "json",
            "cache":false
        }).done(function(r){
            //ok we replaced the template. return info which could be used to update local objects
            prom.resolve(r.response);
        }).fail(function(r){
            alert("Unable to add selected assets.  Please return to the LMS and try again. If the problem persists, please contact KnowledgeCity")
            $('body').empty().html("Error: Please return to the LMS");
            //history.back();
        });

        return prom;
    }


    DesignerAssetManagerPage.prototype.updateAssetIndex = function(indexName, assetIndex) {
        assetIndexes[indexName] = assetIndex;
    }


    //private methods

    function onAssetManagerLoaded(config) {
        // this is called as soon as page is loaded (ie initial 1-time load at app launch)
        

        //init uploader
        Uploader(designer.settings, onUploadComplete);
    }

    function onUploadComplete(result) {
        console.log('Asset Manager: upload finished');
        console.log(result);
        
        var assets = result.assets;

        //update local indexes
        for (let i=0;i<assets.length;i++)
            addAssetToLocalIndex(assets[i]);

        //rerender the assets, then select the new one
        loadAssets("library", {"types":["image"]}).done(function(){
            $page.find(".assets-list.assets-library .asset[data-txtid='"+assets[0].txtid+"']").click()
            console.log('Asset Manager: local assets updated');
        }).always(function(){
            $(".loading").hide();//it is shown in upload.js
        })
    }

    function addEventHandlers(config) {
        // add events that are only added once and persist for life of page

        $page.on('click', '.prev-button', useThisAsset_click);
        $page.on('click', '.tab', tab_click);
        
    }

    function loadAssetManagerContent(config) {
        //load any content needed to load once. (loadAssets runs each time displayed)
        $page = $('.pg-assetmanager');

        var accountHostBasePath = "https://cdn0.knowledgecity.com/opencontent/accounts/";

        if(designer.settings.isDemo)
            accountHostBasePath = "demodata/opencontent/accounts/";

        var s = designer.settings;
        
        // get external assets and account assets (don't reload each time asset manager opened)
        $(".loading").show();
        assetManager.waitForAssetIndexes = $.when(
            //todo: keep account image in cdn1 folder and access via api.
            $.ajax({
                "url":"https://cdn0.knowledgecity.com/opencontent/designer/assets/publicimages/assets.json",
                "cache":true,
                "dataType":"json"
            }).done(function(assetIndex) {
                assetManager.updateAssetIndex("external", assetIndex);
            }),
            $.ajax({
                "url": accountHostBasePath +
                       s.accountId+"/designer/assets/assets--v"+Date.now()+".json",
                "cache":false, 
                "dataType":"json"
            }).done(function(assetIndex) {
                assetManager.updateAssetIndex("account", assetIndex);
            })
        ).always(function(){
            $(".loading").hide();
        });

        return $.when();

    }



    function loadAssets(startTab, config ) {
         // Load the assets data but don't yet render into view.  asset data looks like:
        /*
        {
          "assetFiles": false,
          "assetIndex": {
            "image": {
              "DES1001": {
                "en": {
                  "DES1001-2ik6z": ["computer_saleswoman.jpg","computer_saleswoman2.jpg", "gecko.jpg"],
                  "DES1001-3ik63": ["acting.jpg", "arrowtwoway.png", "engineeringstudent.jpg", "listening.jpg" ]
                }
                "es": {
                  "DES1001-5ik6z": ["computer_saleswoman.jpg","computer_saleswoman2.jpg", "gecko.jpg"],
                  "DES1001-5ik63": ["acting.jpg", "arrowtwoway.png", "engineeringstudent.jpg", "listening.jpg" ]
                }
              },
              "DES1001B": {
                "en": {
                  "DES1001B-2ikbb": ["acting.jpg", "arrowtwoway.png", "retire.jpg", "school_children1.jpg","writing.jpg"]
                }
              }
            }
          },
          "assets": {
            "acting.jpg": {
              "txtid": "acting.jpg",
              "md5": "b568c5632ee7be76452c4193e573f0b0",
              "added": 1552088417,
              "tags": [
                  "images",
                  "acting",
                  "jpg"
              ],
              "type": "image",
              "title": "acting.jpg",
              "file": "acting.jpg",
              "width": 160,
              "height": 90,
              "mime": "image\/jpeg",
              "size": 5473,
              "hsize": "5 KB",
              "about": "160x90 (5 KB)"
            },
            ...
          }
        }

        also, public assets  uses .asset files per image, so the index just has filenames
        {
          "assetFiles": true,
          "assetIndex": {
            "image": {
                "public": ["Warsaw-at-night-free-license-CC0.jpg","abacus-mathematics-addition-subtraction-1019470.jpeg" ... ]
            }
        }
        */

        //prepare all the assets object data, and render the current (starting) tab.
        var prom = $.Deferred();

        var s = designer.settings;

        //make sure assetIndexes are done downloading
        $.when(assetManager.waitForAssetIndexes).then(function() {

            assets = {"lesson":[], "course":[], "library":[], "public": assetIndexes["external"].assetIndex.image.public};

            //note that right now, we only handle image type assets, but other types can fit in easily

            //lesson
            for(let id of assetIndexes["account"].assetIndex["image"][s.courseId][s.lessonLang][s.lessonFolder])
                assets.lesson.push(assetIndexes["account"].assets[id]);

            //course  (note we pull assets from both lessons here. above is just the current lesson's language)
            let added = {}; //track already added to avoid duplicates
            for (let lang in assetIndexes["account"].assetIndex["image"][s.courseId])
                for (let lesson in assetIndexes["account"].assetIndex["image"][s.courseId][lang])
                    for (let id of assetIndexes["account"].assetIndex["image"][s.courseId][lang][lesson])
                        if(!(id in added))
                            assets.course.push(assetIndexes["account"].assets[id]), added[id]=1;

            //library
            for(let id in assetIndexes["account"].assets)
                assets.library.push(assetIndexes["account"].assets[id]);
            //todo: from local current lesson info
            

            // render them in the list view
            var acctPath = assetIndexes["account"].assetBasePath  || "";
            renderAssets(assets["lesson"],  "lesson",  acctPath);
            renderAssets(assets["course"],  "course",  acctPath);
            renderAssets(assets["library"], "library", acctPath);

           
            $page.find('#pgam_tab-' + startTab).click();

            prom.resolve();
        });


        

        return prom;
    }

    function renderAssets(assets, tab, path, maxShown, addMore) {
        // Here we render the asset data into the asset cards in the list view.
        // Sorry about jquery building, but mustache seemed overkill and template strings not fully supported yet.
        tab      = tab      || "project";
        path     = path     || "";
        maxShown = maxShown || 1000;
        addMore  = addMore  || false; //whether to re-render all assets, or to just add the supplied assets to the rendered list

        var starti = 0;
        if(!addMore)
            $page.find('.assets-list.assets-' + tab).empty(); //also clears click handlers if dialog loaded again later
        else
            starti = $page.find('.assets-list.assets-' + tab).children(".asset").length

        for(let i = starti; (i-starti) < assets.length; i++) {
            //<div id="text_question_text_multi_answer" class="asset tag-quizzes">
            //    <div class="prev-small" style="background-image:url(template1.png)"></div>
            //    <div class="info">
            //       <div class="tmpl-title">Text Question - Text Answers</div>
            //       <div class="tmpl-version">Version: 1.0</div>
            //       <div class="tmpl-about">User will read a question and select answer</div>
            //    </div>
            //</div>
        
            var asset = assets[(i-starti)];

            var $asset = $('<div class="asset" style="display:none"></div>');
            $asset.on('click', asset_click);
            $asset.attr("data-item_i", i);
                
            if(typeof asset == "string") { //eg just "someimage.jpg"  we render the thumnail
                $asset.attr('data-txtid', asset);
                $asset.addClass("prev-large");
                
                let imageurl = (path+"_th_"+asset).replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/ /g,'%20');
                $asset.append($('<div></div>').css({"backgroundImage": "url("+imageurl+")"}))
            } else if (typeof asset == "object") {
                $asset.attr('data-txtid', asset.txtid);
                if(!asset.tags)
                    asset.tags=[asset.type];
                for (var ai = 0; ai < asset.tags.length; ai++)
                    $asset.addClass('tag-'+asset.tags[ai]);

                let imageurl = (path+(asset.image||asset.file)).replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/ /g,'%20');
                $asset.append($('<div class="prev-small"></div>').css({"backgroundImage": "url("+ imageurl +")"}))

                var $info = $('<div class="info"></div>');
                $info.append($('<div class="tmpl-title">').text(asset.title));
                $info.append($('<div class="tmpl-type">').text('type: '+asset.type));
                $info.append($('<div class="tmpl-about">').text(asset.about));

                $asset.append($info);
            }
            
            $page.find('.assets-list.assets-' + tab).append($asset);

            //space the requests to download images by 80 ms in between each request
            if( (i-starti) < maxShown) {
                setTimeout("$('.assets-list.assets-" + tab + ' .asset[data-item_i=' + i +"]').show()", 80 * (i - starti) )
            }
            
        }
            
        //add load more if needed
        if(addMore)
            $page.find('.assets-list.assets-' + tab + ' .load-more').remove();
            
        if(maxShown < assets.length){

            var $morebtn = $('<div class="load-more">Load More...</div>')
            let selector = '.assets-list.assets-' + tab + ' .asset:hidden';
            let tb = tab;
            let max = maxShown;
            $morebtn.click(function(){
                console.log("Asset Manager: showing "+ max + " more assets on tab: "+ tb);
                $unshown = $(selector);
                if($unshown.length){
                    $(selector).slice(0, Math.min(max, $unshown.length)).each(function(i,o){
                        let idx = $(this).attr('data-item_i');
                        setTimeout("$('.assets-list.assets-" + tb + ' .asset[data-item_i=' + idx +"]').show()", 80 * i )
                    });
                } else {
                    $page.find('.assets-list.assets-' + tb + ' .load-more').remove();
                }
            })

            $page.find('.assets-list.assets-' + tab).append($morebtn);
        }


        // TODO: setup template filters (quiz, game, informational, favorite, etc)
    }


    function addAssetToLocalIndex(asset, isLessonAsset) {
        //add to account
        assetIndexes['account'].assets[asset.txtid] = asset;

        if(!isLessonAsset)
            return;

        //add to lesson
        let s = designer.settings;
        let existsInLesson = false;
        let existingLessonAssets = assetIndexes['account'].assetIndex[asset.type][s.courseId][s.lessonLang][s.lessonFolder];
        for(let i=0;i<existingLessonAssets.length;i++)
            if(existingLessonAssets[i] == asset.txtid)
                existsInLesson = true;

        if(!existsInLesson) {
            assetIndexes['account'].assetIndex[asset.type][s.courseId][s.lessonLang][s.lessonFolder].push(asset.txtid);
            
            assets['lesson'].push(asset);
        }
    }
    

    function onShowAssetList(tab) {
        //if(tab=="upload") {
            //reset the upload
        //}
        if(tab=="public") {
            //render if not rendered
            if( !$('.assets-list.assets-public').data("rendered") ) {
                $('.assets-list.assets-public').data("rendered",'1').html("Loading...");
                setTimeout(function(){renderAssets(assets["public"],  "public",  assetIndexes["external"].assetBasePath || "",  200, false)}, 10);
            }
        }
        

    }


    function getSelectedAssetInfo(assetIndex, txtid) {
        var prom = $.Deferred();
        var assetPath = assetIndex.assetBasePath  || "";

        if(typeof assetIndex.assets === "undefined")
            assetIndex.assets = {};

        // if we have the asset, resolve with it, otherwise try to get it from file (public assets use file because because of large number)
        if(txtid in assetIndex.assets) {
            prom.resolve(assetIndex.assets[txtid])
        } else {
            // we dont' have asset info but maybe it's in asse file (file.ext.json)
            if(!assetIndex.assetFiles)
                prom.reject();

            $.ajax({
                "url": assetPath + txtid + ".json",
                "cache": false,
                "dataType": "json"
            }).done(function(assetFromFile) {
                if(typeof assetFromFile === "object" && assetFromFile["txtid"]) {
                    assetIndex.assets[txtid] = assetFromFile;
                    prom.resolve(assetIndex.assets[txtid])
                } else {
                    prom.reject();
                }
            }).fail(function(){
                prom.reject();    
            });
        }

        return prom;
    }

    function getAssetImage(assetIndex, txtid) {

        //assets can specify a fully qualified .image field to preview them. if not, try to add one
        var asset = ((assetIndex||{})["assets"]||{})[txtid] || {};
        var image = 'img/blankimg480.png';
        
        if(asset.image)
            image = asset.image;

        //no explicit image, so let's choose one
        if(asset.type == "image" && !asset.image) {
            if (asset.file)
                image = assetIndex.assetBasePath + asset.file
            
            if (asset.blob)
                return asset.imageBlob

            if (asset.imageBase64)
                return asset.imageBase64
        }
        
        //other types of assets
        if(asset.type == "pdf") {
            //todo, have generic pdf image, or actually show it.
        }

        //encode parenthesis which don't work in background url's, eg url(file(2).jpg)
        return image.replace('(', '%28').replace(')', '%29');
    }

    function tab_click() {
        var $clicked = $(this);
        
        if($clicked.hasClass('.selected'))
            return;

        $page.find('.tab.selected').removeClass('selected');
        $page.find('.assets-list.selected').removeClass('selected');
        
        var tab = $clicked.attr('id').replace('pgam_tab-','');
        $clicked.addClass('selected');
        $page.find('.assets-list.assets-' + tab).addClass('selected')
        
        onShowAssetList(tab);
    }


    function asset_click() {
        // when a template is clicked, show its details in the preview pane on the left
        
        $page.find(".assets .asset.selected").removeClass('selected');
        $clicked = $(this)
        $clicked.addClass("selected");

        $page.find(".prev-button").removeClass("disabled");

        // extract the choice
        var txtid = $clicked.attr("data-txtid");
        var assetIndexName = $clicked.parent().attr('data-index');

        getSelectedAssetInfo(assetIndexes[assetIndexName], txtid).done(function(asset){
            var image = getAssetImage(assetIndexes[assetIndexName], asset.txtid)
            
            $page.find('.preview-pane .prev-img-large > div').css('backgroundImage', 'url('+image+')');
            $page.find('.preview-pane .tmpl-title').html(asset.title);
            $page.find('.preview-pane .tmpl-type').html("type: " + asset.type);
            $page.find('.preview-pane .tmpl-about').html(asset.about);
            

        }).fail(function(){
            $page.find(".prev-button").addClass("disabled");
            $page.find('.preview-pane .prev-img-large > div').css('backgroundImage', 'url(img/blankimg480.png)');
            $page.find('.preview-pane .prev-descr-large > div > div').each(function(){$(this).html('')});
            $clicked.removeClass("selected").addClass("unavailable");
        })
        //

        
    }


    function closeAssetManager() {
        //reset state for next time it will be shown, and restore page that opened it

        // reset view
        $page.find(".prev-button").addClass("disabled");
        $page.find('.preview-pane .prev-img-large > div').css('backgroundImage', 'url(img/blankimg480.png)');
        $page.find('.preview-pane .prev-descr-large > div > div').each(function(){$(this).html('')});
        $page.find('.assets .asset.selected').removeClass("selected")


        // restore the page that launched us
        $page.addClass("hidden");
        $parentPage.removeClass("hidden");
    }


    function useThisAsset_click() {
        // When user click "use this asset" on preview pane, close dialog 
        // and return the choice to calling page

        // get the selected templates index
        var $selected = $page.find('.assets .asset.selected');
        var assetIndexName = $selected.parent().attr('data-index');
        var txtid = $selected.attr('data-txtid');

        console.log("Asset Manager: selected asset: " + JSON.stringify(assetIndexes[assetIndexName].assets[txtid]) );

        if(designer.settings.isDemo) {
            var image = getAssetImage(assetIndexes[assetIndexName], txtid);
            var asset = $.extend(true,{},assetIndexes[assetIndexName].assets[txtid]) //get clone so we don't modify original.
            asset.image = (/\/\//.test(image)?'':'/')+image;//so both lesson and designer can find it 
            asset.file  = (/\/\//.test(image)?'':'/')+image;
            
            closeAssetManager();
            assetManager.waitForUserChooseAsset.resolve(asset)
            return;
        }

        $(".loading").show();
        assetManager.addAssetToProject(assetIndexName, txtid).done(function(asset){
            closeAssetManager();
            
            // resolve dialog promise with choice data (see display())
            assetManager.waitForUserChooseAsset.resolve(asset)
        }).always(function(){
            $(".loading").hide();
        });
        
    }

    

    return DesignerAssetManagerPage;

}());