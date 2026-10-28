// dernier message d'une conversation, tel que la liste le resume (le texte est deja coupe par le back)
export interface LastMessage {
  preview: string | null;
  moderated: boolean;
  fromMe: boolean;
  isSystem: boolean;
  hasAttachment: boolean;
  createdAt: string;
}

// une ligne de GET /api/producer/conversations. open = en cours, reported = signalee et pas encore tranchee
export interface ProducerConversation {
  id: string;
  requestId: string;
  // "Client" sans abonnement valide
  clientName: string;
  clientType: 'individual' | 'professional';
  product: string | null;
  quantity: number | null;
  unit: string | null;
  status: 'open' | 'archived' | 'reported' | 'closed';
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage: LastMessage | null;
}

// piece jointe d'un message ; url est signee et expire (generee par le back a chaque lecture)
export interface MessageFile {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  url: string;
}

export interface ThreadMessage {
  id: string;
  senderId: string | null;
  // null quand le message est masque par la moderation
  content: string | null;
  moderated: boolean;
  isSystem: boolean;
  createdAt: string;
  // lu par l'autre personne (null tant que non lu)
  readAt: string | null;
  attachments: MessageFile[];
}

// GET /api/conversations/{id} : le fil, du plus ancien au plus recent. Le lire marque comme lus les messages du client
export interface Thread {
  id: string;
  requestId: string;
  status: ProducerConversation['status'];
  messages: ThreadMessage[];
}
