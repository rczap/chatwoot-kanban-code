export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Configurações ausentes no ambiente.' });
  }

  try {
    // Chamada direta para o endpoint de conversas sem filtros conflitantes
    const baseUrl = chatwootUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations`;
    
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
    
    // O Chatwoot pode retornar os dados direto no objeto, dentro de 'payload' ou dentro de 'data'
    let conversations = [];
    if (data && data.payload) {
      conversations = data.payload;
    } else if (Array.isArray(data)) {
      conversations = data;
    } else if (data && data.data) {
      conversations = data.data;
    }

    const statusColumns = {
      'open': { id: 'open', name: 'Em Aberto', cards: [] },
      'snoozed': { id: 'snoozed', name: 'Agendados', cards: [] },
      'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
    };

    if (Array.isArray(conversations)) {
      conversations.forEach(conv => {
        // Mapeia o status da conversa (open, snoozed, resolved)
        const status = conv.status === 'snoozed' || conv.status === 'resolved' ? conv.status : 'open';
        
        // Pega o nome do contato de forma segura vasculhando a estrutura do Chatwoot
        const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
        
        // Pega a última mensagem enviada ou recebida
        const lastMsg = conv.messages && conv.messages.length > 0 
          ? conv.messages[0].content 
          : 'Mídia ou Mensagem do Sistema';

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
