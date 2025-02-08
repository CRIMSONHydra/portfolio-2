// Global quaote API return structure
// {
//   "Global Quote": {
//       "01. symbol": "AAPL",
//       "02. open": "145.30",
//       "03. high": "147.50",
//       "04. low": "144.00",
//       "05. price": "146.00",
//       "06. volume": "75000000",
//       "07. latest trading day": "2025-02-06",
//       "08. previous close": "145.00",
//       "09. change": "1.00",
//       "10. change percent": "0.69%"
//   }
// }


const API_KEY = "QRU8AJFCKG9G3XFI";

let portfolio = [];

const tableBody = document.querySelector('#portfolioTable tbody');
const totalInvestedEl = document.querySelector('#totalInvested');
const totalProfitEl = document.querySelector('#totalProfit');
const suggestionsEl = document.querySelector('#suggestions');

function savePortfolio() {
  localStorage.setItem("portfolio", JSON.stringify(portfolio));
}

function loadPortfolio() {
  const stored = localStorage.getItem("portfolio");

  if (stored) portfolio = JSON.parse(stored);
}

function updateAllPrices() {
  portfolio.forEach(stock => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stock.symbol}&apikey=${API_KEY}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        const globalQuote = data["Global Quote"];

        if (globalQuote && globalQuote["05. price"]) {
          stock.currentPrice = parseFloat(globalQuote["05. price"]);
          savePortfolio();
          updatePortfolioTable();
          updateSummary();
        }
      })
      .catch(error => console.error(`Error updating ${stock.symbol}:`, error));
  });
}

//chart contexts
//graph of historical prices for each stock in portfolio
const priceCtx = document.getElementById('priceChart').getContext('2d');
//graph of historical pnl for each stock in portfolio
const profitCtx = document.getElementById('profitChart').getContext('2d');

let priceChart = new Chart(priceCtx, {
  type: 'line',
  data: {
    labels: [], // Time labels
    datasets: [{
      label: 'Price',
      data: [],
      borderColor: 'blue',
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { display: true, title: { display: true, text: 'Time' } },
      y: { display: true, title: { display: true, text: 'Price ($)' } }
    }
  }
});

let profitChart = new Chart(profitCtx, {
  type: 'line',
  data: {
    labels: [], // Time labels
    datasets: [{
      label: 'Profit/Loss',
      data: [],
      borderColor: 'green',
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { display: true, title: { display: true, text: 'Time' } },
      y: { display: true, title: { display: true, text: 'Profit ($)' } }
    }
  }
});

// Autocomplete Stock name
document.querySelector('#stockSymbol').addEventListener('input', e => {
  const query = e.target.value.trim();
  if (query.length < 2) {
    suggestionsEl.innerHTML = '';
    return;
  }
  const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${API_KEY}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      suggestionsEl.innerHTML = '';
      if (data.bestMatches) {
        data.bestMatches.forEach(match => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.textContent = `${match["1. symbol"]} - ${match["2. name"]}`;
          item.addEventListener('click', () => {
            document.getElementById('stockSymbol').value = match["1. symbol"];
            suggestionsEl.innerHTML = '';
            autoFillBuyPrice();
          });
          suggestionsEl.appendChild(item);
        });
      }
    })
    .catch(error => console.error('Autocomplete error:', error));
});

//when somethin else gets clicked element loses focus -> blur
document.querySelector('#stockSymbol').addEventListener('blur', autoFillBuyPrice);
function autoFillBuyPrice() {
  const symbol = document.querySelector('#stockSymbol').value.trim();
  const buyPriceInput = document.querySelector('#buyPrice');
  if (symbol && !buyPriceInput.value) {//value doesnt exist
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        const globalQuote = data["Global Quote"];
        if (globalQuote && globalQuote["05. price"]) {
          buyPriceInput.value = parseFloat(globalQuote["05. price"]).toFixed(2);
        }
      })
      .catch(err => console.error('Auto-fill error:', err));
  }
}


function addStock(symbol, shares, buyPrice) {
  symbol = symbol.toUpperCase();
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const globalQuote = data["Global Quote"];
      if (globalQuote && globalQuote["05. price"]) {
        const currentPrice = parseFloat(globalQuote["05. price"]);
        const stockData = {
          symbol,
          shares: Number(shares),//form inputs are in string form
          buyPrice: Number(buyPrice),
          currentPrice: currentPrice
        };
        portfolio.push(stockData);
        savePortfolio();
        updatePortfolioTable();
        updateSummary();
        updateCharts(symbol, stockData.buyPrice, stockData.shares);
      } else {
        alert("Invalid symbol or API limit reached.");
      }
    })
    .catch(error => {
      console.error("Error fetching stock data:", error);
      alert("Error fetching stock data.");
    });
}

