| **Name** | **Pivot Table** | **Version** | 
| --- | --- | --- |
| **Updated by** | Mathias PFAUWADEL | 1.0 |


## Patch Notes

* 1.0 : 1st version working

## To be Done

* More Options
* Add Translations i18n like Data/Common/i18n


## Description 
Allow you to display your item and their associations (n-lvl) in a pivot table, filter, choose your pivot ordering and display bar chart, line piechat... and also export un tsv

## Screen Shot
The layout will scan all of your hierarchy tree, and put it in the pivot table

<img src="https://raw.githubusercontent.com/nevakee716/cwPivotTable/master/screen/1.jpg" alt="Drawing" style="width: 95%;"/>

## Custom Display String Enhanced

The Custom Display String is not compatible yet

## Node setup

<img src="https://raw.githubusercontent.com/nevakee716/cwGantt/master/screen/2.jpg" alt="Drawing" style="width: 95%;"/>

## Options in the evolve Designer

### Json Configuration : 

Describe your configuration in a json object, then mimify it on https://www.cleancss.com/json-minify/

Here is an exemple of a json configuration.

```
        {
            complementaryNode : [],
            hiddenNodes : [],
            cardinalNodes : [],
            cols : [],
            rows : [],
            rendererName : "Table",
            hiddenAttributes : [],
            aggregatorName : "Count"
        };
```


### Complementary Node 

Side way node to add in an objectPage

### Hidden Nodes : 

Make a jump and merge on these node
            

### Cardinal Nodes : 

Association of these nodes will be consider as property and it will be assume that they have only object associate

### cols

Label of the column you want to load at the beginning

### rows

Label of the rows you want to load at the beginning

### rendererName 

Name of the renderer you want to use at the beginning by default it's table

### Hidden Attribute

If you want to hide some Attribute put their label in the option

### Aggregator Name

Put the initial aggregator by default it's count
         
## Data Deriver

You can create some data deriver, if you want for exemple take only the month of a date
you need to modify the file cwPivotTable.dataDeriver.js

This required some javascript knowledge please ask a consultant