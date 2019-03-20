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

  cwPivotTable.prototype.applyJavaScript = function() {
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
          "modules/pivotjqUI/pivotjqUI.min.js"
        ];
        // AsyncLoad
        cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function(error) {
          if (error === null) {
            libToLoad = [
              "modules/pivotC3render/pivotC3render.min.js",
              "modules/pivotD3render/pivotD3render.min.js",
              "modules/pivotExport/pivotExport.min.js"
            ];
            cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad, function(
              error
            ) {
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
  cwPivotTable.prototype.createPivot = function() {
    function addStyleString(str) {
      var node = document.createElement("style");
      node.innerHTML = str;
      document.body.appendChild(node);
    }

    var filterContainer = document.getElementById(
      "cwLayoutPivotFilter" + this.nodeID
    );

    var pivotContainer = document.getElementById("cwPivotTable" + this.nodeID);
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
      configurationFilterObject.appendChild(
        this.getPivotConfigurationFilterObject(
          "selectPivotConfiguration_" + this.nodeID
        )
      );
      if (this.canUpdatePivot) {
        var configurationFilterObjectButton = document.createElement("a");
        configurationFilterObjectButton.className =
          "btn page-action no-text fa fa-floppy-o";
        configurationFilterObjectButton.id =
          "pivotConfigurationSaveButton_" + this.nodeID;
        configurationFilterObject.appendChild(configurationFilterObjectButton);
      }
      filterContainer.appendChild(configurationFilterObject);
    }

    $(".selectPivotConfiguration_" + this.nodeID).selectpicker();
    if (this.pivotConfiguration.enableEdit && this.canCreatePivot) {
      $(
        ".selectPivotConfiguration_" + this.nodeID
      )[0].children[1].children[0].appendChild(this.createAddButton());
    }

    var numberFormat = $.pivotUtilities.numberFormat;

    this.renderers = $.extend(
      $.pivotUtilities.renderers,
      $.pivotUtilities.c3_renderers,
      $.pivotUtilities.d3_renderers,
      $.pivotUtilities.export_renderers
    );

    $("#cwPivotTable" + this.nodeID).pivotUI(self.PivotDatas, {
      onRefresh: self.onRefresh.bind(self),
      renderers: self.renderers,
      rendererOptions: {
        table: {
          clickCallback: self.clickCallback.bind(self)
        }
      },
      hiddenFromDragDrop: self.config.hiddenFromDragDrop,
      derivedAttributes: self.dataDerivers(),
      cols: self.config.cols,
      rows: self.config.rows,
      rendererName: self.config.rendererName,
      hiddenAttributes: self.config.hiddenAttributes,
      inclusions: self.getInclusions()
      // aggregators: {
      //    "Adecco Mean" : this.dataAggregator()
      //}
    });

    this.manageButton();
    // Event for filter
    // Load a new network
    $("select.selectPivotConfiguration_" + this.nodeID).on(
      "changed.bs.select",
      function(e, clickedIndex, newValue, oldValue) {
        var changeSet, id, nodeId, i, config;
        var groupArray = {};
        if (
          clickedIndex !== undefined &&
          $(this).context.hasOwnProperty(clickedIndex)
        ) {
          id = $(this).context[clickedIndex]["id"];
          if (id != 0) {
            config = self.pivotConfiguration.pivots[id].configuration;
            self.pivotConfiguration.selected =
              self.pivotConfiguration.pivots[id];
            self.loadCwApiPivot(config);
          }
        }
        if (cwAPI.isDebugMode() === true) console.log("pivot is set");
      }
    );

    var saveButton = document.getElementById(
      "pivotConfigurationSaveButton_" + this.nodeID
    );
    if (saveButton) {
      saveButton.addEventListener("click", this.saveIndexPage.bind(this));
    }
    if (
      this.config.enableEdit &&
      this.config.loadFirstPivot &&
      this.pivotConfiguration &&
      Object.keys(this.pivotConfiguration.pivots).length > 0
    ) {
      let startCwApiPivot = this.pivotConfiguration.pivots[
        Object.keys(this.pivotConfiguration.pivots)[0]
      ];
      if (startCwApiPivot.configuration) {
        this.pivotConfiguration.selected = startCwApiPivot;
        this.loadCwApiPivot(startCwApiPivot.configuration);
        $("select.selectPivotConfiguration_" + this.nodeID).each(function(
          index
        ) {
          // put values into filters
          $(this).selectpicker("val", startCwApiPivot.label); //init cwAPInetworkfilter
        });
      }
    }
  };

  cwPivotTable.prototype.onRefresh = function() {
    if (this.config.hideTotals === true) this.hideTotalsResults();

    var self = this;

    //cwAPI.CwPopout.hide();
    var headers = document.querySelectorAll(
      "#cwPivotTable" + this.nodeID + " .pvtAxisLabel"
    );
    var hDataLine = {};
    var hDataCol = {};
    var self = this;
    let popOutOffset = document.querySelector(".page-content").offsetLeft;

    for (let i = 0; i < headers.length; i++) {
      let h = headers[i];
      hDataLine[h.offsetLeft] = h.innerText;
      hDataCol[h.offsetTop] = h.innerText;
    }

    var table = document.querySelectorAll(
      "#cwPivotTable" + this.nodeID + " .pvtTable"
    )[0];
    let offsetright = 0;

    if (table) {
      table.addEventListener("click", function(e) {
        hDataLine = {};
        hDataCol = {};
        if (
          e.toElement.className === "pvtColLabel" ||
          e.toElement.className === "pvtRowLabel"
        ) {
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
              popOutName =
                cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
              if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                cwApi.cwDiagramPopoutHelper.openDiagramPopout(
                  object,
                  popOutName
                );
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
              popOutName =
                cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
              if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
                cwApi.cwDiagramPopoutHelper.openDiagramPopout(
                  object,
                  popOutName
                );
              }
            }
          }
        }
      });
    }
  };

  cwPivotTable.prototype.clickCallback = function(
    e,
    value,
    filters,
    pivotData
  ) {
    if (
      pivotData.aggregatorName === "List Unique Values" &&
      this.nodes.hasOwnProperty(pivotData.valAttrs[0])
    ) {
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
        while (
          range.endOffset < node.length &&
          range.toString().match(word_regexp)
        ) {
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
        scriptname = this.nodes[pivotData.valAttrs[0]][str]
          .objectTypeScriptName;
        popOutName =
          cwApi.replaceSpecialCharacters(scriptname) + "_diagram_popout";
        if (cwAPI.ViewSchemaManager.pageExists(popOutName) === true) {
          cwApi.cwDiagramPopoutHelper.openDiagramPopout(object, popOutName);
        }
      }
    }
  };

  cwPivotTable.prototype.manageButton = function() {
    var filterButton = document.getElementById(
      "cwPivotButtonsFilters" + this.nodeID
    );
    var self = this;

    var i;
    var filterButton = document.getElementById(
      "cwPivotButtonsFilters" + this.nodeID
    );
    if (this.config.hideFilter === true) {
      filterButton.classList.remove(selected);
      document.querySelector(".pvtAxisContainer.pvtUnused").style.visibility =
        "hidden";
    }
    filterButton.addEventListener("click", self.manageFilterButton.bind(this));

    var optionButton = document.getElementById(
      "cwPivotButtonsOptions" + this.nodeID
    );
    if (this.config.hideColumn === true) {
      optionButton.classList.remove("selected");
      this.hideFilters();
    }
    optionButton.addEventListener("click", self.manageOptionButton.bind(this));

    var totalButton = document.getElementById(
      "cwPivotButtonsTotals" + this.nodeID
    );
    if (this.config.hideTotals === true) {
      totalButton.classList.remove("selected");
      setTimeout(this.hideTotalsResults, 3000);
    }
    totalButton.addEventListener("click", self.manageTotalButton.bind(this));
  };

  cwPivotTable.prototype.manageFilterButton = function(event) {
    if (this.config.hideFilter === true) {
      this.config.hideFilter = false;
      event.target.classList.add("selected");
      document.querySelector(".pvtAxisContainer.pvtUnused").style.visibility =
        "unset";
    } else {
      this.config.hideFilter = true;
      event.target.classList.remove("selected");
      document.querySelector(".pvtAxisContainer.pvtUnused").style.visibility =
        "hidden";
    }
  };

  cwPivotTable.prototype.showFilters = function() {
    document
      .querySelector(".pvtAxisContainer.pvtRows")
      .classList.remove("cw-hidden");
    document
      .querySelector(".pvtAxisContainer.pvtHorizList")
      .classList.remove("cw-hidden");
    document.querySelector(".pvtUiCell").classList.remove("cw-hidden");
    document.querySelector(".pvtVals").classList.remove("cw-hidden");
  };

  cwPivotTable.prototype.hideFilters = function() {
    document
      .querySelector(".pvtAxisContainer.pvtRows")
      .classList.add("cw-hidden");
    document
      .querySelector(".pvtAxisContainer.pvtHorizList")
      .classList.add("cw-hidden");
    document.querySelector(".pvtUiCell").classList.add("cw-hidden");
    document.querySelector(".pvtVals").classList.add("cw-hidden");
  };

  cwPivotTable.prototype.manageOptionButton = function(event) {
    if (this.config.hideColumn === true) {
      this.config.hideColumn = false;
      event.target.classList.add("selected");
      this.showFilters();
    } else {
      this.config.hideColumn = true;
      event.target.classList.remove("selected");
      this.hideFilters();
    }
  };

  cwPivotTable.prototype.showTotalsResults = function() {
    let p = document.querySelectorAll(".pvtTotal");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.remove("cw-hidden");
      }
    }
    p = document.querySelectorAll(".pvtTotalLabel");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.remove("cw-hidden");
      }
    }
    p = document.querySelectorAll(".pvtGrandTotal");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.remove("cw-hidden");
      }
    }
  };

  cwPivotTable.prototype.hideTotalsResults = function() {
    let p = document.querySelectorAll(".pvtTotal");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.add("cw-hidden");
      }
    }
    p = document.querySelectorAll(".pvtTotalLabel");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.add("cw-hidden");
      }
    }
    p = document.querySelectorAll(".pvtGrandTotal");
    if (p) {
      for (i = 0; i < p.length; i++) {
        p[i].classList.add("cw-hidden");
      }
    }
  };

  cwPivotTable.prototype.manageTotalButton = function(event) {
    if (this.config.hideTotals === true) {
      this.config.hideTotals = false;
      event.target.classList.add("selected");
      this.showTotalsResults();
    } else {
      this.config.hideTotals = true;
      event.target.classList.remove("selected");
      this.hideTotalsResults();
    }
  };
  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
