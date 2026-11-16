import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (본인의 Supabase URL과 Anon Key 사용)
const SUPABASE_URL = 'https://xopyxdsxgubzwcojanhm.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_secret_HsXSKSZzlABjcG5wB2Nm9Q_xIIVxh2z';
// 주의: 기존에 작성하신 프로젝트 내의 supabase 연동 코드가 있다면 그 코드를 그대로 사용하셔도 됩니다.
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [activeTab, setActiveTab] = useState('stocks'); // 'stocks' | 'buys' | 'dividends'
  const [exchangeRate, setExchangeRate] = useState(1400);
  
  const [stocks, setStocks] = useState([]);
  const [buys, setBuys] = useState([]);
  const [dividends, setDividends] = useState([]);

  // 입력폼 상태
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockCurrency, setNewStockCurrency] = useState('원화 (₩)');

  const [buyStockSymbol, setBuyStockSymbol] = useState('');
  const [buyShares, setBuyShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  // 배당금 입력 (년, 월, 일 분리)
  const [divStockSymbol, setDivStockSymbol] = useState('');
  const [divYear, setDivYear] = useState(new Date().getFullYear().toString());
  const [divMonth, setDivMonth] = useState('1');
  const [divDay, setDivDay] = useState('1');
  const [divAmount, setDivAmount] = useState('');

  // 데이터 불러오기
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase.from('app_data').select('*').eq('id', 1).single();
    if (data && data.data) {
      setStocks(data.data.stocks || []);
      setBuys(data.data.buys || []);
      setDividends(data.data.dividends || []);
      if (data.data.exchangeRate) setExchangeRate(data.data.exchangeRate);
    }
  }

  // 데이터 저장하기
  async function saveData(newStocks, newBuys, newDividends, newRate) {
    const payload = {
      stocks: newStocks || stocks,
      buys: newBuys || buys,
      dividends: newDividends || dividends,
      exchangeRate: newRate !== undefined ? newRate : exchangeRate,
    };

    const { error } = await supabase
      .from('app_data')
      .upsert({ id: 1, data: payload });

    if (error) {
      alert('저장에 실패했습니다: ' + error.message);
    }
  }

  // 환율 변경
  const handleRateChange = (e) => {
    const val = Number(e.target.value);
    setExchangeRate(val);
    saveData(stocks, buys, dividends, val);
  };

  // 1. 종목 추가
  const addStock = (e) => {
    e.preventDefault();
    if (!newStockSymbol.trim()) return;
    const symbol = newStockSymbol.toUpperCase().trim();
    if (stocks.some(s => s.symbol === symbol)) {
      alert('이미 존재하는 종목입니다.');
      return;
    }
    const updated = [...stocks, { symbol, currency: newStockCurrency, currentPrice: 0 }];
    setStocks(updated);
    saveData(updated, buys, dividends);
    setNewStockSymbol('');
  };

  // 종목 삭제
  const deleteStock = (symbol) => {
    if (!window.confirm(`${symbol} 종목을 삭제하시겠습니까? 관련된 매수 및 배당 기록도 함께 정리됩니다.`)) return;
    const updatedStocks = stocks.filter(s => s.symbol !== symbol);
    const updatedBuys = buys.filter(b => b.symbol !== symbol);
    const updatedDivs = dividends.filter(d => d.symbol !== symbol);
    
    setStocks(updatedStocks);
    setBuys(updatedBuys);
    setDividends(updatedDivs);
    saveData(updatedStocks, updatedBuys, updatedDivs);
  };

  // 2. 매수 기록 추가
  const addBuy = (e) => {
    e.preventDefault();
    if (!buyStockSymbol || !buyShares || !buyPrice) return;
    const updated = [...buys, { id: Date.now(), symbol: buyStockSymbol, shares: Number(buyShares), price: Number(buyPrice) }];
    setBuys(updated);
    saveData(stocks, updated, dividends);
    setBuyShares('');
    setBuyPrice('');
  };

  // 3. 배당금 기록 추가 (년, 월, 일 포함)
  const addDividend = (e) => {
    e.preventDefault();
    if (!divStockSymbol || !divAmount) return;
    const updated = [...dividends, { 
      id: Date.now(), 
      symbol: divStockSymbol, 
      year: divYear, 
      month: divMonth, 
      day: divDay, 
      amount: Number(divAmount) 
    }];
    setDividends(updated);
    saveData(stocks, buys, updated);
    setDivAmount('');
  };

  // 계산 로직
  // 종목별 수량, 투자원금 계산
  const stockSummary = stocks.map(stock => {
    const stockBuys = buys.filter(b => b.symbol === stock.symbol);
    const totalShares = stockBuys.reduce((acc, cur) => acc + cur.shares, 0);
    const totalInvested = stockBuys.reduce((acc, cur) => acc + (cur.shares * cur.price), 0);
    
    const stockDivs = dividends.filter(d => d.symbol === stock.symbol);
    const totalDiv = stockDivs.reduce((acc, cur) => acc + cur.amount, 0);

    // 종목별 배당 회수율 (배당금 / 투자원금 * 100)
    const divReturnRate = totalInvested > 0 ? (totalDiv / totalInvested) * 100 : 0;

    return {
      ...stock,
      totalShares,
      totalInvested,
      totalDiv,
      divReturnRate,
    };
  });

  const totalInvestedKRW = stockSummary.reduce((acc, cur) => {
    return acc + (cur.currency === '달러 ($)' ? cur.totalInvested * exchangeRate : cur.totalInvested);
  }, 0);

  const totalDividend = dividends.reduce((acc, cur) => acc + cur.amount, 0);
  const totalReturnRate = totalInvestedKRW > 0 ? (totalDividend / totalInvestedKRW) * 100 : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>📈 주식모으기 장부</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label>환율 (원/달러):</label>
        <input type="number" value={exchangeRate} onChange={handleRateChange} style={{ padding: '4px', width: '100px' }} />
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>총 투자원금 (원화환산)</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>{Math.round(totalInvestedKRW).toLocaleString()}원</div>
        </div>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>누적 배당금</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px', color: '#2b8a3e' }}>{totalDividend.toLocaleString()}원</div>
        </div>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ fontSize: '13px', color: '#6c757d' }}>전체 배당 회수율</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px', color: '#1864ab' }}>{totalReturnRate.toFixed(2)}%</div>
        </div>
      </div>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('stocks')} style={tabStyle(activeTab === 'stocks')}>보유종목 현황</button>
        <button onClick={() => setActiveTab('buys')} style={tabStyle(activeTab === 'buys')}>매수기록</button>
        <button onClick={() => setActiveTab('dividends')} style={tabStyle(activeTab === 'dividends')}>배당금기록</button>
      </div>

      {/* 1. 보유종목 탭 */}
      {activeTab === 'stocks' && (
        <div>
          <h3>보유종목 현황</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={thStyle}>종목명</th>
                <th style={thStyle}>통화</th>
                <th style={thStyle}>수량</th>
                <th style={thStyle}>투자원금</th>
                <th style={thStyle}>누적 배당금</th>
                <th style={thStyle}>종목별 배당회수율</th>
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {stockSummary.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#868e96' }}>등록된 종목이 없습니다. 아래에서 종목을 추가해주세요.</td></tr>
              ) : (
                stockSummary.map(s => (
                  <tr key={s.symbol} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={tdStyle}><b>{s.symbol}</b></td>
                    <td style={tdStyle}>{s.currency}</td>
                    <td style={tdStyle}>{s.totalShares}주</td>
                    <td style={tdStyle}>{s.currency === '달러 ($)' ? `$${s.totalInvested.toFixed(2)}` : `${s.totalInvested.toLocaleString()}원`}</td>
                    <td style={tdStyle}>${s.totalDiv.toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: '#1864ab', fontWeight: 'bold' }}>{s.divReturnRate.toFixed(2)}%</td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteStock(s.symbol)} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>삭제</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h4>종목 추가</h4>
          <form onSubmit={addStock} style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="종목명 (예: SCHD)" value={newStockSymbol} onChange={e => setNewStockSymbol(e.target.value)} style={inputStyle} />
            <select value={newStockCurrency} onChange={e => setNewStockCurrency(e.target.value)} style={inputStyle}>
              <option>원화 (₩)</option>
              <option>달러 ($)</option>
            </select>
            <button type="submit" style={btnStyle}>추가</button>
          </form>
        </div>
      )}

      {/* 2. 매수기록 탭 */}
      {activeTab === 'buys' && (
        <div>
          <h3>매수 기록 관리</h3>
          <form onSubmit={addBuy} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <select value={buyStockSymbol} onChange={e => setBuyStockSymbol(e.target.value)} style={inputStyle}>
              <option value="">종목 선택</option>
              {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
            </select>
            <input type="number" placeholder="수량" value={buyShares} onChange={e => setBuyShares(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="매수가격" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} style={inputStyle} />
            <button type="submit" style={btnStyle}>매수 기록 추가</button>
          </form>

          <ul>
            {buys.map(b => (
              <li key={b.id} style={{ marginBottom: '8px' }}>
                <b>{b.symbol}</b> - {b.shares}주 @ {b.price}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. 배당금기록 탭 (년, 월, 일 입력 추가) */}
      {activeTab === 'dividends' && (
        <div>
          <h3>배당금 수령 기록</h3>
          <form onSubmit={addDividend} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            <select value={divStockSymbol} onChange={e => setDivStockSymbol(e.target.value)} style={inputStyle}>
              <option value="">종목 선택</option>
              {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
            </select>
            
            <input type="text" placeholder="년도 (예: 2026)" value={divYear} onChange={e => setDivYear(e.target.value)} style={inputStyle} />
            
            <select value={divMonth} onChange={e => setDivMonth(e.target.value)} style={inputStyle}>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>

            <select value={divDay} onChange={e => setDivDay(e.target.value)} style={inputStyle}>
              {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>

            <input type="number" placeholder="배당금 ($)" value={divAmount} onChange={e => setDivAmount(e.target.value)} style={inputStyle} />
            
            <button type="submit" style={btnStyle}>기록 추가</button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={thStyle}>지급일자</th>
                <th style={thStyle}>종목명</th>
                <th style={thStyle}>배당금</th>
              </tr>
            </thead>
            <tbody>
              {dividends.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#868e96' }}>배당금 수령 기록이 없습니다.</td></tr>
              ) : (
                dividends.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={tdStyle}>{d.year}년 {d.month}월 {d.day}일</td>
                    <td style={tdStyle}><b>{d.symbol}</b></td>
                    <td style={{ ...tdStyle, color: '#2b8a3e' }}>${d.amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 스타일 헬퍼
const tabStyle = (active) => ({
  padding: '8px 16px',
  background: active ? '#228be6' : '#f1f3f5',
  color: active ? 'white' : '#495057',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold'
});

const thStyle = { padding: '10px', borderBottom: '2px solid #dee2e6' };
const tdStyle = { padding: '10px' };
const inputStyle = { padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' };
const btnStyle = { padding: '8px 16px', background: '#228be6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };