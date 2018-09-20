/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */



/*global cwAPI, jQuery */
(function(cwApi, $) {
    "use strict";
    if (cwApi && cwApi.cwLayouts && cwApi.cwLayouts.cwPivotTable) {
        var cwPivotTable = cwApi.cwLayouts.cwPivotTable;
    } else {
        // constructor
        var cwPivotTable = function(options, viewSchema) {
            cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema); // heritage
            cwApi.registerLayoutForJSActions(this); // execute le applyJavaScript après drawAssociations
            this.construct(options);
        };
    }

    cwPivotTable.prototype.applyJavaScript = function() {
        var self = this;
        var libToLoad = [];

        if (cwAPI.isDebugMode() === true) {
            self.createPivot();
        } else {
            libToLoad = ['modules/pivot/pivot.min.js','modules/pivotC3/pivotC3.min.js','modules/pivotC3render/pivotC3render.min.js','modules/pivotD3render/pivotD3render.min.js','modules/pivotExport/pivotExport.min.js','modules/pivotjqUI/pivotjqUI.min.js'];
            // AsyncLoad
            cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function(error) {
                if (error === null) {
                    self.createPivot();
                } else {
                    cwAPI.Log.Error(error);
                }
            });
        }
    };


    // Building network
    cwPivotTable.prototype.createPivot = function() {
        function addStyleString(str) {
            var node = document.createElement('style');
            node.innerHTML = str;
            document.body.appendChild(node);
        }

        var pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
        var self = this,
            i = 0;

       var derivers = $.pivotUtilities.derivers;

        var renderers = $.extend(
            $.pivotUtilities.renderers,
            $.pivotUtilities.c3_renderers,
            $.pivotUtilities.d3_renderers,
            $.pivotUtilities.export_renderers
            );

        $("#cwPivotTable" + this.nodeID).pivotUI(self.PivotDatas, {
            onRefresh: self.onRefresh.bind(self),
            renderers: renderers,
            rendererOptions: {
                table: {
                    clickCallback: self.clickCallback.bind(self)
                }
            },
            //    derivedAttributes: {
            //        "Age Bin": derivers.bin("Age", 10),
            //        "Gender Imbalance": function(mp) {
            //            return mp["Gender"] == "Male" ? 1 : -1;
            //        }
            //    },
           // cols: ["application"],
           // rows: ["process"],
            //    rendererName: "Table Barchart"
        });


    };


    cwPivotTable.prototype.onRefresh = function() {


        var lineHeaders = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtRowLabel");
        var colHeaders = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtColLabel");
        var headers = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtAxisLabel");
        var hDataLine = {};
        var hDataCol = {};
        var self = this;
        headers.forEach(function(h) {
            hDataLine[h.offsetLeft] = h.innerText;
            hDataCol[h.offsetTop] = h.innerText;
        });

        colHeaders.forEach(function(lh) {
           if(hDataCol[lh.offsetTop]) {
                let nodeName = hDataCol[lh.offsetTop];
                let name = lh.innerText;
                var lhClone = lh.cloneNode(true);
                lh.parentNode.replaceChild(lhClone, lh);

                if(self.nodes[nodeName][name]) {
                    var scriptname,popOutName,object = {};
                    object.object_id = self.nodes[nodeName][name].id;
                    scriptname = self.nodes[nodeName][name].objectTypeScriptName;
                    popOutName = cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
                    if(cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                        lhClone.addEventListener('click',function(e) {
                            cwApi.cwDiagramPopoutHelper.openDiagramPopout(object,popOutName);
                        });
                    }
                }
           }
        });

        lineHeaders.forEach(function(lh) {
           if(hDataLine[lh.offsetLeft]) {
                let nodeName = hDataLine[lh.offsetLeft];
                let name = lh.innerText;
                var lhClone = lh.cloneNode(true);
                lh.parentNode.replaceChild(lhClone, lh);

                if(self.nodes[nodeName][name]) {
                    var scriptname,popOutName,object = {};
                    object.object_id = self.nodes[nodeName][name].id;
                    scriptname = self.nodes[nodeName][name].objectTypeScriptName;
                    popOutName = cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
                    if(cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                        lhClone.addEventListener('click',function(e) {
                            cwApi.cwDiagramPopoutHelper.openDiagramPopout(object,popOutName);
                        });
                    }
                }
           }
        });
    };



    cwPivotTable.prototype.clickCallback = function(e, value, filters, pivotData) {

        if (pivotData.aggregatorName === "List Unique Values" && this.nodes.hasOwnProperty(pivotData.valAttrs[0])) {
            if(value.indexOf(",") === -1) {
                str = value;
            } else {
                var selection = window.getSelection();
                if (!selection || selection.rangeCount < 1) return true;
                var range = selection.getRangeAt(0);
                var node = selection.anchorNode;
                var word_regexp = /^[A-Za-z0-9àâéêèìôùûç' _-]*$/;

                // Extend the range backward until it matches word beginning
                while ((range.startOffset > 0) && range.toString().match(word_regexp)) {
                  range.setStart(node, (range.startOffset - 1));
                }
                // Restore the valid word match after overshooting
                if (!range.toString().match(word_regexp)) {
                  range.setStart(node, range.startOffset + 1);
                }

                // Extend the range forward until it matches word ending
                while ((range.endOffset < node.length) && range.toString().match(word_regexp)) {
                  range.setEnd(node, range.endOffset + 1);
                }
                // Restore the valid word match after overshooting
                if (!range.toString().match(word_regexp)) {
                  range.setEnd(node, range.endOffset - 1);
                }

                var str = range.toString();
                if(str.charAt(0) === " ") str = str.slice(1);
            }

            if(this.nodes[pivotData.valAttrs[0]][str]) {
                var scriptname,popOutName,object = {};
                object.object_id = this.nodes[pivotData.valAttrs[0]][str].id;
                scriptname = this.nodes[pivotData.valAttrs[0]][str].objectTypeScriptName;
                popOutName = cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
                if(cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                    cwApi.cwDiagramPopoutHelper.openDiagramPopout(object,popOutName);
                }
            }
        }


    };

    cwApi.cwLayouts.cwPivotTable = cwPivotTable;
}(cwAPI, jQuery));