export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    
    // USANDO FILTRO AMPLO: Traz absolutamente tudo o que está aberto na conta, sem travar em agente
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=all&assignee_type=all`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Se falhar na primeira tentativa, tenta a rota alternativa de listagem direta por metadados
    let conversations = [];
    if (response.ok) {
      const data = await response.json();
      conversations = data.payload || data.data || (Array.isArray(data) ? data : []);
    }

    // Se a rota global falhar ou vier zerada, usamos o plano de contingência (puxar o feed geral por páginas)
    if (conversations.length === 0) {
      const fallbackUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?page=1`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'GET',
        headers: { 'api_access_token': token, 'Content-Type': 'application/json' }
      });
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        conversations = fallbackData.payload || fallbackData.data || (Array.isArray(fallbackData) ? fallbackData : []);
      }
    }

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        // Força cair em uma das três colunas do seu Kanban
        let status = conv.status;
        if (!statusColumns[status]) {
          status = 'open';
        }
        
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
