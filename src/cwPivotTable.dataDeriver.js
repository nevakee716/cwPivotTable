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

    cwPivotTable.prototype.dataDerivers = function() {
        var derivedAttributes = {};
        var view = cwAPI.getCurrentView();
        if(view) view = view.cwView;
        else return {}; 

        if(view === "index_processus") {
            derivedAttributes["Application Mois de Mise en production"] =  $.pivotUtilities.derivers.dateFormat("Application_Date de mise en production", "%m", true);
            derivedAttributes["Application Année de Mise en production"] =  $.pivotUtilities.derivers.dateFormat("Application_Date de mise en production", "%y", true);
        }
        


        return derivedAttributes;
    };


    // Building network
   

    cwApi.cwLayouts.cwPivotTable = cwPivotTable;
}(cwAPI, jQuery));