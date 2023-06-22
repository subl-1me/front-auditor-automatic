const path = require("path");
const Directory = require("../utils/directory");
const fs = require("fs/promises");
const Config = require("../services/ConfigService");

class PitResultBuilder {
  constructor() {}

  /**
   * @description It setup default html template before begin inserting HTML elements
   */
  async createDefaultTemplate() {
    const HTMLTemplateString = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>PIT</title>
        <link rel="stylesheet" href="./style.css">
        <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
      />
      </head>
      <body>
      <div class="container-fluid">
      <div class="card shadow">
        <div class="card-header">
          <h1 class="text-center fw-bold">City Express PIT</h1>
        </div>
        <div class="card-body">
          <table class="table text-center">
            <thead>
              <th>ID</th>
              <th>Guest</th>
              <th>Date-in</th>
              <th>Date-out</th>
              <th>Nights</th>
              <th>Room</th>
              <th>Rate</th>
              <th>Total to pay</th>
              <th>Payment Status</th>
              <th>Observations</th>
              <th></th>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer">
      <h6 class="small float-end m-0">
        Total nights left:
      </h6>
    </div>
    </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.min.js"></script>
      </body>
    </html>
    `;

    const templateDir = path.join(__dirname, "pit-result.html");
    try {
      await Directory.saveFile(templateDir, HTMLTemplateString, "utf-8");

      return {
        templateDir,
        HTMLTemplateString,
      };
    } catch (err) {
      console.log(err);
    }
  }

  createTableRow(reservationId, isCollapsible = false) {
    // insert Boostrap data target parameters
    if (!isCollapsible) {
      const parametersDataString = `data-bs-toggle="collapse" id="${reservationId}" class="tr-rsrv" data-bs-target="#rsrv-${reservationId}-expand"`;
      const tableRowTemplateElem = `<tr ${parametersDataString}></tr>`;
      return tableRowTemplateElem;
    } else {
      const parametersDataString = `id="${reservationId}-collapse"`;
      const tableRowTemplateElem = `<tr ${parametersDataString}></tr>`;
      return tableRowTemplateElem;
    }
  }

  setupCollapseTableRowDataElems(reservation) {
    const currentSheet = reservation.sheets
      .filter(
        (sheet) =>
          sheet.status !== "CLOSED" &&
          sheet.payments &&
          sheet.payments.length > 0
      )
      .shift();

    // create payments <tr>
    const trHTMLElementsPayments = [];
    currentSheet.payments.forEach((payment) => {
      const trPayment = `<tr>
        <td>${payment.transactionDate}</td>
        <td>${payment.transactionAmount}</td>
        <td><div class="badge bg-primary shadow">${payment.transactionType}</div></td>
      </tr>\n`;

      trHTMLElementsPayments.push(trPayment);
    });

    const trHTMLElementRates = [];
    reservation.rates.ratesPerDay.forEach((rate) => {
      let trRate = "";
      const currentDate = Config.getConfig().systemDate;
      const rateModified = rate.date.replaceAll("/", "-");
      const rsrvRateFormatted = new Date(rateModified).toLocaleDateString();
      const currentDateFormatted = new Date(currentDate).toLocaleDateString();

      if (rate.date === currentDate) {
        trRate = `
        <tr class="bg-primary text-white">
          <td>${rate.date}</td>
          <td>$${rate.base}</td>
          <td>$${rate.total}</td>
        </tr>
        `;
      } else {
        trRate = `
        <tr>
          <td>${rate.date}</td>
          <td>$${rate.base}</td>
          <td>$${rate.total}</td>
        </tr>
        `;
      }

      trHTMLElementRates.push(trRate);
    });

    const paymentsHTMLString = this.concatenateTableDataElems(
      trHTMLElementsPayments
    );
    const ratesHTMLString = this.concatenateTableDataElems(trHTMLElementRates);

    const sheetBalanceSanit = Number(
      currentSheet.balance.replace("-", "").replace("$", "").replace(",", "")
    );
    let balanceTotalDaysPays = 0;
    if (!reservation.rates.isRateVariable) {
      balanceTotalDaysPays =
        sheetBalanceSanit / reservation.rates.ratesPerDay[0].total;
    }

    const collapsibleRowString = `<td colspan="12" class="p-0">
    <div
      class="row collapse mb-3 p-3 bg-dark"
      id="rsrv-${reservation.id}-expand"
    >
      <div class="col-8">
        <div class="card shadow-sm bg-light shadow-lg">
          <div class="card-header">
            <h6 class="fw-bold">Payments</h6>
            <h6 class="text-muted float-end">Sheet #${currentSheet.sheetNumber}</h6>
          </div>
          <div class="card-body bg-light">
            <div class="payments-container">
              <table class="table text-center">
                <thead>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Type</th>
                </thead>
                <tbody>
                ${paymentsHTMLString}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer">
            <div class="row">
              <div class="col-6">
                <h6 class="float-start m-0">
                  Balance: ${currentSheet.balance}
                </h6>
              </div>
              <div class="col-6">
                <h6 class="float-end m-0">Pays: ${balanceTotalDaysPays} nights</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-4">
        <div class="card shadow-lg bg-light">
          <div class="card-header">
            <h6 class="fw-bold">Rates</h6>
          </div>
          <div class="card-body bg-light">
            <div class="rates-container">
              <table class="table text-center">
                <thead>
                  <th>Date</th>
                  <th>Rate</th>
                  <th>Total</th>
                </thead>
                <tbody>
                ${ratesHTMLString}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer">
            <h6 class="small float-end m-0">
              Total nights left: $10,415.65
            </h6>
          </div>
        </div>
      </div>
    </div>
  </td>`;

    return collapsibleRowString;
  }

  setupTableDataElements(reservation) {
    // get properties until 7 index to better handling with HTML table headers
    const rsrvProps = Object.getOwnPropertyNames(reservation)
      .slice(0, 8)
      .filter((prop) => prop !== "membership");
    let tableDataElemsArray = [];
    rsrvProps.forEach((prop) => {
      if (prop === "guest") {
        tableDataElemsArray.push(
          `<td>${reservation[prop]} <div class="badge bg-primary small shadow">${reservation.membership}</div></td>\n`
        );
      } else if (prop === "rates") {
        // get current date
        const currentDate = Config.getConfig().systemDate;
        const currentRates = reservation.rates.ratesPerDay
          .filter((rate) => {
            // console.log(rate);
            if (rate.date === currentDate) {
              return rate;
            }
          })
          .shift();

        if (reservation.rates.isRateVariable) {
          tableDataElemsArray.push(
            `<td>$${currentRates.base} <div class="badge bg-primary shadow small">VARIABLE</div></td>\n`
          );
        } else {
          tableDataElemsArray.push(`<td>$${currentRates.base}</td>\n`);
        }
        tableDataElemsArray.push(
          `<td>$${reservation.rates.totalAmount}</td>\n`
        );
        if (reservation.status === "PAID") {
          tableDataElemsArray.push(
            `<td class="status">${reservation.status}</td>\n`
          );
        } else {
          tableDataElemsArray.push(
            `<td class="status"><div class="badge bg-danger shadow">${reservation.status}</div></td>\n`
          );
        }
        if (reservation.message) {
          tableDataElemsArray.push(`<td>${reservation.message}</td>\n`);
        } else {
          tableDataElemsArray.push(`<td></td>\n`);
        }

        tableDataElemsArray.push(`<td class="expand">+</td>\n`);
      } else {
        tableDataElemsArray.push(`<td>${reservation[prop]}</td>\n`);
      }
    });

    return tableDataElemsArray;
  }

  concatenateTableDataElems(dataElements) {
    if (!dataElements || dataElements.length === 0) {
      throw new Error(
        "Table row data elements collection cannot be empty or undefined"
      );
    }

    const tableDataElemsString = dataElements.reduce((accum, actual) => {
      return (accum += actual);
    }, "");

    return tableDataElemsString;
  }

  insertRowData(rowTemplate, HTMLElementsString) {
    const tableRowContentRegex = />[\s\r\n]*</;
    return rowTemplate.replace(tableRowContentRegex, `>${HTMLElementsString}<`);
  }

  insertTableRows(affectedRow, HTMLTemplateString) {
    const tableBodyRegex = /<tbody>[\s\r\n]*<\/tbody>/;
    return HTMLTemplateString.replace(
      tableBodyRegex,
      `<tbody>${affectedRow}</tbody>`
    );
  }

  async createPageTemplateStyles() {
    const templateString = `.status{
        font-weight: bold;
    }
    
    .rsrv-status-paid{
        background-color: rgb(74, 255, 71) !important;
    }
    
    .rsrv-status-pending{
        background-color: rgb(209, 255, 71) !important;
    
    }
    
    .rsrv-status-error{
        background-color: rgb(255, 117, 71) !important;
    }
    
    td{
        vertical-align:middle !important;
    }

    .tr-rsrv:hover{
      cursor: pointer;
        background-color: rgb(218, 218, 218);
    }
    
    th{
        font-weight: 600;
    }
    
    .rates-container, .payments-container{
        max-height: 300px;
        overflow: auto;
    }
    
    .bg-cash{
        background-color: #20ad59;
    }`;

    const templateDir = path.join(__dirname, "style.css");
    try {
      await Directory.saveFile(templateDir, templateString, "utf8");
    } catch (err) {
      throw new Error(
        "Something went wrong trying to create template page styles"
      );
    }
  }

  /**
   * @description Creates a new HTML page to show the provided reservation details
   * @param {Array<*>} reservations Array of guest reservations
   */
  async createResultPage(reservations) {
    const { templateDir, HTMLTemplateString } =
      await this.createDefaultTemplate();

    let tableDataHTMLContent = "";
    for (const reservation of reservations) {
      const tableRowTemplate = this.createTableRow(reservation.id);
      const tableDataElements = this.setupTableDataElements(reservation);
      const tableDataElemsString =
        this.concatenateTableDataElems(tableDataElements);
      const affectedRow = this.insertRowData(
        tableRowTemplate,
        tableDataElemsString
      );
      tableDataHTMLContent += affectedRow + "\n";

      // add another table row with collapse feature to display reservation payments
      const tableRowCollapseTemplate = this.createTableRow(
        reservation.id,
        true
      );

      const collapseRowDataString =
        this.setupCollapseTableRowDataElems(reservation);

      const affectedRow2 = this.insertRowData(
        tableRowCollapseTemplate,
        collapseRowDataString
      );

      tableDataHTMLContent += affectedRow2 + "\n  ";
    }

    // write in local template file
    const HTMLTemplateModified = this.insertTableRows(
      tableDataHTMLContent,
      HTMLTemplateString
    );
    await Directory.saveFile(templateDir, HTMLTemplateModified, "utf8");
    await this.createPageTemplateStyles();

    return {
      message: "OK",
    };
  }
}

// const builderInstance = new PitResultBuilder();
// const startTest = async () => {
//   const { templateDir, HTMLTemplateString } =
//     await builderInstance.createDefaultTemplate();
//   const mockDataDir = path.normalize(
//     "C:/Users/julio/Documents/hotel-auditor-automatic/src/front/pit-result.json"
//   );
//   const mockData = await fs.readFile(mockDataDir, "utf8", (err, data) => {
//     if (err) {
//       throw new Error("Error trying to read json");
//     }

//     return data;
//   });

//   const mockDataParsed = JSON.parse(mockData);
//   let tableDataHTMLContent = "";
//   for (const reservation of mockDataParsed.reservations) {
//     const tableRowTemplate = builderInstance.createTableRow(reservation.id);
//     const tableDataElements =
//       builderInstance.setupTableDataElements(reservation);
//     const tableDataElemsString =
//       builderInstance.concatenateTableDataElems(tableDataElements);
//     const affectedRow = builderInstance.insertRowData(
//       tableRowTemplate,
//       tableDataElemsString
//     );
//     tableDataHTMLContent += affectedRow + "\n";

//     // add another table row with collapse feature to display reservation payments
//     const tableRowCollapseTemplate = builderInstance.createTableRow(
//       reservation.id,
//       true
//     );

//     const collapseRowDataString =
//       builderInstance.setupCollapseTableRowDataElems(reservation);

//     const affectedRow2 = builderInstance.insertRowData(
//       tableRowCollapseTemplate,
//       collapseRowDataString
//     );

//     tableDataHTMLContent += affectedRow2 + "\n  ";
//   }

//   // write in local template file
//   const HTMLTemplateModified = builderInstance.insertTableRows(
//     tableDataHTMLContent,
//     HTMLTemplateString
//   );
//   await Directory.saveFile(templateDir, HTMLTemplateModified, "utf8");
//   await builderInstance.createPageTemplateStyles();
// };

// const init = () => {
//   return new Promise(async (resolve, reject) => {
//     await startTest();
//     console.log("after start test");
//     resolve();
//   });
// };

// init();

module.exports = PitResultBuilder;
