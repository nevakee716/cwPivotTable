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

  cwPivotTable.prototype.getItemDisplayString = function (item) {
    var l,
      getDisplayStringFromLayout = function (layout) {
        return layout.displayProperty.getDisplayString(item);
      };
    if (item.nodeID === this.nodeID) {
      return this.displayProperty.getDisplayString(item);
    }
    if (!this.layoutsByNodeId.hasOwnProperty(item.nodeID)) {
      if (this.viewSchema.NodesByID.hasOwnProperty(item.nodeID)) {
        var layoutOptions = this.viewSchema.NodesByID[item.nodeID].LayoutOptions;
        this.layoutsByNodeId[item.nodeID] = new cwApi.cwLayouts[item.layoutName](layoutOptions, this.viewSchema);
      } else {
        return item.name;
      }
    }
    return getDisplayStringFromLayout(this.layoutsByNodeId[item.nodeID]);
  };

  cwPivotTable.prototype.getCDSWithLink = function (item) {
    return cwAPI.getItemLinkWithName(item).replace(item.name, this.getItemDisplayString(item));
  };

  cwPivotTable.prototype.getCDSWithLinkAndPopOut = function (item) {
    let r = this.getCDSWithLink(item);
    let popOutText = '<i class="fa fa-external-link" aria-hidden="true"></i>';
    let popOutName = cwApi.replaceSpecialCharacters(item.objectTypeScriptName) + "_diagram_popout";
    if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true && cwAPI.customFunction.openDiagramPopoutWithID) {
      let popoutElement =
        ' <span class="iGanttPopOutIcon" onclick="cwAPI.customFunction.openDiagramPopoutWithID(' +
        item.object_id +
        ",'" +
        popOutName +
        "');\">" +
        popOutText +
        "</span>";
      r += popoutElement;
    }
    r = "<span>" + r + "</span>";
    return r;
  };

  cwPivotTable.prototype.parseNode = function (child, callback) {
    for (var associationNode in child.associations) {
      if (child.associations.hasOwnProperty(associationNode)) {
        for (var i = 0; i < child.associations[associationNode].length; i += 1) {
          var nextChild = child.associations[associationNode][i];
          callback(nextChild, associationNode);
        }
      }
    }
  };

  cwPivotTable.prototype.simplify = function (parent, line, cardinal) {
    var childrenArray = [];
    var filterArray = [];
    var filtersGroup = [];
    var filteredFields = [];
    var groupFilter = {};
    var element, filterElement, groupFilter;
    var child, newLine, config, node;
    var self = this;
    var l = 0;
    var addAtTheEnd,
      hasChildren = false;
    if (this.config.cardinalNodes.indexOf(parent.nodeID) !== -1) {
      cardinal = true;
      addAtTheEnd = true;
    }

    this.parseNode(parent, function (child, associationNodeID) {
      if (child.objectTypeScriptName === self.definition.capipivotScriptname && child.properties.configuration) {
        self.addPivotTable(child, parent);
      } else {
        if (cardinal !== true) newLine = $.extend(true, {}, line);
        else newLine = line;
        node = self.viewSchema.NodesByID[associationNodeID];
        node = node ? node : child;
        Object.keys(child.properties).map(function (p, index) {
          var value = child.properties[p];
          value = value === cwApi.getLookupUndefinedValue() ? $.i18n.prop("global_undefined") : value;

          if (node.PropertiesSelected.indexOf(p.toUpperCase()) !== -1) {
            if (p === "name") {
              newLine[node.NodeName] = value;

              if (self.nodes[node.NodeName] === undefined) {
                self.nodes[node.NodeName] = {};
              }
              if (self.nodes[node.NodeName][value] === undefined) {
                self.nodes[node.NodeName][value] = {};
                self.nodes[node.NodeName][value].objectTypeScriptName = child.objectTypeScriptName;
                self.nodes[node.NodeName][value].id = child.object_id;
              }
            } else {
              let prop = cwAPI.mm.getProperty(child.objectTypeScriptName, p);
              if (prop === undefined) {
                prop = {
                  name: p,
                  type: "string",
                };
              }
              if (self.config.propKPImeasure.indexOf(p) !== -1) {
                child.associations["kpi_" + p] = [
                  {
                    associations: [],
                    NodeName: "KPI",
                    PropertiesSelected: ["VALUE", "NAME"],
                    objectTypeScriptName: "kpi",
                    object_id: 42,
                    properties: {
                      name: prop.name,
                      Value: value,
                    },
                  },
                ];
              } else if (node.NodeName === " ") {
                if (prop.type === "Lookup") newLine[prop.name + "_abbreviation"] = child.properties[p + "_abbreviation"];
                newLine[prop.name] = value;
              } else {
                newLine[node.NodeName + "_" + prop.name] = value;
                if (prop.type === "Lookup") newLine[node.NodeName + "_" + prop.name + "_abbreviation"] = child.properties[p + "_abbreviation"];
              }
            }
          }
        });
        hasChildren = true;

        if (self.simplify(child, newLine, cardinal) === false && cardinal !== true) {
          self.PivotDatas.push(newLine);
        }
      }
    });

    if (addAtTheEnd) {
      self.PivotDatas.push(line);
    }
    return hasChildren;
  };

  cwPivotTable.prototype.multiLine = function (name, size) {
    if (size !== "" && size > 0) {
      var nameSplit = name.split(" ");
      var carry = 0;
      var multiLineName = "";
      for (var i = 0; i < nameSplit.length - 1; i += 1) {
        if (nameSplit[i].length > size || carry + nameSplit[i].length > size) {
          multiLineName += nameSplit[i] + "\n";
          carry = 0;
        } else {
          carry += nameSplit[i].length + 1;
          multiLineName += nameSplit[i] + " ";
        }
      }
      multiLineName = multiLineName + nameSplit[nameSplit.length - 1];

      return multiLineName;
    } else {
      return name;
    }
  };

  // obligatoire appeler par le system
  cwPivotTable.prototype.drawAssociations = function (output, associationTitleText, object) {
    var cpyObj = $.extend({}, object);
    var assoNode = {};

    this.originalObject = $.extend({}, object);
    var simplifyObject,
      i,
      assoNode = {},
      isData = false;
    // keep the node of the layout
    assoNode[this.mmNode.NodeID] = object.associations[this.mmNode.NodeID];

    // complementary node
    this.config.complementaryNode.forEach(function (nodeID) {
      if (object.associations[nodeID]) {
        assoNode[nodeID] = object.associations[nodeID];
      }
    });

    cpyObj.associations = assoNode;

    // hidden node
    this.manageHiddenNodes(cpyObj);

    this.JSONobjects = cpyObj;
    this.simplify(this.JSONobjects, {});

    output.push('<div class="cwPivotToolBox">');
    output.push('<div class="cw-visible" id="cwLayoutPivotFilter' + this.nodeID + '"></div>');
    output.push('<div class="cwPivotToolBoxButton" id="cwPivotToolBox' + this.nodeID + '">');
    output.push(
      '<a class="btn page-action no-text fa fa-filter selected" id="cwPivotButtonsFilter' +
        this.nodeID +
        '" title="' +
        $.i18n.prop("filter") +
        '"></a>'
    );
    output.push(
      '<a class="btn page-action no-text fa fa-cogs selected" id="cwPivotButtonsOption' +
        this.nodeID +
        '" title="' +
        $.i18n.prop("option") +
        '"></i></a>'
    );
    output.push(
      '<a class="btn page-action no-text fa fa-ellipsis-v selected" id="cwPivotButtonsColumn' +
        this.nodeID +
        '" title="' +
        $.i18n.prop("column") +
        '"></i></a>'
    );
    output.push(
      '<a class="btn page-action no-text fa fa-ellipsis-h selected" id="cwPivotButtonsRow' +
        this.nodeID +
        '" title="' +
        $.i18n.prop("rows") +
        '"></i></a>'
    );
    output.push(
      '<a class="btn page-action no-text fa fa-stack-overflow selected" id="cwPivotButtonsTotal' +
        this.nodeID +
        '" title="' +
        $.i18n.prop("totals") +
        '"></a>'
    );
    output.push("</div></div>");

    output.push('<div class="cw-visible" id="cwPivotTable' + this.nodeID + '"></div>');
  };

  cwPivotTable.prototype.manageHiddenNodes = function (parent) {
    var childrenToRemove = [];
    var self = this;

    this.parseNode(parent, function (child, associationNode) {
      if (self.config.hiddenNodes.indexOf(associationNode) !== -1) {
        // jumpAndMerge when hidden
        childrenToRemove.push(associationNode);
        for (var nextassociationNode in child.associations) {
          if (child.associations.hasOwnProperty(nextassociationNode)) {
            if (!parent.associations.hasOwnProperty(nextassociationNode)) parent.associations[nextassociationNode] = [];

            for (var i = 0; i < child.associations[nextassociationNode].length; i += 1) {
              var nextChild = child.associations[nextassociationNode][i];
              parent.associations[nextassociationNode].push(nextChild);
            }
          }
        }
      } else {
        self.manageHiddenNodes(child);
      }
    });

    childrenToRemove.forEach(function (c) {
      delete parent.associations[c];
    });
  };

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
