import { useState, useEffect } from 'react';

export default function Kanban() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca as colunas/listas do Chatwoot organizadas para o Kanban
    fetch('/api/kanban')
      .then((res) => res.json())
      .then((data) => {
        setLists(data.lists || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f4f5f7' }}>
        <h3>Carregando seu Painel Kanban...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f5f7', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px', borderBottom: '1px solid #e1e4e8', paddingBottom: '10px' }}>
        <h1 style={{ color: '#1f2d3d', margin: 0 }}>Chatwoot Kanban</h1>
        <p style={{ color: '#5e6c84', margin: '5px 0 0 0' }}>Gerencie seus atendimentos em colunas</p>
      </header>

      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', alignItems: 'flex-start', paddingBottom: '15px' }}>
        {lists.length === 0 ? (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#5e6c84' }}>Nenhuma coluna configurada ou nenhum atendimento encontrado no seu Chatwoot.</p>
          </div>
        ) : (
          lists.map((list) => (
            <div key={list.id} style={{ background: '#ebecf0', borderRadius: '8px', width: '280px', padding: '10px', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#172b4d', textTransform: 'uppercase' }}>{list.name} ({list.cards?.length || 0})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {list.cards?.map((card) => (
                  <div key={card.id} style={{ background: '#fff', padding: '10px', borderRadius: '6px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', color: '#5e6c84', display: 'block' }}>#{card.display_id}</span>
                    <strong style={{ display: 'block', margin: '4px 0', color: '#172b4d', fontSize: '14px' }}>{card.contact_name || 'Cliente sem nome'}</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4c5e7d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.last_message || 'Sem mensagens'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
