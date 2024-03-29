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

          node.PropertiesSelected.forEach(function (s) {
            self.propertiesScriptnameList[s.toLowerCase()] = s.toLowerCase();
          });

          if (node.PropertiesSelected.indexOf(p.toUpperCase()) !== -1) {
            if (p === "name") {
              try {
                newLine[node.NodeName] = cwApi.customLibs.utils.getCustomDisplayStringWithOutHTML(
                  node.LayoutOptions.DisplayPropertyScriptName,
                  child
                );
              } catch (e) {
                newLine[node.NodeName] = value;
              }
              if (self.nodes[node.NodeName] === undefined) {
                self.nodes[node.NodeName] = {};
                self.labels[node.NodeName] = {
                  objectTypeScriptName: child.objectTypeScriptName,
                  property: "name",
                };
              }
              if (self.nodes[node.NodeName][value] === undefined) {
                self.nodes[node.NodeName][value] = {};
                self.nodes[node.NodeName][value].objectTypeScriptName = child.objectTypeScriptName;
                self.nodes[node.NodeName][value].id = child.object_id;
              }
            } else {
              let prop = cwAPI.mm.getProperty(child.objectTypeScriptName, p);

              /* value = cwApi.cwPropertiesGroups.getDisplayValue(child.objectTypeScriptName, p, value, child, "properties");
              value = value.replace(/(\<img).*(\/\>)/, "");*/
              if (prop === undefined) {
                prop = {
                  name: p,
                  type: "string",
                };
              }

              if (prop.type === "Date") {
                value = value.replace(/T[0-9]+\:[0-9]+\:[0-9]+/, "");
              }

              if (prop.type === "Boolean") {
                value = value ? $.i18n.prop("global_true") : $.i18n.prop("global_false");
              }

              if (self.config.propKPImeasure.indexOf(p) !== -1) {
                child.associations["kpi_" + p] = [
                  {
                    associations: [],
                    NodeName: self.config.kpiLabel,
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
                if (!self.labels[prop.name]) {
                  self.labels[prop.name] = {
                    objectTypeScriptName: child.objectTypeScriptName,
                    property: prop.scriptName,
                  };
                }
              } else {
                newLine[node.NodeName + "_" + prop.name] = value;
                if (prop.type === "Lookup") newLine[node.NodeName + "_" + prop.name + "_abbreviation"] = child.properties[p + "_abbreviation"];
                if (!self.labels[node.NodeName + "_" + prop.name]) {
                  self.labels[node.NodeName + "_" + prop.name] = {
                    objectTypeScriptName: child.objectTypeScriptName,
                    property: prop.scriptName,
                  };
                }
              }
            }
          }
        });

        //property deriver
        self.propertyDeriver(child).map(function (p, index) {
          if (self.config.propKPImeasure.indexOf(p.label) !== -1) {
            child.associations["kpi_" + p.label] = [
              {
                associations: [],
                NodeName: self.config.kpiLabel,
                PropertiesSelected: ["VALUE", "NAME"],
                objectTypeScriptName: "kpi",
                object_id: 42,
                properties: {
                  name: p.label,
                  Value: p.value,
                },
              },
            ];
          } else if (node.NodeName === " ") {
            newLine[p.label] = p.value;
          } else {
            newLine[node.NodeName + "_" + p.label] = p.value;
          }
        });

        if (node.IntersectionSchemaNodeId) {
          Object.keys(child.iProperties).map(function (p, index) {
            var value = child.iProperties[p];
            value = value === cwApi.getLookupUndefinedValue() ? $.i18n.prop("global_undefined") : value;
            let anode = self.viewSchema.NodesByID[node.IntersectionSchemaNodeId];
            if (anode.PropertiesSelected.indexOf(p.toUpperCase()) !== -1) {
              if (p === "name") {
                newLine[anode.NodeName] = value;
              } else {
                let prop = cwAPI.mm.getProperty(child.iObjectTypeScriptName, p);
                if (prop.type === "Boolean") {
                  value = value ? $.i18n.prop("global_true") : $.i18n.prop("global_false");
                }

                if (prop === undefined) {
                  prop = {
                    name: p,
                    type: "string",
                  };
                }
                if (node.NodeName === " ") {
                  if (prop.type === "Lookup") newLine[prop.name + "_abbreviation"] = child.properties[p + "_abbreviation"];
                  newLine[prop.name] = value;
                } else {
                  newLine[node.NodeName + "_" + prop.name] = value;
                  if (prop.type === "Lookup") newLine[node.NodeName + "_" + prop.name + "_abbreviation"] = child.properties[p + "_abbreviation"];
                }
              }
            }
          });
        }
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
    var cpyObj = $.extend(true, {}, object);
    this.originalObject = $.extend(true, {}, object);
    var assoNode = {};
    var self = this;
    // keep the node of the layout
    assoNode[this.mmNode.NodeID] = cpyObj.associations[this.mmNode.NodeID];

    // complementary node
    this.config.complementaryNode.forEach(function (nodeID) {
      if (object.associations[nodeID]) {
        assoNode[nodeID] = object.associations[nodeID];
      }
    });

    cpyObj.associations = assoNode;

    // hidden node
    this.manageHiddenNodes(cpyObj);

    // Contextual node
    if (this.config.contextualNodes) {
      Object.keys(this.config.contextualNodes).forEach(function (n) {
        cwAPI.customLibs.utils.manageContextualNodes(cpyObj.associations, [self.config.contextualNodes[n]], n);
      });
    }
    this.JSONobjects = cpyObj;

    this.simplify(this.JSONobjects, {});
    let noUI = this.config.ui ? "" : "cw-hidden";

    output.push('<div class="cwPivotWrapper ' + (this.config.ui ? "" : "noUi") + ' " id="cwPivotWrapper' + this.nodeID + '" ' + noUI + '">');

    output.push('<div class="cwPivotToolBox ' + noUI + '">');
    if (this.config.title && this.config.ui)
      output.push(
        '<div class="cw-visible cwPivotTitle" id="cwPivotTitle' + this.nodeID + '">' + this.viewSchema.NodesByID[this.nodeID].NodeName + "</div>"
      );
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
    if (cwApi.currentUser.PowerLevel === 1) {
      output.push(
        '<a class="btn page-action no-text fa fa-tasks " id="cwPivotExpertMode' + this.nodeID + '" title="' + $.i18n.prop("expertMode") + '"></a>'
      );
    }
    output.push("</div></div>");

    let vertical = this.config.verticalDisplay ? "vertical" : "";
    if (this.config.title && !this.config.ui)
      output.push(
        '<div class="cw-visible cwPivotTitle" id="cwPivotTitle' + this.nodeID + '">' + this.viewSchema.NodesByID[this.nodeID].NodeName + "</div>"
      );
    output.push('<div class="cw-visible cwPivotTable ' + vertical + '" id="cwPivotTable' + this.nodeID + '"></div>');
    output.push("</div>");
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
