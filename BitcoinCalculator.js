// Bitcoin calculation - FIFO method

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

let calculateProfitForAmount = (price, amount) => {
    // let queueIndex = 0; // FIFO
    let queueIndex = buyQueue.length - 1; // LIFO

    if (!buyQueue[queueIndex]) {
        return;
    }

    let currQueueAmount = buyQueue[queueIndex].amount;
    let currQueuePrice = buyQueue[queueIndex].price;
    if (currQueueAmount > amount) {
        buyQueue[queueIndex].amount = currQueueAmount - amount;
        setRightPrice(price, currQueuePrice, amount);
    } else {
        amount -= currQueueAmount;
        setRightPrice(price, currQueuePrice, currQueueAmount);
        buyQueue.splice(queueIndex, 1); // remove current cell

        if (amount > 0) {
            calculateProfitForAmount(price, amount);
        } else if (amount < 0) {
            throw "Something wrong just happened";
        }
    }
};

const AMOUNT_KEY = "B";
const ACTION_KEY = "D";
const PRICE_KEY = "C";
const BUY_VALUE = "Buy";
const excelToJson = require('convert-excel-to-json');
const result = excelToJson({
    // sourceFile: 'test.xlsx'
    sourceFile: 'combined.xlsx'
});

let buyQueue = [];
let bitcoinProfit = 0;
let bitcoinLoss = 0;
let oneSum = 0;
let data = result[Object.keys(result)[0]];
let totalAmountRightNow = 0;

data.splice(0, 1); // remove header
for (let currRow of data) {
    let price = currRow[PRICE_KEY];
    let amount = currRow[AMOUNT_KEY];
    let action = currRow[ACTION_KEY];
    if (action === BUY_VALUE) {
        totalAmountRightNow = totalAmountRightNow + amount;
        buyQueue.push({price, amount});
    } else {
        totalAmountRightNow = totalAmountRightNow - amount;
        calculateProfitForAmount(price, amount);
    }

    if (Math.round(totalAmountRightNow * 100000000) / 100000000 != Math.round(calculateLeftAmount() * 100000000) / 100000000) {
        throw "something's wrong here. there's a bug"
    }
}

let leftAmount = calculateLeftAmount();
let leftValue = calculateLeftValue();
let n = 3;
