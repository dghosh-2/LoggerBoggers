import YahooFinance from 'yahoo-finance2';
import { StockData, StockDataPoint } from './schemas';

// Create yahoo-finance instance (required for v3+)
const yahooFinance = new YahooFinance();

/**
 * Fetch historical stock data from Yahoo Finance
 */
export async function fetchStockData(
    symbol: string,
    period: string = '1y'
): Promise<StockData> {
    try {
        const endDate = new Date();
        const startDate = getPeriodStart(period);

        // Fetch historical data
        const result = await yahooFinance.historical(symbol, {
            period1: startDate,
            period2: endDate,
            interval: '1d',
        }) as any[];

        if (!result || result.length === 0) {
            throw new Error(`No data returned for ${symbol}`);
        }

        const data: StockDataPoint[] = result.map((item: any) => ({
            date: item.date.toISOString().split('T')[0],
            open: item.open || 0,
            high: item.high || 0,
            low: item.low || 0,
            close: item.close || 0,
            volume: item.volume || 0,
            adjClose: item.adjClose || item.close || 0,
        }));

        // Get quote for additional metadata
        let name = symbol;
        let metadata = {};
        try {
            const quote = await yahooFinance.quote(symbol) as any;
            name = quote.longName || quote.shortName || symbol;
            metadata = {
                currency: quote.currency,
                exchangeName: quote.fullExchangeName,
                instrument: quote.quoteType,
            };
        } catch (err) {
            console.warn(`Could not fetch metadata for ${symbol}`);
        }

        return {
            symbol,
            name,
            data,
            metadata,
        };
    } catch (error: any) {
        console.error(`Error fetching data for ${symbol}:`, error);
        throw new Error(`Failed to fetch stock data for ${symbol}: ${error.message}`);
    }
}

/**
 * Fetch data for multiple symbols
 */
export async function fetchMultipleStocks(
    symbols: string[],
    period: string = '1y'
): Promise<StockData[]> {
    const promises = symbols.map(symbol => fetchStockData(symbol, period));
    return Promise.all(promises);
}

/**
 * Convert period string to Date
 */
function getPeriodStart(period: string): Date {
    const now = new Date();
    const periodMap: Record<string, number> = {
        '1d': 1,
        '5d': 5,
        '1mo': 30,
        '3mo': 90,
        '6mo': 180,
        '1y': 365,
        '2y': 730,
        '5y': 1825,
        '10y': 3650,
    };

    const days = periodMap[period] || 365;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    return startDate;
}

/**
 * Calculate risk metrics from stock data
 */
export function calculateRiskMetrics(data: StockDataPoint[]): {
    volatility: number;
    maxDrawdown: number;
    returns: number[];
} {
    if (data.length < 2) {
        return { volatility: 0, maxDrawdown: 0, returns: [] };
    }

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
        returns.push(dailyReturn);
    }

    // Calculate volatility (standard deviation of returns)
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

    // Calculate maximum drawdown
    let maxDrawdown = 0;
    let peak = data[0].close;

    for (const point of data) {
        if (point.close > peak) {
            peak = point.close;
        }
        const drawdown = (peak - point.close) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    return { volatility, maxDrawdown, returns };
}
