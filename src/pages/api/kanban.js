export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  try {
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    
    // Força o Chatwoot a listar conversas de TODOS os agentes (atribuídas ou não)
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=open&assignee_type=all`;
    
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
    
    // O Chatwoot pode envelopar a resposta em data.payload ou data.data
    const conversations = data.payload || data.data || (Array.isArray(data) ? data : []);

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        const status = (conv.status === 'snoozed' || conv.status === 'resolved') ? conv.status : 'open';
        
        // Mapeamento dinâmico do nome do cliente
        const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
        
        // Captura o conteúdo de forma segura
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
