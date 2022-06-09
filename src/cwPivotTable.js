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

  cwPivotTable.prototype.getCapipivotScriptnames = function () {
    this.definition = {};
    this.definition.capipivotScriptname = "capipivot";
    this.definition.capipivotDisplayName = "Pivot Table";
    this.definition.capipivotLabelScriptname = "label";
    this.definition.capipivotLabelDisplayName = "Libéllé";
    this.definition.capipivotToAnyAssociationScriptname = "CAPIPIVOTTOASSOPIVOTANYOBJECTTOANYOBJECT";
    this.definition.capipivotToAnyAssociationDisplayName = "Present On PivotTable";
    this.definition.capipivotCreateOnViewScriptname = "createoncwview";
    this.definition.capipivotConfigurationScriptname = "configuration";
  };

  cwPivotTable.prototype.construct = function (options) {
    this.init = false;
    this.config = JSON.parse(this.options.CustomOptions["JsonConfiguration"]);
    if (this.config.hideFilter === undefined) this.config.hideFilter = false;
    if (this.config.hideOption === undefined) this.config.hideOption = false;
    if (this.config.hideRow === undefined) this.config.hideRow = false;
    if (this.config.hideColumn === undefined) this.config.hideColumn = false;
    if (this.config.hideTotals === undefined) this.config.hideTotals = false;

    if (this.config.complementaryNode === undefined) this.config.complementaryNode = [];
    if (this.config.hiddenNodes === undefined) this.config.hiddenNodes = [];
    if (this.config.cardinalNodes === undefined) this.config.cardinalNodes = [];
    if (this.config.cols === undefined) this.config.cols = [];
    if (this.config.rows === undefined) this.config.rows = [];
    if (this.config.exclusions === undefined) this.config.exclusions = [];
    if (this.config.inclusions === undefined) this.config.inclusions = [];
    if (this.config.aggregatorName === undefined) this.config.aggregatorName = "Count";
    if (this.config.rendererName === undefined) this.config.rendererName = "Table";
    if (this.config.hiddenAttributes === undefined) this.config.hiddenAttributes = [];
    if (this.config.propKPImeasure === undefined) this.config.propKPImeasure = [];
    if (this.config.kpiLabel === undefined) this.config.kpiLabel = "Kpi";
    if (this.config.ui === undefined) this.config.ui = true;
    if (this.config.verticalDisplay === undefined) this.config.verticalDisplay = false;
    if (this.config.title === undefined) this.config.title = false;
    if (this.config.fontsize === undefined) this.config.fontsize = null;
    if (this.config.height === undefined) this.config.height = null;
    if (this.config.legend === undefined) this.config.legend = true;
    if (this.config.displayPercent === undefined) this.config.displayPercent = true;

    if (this.config.sorters === undefined) this.config.sorters = [];

    this.propertiesScriptnameList = {};
    this.getCapipivotScriptnames();
    this.nodes = {};
    this.PivotDatas = [];

    if (cwAPI.customLibs.utils && cwAPI.customLibs.utils.getCustomLayoutConfiguration) {
      this.propConfig = cwAPI.customLibs.utils.getCustomLayoutConfiguration("property");
      if (this.propConfig && this.propConfig.hardcoded && this.propConfig.hardcoded.length > 0) {
        let c = this.propConfig.hardcoded;
        this.propConfig.hardcoded = {};
        let self = this;
        c.forEach(function (cc) {
          self.propConfig.hardcoded[cc.value] = cc;
        });
      }
    }

    this.canCreatePivot = false;
    this.canUpdatePivot = false;
    this.pivotConfiguration = {};
    this.pivotConfiguration.enableEdit = this.config.enableEdit;
    this.pivotConfiguration.pivots = {};

    this.labels = {};
    try {
      this.definition.capipivotCreateOnViewDisplayName = cwAPI.mm.getProperty(
        this.definition.capipivotScriptname,
        this.definition.capipivotCreateOnViewScriptname
      ).name;
      this.definition.capipivotConfigurationDisplayName = cwAPI.mm.getProperty(
        this.definition.capipivotScriptname,
        this.definition.capipivotConfigurationScriptname
      ).name;

      if (
        cwAPI.cwUser.isCurrentUserSocial() === false &&
        cwAPI.mm.getLookupsOnAccessRights(this.definition.capipivotScriptname, "CanCreate").length > 0
      ) {
        this.canCreatePivot = true;
      }
      if (
        cwAPI.cwUser.isCurrentUserSocial() === false &&
        cwAPI.mm.getLookupsOnAccessRights(this.definition.capipivotScriptname, "CanUpdate").length > 0
      ) {
        this.canUpdatePivot = true;
      }
    } catch (e) {
      this.cwAPIPivotUnfind = true;
      this.definition.capipivotCreateOnViewDisplayName = "";
      this.definition.capipivotConfigurationDisplayName = "";
      console.debug(e);
    }
  };

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
