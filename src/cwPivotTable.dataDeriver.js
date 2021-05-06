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

  var replaceTable = {
    "R   ":
      '<img style="width:20px; heigth:20px;" src="https://static8.depositphotos.com/1338574/829/i/950/depositphotos_8293005-stock-photo-the-letter-r-in-gold.jpg">',
  };
  cwPivotTable.prototype.valueReplacer = function () {
    Object.keys(replaceTable).forEach(function (dv) {
      document.querySelectorAll(".pvtTable .pvtVal[data-value='" + dv + "']").forEach(function (e) {
        e.innerHTML = replaceTable[dv];
      });
    });
  };

  cwPivotTable.prototype.dataDerivers = function () {
    var derivedAttributes = {};
    var view = cwAPI.getCurrentView();
    if (view) view = view.cwView;
    else return {};

    if (view.indexOf("index_customers_pivot") !== -1) {
      derivedAttributes["Month"] = $.pivotUtilities.derivers.dateFormat("Time Entry_Start Date", "%m", true);
      derivedAttributes["Year"] = $.pivotUtilities.derivers.dateFormat("Time Entry_Start Date", "%y", true);
      derivedAttributes["Time Entry Date"] = $.pivotUtilities.derivers.dateFormat("Time Entry_Start Date", "%d/%m/%y", true);
      derivedAttributes["Week Number"] = function (record) {
        var d = new Date(record["Time Entry_Start Date"]);
        return d.getWeekNumber();
      };
    }

    if (view.indexOf("process_pivot") !== -1) {
      derivedAttributes["RACI"] = function (record) {
        return (
          (record["Role_R - Réalise"] == $.i18n.prop("global_true") ? "R" : "") +
          " " +
          (record["Role_A - sous l'Autorité de"] == $.i18n.prop("global_true") ? "A" : "") +
          " " +
          (record["Role_C - Consulté"] == $.i18n.prop("global_true") ? "C" : "") +
          " " +
          (record["Role_I - Informé"] == $.i18n.prop("global_true") ? "I" : "")
        );
      };
    }

    if (view.indexOf("index_g11_regions") !== -1) {
      derivedAttributes["Critical solution (%)"] = function (record) {
        return Math.round(record["Critical solution percentage"] * 100) + "%";
      };
      derivedAttributes["Critical solutions at risk (%)"] = function (record) {
        return Math.round(record["Critical solutions at risk percentage"] * 100) + "%";
      };
      derivedAttributes["Date"] = function (record) {
        return record["Year"] + "/" + record["Month number"];
      };
    }

    Date.prototype.getWeekNumber = function () {
      var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
      var dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    return derivedAttributes;
  };

  cwPivotTable.prototype.getInclusions = function () {
    if (this.config.inclusions === undefined) this.config.inclusions = {};

    if (this.config.currentDateFilter !== undefined) {
      let d = new Date();
      for (let i in this.config.currentDateFilter) {
        this.config.inclusions[this.config.currentDateFilter[i]] = [d.getFullYear() + "/" + d.getMonth()];
      }
    }
    return this.config.inclusions;
  };
  cwPivotTable.prototype.dataAggregator = function () {
    var dataAggregator = {};
    var view = cwAPI.getCurrentView();
    if (view) view = view.cwView;
    else return {};

    if (view.indexOf("index_processus_pivot") !== -1) {
      dataAggregator["Macro Process Count"] = function (record) {
        var d = new Date(record["Time Entry_Start Date"]);
        return d.getWeekNumber();
      };
    }

    var mean = function () {
      return function (a, b, c) {
        var c = {};

        if (a && a.valAttrs && a.valAttrs.length > 0) {
          var countAttribute = a.valAttrs[0];
          var countAttributeOn = a.valAttrs[1];
          var sumAttribute = a.valAttrs[2];

          a.input.forEach(function (l) {
            if (l[countAttributeOn] && l[countAttribute]) {
              if (c[l[countAttributeOn]] === undefined) c[l[countAttributeOn]] = [l[countAttribute]];
              else {
                if (c[l[countAttributeOn]].indexOf(l[countAttribute]) === -1) c[l[countAttributeOn]].push(l[countAttribute]);
              }
            }
          });
        }

        return {
          sum: 0,
          mp: "",
          push: function (record) {
            if (!isNaN(parseFloat(record[sumAttribute]))) {
              this.sum += record[sumAttribute];
            }
            if (record[countAttributeOn]) {
              this.mp = record[countAttributeOn];
            }
          },
          value: function () {
            if (c[this.mp]) return this.sum / c[this.mp].length;
          },
          format: function (x) {
            return x;
          },
          numInputs: 3,
        };
      };
    };

    return mean;
  };

  // Building network

  cwApi.cwLayouts.cwPivotTable = cwPivotTable;
})(cwAPI, jQuery);
