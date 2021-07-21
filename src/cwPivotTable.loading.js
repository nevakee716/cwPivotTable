/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery */
(function (cwApi, $) {
  "use strict";
  if (cwApi && cwApi.cwLayouts && cwApi.cwLayouts.cwPivotTable) {
    var cwPivotTable = cwApi.cwLayouts.cwPivotTable;
  } else {
    // constructor
    var cwPivotTable = function (options, viewSchema) {
      cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema); // heritage
      cwApi.registerLayoutForJSActions(this); // execute le applyJavaScript après drawAssociations
      this.construct(options);
    };
  }

  cwPivotTable.prototype.createLoadingElement = function (container) {
    //.log("Create loading " + this.nodeID);
    var a = document.createElement("a");
    a.id = "pivotLoadingElementWrapper_" + this.nodeID;
    a.className = "pivotLoadingElementWrapper cw-hidden";
    a.innerHTML = "<i class='pivotLoadingElement fa fa-circle-o-notch fa-spin'> </i>";
    container.appendChild(a);
  };

  cwPivotTable.prototype.displayLoading = function () {
    // console.log("display loading " + this.nodeID);
    let loadingElement = document.getElementById("pivotLoadingElementWrapper_" + this.nodeID);
    if (loadingElement) loadingElement.classList.remove("cw-hidden");
  };

  cwPivotTable.prototype.hideLoading = function () {
    //console.log("Hide loading " + this.nodeID);
    let loadingElement = document.getElementById("pivotLoadingElementWrapper_" + this.nodeID);
    if (loadingElement) loadingElement.classList.add("cw-hidden");
  };

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
