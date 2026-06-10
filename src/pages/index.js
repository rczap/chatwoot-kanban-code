import { useState, useEffect } from 'react';

export default function Kanban() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. BUSCA OS DADOS DA API DO KANBAN
  const carregarDados = () => {
    fetch('/api/kanban')
      .then((res) => res.json())
      .then((data) => {
        setLists(data.lists || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // 2. LÓGICA DE CLIQUE CORRETA VIA POSTMESSAGE (SEM QUEBRAR A URL)
  const abrirConversaNoChatwoot = (conversationId) => {
    if (typeof window !== 'undefined' && window.parent) {
      // Captura o ID da conta direto dos parâmetros da URL de forma dinâmica
      const urlParams = new URLSearchParams(window.location.search);
      const accountId = urlParams.get('account_id') || '1';
      
      // Criamos os dois formatos de rota que o Chatwoot aceita nativamente via postMessage
      const targetUrl = `/app/accounts/${accountId}/conversations/${conversationId}`;

      // Envia como Objeto
      window.parent.postMessage({
        event: 'setUrl',
        url: targetUrl
      }, '*');

      // Envia como String (JSON) para garantir compatibilidade se a versão divergir
      window.parent.postMessage(
        JSON.stringify({
          event: 'setUrl',
          url: targetUrl
        }),
        '*'
      );
    }
  };

  // 3. FUNÇÕES NATIVAS DO ARRASTAR E SOLTAR (HTML5)
  const handleDragStart = (e, cardId, sourceListId) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('sourceListId', sourceListId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e, targetListId) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const sourceListId = e.dataTransfer.getData('sourceListId');

    if (sourceListId === targetListId) return;

    // Atualiza o visual na tela imediatamente (Otimização de UX)
    const novasListas = [...lists];
    let cardMovido = null;

    novasListas.forEach(lista => {
      if (lista.id === sourceListId) {
        cardMovido = lista.cards.find(c => c.id === cardId);
        lista.cards = lista.cards.filter(c => c.id !== cardId);
      }
    });

    if (cardMovido) {
      novasListas.forEach(lista => {
        if (lista.id === targetListId) {
          lista.cards.push(cardMovido);
        }
      });
      setLists(novasListas);
    }

    // Salva a mudança enviando o comando para o Chatwoot via API
    try {
      const response = await fetch('/api/kanban', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: cardId, targetColumnId: targetListId })
      });

      if (!response.ok) {
        carregarDados(); // Se falhar, restaura a posição correta
        alert('Não foi possível mover o status no Chatwoot.');
      }
    } catch (error) {
      carregarDados();
    }
  };

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
            <p style={{ color: '#5e6c84' }}>Nenhuma coluna configurada ou nenhum atendimento encontrado.</p>
          </div>
        ) : (
          lists.map((list) => (
            <div 
              key={list.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, list.id)}
              style={{ background: '#ebecf0', borderRadius: '8px', width: '280px', padding: '10px', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', minHeight: '400px' }}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#172b4d', textTransform: 'uppercase' }}>{list.name} ({list.cards?.length || 0})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '350px' }}>
                {list.cards?.map((card) => (
                  <div 
                    key={card.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id, list.id)}
                    onClick={() => abrirConversaNoChatwoot(card.id)}
                    style={{ 
                      background: '#fff', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      boxShadow: '0 1px 1px rgba(0,0,0,0.1)', 
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
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
