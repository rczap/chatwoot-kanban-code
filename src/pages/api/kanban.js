export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token) {
    return res.status(500).json({ error: 'Configurações de variáveis de ambiente do Chatwoot estão ausentes.' });
  }

  try {
    // Faz a chamada oficial na API do Chatwoot buscando as conversas abertas
    const response = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations`, {
      method: 'GET',
      headers: { 'api_access_token': token, 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Falha ao conectar com a API do Chatwoot');
    const data = await response.json();
    const conversations = data.payload || [];

    // Organiza as conversas nas colunas padrões do Kanban por status
    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    conversations.forEach(conv => {
      const status = conv.status || 'open';
      if (statusColumns[status]) {
        statusColumns[status].cards.push({
          id: conv.id.toString(),
          display_id: conv.display_id,
          contact_name: conv.meta?.sender?.name,
          last_message: conv.messages?.[0]?.content || 'Mensagem de mídia/sistema'
        });
      }
    });

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
