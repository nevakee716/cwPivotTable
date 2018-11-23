| **Name** | **Pivot Table** | **Version** | 
| --- | --- | --- |
| **Updated by** | Mathias PFAUWADEL | 2.0 |


## Patch Notes

* 2.0 : 1st version working

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

<img src="https://raw.githubusercontent.com/nevakee716/cwPivotTable/master/screen/2.jpg" alt="Drawing" style="width: 95%;"/>

## Options in the evolve Designer

### Json Configuration : 

Describe your configuration in a json object, then mimify it on https://www.cleancss.com/json-minify/

Here is an exemple of a json configuration.

```
{
            "complementaryNode" : [],
            "hiddenNodes" : [],
            "cardinalNodes" : [],
            "cols" : [],
            "rows" : [],
            "rendererName" : "Table",
            "hiddenAttributes" : [],
            "aggregatorName" : "Count",
            "enableEdit" : true,
            "loadFirstPivot" : true
}
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
         
## Enable Edit

You can load Pivot Table Analysis (cols,rows, aggregator, filters ...)
Contributor only can save or create a pivot Table. 

<img src="https://raw.githubusercontent.com/nevakee716/cwPivotTable/master/screen/pivotEdit1.jpg" alt="Drawing" style="width: 95%;"/>

When you create a new Pivot Table Analysis, it will create a new object and associate it with the object of your objectPage.

To use this option you need to have your metamodel ready : 
Create a new objectType : CW API Pivot with 3 properties : Configuration (memoText), Label (string) and Create On View (string)
Create also an association between CW API Pivot and Any Objects
Inside C:\Casewise\Evolve\Site\bin\webDesigner\custom\Marketplace\libs\cwPivotTable\src\pivotEdit2.js
Fill theses variable with the scriptname of your model 

<img src="https://raw.githubusercontent.com/nevakee716/cwPivotTable/master/screen/pivotEdit3.jpg" alt="Drawing" style="width: 95%;"/>

Inside your evolve configuration 
You need to put the association to Cw API Pivot to the main object if you are on an objectPage 
On an Indexpage, you need to add a new Cw API Pivot node with a filter(createOnCWview = indexpage.nodeIDofThePivotLayout)
(don't forget to use complementary node if needed)

<img src="https://raw.githubusercontent.com/nevakee716/cwNetwork/master/screen/pivotEdit4.jpg" alt="Drawing" style="width: 95%;"/>


### Load the First Cw Api Network of the list

If you check this option, the network layout will load the first capinetwork of the list


## Data Deriver

You can create some data deriver, if you want for exemple take only the month of a date
you need to modify the file cwPivotTable.dataDeriver.js

This required some javascript knowledge please ask a consultant