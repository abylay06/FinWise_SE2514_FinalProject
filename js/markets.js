const companySelect = document.querySelector('#market-symbol');
const companyNote = document.querySelector('#company-note');
const chartHost = document.querySelector('#market-widget');
const chartStatus = document.querySelector('#chart-status');
const chartLink = document.querySelector('#chart-link');
const companyNotes = {
    AAPL: 'Apple designs devices including the iPhone and Mac.',
    MSFT: 'Microsoft develops software and cloud services, including Windows and Azure.',
    AMZN: 'Amazon runs an online retail business and the AWS cloud platform.'
};
let loadingTimer;

function loadStockChart() {
    const ticker = companySelect.value;
    const symbol = 'NASDAQ:' + ticker;
    companyNote.textContent = companyNotes[ticker];
    chartLink.href = 'https://www.tradingview.com/symbols/NASDAQ-' + ticker + '/';
    chartLink.textContent = 'Open ' + ticker + ' on TradingView ↗';
    chartStatus.textContent = 'Loading chart…';
    clearTimeout(loadingTimer);

    
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container';
    const slot = document.createElement('div');
    slot.className = 'tradingview-widget-container__widget';
    widget.append(slot);
    chartHost.replaceChildren(widget);

    function showUnavailable() {
        if (widget.parentNode !== chartHost) return;
        chartStatus.textContent = 'The chart is taking longer to load. You can open it on TradingView below.';
    }
    loadingTimer = setTimeout(showUnavailable, 12000);
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.textContent = JSON.stringify({
        symbols: [[companySelect.selectedOptions[0].textContent, symbol + '|1D']],
        dateRanges: ['1m|1D', '3m|1D', '12m|1D'],
        colorTheme: document.documentElement.dataset.theme,
        locale: 'en', width: '100%', height: '100%',
        chartType: 'area', hideDateRanges: false
    });
    script.addEventListener('load', () => {
        const frame = widget.querySelector('iframe');
        if (!frame || widget.parentNode !== chartHost) return;
        frame.title = ticker + ' share price chart from TradingView';
        frame.addEventListener('load', () => {
            if (widget.parentNode !== chartHost) return;
            clearTimeout(loadingTimer);
            chartStatus.textContent = '';
        }, {once: true});
    });
    script.addEventListener('error', () => {
        if (widget.parentNode !== chartHost) return;
        clearTimeout(loadingTimer);
        chartStatus.textContent = 'The chart could not load. Open it on TradingView using the link below.';
    });
    widget.append(script);
}

companySelect.addEventListener('change', () => {
    loadStockChart();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        companyNote.animate([{opacity: 0}, {opacity: 1}], {duration: 250});
    }
});
document.addEventListener('finwise-theme-change', loadStockChart);
loadStockChart();
