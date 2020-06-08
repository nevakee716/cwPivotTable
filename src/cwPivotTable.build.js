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
          "modules/D3/d3.min.js",
          "modules/pivotC3/pivotC3.min.js",
          "modules/pivotjqUI/pivotjqUI.min.js",
        ];
        // AsyncLoad
        cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function (error) {
          if (error === null) {
            libToLoad = [
              "modules/pivotC3render/pivotC3render.min.js",
              "modules/pivotD3render/pivotD3render.min.js",
              "modules/pivotExport/pivotExport.min.js",
            ];
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

  // Building network
  cwPivotTable.prototype.createPivot = function () {
    function addStyleString(str) {
      var node = document.createElement("style");
      node.innerHTML = str;
      document.body.appendChild(node);
    }

    var filterContainer = document.getElementById("cwLayoutPivotFilter" + this.nodeID);

    // set height
    var titleReact = document.querySelector("#cw-top-bar");
    let topBar = document.querySelector(".page-top");
    let topBarHeight = 52;
    let titleReactHeight = 52;
    if (topBar) topBarHeight = topBar.getBoundingClientRect().height;
    if (titleReact) titleReactHeight = titleReact.getBoundingClientRect().height;

    this.canvaHeight = window.innerHeight - titleReactHeight - topBarHeight - 100;

    var pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
    pivotContainer.setAttribute("style", "height:" + this.canvaHeight + "px");
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

    var numberFormat = $.pivotUtilities.numberFormat;

    this.renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.plotly_renderers, $.pivotUtilities.export_renderers);
    let lang = cwApi.getSelectedLanguage();
    lang = lang == "fr" || lang == "it" ? lang : "en";

    this.pivotUI = $("#cwPivotTable" + this.nodeID).pivotUI(self.PivotDatas, {
      onRefresh: self.onRefresh.bind(self),
      renderers: self.renderers,
      rendererOptions: {
        table: {
          clickCallback: self.clickCallback.bind(self),
        },
        plotly: {
          yaxis: { fixedrange: true },
          xaxis: { fixedrange: true },
        },
        plotlyConfig: {
          displaylogo: false,
          modeBarButtonsToRemove: ["zoom2d", "pan2d", "select2d", "zoomIn2d", "zoomOut2d", "resetScale2d", "toggleSpikelines", "lasso2d"],
          clickCallback: self.clickOnPlotly.bind(self),
        },
      },
      unusedAttrsVertical: self.config.verticalDisplay === false ? false : true,
      hiddenFromDragDrop: self.config.hiddenFromDragDrop,
      derivedAttributes: self.dataDerivers(),
      cols: self.config.cols,
      rows: self.config.rows,
      vals: self.config.vals,
      aggregatorName: self.config.aggregatorName,
      rendererName: self.config.rendererName,
      hiddenAttributes: self.config.hiddenAttributes,
      inclusions: self.getInclusions(),

      // aggregators: {
      //    "Mean" : this.dataAggregator()
      //}
    });

    this.manageButton();
    // Event for filter
    // Load a new network
    $("select.selectPivotConfiguration_" + this.nodeID).on("changed.bs.select", function (e, clickedIndex, newValue, oldValue) {
      var changeSet, id, nodeId, i, config;
      var groupArray = {};
      if (clickedIndex !== undefined && $(this).context.children && $(this).context.children[clickedIndex]) {
        id = $(this).context.children[clickedIndex].id;
        if (id != 0) {
          config = self.pivotConfiguration.pivots[id].configuration;
          self.pivotConfiguration.selected = self.pivotConfiguration.pivots[id];
          self.loadCwApiPivot(config);
        }
      }
      if (cwAPI.isDebugMode() === true) console.log("pivot is set");
    });

    var saveButton = document.getElementById("pivotConfigurationSaveButton_" + this.nodeID);
    if (saveButton) {
      saveButton.addEventListener("click", this.saveIndexPage.bind(this));
    }
    if (this.config.enableEdit && this.config.loadFirstPivot && this.pivotConfiguration && Object.keys(this.pivotConfiguration.pivots).length > 0) {
      let startCwApiPivot = this.pivotConfiguration.pivots[Object.keys(this.pivotConfiguration.pivots)[0]];
      if (startCwApiPivot.configuration) {
        this.pivotConfiguration.selected = startCwApiPivot;
        this.loadCwApiPivot(startCwApiPivot.configuration);
        $("select.selectPivotConfiguration_" + this.nodeID).each(function (index) {
          // put values into filters
          $(this).selectpicker("val", startCwApiPivot.label); //init cwAPInetworkfilter
        });
      }
    }
  };

  cwPivotTable.prototype.onRefresh = function () {
    if (this.config.hideTotals === true) this.hideTotal();

    var self = this;
    let pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
    let t = document.querySelector("#cwPivotTable" + this.nodeID + " table.pvtUi");
    let col1 = document.querySelector("#cwPivotTable" + this.nodeID + " td.pvtUiCell");
    let col2 = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtVals.pvtUiCell");
    let col3 = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtAxisContainer.pvtHorizList.pvtCols.pvtUiCell");

    t.style.width = "100%";
    col3.style.width = pivotContainer.parentElement.offsetWidth - 600 + "px";

    let row3 = document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRendererArea");
    row3.parentElement.style.height = this.canvaHeight - 70 + "px";
    row3.parentElement.children.forEach((n) => (n.style.height = this.canvaHeight - 70 + "px"));

    //cwAPI.CwPopout.hide();
    var headers = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtAxisLabel");
    var hDataLine = {};
    var hDataCol = {};
    var self = this;
    let popOutOffset = document.querySelector(".page-content").offsetLeft;

    for (let i = 0; i < headers.length; i++) {
      let h = headers[i];
      hDataLine[h.offsetLeft] = h.innerText;
      hDataCol[h.offsetTop] = h.innerText;
    }

    var table = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtTable")[0];
    let offsetright = 0;

    if (table) {
      table.addEventListener("click", function (e) {
        hDataLine = {};
        hDataCol = {};
        if (e.toElement.className === "pvtColLabel" || e.toElement.className === "pvtRowLabel") {
          for (let i = 0; i < headers.length; i++) {
            let h = headers[i];
            hDataLine[h.offsetLeft] = h.innerText;
            hDataCol[h.offsetTop] = h.innerText;
          }
        }
        if (e.toElement.className === "pvtColLabel") {
          let lh = e.toElement;

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
        if (e.toElement.className === "pvtRowLabel") {
          let lh = e.toElement;
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

  cwPivotTable.prototype.manageButton = function () {
    var self = this;

    var i;
    var filterButton = document.getElementById("cwPivotButtonsFilter" + this.nodeID);
    if (this.config.hideFilter === true) {
      filterButton.classList.remove("selected");
      this.hideFilter();
    }
    filterButton.addEventListener("click", self.manageEventButton.bind(this, "Filter"));

    var optionButton = document.getElementById("cwPivotButtonsOption" + this.nodeID);
    if (this.config.hideOption === true) {
      optionButton.classList.remove("selected");
      this.hideOption();
    }
    optionButton.addEventListener("click", self.manageEventButton.bind(this, "Option"));

    var rowButton = document.getElementById("cwPivotButtonsRow" + this.nodeID);
    if (this.config.hideRow === true) {
      rowButton.classList.remove("selected");
      this.hideRow();
    }
    rowButton.addEventListener("click", self.manageEventButton.bind(this, "Row"));

    var columnButton = document.getElementById("cwPivotButtonsColumn" + this.nodeID);
    if (this.config.hideColumn === true) {
      columnButton.classList.remove("selected");
      this.hideColumn();
    }
    columnButton.addEventListener("click", self.manageEventButton.bind(this, "Column"));

    var totalButton = document.getElementById("cwPivotButtonsTotal" + this.nodeID);
    if (this.config.hideTotals === true) {
      totalButton.classList.remove("selected");
      setTimeout(this.hideTotal, 3000);
    }
    totalButton.addEventListener("click", self.manageEventButton.bind(this, "Total"));
  };

  cwPivotTable.prototype.manageEventButton = function (buttonId, event) {
    if (this.config["hide" + buttonId] === false) {
      this.config["hide" + buttonId] = true;
      event.target.classList.remove("selected");
      this["hide" + buttonId]();
    } else {
      this.config["hide" + buttonId] = false;
      event.target.classList.add("selected");
      this["show" + buttonId]();
    }
  };

  cwPivotTable.prototype.showColumn = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtCols").classList.remove("cw-hidden");
  };

  cwPivotTable.prototype.hideColumn = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtCols").classList.add("cw-hidden");
  };

  cwPivotTable.prototype.showRow = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRows").classList.remove("cw-hidden");
  };

  cwPivotTable.prototype.hideRow = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRows").classList.add("cw-hidden");
  };

  cwPivotTable.prototype.showFilter = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtUnused").style.borderWidth = "2px";
    let p = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtUnused li");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.remove("cw-hidden");
      }
    }
  };

  cwPivotTable.prototype.hideFilter = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtUnused").style.borderWidth = "0px";
    let p = document.querySelectorAll("#cwPivotTable" + this.nodeID + " .pvtUnused li");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.add("cw-hidden");
      }
    }
  };

  cwPivotTable.prototype.showOption = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRenderer").parentNode.classList.remove("cw-hidden");
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtVals.pvtUiCell").classList.remove("cw-hidden");
  };

  cwPivotTable.prototype.hideOption = function () {
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtRenderer").parentNode.classList.add("cw-hidden");
    document.querySelector("#cwPivotTable" + this.nodeID + " .pvtVals.pvtUiCell").classList.add("cw-hidden");
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
