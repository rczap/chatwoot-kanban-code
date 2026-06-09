export default async function handler(req, res) {
  const chatwootUrl = process.env.CHATWOOT_URL;
  const token = process.env.CHATWOOT_ACCESS_TOKEN;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;

  if (!chatwootUrl || !token || !accountId) {
    return res.status(500).json({ error: 'Variáveis de ambiente ausentes.' });
  }

  const baseUrl = chatwootUrl.replace(/\/$/, '');

  // --- ARRASTAR E SOLTAR (POST/PUT) ---
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const cardId = req.body.cardId || req.body.id || req.body.conversationId;
      let targetStatus = req.body.targetColumnId || req.body.columnId || req.body.status;

      if (!cardId || !targetStatus) {
        return res.status(400).json({ error: 'Identificadores ausentes.' });
      }

      targetStatus = targetStatus.toString().toLowerCase();
      // Mapeamento caso o front envie o novo nome personalizado ao arrastar
      if (targetStatus.includes('aberto') || targetStatus.includes('retorno')) targetStatus = 'open';
      if (targetStatus.includes('agendado') || targetStatus.includes('atendimento') || targetStatus.includes('snoozed')) targetStatus = 'snoozed';
      if (targetStatus.includes('resolvido') || targetStatus.includes('resolved')) targetStatus = 'resolved';

      const updateUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${cardId}`;
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'api_access_token': token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `O Chatwoot recusou a alteração.` });
      }

      return res.status(200).json({ success: true, id: cardId, status: targetStatus });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- LISTAR AS CONVERSAS (GET) ---
  if (req.method === 'GET') {
    try {
      const apiUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations?status=all&assignee_type=all`;
      
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
      
      let conversations = [];
      if (data && data.data && data.data.payload) {
        conversations = data.data.payload;
      } else if (data && data.payload) {
        conversations = data.payload;
      } else if (data && data.data) {
        conversations = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        conversations = data;
      }

      // NOMES ALTERADOS AQUI: Personalização visual das colunas do Kanban
      const statusColumns = {
        'open': { id: 'open', name: 'Retorno do envio', cards: [] },
        'snoozed': { id: 'snoozed', name: 'Em atendimento', cards: [] },
        'resolved': { id: 'resolved', name: 'Resolvidos', cards: [] }
      };

      const vistos = new Set();

      if (Array.isArray(conversations)) {
        conversations.forEach(conv => {
          const status = (conv.status === 'snoozed' || conv.status === 'resolved') ? conv.status : 'open';
          const contactId = conv.meta?.sender?.id || conv.contact?.id || conv.id;
          
          if (vistos.has(contactId)) {
            return;
          }
          vistos.add(contactId);

          const contactName = conv.meta?.sender?.name || conv.contact?.name || 'Cliente sem nome';
          
          let lastMsg = 'Mídia ou Mensagem do Sistema';
          if (conv.messages && conv.messages.length > 0) {
            lastMsg = conv.messages[0].content || lastMsg;
          } else if (conv.last_non_activity_message && conv.last_non_activity_message.content) {
            lastMsg = conv.last_non_activity_message.content;
          }

          statusColumns[status].cards.push({
            id: conv.id.toString(),
            cardId: conv.id.toString(),
            conversationId: conv.id.toString(),
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
}
