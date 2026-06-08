export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token) {
    return res.status(500).json({ error: 'Configurações ausentes.' });
  }

  try {
    // Nova URL focada em trazer todas as conversas ativas da fila, paginando até 100 registros
    const apiUrl = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations?status=all&page=1`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token, 
        'Content-Type': 'application/json' 
      }
    });

    if (!response.ok) throw new Error('Falha ao conectar com a API do Chatwoot');
    const data = await response.json();
    
    // Trata se o retorno vem dentro de payload ou direto no objeto
    const conversations = data.payload || (Array.isArray(data) ? data : []);

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    conversations.forEach(conv => {
      // Garante o mapeamento do status correto ou joga para 'open' por padrão
      const status = conv.status === 'snoozed' || conv.status === 'resolved' ? conv.status : 'open';
      
      statusColumns[status].cards.push({
        id: conv.id.toString(),
        display_id: conv.display_id,
        contact_name: conv.meta?.sender?.name || 'Cliente sem nome',
        last_message: conv.messages?.[0]?.content || 'Mensagem de mídia/sistema'
      });
    });

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
