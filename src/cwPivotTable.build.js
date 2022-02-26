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
    var pivotWrapper = document.getElementById("cwPivotWrapper" + this.nodeID);
    if (!pivotWrapper) return;
    this.createLoadingElement(pivotWrapper);
    this.displayLoading();
    if (this.init === false) {
      this.init = true;
      if (cwAPI.isDebugMode() === true) {
        self.loadDisplayLayout();
      } else {
        libToLoad = [
          "modules/bootstrap/bootstrap.min.js",
          "modules/bootstrap-select/bootstrap-select.min.js",
          "modules/pivot/pivot.min.js",
          "modules/pivotPloty/pivotPloty.min.js",
          "modules/pivotjqUI/pivotjqUI.min.js",
          "modules/jstree/jstree.min.js",
        ];
        // AsyncLoad
        cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function (error) {
          if (error === null) {
            libToLoad = ["modules/pivotPlotyrender/pivotPlotyrender.min.js", "modules/pivotExport/pivotExport.min.js"];
            cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function (error) {
              if (error === null) {
                self.loadDisplayLayout();
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

  cwPivotTable.prototype.loadDisplayLayout = function () {
    let self = this;
    let container = $("#cwPivotWrapper" + this.nodeID);
    var parentTable = container.parents("div.tab-content");
    var loaded = false;

    if (parentTable && parentTable.length === 0) {
      self.createPivot();
    } else {
      var tabHidden;
      setInterval(function () {
        tabHidden = parentTable.css("visibility") == "hidden";
        if (!tabHidden && loaded === false) {
          loaded = true;
          self.createPivot();
          console.log("load pivot " + self.nodeID);
        }
      }, 200);
    }
  };

  // Building pivot
  cwPivotTable.prototype.createPivot = function () {
    var filterContainer = document.getElementById("cwLayoutPivotFilter" + this.nodeID);
    filterContainer.innerHTML = "";

    var pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
    var parentNode = pivotContainer.parentNode;
    pivotContainer.parentNode.removeChild(pivotContainer);
    var pivotContainer = document.createElement("div");
    let vertical = this.config.verticalDisplay ? "vertical" : "";
    pivotContainer.className = "cw-visible cwPivotTable " + vertical;
    pivotContainer.id = "cwPivotTable" + this.nodeID;
    parentNode.appendChild(pivotContainer);

    $("#parent_div").html('<div id="output"></div>');
    // set height
    var titleReact = document.querySelector("#cw-top-bar");
    let topBar = document.querySelector(".page-top");
    let wrapper = document.querySelector("#cwPivotWrapper" + this.nodeID);
    let topBarHeight = 52;
    let titleReactHeight = 52;
    if (topBar) topBarHeight = topBar.getBoundingClientRect().height;
    if (titleReact) titleReactHeight = titleReact.getBoundingClientRect().height;
    let margin = this.config.enableEdit ? 60 : 10;

    let checkIfInaDisplay = document.querySelector(".homePage_evolveView  #cwPivotWrapper" + this.nodeID);

    if (this.config.height) {
      this.canvaHeight = this.config.height;
    } else if (!checkIfInaDisplay) {
      this.canvaHeight = window.innerHeight - 95 - 2 * 3.75 * parseFloat(getComputedStyle(document.documentElement).fontSize) - margin;
    } else {
      this.canvaHeight = wrapper.offsetHeight * 0.9;
    }

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
      sorters: this.getSorter(),
      exclusions: this.config.exclusions,
      inclusions: this.config.inclusions,
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
    console.log(this.config.ui);
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
          self.hideLoading();
          self.onRefresh();
        });
      } else self.hideLoading();
    } else {
      setTimeout(function () {
        var optionButton = document.getElementById("cwPivotButtonsOption" + self.nodeID);
        var event = {
          target: optionButton,
        };
        self.manageEventButton("Option", event, true);
        setTimeout(function () {
          self.manageEventButton("Option", event);
          self.hideLoading();
        }, 500);
      }, 500);
    }

    // Event for filter
    $(".selectPivotConfiguration_" + this.nodeID).on("changed.bs.select", function (e, clickedIndex, newValue, oldValue) {
      var id, config;
      if (clickedIndex !== undefined && $(this).context.children && $(this).context.children[clickedIndex]) {
        id = $(this).context.children[clickedIndex].id;
        if (id != 0) {
          config = self.pivotConfiguration.pivots[id].configuration;
          self.pivotConfiguration.selected = self.pivotConfiguration.pivots[id];
          self.loadCwApiPivot(config);

          self.onRefresh();
        }
      }
      if (cwAPI.isDebugMode() === true) console.log("PIVOT set");
    });
  };

  cwPivotTable.prototype.getSorter = function (pivotConfig) {
    let r = {};
    this.config.sorters.forEach(function (sorter) {
      r[sorter.name] = $.pivotUtilities.sortAs(sorter.array);
    });
    return r;
  };
  cwPivotTable.prototype.onRefresh = function (pivotConfig) {
    //console.log("refresh " + this.nodeID);
    if (this.config.hideTotals === true) this.hideTotal();
    if (pivotConfig) {
      this.config.cols = pivotConfig.cols;
      this.config.rows = pivotConfig.rows;
      this.config.vals = pivotConfig.vals;
      this.config.exclusions = pivotConfig.exclusions;
      this.config.aggregatorName = pivotConfig.aggregatorName;
      this.config.rendererName = pivotConfig.rendererName;
    }

    if (this.apply) this.apply();
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

    if (t) t.style.width = "100%";
    if (this.config.ui) {
      if (this.config.hideColumn) this.hideColumn();
      else this.showColumn();

      if (this.config.hideRow) this.hideRow();
      else this.showRow();

      if (this.config.hideFilter) this.hideFilter();
      else this.showFilter();

      if (this.config.hideOption) {
        this.hideOption();
      } else {
        this.showOption();
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

    // check for context
    let context;
    var isInDisplay = document.querySelector(".homePage_evolveView") ? true : false;
    if (isInDisplay) {
      let displayId = document.querySelector("#cwPivotWrapper" + self.nodeID).parentElement.parentElement.parentElement.id;
      context = cwApi.customLibs.utils.sendIndexContext(
        displayId,
        objects.map(function (o) {
          return o.object_id;
        })
      );
    }
    // use regular popout if no context
    if (!context) cwAPI.customLibs.utils.createPopOutFormultipleObjects(objects);
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

    ["Filter", "Option", "Row", "Column"].forEach(function (id) {
      var button = document.getElementById("cwPivotButtons" + id + self.nodeID);
      if (self.config["hide" + id] === true) {
        button.classList.remove("selected");
      }
      if (!noEvent) {
        button.onclick = null;
        button.onclick = self.manageEventButton.bind(self, id);
      }
    });

    var totalButton = document.getElementById("cwPivotButtonsTotal" + this.nodeID);
    if (this.config.hideTotals === true) {
      totalButton.classList.remove("selected");
      setTimeout(this.hideTotal, 3000);
    }
    if (!noEvent) {
      totalButton.onclick = null;
      totalButton.onclick = self.manageEventButton.bind(this, "Total");
    }

    var expertModeButton = document.getElementById("cwPivotExpertMode" + this.nodeID);
    if (expertModeButton) {
      expertModeButton.onclick = null;
      expertModeButton.onclick = self.manageExpertModeButton.bind(this);
    }
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

  // manage Expert Mode
  cwPivotTable.prototype.manageExpertModeButton = function (event) {
    var self = this;
    cwApi.CwAsyncLoader.load("angular", function () {
      if (self.expertMode === true) {
        self.expertMode = false;
        event.target.title = $.i18n.prop("activate_expert_mode");
        event.target.classList.remove("selected");
        cwAPI.CwPopout.hide();
      } else {
        self.expertMode = true;
        event.target.title = $.i18n.prop("deactivate_expert_mode");
        event.target.classList.add("selected");
        cwApi.CwPopout.showPopout($.i18n.prop("expert_mode"));

        cwApi.CwPopout.setContent(self.createExpertModeElement());
        self.setEventForExpertMode();
        self.selectTab("pivotTableNodes");
        self.selectTab("pivotTableNodes");
        cwApi.CwPopout.onClose(function () {
          self.expertMode = false;
          event.target.title = $.i18n.prop("activate_expert_mode");
        });
      }
    });
  };

  // manage Expert Mode
  cwPivotTable.prototype.createExpertModeElement = function () {
    var self = this;
    var tab = [];
    var tabs = ["pivotTableNodes", "PivotTable", "PivotTableSorters"]; //, "general"];
    var expertModeConfig = document.createElement("div");
    expertModeConfig.className = "cwPivotTableExpertModeConfig";
    expertModeConfig.id = "cwPivotTableExpertModeConfig" + this.nodeID;

    var cwPivotTableExpertModeContainerTab = document.createElement("div");
    cwPivotTableExpertModeContainerTab.className = "cwPivotTableExpertModeContainerTab";
    cwPivotTableExpertModeContainerTab.id = "cwPivotTableExpertModeContainerTab" + this.nodeID;
    expertModeConfig.appendChild(cwPivotTableExpertModeContainerTab);

    var expertModeContainer = document.createElement("div");
    expertModeContainer.className = "cwPivotTableExpertModeContainer";
    expertModeContainer.id = "cwPivotTableExpertModeContainer";

    var treeContainer = document.createElement("div");
    treeContainer.id = "cwPivotTableExpertModeNodesConfigTree" + this.nodeID;
    treeContainer.className = "cwPivotTableExpertModeNodesConfigTree";

    expertModeConfig.appendChild(treeContainer);
    expertModeConfig.appendChild(expertModeContainer);

    tabs.forEach(function (t) {
      let tab = document.createElement("div");
      tab.className = "cwPivotTableExpertModeTabs";
      tab.id = t;
      tab.innerText = $.i18n.prop(t);
      cwPivotTableExpertModeContainerTab.appendChild(tab);
    });
    let tabElem = document.createElement("div");
    tabElem.className = "cwPivotTableExpertModeTabs";
    tabElem.id = "saveconfiguration";
    tabElem.innerHTML = '<i class="fa fa-floppy-o" aria-hidden="true"></i>';
    cwPivotTableExpertModeContainerTab.appendChild(tabElem);

    return expertModeConfig;
  };

  cwPivotTable.prototype.selectTab = function (id) {
    var self = this,
      loader = cwApi.CwAngularLoader;
    loader.setup();

    let treeElem = document.getElementById("cwPivotTableExpertModeNodesConfigTree" + this.nodeID);
    if (id === "saveconfiguration") {
      var cpyConfig = $.extend(true, {}, this.config);
      cpyConfig.inclusions = undefined;
      cwAPI.customLibs.utils.copyToClipboard(JSON.stringify(cpyConfig));
      treeElem.style.display = "none";
    } else if (id === "PivotTable") {
      treeElem.style.display = "none";
    } else {
      treeElem.style.display = "block";
    }
    let templatePath = cwAPI.getCommonContentPath() + "/html/cwPivotTable/" + id + ".ng.html" + "?" + Math.random();
    this.unselectTabs();
    let t = document.querySelector("#" + id);
    t.className += " selected";

    var $container = $("#cwPivotTableExpertModeContainer");

    loader.loadControllerWithTemplate(t.id, $container, templatePath, function ($scope) {
      $scope.metamodel = cwAPI.mm.getMetaModel();
      $scope.config = self.config;
      $scope.cwApi = cwApi;

      $scope.toggle = function (c, e) {
        if (c.hasOwnProperty(e)) delete c[e];
        else c[e] = true;
      };

      $scope.toggleArray = function (c, e) {
        var i = c.indexOf(e);
        if (i === -1) c.push(e);
        else c.splice(i, 1);
      };
      $scope.isSelected = function (c, e) {
        var i = c.indexOf(e);
        if (i === -1) return "";
        else return "selected";
      };

      $scope.updatePivot = self.updatePivot.bind(self);

      $scope.updateSorter = function (index) {
        $scope.ng.config.sorters[index].array = $scope.ng.config.sorters[index].arrayString.split(",");
        $scope.updatePivot();
      };

      $scope.ng = {};
      $scope.ng.config = self.config;
      $scope.ng.cwAPIPivotUnfind = self.cwAPIPivotUnfind;
      $scope.ng.propertiesScriptnameList = self.propertiesScriptnameList;
      self.apply = function () {
        $scope.$apply();
      };

      if (self["controller_" + t.id] && $scope.config) self["controller_" + t.id]($container, templatePath, $scope);
    });
  };
  cwPivotTable.prototype.setEventForExpertMode = function () {
    var self = this;
    let matches = document.querySelectorAll(".cwPivotTableExpertModeTabs");
    for (let i = 0; i < matches.length; i++) {
      let t = matches[i];
      t.addEventListener("click", function (event) {
        self.selectTab(t.id);
      });
    }
  };

  cwPivotTable.prototype.unselectTabs = function (tabs) {
    let matches = document.querySelectorAll(".cwPivotTableExpertModeTabs");
    for (let i = 0; i < matches.length; i++) {
      let t = matches[i];
      t.className = t.className.replaceAll(" selected", "");
    }
  };

  cwPivotTable.prototype.bootstrapFilter = function (id, value) {
    window.setTimeout(function (params) {
      $("#" + id).selectpicker();
      $("#" + id).selectpicker("val", value);
    }, 1000);
  };

  cwPivotTable.prototype.nodeIDToFancyTree = function (node, noLoop) {
    var self = this;
    var exportNode = {};
    if (node === undefined) {
      node = this.viewSchema.NodesByID[this.nodeID];
    }
    exportNode.text = node.NodeName;
    exportNode.NodeID = node.NodeID;
    exportNode.children = [];
    exportNode.objectTypeScriptName = node.ObjectTypeScriptName;
    exportNode.SortedChildren = node.SortedChildren;
    exportNode.state = {
      opened: true,
    };

    if (noLoop !== true) {
      node.SortedChildren.forEach(function (n) {
        exportNode.children.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[n.NodeId]));
      });
    }

    return exportNode;
  };

  cwPivotTable.prototype.updatePivot = function () {
    var self = this;
    let o = $.extend(true, {}, this.originalObject);
    var assoNode = {};
    // keep the node of the layout
    assoNode[this.mmNode.NodeID] = o.associations[this.mmNode.NodeID];
    // complementary node
    this.config.complementaryNode.forEach(function (nodeID) {
      if (o.associations[nodeID]) {
        assoNode[nodeID] = o.associations[nodeID];
      }
    });
    this.PivotDatas = [];
    o.associations = assoNode;
    this.manageHiddenNodes(o);
    // Contextual node
    if (this.config.contextualNodes) {
      Object.keys(this.config.contextualNodes).forEach(function (n) {
        cwAPI.customLibs.utils.manageContextualNodes(o.associations, [self.config.contextualNodes[n]], n);
      });
    }
    this.JSONobjects = o;

    this.simplify(this.JSONobjects, {});
    this.createPivot();
  };

  cwPivotTable.prototype.controller_pivotTableNodes = function ($container, templatePath, $scope) {
    var self = this;
    $scope.treeID = "cwPivotTableExpertModeNodesConfigTree" + this.nodeID;
    $scope.optionString = {};

    $scope.updateNodeCheck = function (config, nodeId) {
      let index = self.config[config].indexOf(nodeId);
      if (index === -1) {
        self.config[config].push(nodeId);
      } else {
        self.config[config].splice(index, 1);
      }
      self.updatePivot();
    };

    $scope.updateValues = function () {
      console.log($scope.values);
      $scope.values = $scope.values.filter(function (v) {
        return !!v;
      });
    };

    var tmpsource = [],
      source = [],
      self = this;
    let q = cwApi.getQueryStringObject();
    let tab = "tab0";

    if (q.cwtabid) tab = q.cwtabid;
    if (this.viewSchema.Tab && this.viewSchema.Tab.Tabs) {
      this.viewSchema.Tab.Tabs.forEach(function (t) {
        if (t.Id === tab) {
          t.Nodes.forEach(function (n) {
            source.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[n]));
          });
        }
      });
    } else {
      self.viewSchema.RootNodesId.forEach(function (n) {
        source.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[n]));
      });
    }

    if (cwApi.isIndexPage() === false) {
      tmpsource.push(self.nodeIDToFancyTree(self.viewSchema.NodesByID[self.viewSchema.RootNodesId[0]]));
      tmpsource[0].children = source;
      source = tmpsource;
    }

    $scope.loadtree = function () {
      // define right click action on the jstree
      function contextMenu(node) {
        var items = {};
        var tree = $("#" + $scope.treeID).jstree(true);
        if (node.type !== "file") {
          items.createStep = {
            label: "Create Step",
            icon: "fa fa-plus",
            action: function (questo) {
              let newNodeID = tree.create_node(
                node,
                {
                  text: "Step",
                  parent: "node.original.NodeName",
                  type: "file",
                  NodeID: node.original.NodeID,
                  objectTypeScriptName: node.original.objectTypeScriptName,
                },
                node.children.length - node.original.SortedChildren.length
              );
              if ($scope.config.nodes[node.original.NodeID] === undefined) $scope.config.nodes[node.original.NodeID] = { steps: {} };
              $scope.config.nodes[node.original.NodeID].steps[newNodeID] = { cds: "{name}" };
            },
          };
        } else {
          items.renameStep = {
            label: "Rename Step",
            icon: "fa fa-pencil",
            action: function (obj) {
              tree.edit(node);
            },
          };
          items.deleteStep = {
            label: "Delete Step",
            icon: "fa fa-trash",
            action: function (obj) {
              tree.delete_node($(node));
              delete $scope.config.nodes[node.original.NodeID].steps[node.id];
              self.updateTimeline();
            },
          };
        }
        return items;
      }

      $(".cwPivotTableExpertModeNodesConfigTree")
        // onselect event
        .on("changed.jstree", function (e, data) {
          if (data.node && data.node.original) {
            $scope.ng.nodeID = data.node.original.NodeID;
            let node = self.viewSchema.NodesByID[$scope.ng.nodeID];
            $scope.ng.PropertiesSelected = node.PropertiesSelected.map(function (n) {
              return cwAPI.mm.getProperty(node.ObjectTypeScriptName, n);
            });
            if (data.node.type === "default") {
              $scope.ng.selectedNode = data.node.original;
              $scope.ng.selectedStep = undefined;

              $scope.$apply();
            }
          }
        })
        .jstree({
          core: {
            data: source,
            check_callback: true,
          },
          types: {
            default: {
              valid_children: ["file"],
            },
            file: {
              icon: "fa fa-cube",
              valid_children: [],
            },
          },
          plugins: ["contextmenu", "types"],
          contextmenu: {
            select_node: false,
            items: contextMenu,
          },
        });
    };
    $scope.loadtree();
  };

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
