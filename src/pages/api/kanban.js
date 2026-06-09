export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Configurações ausentes no ambiente.' });
  }

  try {
    // URL limpa para buscar as conversas da conta
    const apiUrl = `${chatwootUrl.replace(/\/$/, '')}/api/v1/accounts/${accountId}/conversations?status=all`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Chatwoot respondeu com status: ${response.status}` });
    }
    
    const data = await response.json();
    const conversations = data.payload || (Array.isArray(data) ? data : []);

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        const status = conv.status === 'snoozed' || conv.status === 'resolved' ? conv.status : 'open';
        statusColumns[status].cards.push({
          id: conv.id.toString(),
          display_id: conv.display_id,
          contact_name: conv.meta?.sender?.name || 'Cliente sem nome',
          last_message: conv.messages?.[0]?.content || 'Mídia ou Mensagem do Sistema'
        });
      });
    }

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
