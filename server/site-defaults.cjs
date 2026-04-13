'use strict';

/** Estado inicial (igual ao defaults de dados-site.js) — usado no seed Supabase / arquivo local */
module.exports = {
  events: [
    { id: '1', titulo: 'Encontro Cultural', descricao: 'Um dia de atividades, oficinas e apresentações para toda a família. Local: Sede da Associação.', data: '2026-04-12', hora: '09:00', local: 'Sede da Associação', vagas: 100, inscricoesAtivas: true, publicado: true, destaque: true },
    { id: '2', titulo: 'Workshop Voluntários', descricao: 'Formação para quem quer contribuir com nossos projetos. Inscrição gratuita.', data: '2026-04-26', hora: '14:00', local: 'Sede', vagas: 50, inscricoesAtivas: true, publicado: true, destaque: true },
    { id: '3', titulo: 'Feira Comunitária', descricao: 'Feira de artesanato, gastronomia e troca de experiências. Participe!', data: '2026-05-10', hora: '10:00', local: 'Praça Central', vagas: 0, inscricoesAtivas: false, publicado: true, destaque: true }
  ],
  news: [
    { id: '1', titulo: 'Novo projeto de inclusão digital', categoria: 'Projeto', resumo: 'Iniciamos as aulas de informática básica para a terceira idade. Saiba como participar.', conteudo: '', publicado: true, destaque: true, dataPublicacao: '2026-03-10', exclusivoMembros: false },
    { id: '2', titulo: 'Assembleia geral – convocação', categoria: 'Comunicado', resumo: 'Convocamos todos os associados para a assembleia ordinária. Data e local no link.', conteudo: '', publicado: true, destaque: false, dataPublicacao: '2026-03-05', exclusivoMembros: true }
  ],
  blog: [
    {
      id: '1',
      titulo: 'Como podemos ampliar o voluntariado?',
      categoria: 'Discussão',
      resumo: 'Sugestões e experiências de quem já participa.',
      conteudo: 'Este é um espaço para trocar ideias sobre voluntariado na associação.\n\nPartilhe experiências, dúvidas ou sugestões — o texto completo aparece na página do post.',
      publicado: true,
      dataPublicacao: '2026-03-08'
    }
  ],
  gallery: [
    { id: '1', titulo: 'Evento Cultural 2024', tipo: 'imagem', url: '', categoria: 'Eventos' },
    { id: '2', titulo: 'Workshop Voluntários', tipo: 'imagem', url: '', categoria: 'Eventos' }
  ],
  members: [
    { id: '1', usuario: 'membro', senha: 'demo123', nome: 'Membro', email: 'membro@exemplo.org', telefone: '', tipoAssociado: 'Associado', foto: '', ativo: true },
    { id: '2', usuario: 'admin', senha: 'admin123', nome: 'Administrador', email: '', telefone: '', tipoAssociado: 'Administrador', foto: '', ativo: true }
  ],
  sponsors: [
    { id: '1', nome: 'Patrocinador 1', descricao: '', logo: '', url: '' },
    { id: '2', nome: 'Patrocinador 2', descricao: '', logo: '', url: '' }
  ],
  documents: [
    { id: '1', titulo: 'Ata da Assembleia Geral – Março 2026', arquivo: '', categoria: 'ata', visivel: true },
    { id: '2', titulo: 'Estatuto da Associação', arquivo: '', categoria: 'estatuto', visivel: true },
    { id: '3', titulo: 'Relatório de atividades 2024', arquivo: '', categoria: 'relatorio', visivel: true }
  ],
  institutional: {
    historia: 'Nossa associação nasceu do desejo de unir a comunidade em torno de causas comuns. Ao longo dos anos, crescemos e ampliamos nosso impacto, sempre mantendo os valores de solidariedade e inclusão.',
    missao: 'Promover o desenvolvimento social e cultural da comunidade, através de projetos, eventos e ações que fortaleçam os laços entre as pessoas e incentivem a participação cidadã.',
    visao: 'Ser referência em ações comunitárias e culturais na região, reconhecida pela transparência, pelo impacto positivo e pela capacidade de mobilizar pessoas em prol do bem comum.',
    objetivos: ['Realizar eventos culturais e formativos', 'Fomentar o voluntariado e a participação', 'Manter canal aberto de comunicação com a sociedade', 'Preservar e divulgar a memória e a cultura local'],
    email: 'contato@associacao.org.br',
    telefone: '(00) 0000-0000',
    facebook: '',
    instagram: '',
    youtube: ''
  },
  admin_users: [
    { id: '1', usuario: 'admin', senha: 'admin123', nome: 'Administrador', perfil: 'admin' },
    { id: '2', usuario: 'editor', senha: 'editor123', nome: 'Editor', perfil: 'editor' }
  ],
  inscricoes: [],
  /** Mensagens do formulário público de contato (site/contato.html). */
  mensagens_contato: [],
  /** Intenções de doação (site/doar.html) — não é pagamento; só registo para contacto. */
  pedidos_doacao: [],
  /** Voluntariado e suporte enviados pela área de membros. */
  mensagens_membros: []
};
