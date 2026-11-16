import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xopyxdsxgubzwcojanhm.supabase.co';
const supabaseKey = 'sb_publishable_bwBWyCIB6pdHlCfrrLE2tw_unzLXlNv';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [buys, setBuys] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(1330);
  const [activeTab, setActiveTab] = useState('stocks');
  
  const [newStockName, setNewStockName] = useState('');
  const [newStockCurrency, setNewStockCurrency] = useState('달러 ($)');

  const [selectedStockId, setSelectedStockId] = useState('');
  const [buyShares, setBuyShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const [divStockId, setDivStockId] = useState('');
  const [divYear, setDivYear] = useState('2026');
  const [divMonth, setDivMonth] = useState('1월');
  const [divDay, setDivDay] = useState('1일');
  const [divAmount, setDivAmount] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('app_data')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && data.data) {
        setStocks(data.data.stocks || []);
        setBuys(data.data.buys || []);
        setDividends(data.data.dividends || []);
        setExchangeRate(data.data.exchangeRate || 1330);
      }
    } catch (err) {
      console.error('데이터 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (updatedStocks, updatedBuys, updatedDividends, newRate) => {
    const payload = {
      stocks: updatedStocks,
      buys: updatedBuys,
      dividends: updatedDividends,
      exchangeRate: newRate
    };

    await supabase
      .from('app_data')
      .upsert({ id: 1, data: payload });
  };

  const handleRateChange = (e) => {
    const newRate = Number(e.target.value) || 0;
    setExchangeRate(newRate);
    saveData(stocks, buys, dividends, newRate);
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newStockName.trim()) return;

    const newStock = {
      id: Date.now().toString(),
      name: newStockName.trim(),
      currency: newStockCurrency,
      currentPrice: 0
    };

    const updatedStocks = [...stocks, newStock];
    setStocks(updatedStocks);
    saveData(updatedStocks, buys, dividends, exchangeRate);
    setNewStockName('');
  };

  const handleDeleteStock = (id) => {
    const updatedStocks = stocks.filter((s) => s.id !== id);
    const updatedBuys = buys.filter((b) => b.stockId !== id);
    const updatedDividends = dividends.filter((d) => d.stockId !== id);
    setStocks(updatedStocks);
    setBuys(updatedBuys);
    setDividends(updatedDividends);
    saveData(updatedStocks, updatedBuys, updatedDividends, exchangeRate);
  };

  const handleCurrentPriceChange = (id, value) => {
    const updatedStocks = stocks.map((s) => {
      if (s.id === id) {
        return { ...s, currentPrice: Number(value) || 0 };
      }
      return s;
    });
    setStocks(updatedStocks);
    saveData(updatedStocks, buys, dividends, exchangeRate);
  };

  const handleAddBuy = (e) => {
    e.preventDefault();
    if (!selectedStockId || !buyShares || !buyPrice) return;

    const newBuy = {
      id: Date.now().toString(),
      stockId: selectedStockId,
      shares: Number(buyShares),
      price: Number(buyPrice)
    };

    const updatedBuys = [...buys, newBuy];
    setBuys(updatedBuys);
    saveData(stocks, updatedBuys, dividends, exchangeRate);
    setBuyShares('');
    setBuyPrice('');
  };

  const handleDeleteBuy = (id) => {
    const updatedBuys = buys.filter((b) => b.id !== id);
    setBuys(updatedBuys);
    saveData(stocks, updatedBuys, dividends, exchangeRate);
  };

  const handleAddDividend = (e) => {
    e.preventDefault();
    if (!divStockId || !divAmount) return;

    const newDiv = {
      id: Date.now().toString(),
      stockId: divStockId,
      date: `${divYear}-${divMonth}-${divDay}`,
      amount: Number(divAmount)
    };

    const updatedDividends = [...dividends, newDiv];
    setDividends(updatedDividends);
    saveData(stocks, buys, updatedDividends, exchangeRate);
    setDivAmount('');
  };

  const handleDeleteDividend = (id) => {
    const updatedDividends = dividends.filter((d) => d.id !== id);
    setDividends(updatedDividends);
    saveData(stocks, buys, updatedDividends, exchangeRate);
  };

  const stockSummaryMap = {};
  stocks.forEach((s) => {
    const stockName = s.name || s.symbol || '종목';
    stockSummaryMap[s.id || stockName] = { 
      ...s, 
      name: stockName,
      id: s.id || stockName,
      totalShares: 0, 
      totalInvested: 0, 
      avgBuyPrice: 0,
      totalDividend: 0 
    };
  });

  buys.forEach((b) => {
    if (stockSummaryMap[b.stockId]) {
      stockSummaryMap[b.stockId].totalShares += b.shares;
      stockSummaryMap[b.stockId].totalInvested += b.shares * b.price;
    }
  });

  dividends.forEach((d) => {
    if (stockSummaryMap[d.stockId]) {
      stockSummaryMap[d.stockId].totalDividend += d.amount;
    }
  });

  Object.values(stockSummaryMap).forEach((s) => {
    if (s.totalShares > 0) {
      s.avgBuyPrice = s.totalInvested / s.totalShares;
    }
  });

  let totalInvestedKRW = 0;
  let totalValuationKRW = 0;
  let totalDividendKRW = 0;

  Object.values(stockSummaryMap).forEach((s) => {
    const valuation = s.totalShares * (s.currentPrice || 0);
    const isUSD = s.currency === '달러 ($)';

    const investedKRW = isUSD ? s.totalInvested * exchangeRate : s.totalInvested;
    const valuationKRW = isUSD ? valuation * exchangeRate : valuation;
    const dividendKRW = isUSD ? s.totalDividend * exchangeRate : s.totalDividend;

    totalInvestedKRW += investedKRW;
    totalValuationKRW += valuationKRW;
    totalDividendKRW += dividendKRW;
  });

  const totalProfitKRW = totalValuationKRW - totalInvestedKRW;
  const totalReturnRate = totalInvestedKRW > 0 ? (totalProfitKRW / totalInvestedKRW) * 100 : 0;
  const dividendYieldRate = totalInvestedKRW > 0 ? (totalDividendKRW / totalInvestedKRW) * 100 : 0;

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>데이터를 불러오는 중입니다...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>📈 주식모으기 장부</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>환율 (원/달러): </label>
        <input 
          type="number" 
          value={exchangeRate} 
          onChange={handleRateChange} 
          style={{ padding: '5px', width: '100px' }} 
        /> 원
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', flex: 1, background: '#f9f9f9' }}>
          <h4>총 투자원금 (원화환산)</h4>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{Math.round(totalInvestedKRW).toLocaleString()} 원</p>
        </div>
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', flex: 1, background: '#f9f9f9' }}>
          <h4>누적 배당금 (원화환산)</h4>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'green' }}>{Math.round(totalDividendKRW).toLocaleString()} 원</p>
        </div>
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', flex: 1, background: '#f9f9f9' }}>
          <h4>전체 배당 회수율</h4>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'green' }}>{dividendYieldRate.toFixed(2)} %</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('stocks')}
          style={{ padding: '8px 16px', marginRight: '10px', background: activeTab === 'stocks' ? '#007bff' : '#f1f1f1', color: activeTab === 'stocks' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          보유종목 현황
        </button>
        <button 
          onClick={() => setActiveTab('buys')}
          style={{ padding: '8px 16px', marginRight: '10px', background: activeTab === 'buys' ? '#007bff' : '#f1f1f1', color: activeTab === 'buys' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          매수기록
        </button>
        <button 
          onClick={() => setActiveTab('dividends')}
          style={{ padding: '8px 16px', background: activeTab === 'dividends' ? '#007bff' : '#f1f1f1', color: activeTab === 'dividends' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          배당금기록
        </button>
      </div>

      {activeTab === 'stocks' && (
        <div>
          <h3>보유종목 현황 (원화 및 달러/환율 연동 표시)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ background: '#f1f1f1', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>종목명</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>수량</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>평균매수가</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>현재가격 (수정가능)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>평가금액</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>수익률</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>누적 배당금</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>배당회수율</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>등록된 종목이 없습니다.</td>
                </tr>
              ) : (
                Object.values(stockSummaryMap).map((s) => {
                  const isUSD = s.currency === '달러 ($)';
                  const unit = isUSD ? '$' : '₩';

                  const avgBuyPriceOrig = s.avgBuyPrice;
                  const currentPriceOrig = s.currentPrice || 0;
                  const valuationOrig = s.totalShares * currentPriceOrig;
                  const profitOrig = valuationOrig - s.totalInvested;
                  const returnRate = s.totalInvested > 0 ? (profitOrig / s.totalInvested) * 100 : 0;
                  const divYield = s.totalInvested > 0 ? (s.totalDividend / s.totalInvested) * 100 : 0;

                  const avgBuyPriceKRW = isUSD ? avgBuyPriceOrig * exchangeRate : avgBuyPriceOrig;
                  const currentPriceKRW = isUSD ? currentPriceOrig * exchangeRate : currentPriceOrig;
                  const valuationKRW = isUSD ? valuationOrig * exchangeRate : valuationOrig;
                  const dividendKRW = isUSD ? s.totalDividend * exchangeRate : s.totalDividend;

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{s.name} <span style={{ fontSize: '11px', color: '#666' }}>({s.currency})</span></td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{s.totalShares.toLocaleString()} 주</td>
                      
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div>{unit} {avgBuyPriceOrig.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>(₩{Math.round(avgBuyPriceKRW).toLocaleString()})</div>
                      </td>

                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <input 
                            type="number" 
                            value={s.currentPrice || ''} 
                            onChange={(e) => handleCurrentPriceChange(s.id, e.target.value)} 
                            placeholder="현재가"
                            style={{ width: '80px', textAlign: 'center', padding: '4px', border: '1px solid #007bff', borderRadius: '4px' }}
                          /> {unit}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>(₩{Math.round(currentPriceKRW).toLocaleString()})</div>
                      </td>

                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold' }}>{unit} {valuationOrig.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>(₩{Math.round(valuationKRW).toLocaleString()})</div>
                      </td>

                      <td style={{ padding: '10px', textAlign: 'center', color: profitOrig >= 0 ? 'blue' : 'red', fontWeight: 'bold' }}>
                        {returnRate.toFixed(2)}%
                      </td>

                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ color: 'green', fontWeight: 'bold' }}>{unit} {s.totalDividend.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>(₩{Math.round(dividendKRW).toLocaleString()})</div>
                      </td>

                      <td style={{ padding: '10px', textAlign: 'center', color: 'green', fontWeight: 'bold' }}>
                        {divYield.toFixed(2)}%
                      </td>

                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteStock(s.id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fafafa' }}>
            <h4>새 종목 추가</h4>
            <form onSubmit={handleAddStock} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="종목명 (예: SCHD)" value={newStockName} onChange={(e) => setNewStockName(e.target.value)} style={{ padding: '8px', flex: 1 }} />
              <select value={newStockCurrency} onChange={(e) => setNewStockCurrency(e.target.value)} style={{ padding: '8px' }}>
                <option value="원 (₩)">원화 (₩)</option>
                <option value="달러 ($)">달러 ($)</option>
              </select>
              <button type="submit" style={{ background: '#007bff', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '4px', cursor: 'pointer' }}>추가</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'buys' && (
        <div>
          <h3>매수 기록 관리</h3>
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fafafa', marginBottom: '20px' }}>
            <form onSubmit={handleAddBuy} style={{ display: 'flex', gap: '10px' }}>
              <select value={selectedStockId} onChange={(e) => setSelectedStockId(e.target.value)} style={{ padding: '8px', flex: 1 }}>
                <option value="">-- 종목 선택 --</option>
                {stocks.map((s) => <option key={s.id} value={s.id}>{s.name || s.symbol} ({s.currency})</option>)}
              </select>
              <input type="number" placeholder="수량" value={buyShares} onChange={(e) => setBuyShares(e.target.value)} style={{ padding: '8px', width: '90px' }} />
              <input type="number" placeholder="매수가" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} style={{ padding: '8px', width: '110px' }} />
              <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '4px', cursor: 'pointer' }}>기록 추가</button>
            </form>
          </div>
          <ul>
            {buys.map((b) => {
              const stock = stocks.find((s) => s.id === b.stockId);
              return (
                <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #eee', marginBottom: '6px', background: '#fff', borderRadius: '4px' }}>
                  <span><b>{stock ? (stock.name || stock.symbol) : ''}</b> - {b.shares}주 @ {b.price}</span>
                  <button onClick={() => handleDeleteBuy(b.id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>삭제</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeTab === 'dividends' && (
        <div>
          <h3>배당금 수령 기록</h3>
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fafafa', marginBottom: '20px' }}>
            <form onSubmit={handleAddDividend} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={divStockId} onChange={(e) => setDivStockId(e.target.value)} style={{ padding: '8px', flex: 1 }}>
                <option value="">-- 종목 선택 --</option>
                {stocks.map((s) => <option key={s.id} value={s.id}>{s.name || s.symbol} ({s.currency})</option>)}
              </select>
              <select value={divYear} onChange={(e) => setDivYear(e.target.value)} style={{ padding: '8px' }}>
                <option value="2025">2025년</option>
                <option value="2026">2026년</option>
                <option value="2027">2027년</option>
              </select>
              <select value={divMonth} onChange={(e) => setDivMonth(e.target.value)} style={{ padding: '8px' }}>
                {['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={divDay} onChange={(e) => setDivDay(e.target.value)} style={{ padding: '8px' }}>
                {Array.from({length: 31}, (_, i) => `${i+1}일`).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="number" placeholder="배당금 금액" value={divAmount} onChange={(e) => setDivAmount(e.target.value)} style={{ padding: '8px', width: '110px' }} />
              <button type="submit" style={{ background: '#28a745', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '4px', cursor: 'pointer' }}>기록 추가</button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f1f1', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>지급일자</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>종목명</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>배당금</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {dividends.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>배당금 수령 기록이 없습니다.</td>
                </tr>
              ) : (
                dividends.map((d) => {
                  const stock = stocks.find((s) => s.id === d.stockId);
                  const unitSymbol = stock && stock.currency === '달러 ($)' ? '$' : '₩';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{d.date}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{stock ? (stock.name || stock.symbol) : '삭제된 종목'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: 'green' }}>
                        {unitSymbol} {d.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteDividend(d.id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>삭제</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}