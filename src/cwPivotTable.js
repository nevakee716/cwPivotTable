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

    cwPivotTable.prototype.construct = function(options) {
        
        this.config = JSON.parse(this.options.CustomOptions['JsonConfiguration']);
        this.config = {
            complementaryNode : [],
            hiddenNodes : [],
            cardinalNodes : [],
            cols : [],
            rows : [],
            rendererName : "Table",
            hiddenAttributes : [],
            aggregatorName : "Count"
        };

        if(config.complementaryNode === undefined)  config.complementaryNode = [];
        if(config.hiddenNodes === undefined)  config.hiddenNodes = [];
        if(config.cardinalNodes === undefined)  config.cardinalNodes = [];
        if(config.cols === undefined)  config.cols = [];
        if(config.rows === undefined)  config.rows = [];
        if(config.aggregatorName === undefined)  config.aggregatorName = "Count";
        if(config.rendererName === undefined)  config.aggregatorName = "Table";
        if(config.hiddenAttributes === undefined)  config.hiddenAttributes = [];


        this.nodes = {};
        this.PivotDatas = [];
        //var nodesObj = {};
        //this.config.nodes.forEach(function(n) {
        //    nodesObj[n.nodeID] = n;
        //});
//
        //this.config.nodes = nodesObj;
    };



    cwApi.cwLayouts.cwPivotTable = cwPivotTable;
}(cwAPI, jQuery));