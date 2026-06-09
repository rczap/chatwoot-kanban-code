import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const eventData = req.body;

    // Verifica se o evento recebido é de mudança ou atualização de conversa
    if (eventData && (eventData.event === 'conversation_updated' || eventData.event === 'conversation_created')) {
      const conversationId = eventData.id;
      const newStatus = eventData.status; // open, snoozed, resolved

      // Se o seu projeto salva os cartões localmente no banco SQLite para ordenação:
      // Esse bloco atualiza o status do card de forma correspondente
      try {
        await prisma.card.updateMany({
          where: { id: conversationId.toString() },
          data: { columnId: newStatus }
        });
      } catch (dbError) {
        // Se a sua estrutura visual ler direto do Chatwoot sem persistência local rígida,
        // o log abaixo evita que a API quebre.
        console.log('Card local não encontrado para atualizar via DB, ignorando reordenação física.');
      }

      return res.status(200).json({ success: true, message: 'Status atualizado no Kanban com sucesso!' });
    }

    return res.status(200).json({ success: true, message: 'Evento recebido, mas não exigia ação.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
