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





    cwPivotTable.prototype.createLoadingElement = function(container) {
        console.log("Create loading")
        var a = document.createElement('a');
        a.className = 'pivotLoadingElementWrapper';
        a.innerHTML = "<i class='pivotLoadingElement fa fa-circle-o-notch fa-spin'> </i>";
        this.loadingElement = a;
        container.appendChild(a);
    };

    cwPivotTable.prototype.displayLoading = function() { 
        this.loadingElement.classList.remove("cw-hidden");
    };


    cwPivotTable.prototype.hideLoading = function() { 
        this.loadingElement.classList.add("cw-hidden");
    };




    cwApi.cwLayouts.cwPivotTable = cwPivotTable;
}(cwAPI, jQuery));