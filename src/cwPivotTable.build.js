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

  cwPivotTable.prototype.getDefaultColor = function (i) {
    let d = ["#5DA5DA", "#FAA43A", "#60BD68", "#F15854", "#4D4D4D", "#F17CB0", ",#5ddac5", "#B276B2", "#5d65da", "#ceda5d"];
    if (i > d.length - 1) return tinycolor.random().toHexString();
    return i === null ? d : d[i];
  };
  cwPivotTable.prototype.applyJavaScript = function () {
    var self = this;
    var libToLoad = [];
    if (this.init === false) {
      this.init = true;
      if (cwAPI.isDebugMode() === true) {
        self.createPivot();
      } else {
        libToLoad = [
          "modules/bootstrap/bootstrap.min.js",
          "modules/bootstrap-select/bootstrap-select.min.js",
          "modules/pivot/pivot.min.js",
          "modules/pivotPloty/pivotPloty.min.js",
          "modules/pivotjqUI/pivotjqUI.min.js",
        ];
        // AsyncLoad
        cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function (error) {
          if (error === null) {
            libToLoad = ["modules/pivotPlotyrender/pivotPlotyrender.min.js", "modules/pivotExport/pivotExport.min.js"];
            cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function (error) {
              if (error === null) {
                self.createPivot();
              } else {
                cwAPI.Log.Error(error);
              }
            });
          } else {
            cwAPI.Log.Error(error);
          }
        });
      }
    }
  };

  // Building pivot
  cwPivotTable.prototype.createPivot = function () {
    var filterContainer = document.getElementById("cwLayoutPivotFilter" + this.nodeID);

    // set height
    var titleReact = document.querySelector("#cw-top-bar");
    let topBar = document.querySelector(".page-top");
    let wrapper = document.querySelector("#cwPivotWrapper" + this.nodeID);
    let topBarHeight = 52;
    let titleReactHeight = 52;
    if (topBar) topBarHeight = topBar.getBoundingClientRect().height;
    if (titleReact) titleReactHeight = titleReact.getBoundingClientRect().height;
    let margin = this.config.enableEdit ? 60 : 10;
    var pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
    let checkIfInaDisplay = document.querySelector(".homePage_evolveView  #cwPivotWrapper" + this.nodeID);

    if (this.config.height) {
      this.canvaHeight = this.config.height;
    } else if (!checkIfInaDisplay) {
      this.canvaHeight = window.innerHeight - 95 - 2 * 3.75 * parseFloat(getComputedStyle(document.documentElement).fontSize) - margin;
    } else {
      this.canvaHeight = wrapper.offsetHeight * 0.9;
    }
    var pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
    pivotContainer.setAttribute("style", "min-height:" + this.canvaHeight + "px");
    var self = this,
      i = 0;
    this.pivotContainer = pivotContainer;
    var derivers = $.pivotUtilities.derivers;

    if (this.pivotConfiguration && this.pivotConfiguration.enableEdit) {
      var configurationFilterObject = document.createElement("div");
      configurationFilterObject.className = "LayoutPivotfilterGroup";

      var configurationFilterObjectTitle = document.createElement("div");
      configurationFilterObjectTitle.innerHTML = "Pivot Table Configuration";

      configurationFilterObject.appendChild(configurationFilterObjectTitle);
      configurationFilterObject.appendChild(this.getPivotConfigurationFilterObject("selectPivotConfiguration_" + this.nodeID));
      if (this.canUpdatePivot && document.getElementById("pivotConfigurationSaveButton_" + this.nodeID) === null) {
        var configurationFilterObjectButton = document.createElement("a");
        configurationFilterObjectButton.className = "btn page-action no-text fa fa-floppy-o";
        configurationFilterObjectButton.id = "pivotConfigurationSaveButton_" + this.nodeID;
        configurationFilterObject.appendChild(configurationFilterObjectButton);
      }
      filterContainer.appendChild(configurationFilterObject);
    }

    $(".selectPivotConfiguration_" + this.nodeID).selectpicker();
    if (this.pivotConfiguration.enableEdit && this.canCreatePivot) {
      $(".selectPivotConfiguration_" + this.nodeID)[0].children[1].children[0].appendChild(this.createAddButton());
    }

    this.renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.plotly_renderers, $.pivotUtilities.export_renderers);
    let lang = cwApi.getSelectedLanguage();
    lang = lang == "fr" || lang == "it" ? lang : "en";
    this.pivotCurrentConfiguration = {
      onRefresh: this.onRefresh.bind(self),
      renderers: this.renderers,
      rendererOptions: {
        table: {
          clickCallback: this.clickCallback.bind(this),
        },
        plotly: {
          yaxis: { fixedrange: true, automargin: true },
          xaxis: { fixedrange: true, automargin: true },
        },
        plotlyConfig: {
          displaylogo: false,
          modeBarButtonsToRemove: ["zoom2d", "pan2d", "select2d", "zoomIn2d", "zoomOut2d", "resetScale2d", "toggleSpikelines", "lasso2d"],
          clickCallback: this.clickOnPlotly.bind(this),
          getColor: this.getColor.bind(this),
          nodeID: this.nodeID,
          ui: this.config.ui,
          fontsize: this.config.fontsize,
          legend: this.config.legend,
        },
      },
      unusedAttrsVertical: !this.config.verticalDisplay,
      hiddenFromDragDrop: this.config.hiddenFromDragDrop,
      derivedAttributes: this.dataDerivers(),
      cols: this.config.cols,
      rows: this.config.rows,
      vals: this.config.vals,
      aggregatorName: this.config.aggregatorName,
      rendererName: this.config.rendererName,
      hiddenAttributes: this.config.hiddenAttributes,
      inclusions: this.getInclusions(),
      showUI: this.config.ui,
      // aggregators: {
      //    "Mean" : this.dataAggregator()
      //}
    };
    this.pivotUI = $("#cwPivotTable" + this.nodeID).pivotUI(this.PivotDatas, this.pivotCurrentConfiguration);

    this.manageButton();
    // Event for filter
    // Load a new network
    var saveButton = document.getElementById("pivotConfigurationSaveButton_" + this.nodeID);
    if (saveButton) {
      saveButton.addEventListener("click", this.saveIndexPage.bind(self));
    }
    if (self.config.enableEdit && this.config.loadFirstPivot && this.pivotConfiguration && Object.keys(this.pivotConfiguration.pivots).length > 0) {
      let startCwApiPivot = this.pivotConfiguration.pivots[Object.keys(this.pivotConfiguration.pivots)[0]];
      if (startCwApiPivot.configuration) {
        this.pivotConfiguration.selected = startCwApiPivot;
        this.loadCwApiPivot(startCwApiPivot.configuration);
        $("select.selectPivotConfiguration_" + this.nodeID).each(function (index) {
          // put values into filters
          $(this).selectpicker("val", startCwApiPivot.label); //init cwAPInetworkfilter
        });
      }
    } else {
      setTimeout(function () {
        var optionButton = document.getElementById("cwPivotButtonsOption" + self.nodeID);
        var event = {
          target: optionButton,
        };
        self.manageEventButton("Option", event, true);
        setTimeout(function () {
          self.manageEventButton("Option", event);
        }, 500);
      }, 500);
    }
  };

  cwPivotTable.prototype.onRefresh = function () {
    console.log("refresh " + this.nodeID);
    if (this.config.hideTotals === true) this.hideTotal();

    var self = this;
    let pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
    let t = document.querySelector("#cwPivotTable" + this.nodeID + " table.pvtUi");
    let t_thead = document.querySelector("#cwPivotTable" + this.nodeID + " table.pvtUi > thead");
    let renderer = document.querySelector("#cwPivotTable" + this.nodeID + " td.pvtUiCell");
    let agreg = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtVals.pvtUiCell");
    let cols = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtAxisContainer.pvtCols");
    let rows = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtAxisContainer.pvtRows");
    let filters = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtAxisContainer.pvtUnused");
    let pvtRendererArea = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRendererArea");

    t.style.width = "100%";
    if (this.config.ui) {
      if (this.config.hideColumn) this.hideColumn();
      else this.showColumn();

      if (this.config.hideRow) this.hideRow();
      else this.showRow();

      if (this.config.hideFilter) this.hideFilter();
      else this.showFilter();

      if (this.config.hideOption) {
        // this.hideOption();
        agreg.style.visibility = "hidden";
        renderer.style.visibility = "hidden";
        agreg.style.height = "0px";
        renderer.style.height = "0px";
      } else {
        //  this.showOption();
        agreg.style.visibility = "visible";
        renderer.style.visibility = "visible";
        agreg.style.height = "unset";
        renderer.style.height = "unset";
      }

      var cth = function (thead, width) {
        var th = document.createElement("th");
        th.style.width = width;
        thead.append(th);
      };
      var thead = document.createElement("thead");

      if (!self.config.verticalDisplay) {
        if (this.config.hideOption) {
          if (this.config.hideFilter) {
            cth(thead, "0px");
          } else cth(thead, "250px");
          if (this.config.hideRow) {
            cth(thead, "0px");
          } else cth(thead, "250px");
        } else {
          cth(thead, "250px");
          cth(thead, "250px");
        }
        pvtRendererArea.parentElement.style.height = this.canvaHeight - cols.offsetHeight - 80 + "px";
      } else {
        if (this.config.hideOption && this.config.hideRow) {
          cth(thead, "0px");
        } else cth(thead, "250px");
        pvtRendererArea.parentElement.style.height = this.canvaHeight - cols.offsetHeight - filters.offsetHeight + "px";
      }

      if (t_thead) t.removeChild(t_thead);
      t.insertBefore(thead, t.firstChild);
    } else {
      pvtRendererArea.parentElement.style.height = this.canvaHeight - agreg.offsetHeight + "px";
    }
    $(".pvtColLabel:contains(null)").text("");
    $(".pvtRowLabel:contains(null)").text("");

    var headers = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtAxisLabel");
    var hDataLine = {};
    var hDataCol = {};
    var self = this;

    for (let i = 0; i < headers.length; i++) {
      let h = headers[i];
      hDataLine[h.offsetLeft] = h.innerText;
      hDataCol[h.offsetTop] = h.innerText;
    }

    var table = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtTable")[0];
    let offsetright = 0;

    if (table) {
      this.valueReplacer();
      table.addEventListener("click", function (e) {
        hDataLine = {};
        hDataCol = {};
        if (e.target.className === "pvtColLabel" || e.target.className === "pvtRowLabel") {
          for (let i = 0; i < headers.length; i++) {
            let h = headers[i];
            hDataLine[h.offsetLeft] = h.innerText;
            hDataCol[h.offsetTop] = h.innerText;
          }
        }
        if (e.target.className === "pvtColLabel") {
          let lh = e.target;

          if (hDataCol[lh.offsetTop]) {
            let nodeName = hDataCol[lh.offsetTop];
            let name = lh.innerText;

            if (self.nodes[nodeName] && self.nodes[nodeName][name]) {
              var scriptname,
                popOutName,
                object = {};
              object.object_id = self.nodes[nodeName][name].id;
              scriptname = self.nodes[nodeName][name].objectTypeScriptName;
              popOutName = cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
              if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                cwApi.cwDiagramPopoutHelper.openDiagramPopout(object, popOutName);
              }
            }
          }
        }
        if (e.target.className === "pvtRowLabel") {
          let lh = e.target;
          if (hDataLine[lh.offsetLeft]) {
            let nodeName = hDataLine[lh.offsetLeft];
            let name = lh.innerText;

            if (self.nodes[nodeName] && self.nodes[nodeName][name]) {
              var scriptname,
                popOutName,
                object = {};
              object.object_id = self.nodes[nodeName][name].id;
              scriptname = self.nodes[nodeName][name].objectTypeScriptName;
              popOutName = cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
              if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                cwApi.cwDiagramPopoutHelper.openDiagramPopout(object, popOutName);
              }
            }
          }
        }
      });
    }
  };

  cwPivotTable.prototype.getColor = function (object_prop, i, valueLabel) {
    let conf;
    if (!this.propConfig) return this.getDefaultColor(i);
    if (!this.labels[object_prop]) {
      if (this.propConfig.hardcoded && this.propConfig.hardcoded[valueLabel]) {
        conf = this.propConfig.hardcoded[valueLabel];
        return conf.iconColor ? conf.iconColor : conf.valueColor;
      }
      return this.getDefaultColor(i);
    }
    let objectTypeScriptName = this.labels[object_prop].objectTypeScriptName;
    let propScriptname = this.labels[object_prop].property;
    if (this.propConfig[objectTypeScriptName] && this.propConfig[objectTypeScriptName][propScriptname]) {
      let prop = cwApi.mm.getProperty(objectTypeScriptName, propScriptname);
      if (!prop) return this.getDefaultColor(i);

      let lookupId;
      prop.lookups.forEach(function (l) {
        if (l.name === valueLabel) lookupId = l.id;
      });
      conf = this.propConfig[objectTypeScriptName][propScriptname][lookupId];
      if (lookupId && conf) {
        return conf.iconColor ? conf.iconColor : conf.valueColor;
      }
    } else if (this.propConfig.hardcoded && this.propConfig.hardcoded[valueLabel]) {
      conf = this.propConfig.hardcoded[valueLabel];
      return conf.iconColor ? conf.iconColor : conf.valueColor;
    }
    return this.getDefaultColor(i);
  };

  cwPivotTable.prototype.clickOnPlotly = function (pivotData, data) {
    let objects = [],
      self = this,
      otLabel = pivotData.valAttrs[0];
    if (!data) return;

    data.forEach(function (d) {
      if (self.nodes[otLabel][d]) {
        let object = {};
        object.object_id = self.nodes[otLabel][d].id;
        object.objectTypeScriptName = self.nodes[otLabel][d].objectTypeScriptName;
        object.name = d;
        object.properties = {
          name: d,
        };
        objects.push(object);
      }
    });

    cwAPI.customLibs.utils.createPopOutFormultipleObjects(objects);
  };
  cwPivotTable.prototype.clickCallback = function (e, value, filters, pivotData) {
    if (pivotData.aggregatorName === "List Unique Values" && this.nodes.hasOwnProperty(pivotData.valAttrs[0])) {
      if (value.indexOf(",") === -1) {
        str = value;
      } else {
        var selection = window.getSelection();
        if (!selection || selection.rangeCount < 1) return true;
        var range = selection.getRangeAt(0);
        var node = selection.anchorNode;
        var word_regexp = /^[\.A-Za-z0-9àâéêèìôùûç' _-]*$/;

        // Extend the range backward until it matches word beginning
        while (range.startOffset > 0 && range.toString().match(word_regexp)) {
          range.setStart(node, range.startOffset - 1);
        }
        // Restore the valid word match after overshooting
        if (!range.toString().match(word_regexp)) {
          range.setStart(node, range.startOffset + 1);
        }

        // Extend the range forward until it matches word ending
        while (range.endOffset < node.length && range.toString().match(word_regexp)) {
          range.setEnd(node, range.endOffset + 1);
        }
        // Restore the valid word match after overshooting
        if (!range.toString().match(word_regexp)) {
          range.setEnd(node, range.endOffset - 1);
        }

        var str = range.toString();
        if (str.charAt(0) === " ") str = str.slice(1);
      }

      if (this.nodes[pivotData.valAttrs[0]][str]) {
        var scriptname,
          popOutName,
          object = {};
        object.object_id = this.nodes[pivotData.valAttrs[0]][str].id;
        scriptname = this.nodes[pivotData.valAttrs[0]][str].objectTypeScriptName;
        popOutName = cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
        if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
          cwApi.cwDiagramPopoutHelper.openDiagramPopout(object, popOutName);
        }
      }
    }
  };

  cwPivotTable.prototype.manageButton = function (noEvent) {
    var self = this;

    var i;
    var filterButton = document.getElementById("cwPivotButtonsFilter" + this.nodeID);
    if (this.config.hideFilter === true) {
      filterButton.classList.remove("selected");
    }

    if (!noEvent) filterButton.addEventListener("click", self.manageEventButton.bind(this, "Filter"));

    var optionButton = document.getElementById("cwPivotButtonsOption" + this.nodeID);
    if (this.config.hideOption === true) {
      optionButton.classList.remove("selected");
    }
    if (!noEvent) optionButton.addEventListener("click", self.manageEventButton.bind(this, "Option"));

    var rowButton = document.getElementById("cwPivotButtonsRow" + this.nodeID);
    if (this.config.hideRow === true) {
      rowButton.classList.remove("selected");
    }
    if (!noEvent) rowButton.addEventListener("click", self.manageEventButton.bind(this, "Row"));

    var columnButton = document.getElementById("cwPivotButtonsColumn" + this.nodeID);
    if (this.config.hideColumn === true) {
      columnButton.classList.remove("selected");
    }
    if (!noEvent) columnButton.addEventListener("click", self.manageEventButton.bind(this, "Column"));

    var totalButton = document.getElementById("cwPivotButtonsTotal" + this.nodeID);
    if (this.config.hideTotals === true) {
      totalButton.classList.remove("selected");
      setTimeout(this.hideTotal, 3000);
    }
    if (!noEvent) totalButton.addEventListener("click", self.manageEventButton.bind(this, "Total"));
  };

  cwPivotTable.prototype.manageEventButton = function (buttonId, event, noRefresh) {
    if (this.config["hide" + buttonId] === false) {
      this.config["hide" + buttonId] = true;
      event.target.classList.remove("selected");
    } else {
      this.config["hide" + buttonId] = false;
      event.target.classList.add("selected");
    }
    if (!noRefresh) {
      this.pivotUI = $("#cwPivotTable" + this.nodeID).pivotUI(this.PivotDatas, this.pivotCurrentConfiguration);
      this.onRefresh();
    }
  };
  cwPivotTable.prototype.showColumn = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtCols").classList.remove("cw-hiddenByVisibility");
  };

  cwPivotTable.prototype.hideColumn = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtCols").classList.add("cw-hiddenByVisibility");
  };

  cwPivotTable.prototype.showRow = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRows").classList.remove("cw-hiddenByVisibility");
  };

  cwPivotTable.prototype.hideRow = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRows").classList.add("cw-hiddenByVisibility");
  };

  cwPivotTable.prototype.showFilter = function () {
    let f = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtUnused");
    f.style.borderWidth = "2px";
    f.style.width = "300px";
    f.classList.remove("noBackground");
    let p = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtUnused li");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.remove("cw-hidden");
      }
    }
  };

  cwPivotTable.prototype.hideFilter = function (filters) {
    let f = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtUnused");
    f.style.width = "0px";
    f.style.borderWidth = "0px";
    //f.style.display = "none";
    f.classList.add("noBackground");
    let p = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtUnused li");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.add("cw-hidden");
      }
    }
  };

  cwPivotTable.prototype.showOption = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRenderer").parentNode.classList.remove("cw-hiddenByVisibility");
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtVals.pvtUiCell").classList.remove("cw-hiddenByVisibility");
  };

  cwPivotTable.prototype.hideOption = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRenderer").parentNode.classList.add("cw-hiddenByVisibility");
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtVals.pvtUiCell").classList.add("cw-hiddenByVisibility");
  };

  cwPivotTable.prototype.showTotal = function () {
    var self = this;
    [" .pvtTotal", " .pvtTotalLabel", " .pvtGrandTotal"].forEach(function (selector) {
      let p = document.querySelectorAll("#cwPivotTable" + self.nodeID + selector);
      if (p) {
        for (i = 0; i < p.length; i++) {
          p[i].classList.remove("cw-hidden");
        }
      }
    });
  };

  cwPivotTable.prototype.hideTotal = function () {
    var self = this;
    [" .pvtTotal", " .pvtTotalLabel", " .pvtGrandTotal"].forEach(function (selector) {
      let p = document.querySelectorAll("#cwPivotTable" + self.nodeID + selector);
      if (p) {
        for (i = 0; i < p.length; i++) {
          p[i].classList.add("cw-hidden");
        }
      }
    });
  };

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
