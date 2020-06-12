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

  cwPivotTable.prototype.addPivotTable = function (pivot, father) {
    if (this.pivotConfiguration === undefined) {
      this.pivotConfiguration = {};
      this.pivotConfiguration.selected = {};
      this.pivotConfiguration.pivots = {};
    }
    if (this.pivotConfiguration.pivots[pivot.object_id] === undefined) {
      this.pivotConfiguration.pivots[pivot.object_id] = {};
      this.pivotConfiguration.pivots[pivot.object_id].label = pivot.properties[this.definition.capipivotLabelScriptname];
      this.pivotConfiguration.pivots[pivot.object_id].configuration = JSON.parse(pivot.properties.configuration.replaceAll("\\", ""));
      this.pivotConfiguration.pivots[pivot.object_id].obj = pivot;
      if (!cwAPI.isIndexPage()) {
        pivot.associations = {};
        pivot.associations[this.nodeID] = {};
        pivot.associations[this.nodeID].associationScriptName = this.definition.capipivotToAnyAssociationScriptname;
        pivot.associations[this.nodeID].displayName = this.definition.capipivotToAnyAssociationDisplayName;
        pivot.associations[this.nodeID].items = [];
        pivot.associations[this.nodeID].nodeId = this.nodeID;
      }
    }
    var newItem = {};
    newItem.name = father.name;
    newItem.intersectionObjectUID = pivot.iProperties.uniqueidentifier;
    newItem.targetObjectID = father.object_id;
    newItem.isNew = "false";
    newItem.targetObjectTypeScriptName = father.objectTypeScriptName;
    if (!cwAPI.isIndexPage()) this.pivotConfiguration.pivots[pivot.object_id].obj.associations[this.nodeID].items.push(newItem);
  };

  cwPivotTable.prototype.getPivotConfigurationFilterObject = function (classname) {
    var filterObject;
    var object;
    var id;

    let wrapperObject = document.createElement("span");
    wrapperObject.className = "bootstrap-iso";

    filterObject = document.createElement("select");
    filterObject.setAttribute("data-live-search", "true");
    filterObject.setAttribute("data-size", "5");

    filterObject.className = classname + " Pivot";
    filterObject.setAttribute("filterName", "Pivot Table");

    object = document.createElement("option");
    object.setAttribute("id", 0);
    object.textContent = "None";
    filterObject.appendChild(object);

    var array = [];
    for (id in this.pivotConfiguration.pivots) {
      if (this.pivotConfiguration.pivots.hasOwnProperty(id)) {
        var element = {};
        element.id = id;
        element.label = this.pivotConfiguration.pivots[id].label;
        array.push(element);
      }
    }
    array.sort(function (a, b) {
      var nameA = a.label.toLowerCase(),
        nameB = b.label.toLowerCase();
      if (nameA < nameB)
        //sort string ascending
        return -1;
      if (nameA > nameB) return 1;
      return 0; //default return value (no sorting)
    });

    array.forEach(function (element) {
      object = document.createElement("option");
      object.setAttribute("id", element.id);
      object.textContent = element.label;
      filterObject.appendChild(object);
    });

    wrapperObject.appendChild(filterObject);
    return wrapperObject;
  };

  cwPivotTable.prototype.addEventOnSave = function () {
    var buttonSave = document.getElementsByClassName("cw-edit-mode-button-edit")[0];
    if (buttonSave) {
      buttonSave.addEventListener("click", this.createChangeset.bind(this), false);
    }
  };

  cwPivotTable.prototype.createAddButton = function () {
    var buttonAdd = document.createElement("a");
    buttonAdd.className = "pivotAddButton fa fa-2x fa-plus-circle";
    buttonAdd.addEventListener("click", this.createChangesetWithCreation.bind(this), false);
    return buttonAdd;
  };

  cwPivotTable.prototype.saveIndexPage = function () {
    this.directSave(this.pivotConfiguration.selected.obj);
  };

  cwPivotTable.prototype.createChangeset = function () {
    this.indirectSave();
  };

  cwPivotTable.prototype.createChangesetWithCreation = function (event) {
    var networkName;
    if (
      event.currentTarget.parentElement &&
      event.currentTarget.parentElement.firstElementChild &&
      event.currentTarget.parentElement.firstElementChild.value !== ""
    ) {
      this.directSaveNewNetwork(event.currentTarget.parentElement.firstElementChild.value);
    }
  };

  cwPivotTable.prototype.getConfigurationAndAssociationObjectToPivot = function (newObj, label) {
    var linkTypeLabels,
      nodes,
      config,
      positions,
      newAssoItems = [],
      newAssoItemsObj = {},
      self = this;
    newObj.displayNames = {};
    newObj.displayNames[this.definition.capipivotConfigurationScriptname] = this.definition.capipivotConfigurationDisplayName;
    newObj.displayNames[this.definition.capipivotCreateOnViewScriptname] = this.definition.capipivotCreateOnViewDisplayName;
    newObj.displayNames[this.definition.capipivotLabelScriptname] = this.definition.capipivotLabelDisplayName;

    var nodes, config, positions;
    config = $("#cwPivotTable" + this.nodeID).data("pivotUIOptions");
    var config_copy = JSON.parse(JSON.stringify(config));
    //delete some values which will not serialize to JSON
    delete config_copy["aggregators"];
    delete config_copy["renderers"];

    newObj.properties[this.definition.capipivotConfigurationScriptname] = JSON.stringify(config_copy);

    var view = cwAPI.getCurrentView();
    if (view && view.cwView) {
      view = view.cwView;
    }

    newObj.properties[this.definition.capipivotCreateOnViewScriptname] = view + "." + this.nodeID;

    newObj.properties[this.definition.capipivotLabelScriptname] = label;

    newObj.properties["name"] = view + "." + this.nodeID + " => " + label;

    if (!cwAPI.isIndexPage()) {
      if (newObj.associations) {
        newObj.associations[this.nodeID].items.forEach(function (item) {
          newAssoItemsObj[item.targetObjectID + item.targetObjectTypeScriptName] = item;
        });
      } else {
        newAssoItems = [];
        newObj.associations = {};
        newObj.associations[this.nodeID] = {};
      }
      newObj.associations[this.nodeID].items = [];

      var assoItem = {};
      assoItem.name = this.originalObject.name;
      assoItem.intersectionObjectUID = "";
      assoItem.isNew = "false";
      assoItem.targetObjectTypeScriptName = this.originalObject.objectTypeScriptName;
      assoItem.targetObjectID = this.originalObject.object_id;
      newObj.associations[this.nodeID].items.push(assoItem);
    }

    return config;
  };

  cwPivotTable.prototype.directSaveNewNetwork = function (pivotName) {
    var newObj = {};
    var newNewObj = {};
    var self = this;
    var config;
    newObj.properties = {};
    config = this.getConfigurationAndAssociationObjectToPivot(newObj, pivotName);
    var asso = $.extend(true, {}, newObj.associations);
    newObj.associations = {};
    newNewObj = $.extend(true, {}, newObj);
    newNewObj.associations = asso;

    cwAPI.CwEditSave.setPopoutContentForGrid(
      cwApi.CwPendingChangeset.ActionType.Create,
      null,
      newObj,
      0,
      this.definition.capipivotScriptname,
      function (elem) {
        if (elem && elem.status == "Ok") {
          if (!cwAPI.isIndexPage()) {
            newObj.associations[self.nodeID] = {};
            newObj.associations[self.nodeID].items = [];
            newObj.associations[self.nodeID].associationScriptName = self.definition.capipivotToAnyAssociationScriptname;

            newObj.object_id = elem.id;
            newNewObj.object_id = elem.id;
            cwAPI.CwEditSave.setPopoutContentForGrid(
              cwApi.CwPendingChangeset.ActionType.Update,
              newObj,
              newNewObj,
              newObj.object_id,
              self.definition.capipivotScriptname,
              function (response) {
                if (!cwApi.statusIsKo(response)) {
                  self.createdSaveObjFromReponse(newNewObj, response, pivotName, config);

                  var html = '<option id="' + response.id + '">' + pivotName + "</>";
                  $(".selectPivotConfiguration_" + self.nodeID)
                    .append(html)
                    .selectpicker("refresh");

                  $("div.selectPivotConfiguration_" + self.nodeID + " > option").remove();
                  $(".selectPivotConfiguration_" + self.nodeID)
                    .val(pivotName)
                    .selectpicker("refresh");
                }
              }
            );
          } else {
            self.pivotConfiguration.pivots[elem.id] = {};
            self.pivotConfiguration.pivots[elem.id].obj = newNewObj;
            self.pivotConfiguration.pivots[elem.id].label = pivotName;
            self.pivotConfiguration.pivots[elem.id].configuration = config;
            self.pivotConfiguration.selected = self.pivotConfiguration.pivots[elem.id];

            var html = '<option id="' + elem.id + '">' + pivotName + "</>";
            $(".selectPivotConfiguration_" + self.nodeID)
              .append(html)
              .selectpicker("refresh");

            $("div.selectPivotConfiguration_" + self.nodeID + " > option").remove();
            $(".selectPivotConfiguration_" + self.nodeID)
              .val(pivotName)
              .selectpicker("refresh");
          }
        }
      }
    );
  };

  cwPivotTable.prototype.createdSaveObjFromReponse = function (obj, response, pivotName, config) {
    var r,
      self = this;

    this.pivotConfiguration.pivots[response.id] = {};
    this.pivotConfiguration.pivots[response.id].configuration = config;
    obj.objectTypeScriptName = this.definition.capipivotScriptname;
    obj.name = pivotName;

    var targetId,
      targetIds = {};
    for (var i in response.intersectionObjectProperties) {
      if (response.intersectionObjectProperties.hasOwnProperty(i)) {
        r = response.intersectionObjectProperties[i];
        if (targetIds[r.targetObjectID]) {
          window.location.reload();
        } else {
          targetIds[r.targetObjectID] = true;
        }
        var isPresent = false;
        obj.associations[self.nodeID].items.forEach(function (n) {
          if (r.targetObjectID === n.targetObjectID) {
            isPresent = true;
            n.intersectionObjectUID = r.uid;
          }
        });
      }
    }
    if (!cwAPI.isIndexPage()) {
      obj.associations[this.nodeID].associationScriptName = this.definition.capipivotToAnyAssociationScriptname;
      obj.associations[this.nodeID].displayName = this.definition.capipivotToAnyAssociationDisplayName;
      obj.associations[this.nodeID].nodeID = self.nodeID;
    }

    this.pivotConfiguration.pivots[response.id].obj = obj;
    this.pivotConfiguration.pivots[response.id].label = pivotName;
    this.pivotConfiguration.selected = this.pivotConfiguration.pivots[response.id];
  };

  cwPivotTable.prototype.directSave = function (oldObj) {
    var config, changeset, newObj;
    var self = this;
    changeset = new cwApi.CwPendingChangeset(oldObj.objectTypeScriptName, oldObj.object_id, oldObj.name, true, 1);
    newObj = $.extend(true, {}, oldObj);

    config = this.getConfigurationAndAssociationObjectToPivot(newObj, oldObj.properties[this.definition.capipivotLabelScriptname]);
    //changeset.compareAndAddChanges(oldObj, newObj);

    cwAPI.CwEditSave.setPopoutContentForGrid(
      cwApi.CwPendingChangeset.ActionType.Update,
      oldObj,
      newObj,
      oldObj.object_id,
      oldObj.objectTypeScriptName,
      function (response) {
        if (!cwApi.statusIsKo(response)) {
          self.createdSaveObjFromReponse(newObj, response, newObj.properties["name"], config);
        }
      }
    );
  };

  cwPivotTable.prototype.loadCwApiPivot = function (config) {
    var self = this;
    config.onRefresh = self.onRefresh.bind(self);
    config.renderers = self.renderers;
    config.rendererOptions = {
      table: {
        clickCallback: self.clickCallback.bind(self),
      },
      plotly: {
        yaxis: { fixedrange: true, automargin: true },
        xaxis: { fixedrange: true, automargin: true },
      },
      plotlyConfig: {
        displaylogo: false,
        modeBarButtonsToRemove: ["zoom2d", "pan2d", "select2d", "zoomIn2d", "zoomOut2d", "resetScale2d", "toggleSpikelines", "lasso2d"],
        clickCallback: self.clickOnPlotly.bind(self),
      },
    };
    config.showUI = this.config.ui;
    config.unusedAttrsVertical = !self.config.verticalDisplay;
    config.derivedAttributes = self.dataDerivers();
    config.hiddenFromDragDrop = self.config.hiddenFromDragDrop;
    config.hiddenAttributes = self.config.hiddenAttributes;
    delete config.aggregators;

    $("#cwPivotTable" + this.nodeID).pivotUI(this.PivotDatas, config, true);
    $("#cwPivotTable" + this.nodeID).pivotUI(this.PivotDatas, config, true);
    this.manageButton(true);
  };

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
