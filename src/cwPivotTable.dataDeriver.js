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

        if(view.indexOf("index_customers_pivot") !== -1) {
            derivedAttributes["Month"] =  $.pivotUtilities.derivers.dateFormat("Time Entry_Start Date", "%m", true);
            derivedAttributes["Year"] =  $.pivotUtilities.derivers.dateFormat("Time Entry_Start Date", "%y", true);
            derivedAttributes["Time Entry Date"] = $.pivotUtilities.derivers.dateFormat('Time Entry_Start Date', '%d/%m/%y', true);
            derivedAttributes["Week Number"] = function(record) {
                var d = new Date(record['Time Entry_Start Date']);
                return d.getWeekNumber();
            };
        }
        

      Date.prototype.getWeekNumber = function(){
        var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
      };

        return derivedAttributes;
    };


    // Building network
   

    cwApi.cwLayouts.cwPivotTable = cwPivotTable;
}(cwAPI, jQuery));