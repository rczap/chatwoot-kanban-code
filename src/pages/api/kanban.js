export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    
    // Mudamos o filtro para buscar todas as conversas sem travar no escopo do bot
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=open`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Erro Chatwoot: ${response.status}` });
    }
    
    const data = await response.json();
    
    // O Chatwoot pode devolver um objeto com 'data' ou 'payload' contendo a lista
    const conversations = data.data || data.payload || (Array.isArray(data) ? data : []);

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        const status = (conv.status === 'snoozed' || conv.status === 'resolved') ? conv.status : 'open';
        
        const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
        
        let lastMsg = 'Mídia ou Mensagem do Sistema';
        if (conv.messages && conv.messages.length > 0) {
          lastMsg = conv.messages[0].content || lastMsg;
        }

        statusColumns[status].cards.push({
          id: conv.id.toString(),
          display_id: conv.display_id,
          title: contactName,
          contact_name: contactName,
          description: lastMsg,
          last_message: lastMsg
        });
      });
    }

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
