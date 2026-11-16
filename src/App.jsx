import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 연결 설정 (공유해주신 URL 적용)
const SUPABASE_URL = 'https://xopyxdsxgubzwcojanhm.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_bwBWyCIB6pdHlCfrrLE2tw_unzLXlNv';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [tab, setTab] = useState('holdings');
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({ fx: 1400, stocks: [], buys: [], divs: [] });

  const [stockForm, setStockForm] = useState({ name: '', currency: 'KRW', price: '' });
  const [buyForm, setBuyForm] = useState({ stockId: '', qty: '', price: '' });
  const [divForm, setDivForm] = useState({ stockId: '', net: '' });

  // 1. 앱이 켜질 때 Supabase에서 데이터 불러오기
  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('app_data')
          .select('data')
          .limit(1)
          .single();
        
        if (error) {
          console.error('불러오기 에러 발생:', error.message);
        } else if (data && data.data) {
          setState(data.data);
        }
      } catch (err) {
        console.error('네트워크 또는 통신 에러:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 2. 데이터가 바뀔 때마다 Supabase에 강제 저장하기
  const saveData = async (newState) => {
    setState(newState);
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 1, data: newState });

      if (error) {
        console.error('저장 실패 에러:', error.message);
        alert('저장에 실패했습니다: ' + error.message);
      } else {
        console.log('클라우드 저장 성공!');
      }
    } catch (err) {
      console.error('저장 중 예외 발생:', err);
    }
  };

  const fx = state.fx > 0 ? state.fx : 1400;
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const money = (n, cur) => cur === 'USD' ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : won(n);
  const toKRW = (n, cur) => cur === 'USD' ? n * fx : n;

  // 자산 및 통화별 계산 로직
  const rows = (state.stocks || []).map(s => {
    const cur = s.currency || 'KRW';
    const stockBuys = (state.buys || []).filter(b => b.stockId === s.id);
    const qty = stockBuys.reduce((acc, curItem) => acc + curItem.qty, 0);
    const cost = stockBuys.reduce((acc, curItem) => acc + (curItem.qty * curItem.price), 0);
    const stockDivs = (state.divs || []).filter(d => d.stockId === s.id).reduce((acc, curItem) => acc + curItem.net, 0);
    const value = s.price > 0 ? qty * s.price : cost;
    const pl = value - cost;
    const divReturnRate = cost ? (stockDivs / cost) * 100 : 0;

    return { 
      ...s, 
      cur, 
      qty, 
      cost, 
      div: stockDivs, 
      value, 
      pl, 
      divReturnRate,
      costKRW: toKRW(cost, cur),
      valueKRW: toKRW(value, cur),
      plKRW: toKRW(pl, cur),
      divKRW: toKRW(stockDivs, cur)
    };
  });

  const totalCostKRW = rows.reduce((acc, cur) => acc + cur.costKRW, 0);
  const totalValueKRW = rows.reduce((acc, cur) => acc + cur.valueKRW, 0);
  const totalDivKRW = rows.reduce((acc, cur) => acc + cur.divKRW, 0);
  const totalPlKRW = totalValueKRW - totalCostKRW;
  const totalDivReturnRate = totalCostKRW ? (totalDivKRW / totalCostKRW) * 100 : 0;

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '18px' }}>데이터를 불러오는 중입니다...</div>;
  }

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', background: '#f5f7f6', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>📈 주식모으기 장부</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <span>환율 (원/달러):</span>
          <input 
            type="number" 
            value={state.fx || 1400} 
            onChange={(e) => saveData({ ...state, fx: Number(e.target.value) || 1400 })} 
            style={{ width: '80px', padding: '4px', textAlign: 'right', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>총 투자원금 (원화환산)</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{won(totalCostKRW)}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>총 평가금액</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: totalPlKRW >= 0 ? 'red' : 'blue' }}>{won(totalValueKRW)}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>누적 배당금</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: '#0d6a54' }}>{won(totalDivKRW)}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>배당 회수율</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: '#0d6a54' }}>{totalDivReturnRate.toFixed(2)}%</div>
        </div>
      </div>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setTab('holdings')} style={{ flex: 1, padding: '10px', background: tab === 'holdings' ? '#0d6a54' : '#fff', color: tab === 'holdings' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>보유종목</button>
        <button onClick={() => setTab('buys')} style={{ flex: 1, padding: '10px', background: tab === 'buys' ? '#0d6a54' : '#fff', color: tab === 'buys' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>매수기록</button>
        <button onClick={() => setTab('divs')} style={{ flex: 1, padding: '10px', background: tab === 'divs' ? '#0d6a54' : '#fff', color: tab === 'divs' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>배당금기록</button>
      </div>

      {/* 컨텐츠 영역 */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd' }}>
        
        {/* 1. 보유종목 탭 */}
        {tab === 'holdings' && (
          <div>
            <h2>보유종목 현황</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', textAlign: 'right', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd', fontSize: '13px', color: '#666' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>종목명</th>
                    <th style={{ padding: '8px' }}>통화</th>
                    <th style={{ padding: '8px' }}>수량</th>
                    <th style={{ padding: '8px' }}>투자원금</th>
                    <th style={{ padding: '8px' }}>현재가</th>
                    <th style={{ padding: '8px' }}>평가손익</th>
                    <th style={{ padding: '8px' }}>배당금</th>
                    <th style={{ padding: '8px' }}>배당회수율</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>등록된 종목이 없습니다. 아래에서 추가해주세요.</td></tr>
                  ) : (
                    rows.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>{r.name}</td>
                        <td style={{ padding: '8px' }}>
                          <select 
                            value={r.cur} 
                            onChange={(e) => {
                              const newCur = e.target.value;
                              const updatedStocks = state.stocks.map(st => st.id === r.id ? { ...st, currency: newCur } : st);
                              saveData({ ...state, stocks: updatedStocks });
                            }}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                          >
                            <option value="KRW">원화 (₩)</option>
                            <option value="USD">달러 ($)</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>{r.qty}주</td>
                        <td style={{ padding: '8px' }}>{money(r.cost, r.cur)}</td>
                        <td style={{ padding: '8px' }}>
                          <input 
                            type="number" 
                            defaultValue={r.price || ''} 
                            onBlur={(e) => {
                              const val = Number(e.target.value) || 0;
                              const updatedStocks = state.stocks.map(st => st.id === r.id ? { ...st, price: val } : st);
                              saveData({ ...state, stocks: updatedStocks });
                            }}
                            placeholder="현재가" 
                            style={{ width: '80px', padding: '4px', textAlign: 'right' }} 
                          />
                        </td>
                        <td style={{ padding: '8px', color: r.pl >= 0 ? 'red' : 'blue' }}>{money(r.pl, r.cur)}</td>
                        <td style={{ padding: '8px' }}>{money(r.div, r.cur)}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#0d6a54' }}>{r.divReturnRate.toFixed(2)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginTop: '24px', fontSize: '16px' }}>종목 추가</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!stockForm.name) return;
              const newStocks = [...(state.stocks || []), { 
                id: Date.now().toString(), 
                name: stockForm.name, 
                currency: stockForm.currency, 
                price: Number(stockForm.price) || 0 
              }];
              saveData({ ...state, stocks: newStocks });
              setStockForm({ name: '', currency: 'KRW', price: '' });
            }} style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="종목명 (예: SCHD)" value={stockForm.name} onChange={e => setStockForm({ ...stockForm, name: e.target.value })} style={{ flex: 2, minWidth: '150px', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required />
              <select value={stockForm.currency} onChange={e => setStockForm({ ...stockForm, currency: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
                <option value="KRW">원화 (₩)</option>
                <option value="USD">달러 ($)</option>
              </select>
              <button type="submit" style={{ padding: '8px 16px', background: '#0d6a54', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>추가</button>
            </form>
          </div>
        )}

        {/* 2. 매수기록 탭 */}
        {tab === 'buys' && (
          <div>
            <h2>매수 기록하기</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!buyForm.stockId) return alert('종목을 선택하세요.');
              const newBuys = [...(state.buys || []), { id: Date.now().toString(), stockId: buyForm.stockId, qty: Number(buyForm.qty), price: Number(buyForm.price) }];
              saveData({ ...state, buys: newBuys });
              setBuyForm({ stockId: '', qty: '', price: '' });
            }} style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
              <select value={buyForm.stockId} onChange={e => setBuyForm({ ...buyForm, stockId: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required>
                <option value="">종목 선택</option>
                {(state.stocks || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.currency || 'KRW'})</option>)}
              </select>
              <input type="number" placeholder="수량" value={buyForm.qty} onChange={e => setBuyForm({ ...buyForm, qty: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required />
              <input type="number" placeholder="매수 단가 (해당 통화 기준)" value={buyForm.price} onChange={e => setBuyForm({ ...buyForm, price: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required />
              <button type="submit" style={{ padding: '10px', background: '#0d6a54', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>매수 기록 추가</button>
            </form>
          </div>
        )}

        {/* 3. 배당금기록 탭 */}
        {tab === 'divs' && (
          <div>
            <h2>배당금 기록하기</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!divForm.stockId) return alert('종목을 선택하세요.');
              const newDivs = [...(state.divs || []), { id: Date.now().toString(), stockId: divForm.stockId, net: Number(divForm.net) }];
              saveData({ ...state, divs: newDivs });
              setDivForm({ stockId: '', net: '' });
            }} style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
              <select value={divForm.stockId} onChange={e => setDivForm({ ...divForm, stockId: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required>
                <option value="">종목 선택</option>
                {(state.stocks || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.currency || 'KRW'})</option>)}
              </select>
              <input type="number" placeholder="받은 배당금 (해당 통화 기준 세후)" value={divForm.net} onChange={e => setDivForm({ ...divForm, net: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} required />
              <button type="submit" style={{ padding: '10px', background: '#0d6a54', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>배당금 기록 추가</button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}