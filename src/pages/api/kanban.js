export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token) {
    return res.status(500).json({ error: 'Configurações de variáveis de ambiente do Chatwoot estão ausentes.' });
  }

  try {
    // Adicionado filtros para trazer conversas atribuídas, não atribuídas e de todos os status
    const apiUrl = `${chatwootUrl}/api/v1/accounts/${accountId}/conversations?status=all&conversation_type=all`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token, 
        'Content-Type': 'application/json' 
      }
    });

    if (!response.ok) throw new Error('Falha ao conectar com a API do Chatwoot');
    const data = await response.json();
    
    // Se o Chatwoot retornar a estrutura dentro de data.payload ou direto em data
    const conversations = data.payload || data || [];

    // Organiza as conversas nas colunas padrões do Kanban por status
    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        const status = conv.status || 'open';
        if (statusColumns[status]) {
          statusColumns[status].cards.push({
            id: conv.id.toString(),
            display_id: conv.display_id,
            contact_name: conv.meta?.sender?.name || 'Cliente sem nome',
            last_message: conv.messages?.[0]?.content || 'Mensagem de mídia/sistema'
          });
        }
      });
    }

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
