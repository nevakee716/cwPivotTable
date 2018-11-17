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


        if(this.config.complementaryNode === undefined)  this.config.complementaryNode = [];
        if(this.config.hiddenNodes === undefined)  this.config.hiddenNodes = [];
        if(this.config.cardinalNodes === undefined)  this.config.cardinalNodes = [];
        if(this.config.cols === undefined)  this.config.cols = [];
        if(this.config.rows === undefined)  this.config.rows = [];
        if(this.config.aggregatorName === undefined)  this.config.aggregatorName = "Count";
        if(this.config.rendererName === undefined)  this.config.rendererName = "Table";
        if(this.config.hiddenAttributes === undefined)  this.config.hiddenAttributes = [];


        this.nodes = {};
        this.PivotDatas = [];

        this.definition = {};
        this.definition.capipivotScriptname = "capipivot";
        this.definition.capipivotDisplayName = "Pivot Table";
        this.definition.capipivotLabelScriptname = "label";
        this.definition.capipivotLabelDisplayName = "Libéllé";
        this.definition.capipivotToAnyAssociationScriptname = "CAPIPIVOTTOASSOPIVOTANYOBJECTTOANYOBJECT";
        this.definition.capipivotToAnyAssociationDisplayName = "Present On PivotTable";
        this.definition.capipivotCreateOnViewScriptname = "createoncwview";
        this.definition.capipivotConfigurationScriptname = "configuration";
        this.canCreatePivot = false;
        this.canUpdatePivot = false;
        this.pivotConfiguration = {};
        this.pivotConfiguration.enableEdit = this.options.CustomOptions['enableEdit'];
        this.pivotConfiguration.pivots = {}; 
        
        this.pivotConfiguration.enableEdit = true;

        try {
            this.definition.capipivotCreateOnViewDisplayName = cwAPI.mm.getProperty(this.definition.capipivotScriptname,this.definition.capipivotCreateOnViewScriptname).name;
            this.definition.capipivotConfigurationDisplayName = cwAPI.mm.getProperty(this.definition.capipivotScriptname,this.definition.capipivotConfigurationScriptname).name;

            if(cwAPI.cwUser.isCurrentUserSocial() === false && cwAPI.mm.getLookupsOnAccessRights(this.definition.capipivotScriptname,"CanCreate").length > 0) {
                this.canCreatePivot = true;
            }
            if(cwAPI.cwUser.isCurrentUserSocial() === false && cwAPI.mm.getLookupsOnAccessRights(this.definition.capipivotScriptname,"CanUpdate").length > 0) {
                this.canUpdatePivot = true;
            }
        } catch (e) {
            this.definition.capipivotCreateOnViewDisplayName = "Create on cwView";
            this.definition.capipivotConfigurationDisplayName = "Configuration";
            this.canCreatePivot = true;
            this.canUpdatePivot = true;
            console.log(e);
        }
    };



    cwApi.cwLayouts.cwPivotTable = cwPivotTable;
}(cwAPI, jQuery));