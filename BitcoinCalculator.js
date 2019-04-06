// Bitcoin calculation - FIFO method

let numberToExcelCol = (col) => {
    var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return base[col];
};

let calculateLeftAmount = () => {
    let leftAmountTotal = 0;
    for (let currBuy of buyQueue) {
        leftAmountTotal += currBuy.amount;
    }

    return leftAmountTotal;
}

let calculateLeftValue = () => {
    let leftValueTotal = 0;
    for (let currBuy of buyQueue) {
        leftValueTotal += currBuy.amount * currBuy.price;
    }

    return leftValueTotal;
}

let setRightPrice = (price, currQueuePrice, amount) => {
    if (price > currQueuePrice) { // Current price is higher than original - this means profit
        bitcoinProfit += (price - currQueuePrice) * amount;
    } else if (price < currQueuePrice) { // Current price is higher than original - this means loss
        bitcoinLoss += (currQueuePrice - price) * amount;
    }

    oneSum += (price - currQueuePrice) * amount;
};

let calculateProfitForAmount = (price, amount, date, currPrice = 0) => {
    let queueIndex = 0; // FIFO
    // let queueIndex = buyQueue.length - 1; // LIFO

    if (!buyQueue[queueIndex]) {
        return currPrice;
    }

    let currQueueAmount = buyQueue[queueIndex].amount;
    let currQueuePrice = buyQueue[queueIndex].price;
    if (currQueueAmount > amount) {
        buyQueue[queueIndex].amount = currQueueAmount - amount;
        currPrice += amount * currQueuePrice;
        // setRightPrice(price, currQueuePrice, amount);
    } else {
        amount -= currQueueAmount;
        currPrice += currQueueAmount * currQueuePrice;
        // setRightPrice(price, currQueuePrice, currQueueAmount);

        buyQueue.splice(queueIndex, 1); // remove current cell

        if (amount > 0) {
            currPrice = calculateProfitForAmount(price, amount, date, currPrice);
        } else if (amount < 0) {
            throw "Something wrong just happened";
        }
    }

    return currPrice;
};

const DATE_KEY = "A";
const AMOUNT_KEY = "E";
const ACTION_KEY = "O";
const PRICE_KEY = "I";
const FEE_KEY = "M";
const BUY_VALUE = "Buy";
const COST_OF_SELL_LOCATION = 11;
const PROFIT_LOCATION = 12;

const excelToJson = require('convert-excel-to-json');
const result = excelToJson({
    // sourceFile: 'test.xlsx'
    sourceFile: 'combined-for 1301.xlsx'
});

var xl = require('excel4node');

var wb = new xl.Workbook();
var ws = wb.addWorksheet('Sheet 1');

let buyQueue = [];
let bitcoinProfit = 0;
let bitcoinLoss = 0;
let oneSum = 0;
let data = result[Object.keys(result)[0]];
let totalAmountRightNow = 0;

let header = data.splice(0, 1)[0]; // remove header

let index = 1;
for (let currHeader of Object.values(header)) {
    ws.cell(1, index)
        .string(currHeader);
    index++;
}

let currRowIndex = 2;

let generateRow = (currRow) => {
    for (let colIndex = 1; colIndex <= Object.keys(header).length; colIndex++) {
        let currKey = numberToExcelCol(colIndex - 1);

        let cell = ws.cell(currRowIndex, colIndex);
        let currValue = currRow[currKey] || "";

        if (typeof currValue.getMonth === 'function') {
            cell.date(currValue);
        } else if (currValue != "" && !isNaN(currValue)) {
            cell.number(currValue);
        } else {
            cell.string(currValue);
        }
    }
}

for (let currRow of data) {
    let price = currRow[PRICE_KEY];
    let amount = currRow[AMOUNT_KEY];
    let action = currRow[ACTION_KEY];
    let fee = currRow[FEE_KEY];
    // let date = currRow[DATE_KEY].toString();
    let date = null;
    generateRow(currRow);

    if (action === BUY_VALUE) {
        totalAmountRightNow = totalAmountRightNow + amount;
        buyQueue.push({price, amount});
        ws.cell(currRowIndex, PROFIT_LOCATION).number(fee * -1);
    } else {
        totalAmountRightNow = totalAmountRightNow - amount;
        let currPriceRelative = calculateProfitForAmount(price, amount, date);
        let currPricePerUnit = currPriceRelative / amount;
        ws.cell(currRowIndex, COST_OF_SELL_LOCATION).number(currPricePerUnit);
        ws.cell(currRowIndex, PROFIT_LOCATION).number((price - currPricePerUnit) * amount - fee);
    }

    if (Math.round(totalAmountRightNow * 100000000) / 100000000 != Math.round(calculateLeftAmount() * 100000000) / 100000000) {
        throw "something's wrong here. there's a bug"
    }

    currRowIndex++;
}

wb.write('Excel.xlsx');

// console.log("left Amount:", calculateLeftAmount());
// console.log("left Value:", calculateLeftValue());
// console.log("calculated profit after kizuz: ", bitcoinProfit - bitcoinLoss);
// console.log("calculated profit: ", bitcoinProfit);
// console.log("calculated loss: ", bitcoinLoss);