function updatePortfolioTable() {
  tableBody.innerHTML = '';
  portfolio.forEach(stock => {
    const profit = ((stock.currentPrice - stock.buyPrice) * stock.shares).toFixed(2);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${stock.symbol}</td>
      <td>${stock.shares}</td>
      <td>$${stock.buyPrice.toFixed(2)}</td>
      <td>$${stock.currentPrice.toFixed(2)}</td>
      <td>$${profit}</td>
      <td><button class="removeStock" data-symbol="${stock.symbol}">Remove</button></td>
    `;
    tableBody.appendChild(row);
  });
}

function updateSummary() {
  let totalInvested = 0;
  let totalProfit = 0;
  portfolio.forEach(stock => {
    totalInvested += stock.buyPrice * stock.shares;
    totalProfit += (stock.currentPrice - stock.buyPrice) * stock.shares;
  });
  totalInvestedEl.textContent = totalInvested.toFixed(2);
  totalProfitEl.textContent = totalProfit.toFixed(2);
}

function updateCharts(symbol, buyPrice, shares) {
  const timePeriod = document.getElementById('timePeriod').value;
  let apiUrl = '';
  if (timePeriod === 'TIME_SERIES_INTRADAY') {
    apiUrl = `https://www.alphavantage.co/query?function=${timePeriod}&symbol=${symbol}&interval=5min&apikey=${API_KEY}`;
  } else {
    apiUrl = `https://www.alphavantage.co/query?function=${timePeriod}&symbol=${symbol}&apikey=${API_KEY}`;
  }
  
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      let timeSeries;
      if (timePeriod === 'TIME_SERIES_INTRADAY') {
        timeSeries = data["Time Series (5min)"];
      } else if (timePeriod === 'TIME_SERIES_DAILY') {
        timeSeries = data["Time Series (Daily)"];
      } else if (timePeriod === 'TIME_SERIES_WEEKLY') {
        timeSeries = data["Weekly Time Series"];
      } else if (timePeriod === 'TIME_SERIES_MONTHLY') {
        timeSeries = data["Monthly Time Series"];
      }
      
      if (!timeSeries) {
        alert("Time series data not available or API limit reached.");
        return;
      }
      
      const labels = [];
      const priceData = [];
      const profitData = [];
      
      // Use the latest 10 data points
      const entries = Object.entries(timeSeries).slice(0, 10).reverse();
      entries.forEach(([time, values]) => {
        labels.push(time);
        const price = parseFloat(values["4. close"]);
        priceData.push(price);
        profitData.push(((price - buyPrice) * shares).toFixed(2));
      });
      
      // Update
      priceChart.data.labels = labels;
      priceChart.data.datasets[0].data = priceData;
      priceChart.data.datasets[0].label = `${symbol} Price`;
      priceChart.update();
      
      profitChart.data.labels = labels;
      profitChart.data.datasets[0].data = profitData;
      profitChart.data.datasets[0].label = `${symbol} Profit/Loss`;
      profitChart.update();
    })
    .catch(error => {
      console.error("Error fetching time series data:", error);
      alert("Error fetching time series data.");
    });
}

document.getElementById('addStockForm').addEventListener('submit', e => {
  e.preventDefault();
  const symbol = document.getElementById('stockSymbol').value.trim();
  const shares = document.getElementById('shares').value;
  const buyPrice = document.getElementById('buyPrice').value;
  if (symbol && shares && buyPrice) {
    addStock(symbol, shares, buyPrice);
    e.target.reset();
    suggestionsEl.innerHTML = '';
  }
});

// Remove stock wiht del btn
tableBody.addEventListener('click', function(e) {
  if (e.target.classList.contains('removeStock')) {
    const symbol = e.target.getAttribute('data-symbol');
    portfolio = portfolio.filter(stock => stock.symbol !== symbol);
    savePortfolio();
    updatePortfolioTable();
    updateSummary();
  }
});

// Update chart time
document.getElementById('timePeriod').addEventListener('change', function() {
  if (portfolio.length > 0) {
    const { symbol, buyPrice, shares } = portfolio[portfolio.length - 1];
    updateCharts(symbol, buyPrice, shares);
  }
});

window.addEventListener('load', function() {
  loadPortfolio();
  updatePortfolioTable();
  updateSummary();
  updateAllPrices();
});
