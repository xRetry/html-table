
class HtmlTable {
    #colNumMap;
    #colData2colDom;
    #rowData2rowDom;
    #rowIdxs;
    #colNames;
    #data;
    #elemTable;
    #elemHeader;
    #elemBody;
    #htmlSettings;

    constructor(element, data) {
        this.#htmlSettings = {
            showHeader: false,
            showfilters: false,
            classes: {},
        };
        this.#transposeData(data)
        this.#bindToParent(element);
    }

    showHeader(show) {
        if (this.#htmlSettings.showHeader === show) return;
        this.#htmlSettings.showHeader = show;

        if (show) {
            this.#elemHeader = document.createElement('thead');
            const row = document.createElement('tr');
            this.#elemHeader.append(row);

            for (const colName of this.#htmlSettings.colOrder) {
                const elemCell = document.createElement('th');
                elemCell.textContent = colName;

                row.append(elemCell);
            }

            this.#elemTable.insertBefore(this.#elemHeader, this.#elemTable.children[0]);
        } else {
            this.#elemHeader.children[0].remove();
        }

        return this;
    }

    setColNames(mapping) {
        for (const oldName of Object.keys(mapping)) {
            const colIdx = this.#colNumMap[oldName];
            if (colIdx == null) continue;

            const newName = mapping[oldName];
            this.#colNames[colIdx] = newName;
            if (!this.#htmlSettings.showHeader) continue;

            this.#elemTable.children[0].children[colIdx].textContent = newName;
        }
        return this;
    }

    setColOrder(colOrder) {
        this.#htmlSettings.colOrder = colOrder;

        this.#buildTable();
        return this;
    }

    addClass(elemMapping) {
        this.#htmlSettings.classes = elemMapping;
        this.#applyClasses();
        return this;
    }

    removeColumnsByName(colNames) {
        for (const colName of colNames) {
            const colIdx = this.#colNumMap[colName];
            if (colIdx == null) continue;

            let colDom = this.#colData2colDom[colIdx];
            if (colDom == null) continue;

            for (let i=0; i<this.#elemTable.children.length; i++) {
                this.#elemTable.children[i].children[colDom].remove();
                this.#colData2colDom[colIdx] = null;
            }
        }

        return this;
    }

    showFilters(show=true) {
        if (show && !this.#htmlSettings.showFilters) {
            const elemRow = document.createElement('tr');
            const table = this;
            for (let colDom=0; colDom<this.#htmlSettings.colOrder.length; colDom++) {
                const colData = Number(this.#elemBody.children[0].children[colDom].getAttribute('col'));

                const elemInput = document.createElement('input');
                elemInput.type = 'text';
                elemInput.className = 'js-filter';
                elemInput.setAttribute('col', colData);
                elemInput.onkeyup = function() {
                    const colNum = Number(this.getAttribute('col'));
                    table.filterColData(colNum, this.value);
                };

                const elemCell = document.createElement('td')
                elemCell.append(elemInput);
                elemRow.append(elemCell);
            }

            this.#elemHeader.append(elemRow);
            this.#htmlSettings.showFilters = true;
        }

        if (!show && this.#htmlSettings.showFilters) {
            this.#elemHeader.removeChild(this.#elemHeader.lastChild);
            this.#htmlSettings.showFilters = false;
        }
    }

    filterColData(colNum, filterText) {
        for (const i of this.#rowIdxs) {
            let needsShown = this.#data[i][colNum].toString().includes(filterText);
            let isHidden = this.#rowData2rowDom[i] == null;

            if (needsShown && isHidden) {
                this.#elemBody.children[i].style.display = '';
                this.#rowData2rowDom[i] = i;
            }
            if (!needsShown && !isHidden) {
                this.#elemBody.children[i].style.display = 'none';
                this.#rowData2rowDom[i] = null;
            }
        }
        return this;

    }

    filterCol(colNum, filterText) {
        const colData = this.#elemBody.children[0].children[colNum].getAttribute('col');
        this.filterColData(colData, filterText);
    }

    #bindToParent(element) {
        const elemParent = document.querySelector(element);
        this.#elemTable = document.createElement('table');
        elemParent.append(this.#elemTable);
        this.#htmlSettings.showHeader = true;
        this.#htmlSettings.colOrder = this.#colNames;

        this.#buildTable();
    }

    #buildTable() {
        this.#elemTable.replaceChildren();

        this.#elemBody = document.createElement('tbody');
        this.#elemTable.append(this.#elemBody);

        const showHeader = this.#htmlSettings.showHeader;
        this.#htmlSettings.showHeader = false;
        const showFilters = this.#htmlSettings.showFilters;
        this.#htmlSettings.showFilters = false;

        for (let i=0; i<this.#colData2colDom.length; i++) this.#colData2colDom[i] = null;

        for (let i = 0; i < this.#data.length; i++) {
            let elemRow = document.createElement('tr');
            let colDom = 0;
            for (const colName of this.#htmlSettings.colOrder) {
                const colData = this.#colNumMap[colName];
                if (colData == null) continue;

                this.#colData2colDom[colData] = colDom;

                const elemCell = document.createElement('td');
                elemCell.setAttribute('row', i);
                elemCell.setAttribute('col', colData);
                const elemContent = document.createTextNode(this.#data[i][colData]);
                elemCell.append(elemContent);
                elemRow.append(elemCell);
                colDom++;
            }

            this.#elemBody.append(elemRow);
        }
        this.showHeader(showHeader);
        this.#applyClasses();
        this.showFilters(showFilters);
    }

    #applyClasses() {
        const classes = this.#htmlSettings.classes;

        if ('table' in classes) {
            this.#elemTable.classList.add(classes.table);
        }

        for (const [key, value] of Object.entries(classes)) {
            const rowNum = parseInt(key);
            let rowElems;
            if (isNaN(rowNum)) {
                rowElems = this.#elemTable.querySelectorAll(key);
            } else {
                const headerChildren = this.#elemHeader.children;
                rowElems = rowNum < headerChildren.length
                    ? headerChildren[rowNum].children
                    : this.#elemBody.children[rowNum - headerChildren.length].children;
            }

            for (const elem of rowElems) {
                elem.classList.add(value);
            }
        }
    }

    #transposeData(data) {
        this.#colNames = Object.keys(data[0]);
        this.#data = [];
        this.#colNumMap = {};
        this.#colData2colDom = [];
        this.#rowData2rowDom = [];
        this.#rowIdxs = [];
        for (let i = 0; i < data.length; i++) {
            this.#rowData2rowDom[i] = i;
            this.#rowIdxs.push(i);
            this.#data.push([]);
            let colNum = 0;
            for (const key of Object.keys(data[i])) {
                this.#colData2colDom[colNum] = colNum;
                this.#colNumMap[key] = colNum++;
                this.#data[i].push(data[i][key]);
            }
        }
    }
}

let dataTable = [
    { 'a': 1, 'b': 2, 'c': 10},
    { 'a': 3, 'b': 4, 'c': 20},
];


var t; 

window.onload = function() {
    t = new HtmlTable('#tbl', dataTable);
    t.setColOrder(['c', 'b'])
        .addClass({'td': 'red', 0: 'ok', table: 'formated'})
        .showFilters();
};


