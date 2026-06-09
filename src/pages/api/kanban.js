export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Configurações ausentes no ambiente.' });
  }

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    
    // Injetado o parâmetro &role=administrator para garantir que o Chatwoot libere a fila global
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=all&role=administrator`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'api_access_token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Chatwoot retornou status: ${response.status}` });
    }
    
    const data = await response.json();
    
    // Tratamento robusto para qualquer formato de resposta do Chatwoot (Direct array ou payload)
    const conversations = data.payload || (Array.isArray(data) ? data : data.data || []);

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        const status = conv.status === 'snoozed' || conv.status === 'resolved' ? conv.status : 'open';
        
        const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
        
        // Pega de forma segura o texto da última mensagem da conversa
        let lastMsg = 'Mídia ou Mensagem do Sistema';
        if (conv.messages && conv.messages.length > 0) {
          lastMsg = conv.messages[0].content || lastMsg;
        } else if (conv.last_non_activity_message && conv.last_non_activity_message.content) {
          lastMsg = conv.last_non_activity_message.content;
        }

        statusColumns[status].cards.push({
          id: conv.id.toString(),
          display_id: conv.display_id,
          contact_name: contactName,
          last_message: lastMsg
        });
      });
    }

    return res.status(200).json({ lists: Object.values(statusColumns) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
