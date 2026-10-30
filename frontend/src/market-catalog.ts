// Local identity catalog only. Prices and histories belong to the official widgets.
export interface StockIdentity { symbol: string; name: string; tradingView: string }
export const stocks: StockIdentity[] = [
  { symbol: 'ITUB4', name: 'Itaú Unibanco', tradingView: 'BMFBOVESPA:ITUB4' },
  { symbol: 'PETR4', name: 'Petrobras', tradingView: 'BMFBOVESPA:PETR4' },
  { symbol: 'VALE3', name: 'Vale', tradingView: 'BMFBOVESPA:VALE3' },
  { symbol: 'MGLU3', name: 'Magazine Luiza', tradingView: 'BMFBOVESPA:MGLU3' },
];
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
export const findStock = (value: string) => stocks.find(stock => stock.symbol === normalizeSearch(value));
export const searchStocks = (value: string) => stocks.filter(stock => normalizeSearch(`${stock.symbol} ${stock.name}`).includes(normalizeSearch(value)));
