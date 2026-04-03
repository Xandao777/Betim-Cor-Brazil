(function () {
  'use strict';

  var CHAVE = 'adminSession';
  var D = window.DadosSite;
  if (!D) return;

  var sessao = null;
  try {
    var raw = sessionStorage.getItem(CHAVE);
    sessao = raw ? JSON.parse(raw) : null;
  } catch (e) {}
  if (!sessao) {
    window.location.href = 'index.html';
    return;
  }

  // Logout: limpar sessão ao clicar em Sair
  document.querySelectorAll('.admin-sidebar .sair a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      sessionStorage.removeItem(CHAVE);
      window.location.href = 'index.html';
    });
  });

  var perfil = sessao.perfil || 'editor';
  var isAdmin = perfil === 'admin';

  // Mostrar usuário e esconder itens restritos a admin
  var infoEl = document.getElementById('admin-usuario-info');
  if (infoEl) infoEl.textContent = 'Logado como ' + sessao.nome + ' (' + perfil + '). ';
  var sidebar = document.querySelector('.admin-sidebar');
  if (sidebar && !isAdmin) {
    [].slice.call(sidebar.querySelectorAll('a[data-secao]')).forEach(function (a) {
      var secao = a.getAttribute('data-secao');
      if (secao === 'membros' || secao === 'documentos' || secao === 'institucional') {
        a.style.display = 'none';
      }
    });
  }

  function id() { return Math.random().toString(36).slice(2, 10); }

  // Navegação entre seções
  document.querySelectorAll('.admin-sidebar a[data-secao]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var secao = this.getAttribute('data-secao');
      document.querySelectorAll('.admin-sidebar a[data-secao]').forEach(function (a) { a.classList.remove('ativo'); });
      this.classList.add('ativo');
      document.querySelectorAll('.admin-secao').forEach(function (s) { s.classList.remove('ativo'); });
      var el = document.getElementById('secao-' + secao);
      if (el) el.classList.add('ativo');
      if (secao === 'dashboard') atualizarDashboard();
    });
  });

  function atualizarDashboard() {
    var events = D.getEvents() || [];
    var news = D.getNews() || [];
    var members = D.getMembers() || [];
    var elE = document.getElementById('dashboard-events-count');
    var elN = document.getElementById('dashboard-news-count');
    var elM = document.getElementById('dashboard-members-count');
    if (elE) elE.textContent = 'Eventos: ' + events.length;
    if (elN) elN.textContent = 'Notícias: ' + news.length;
    if (elM) elM.textContent = 'Membros: ' + members.length;
  }
  atualizarDashboard();

  // ---- EVENTOS ----
  var formEventoCard = document.getElementById('form-evento-card');
  var formEvento = document.getElementById('form-evento');
  function renderEventos() {
    var tbody = document.querySelector('#tabela-eventos tbody');
    if (!tbody) return;
    var list = D.getEvents() || [];
    tbody.innerHTML = list.map(function (e) {
      return '<tr><td>' + (e.titulo || '') + '</td><td>' + (e.data || '') + '</td><td>' + (e.publicado ? 'Sim' : 'Não') + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-evento" data-id="' + e.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-evento" data-id="' + e.id + '">Excluir</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('.btn-edit-evento').forEach(function (b) {
      b.addEventListener('click', function () { editarEvento(this.getAttribute('data-id')); });
    });
    tbody.querySelectorAll('.btn-remove-evento').forEach(function (b) {
      b.addEventListener('click', function () { if (confirm('Excluir este evento?')) removerEvento(this.getAttribute('data-id')); });
    });
  }
  function editarEvento(id) {
    var list = D.getEvents() || [];
    var e = list.find(function (x) { return x.id === id; });
    if (!e) return;
    document.getElementById('evento-id').value = e.id;
    document.getElementById('evento-titulo').value = e.titulo || '';
    document.getElementById('evento-descricao').value = e.descricao || '';
    document.getElementById('evento-data').value = e.data || '';
    document.getElementById('evento-hora').value = (e.hora || '').slice(0, 5);
    document.getElementById('evento-local').value = e.local || '';
    document.getElementById('evento-vagas').value = e.vagas !== undefined ? e.vagas : 0;
    document.getElementById('evento-inscricoes').checked = !!e.inscricoesAtivas;
    document.getElementById('evento-publicado').checked = e.publicado !== false;
    document.getElementById('evento-destaque').checked = !!e.destaque;
    document.getElementById('form-evento-titulo').textContent = 'Editar evento';
    formEventoCard.style.display = 'block';
  }
  function removerEvento(id) {
    var list = (D.getEvents() || []).filter(function (x) { return x.id !== id; });
    D.setEvents(list);
    renderEventos();
    formEventoCard.style.display = 'none';
  }
  document.getElementById('btn-novo-evento').addEventListener('click', function () {
    document.getElementById('evento-id').value = '';
    document.getElementById('form-evento').reset();
    document.getElementById('evento-vagas').value = 0;
    document.getElementById('evento-publicado').checked = true;
    document.getElementById('form-evento-titulo').textContent = 'Novo evento';
    formEventoCard.style.display = 'block';
  });
  document.getElementById('evento-cancelar').addEventListener('click', function () { formEventoCard.style.display = 'none'; });
  if (formEvento) {
    formEvento.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = D.getEvents() || [];
      var rec = {
        id: document.getElementById('evento-id').value || id(),
        titulo: document.getElementById('evento-titulo').value.trim(),
        descricao: document.getElementById('evento-descricao').value.trim(),
        data: document.getElementById('evento-data').value,
        hora: document.getElementById('evento-hora').value || '',
        local: document.getElementById('evento-local').value.trim(),
        vagas: parseInt(document.getElementById('evento-vagas').value, 10) || 0,
        inscricoesAtivas: document.getElementById('evento-inscricoes').checked,
        publicado: document.getElementById('evento-publicado').checked,
        destaque: document.getElementById('evento-destaque').checked
      };
      var idx = list.findIndex(function (x) { return x.id === rec.id; });
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      D.setEvents(list);
      renderEventos();
      formEventoCard.style.display = 'none';
    });
  }
  renderEventos();

  // ---- NOTÍCIAS ----
  var formNoticiaCard = document.getElementById('form-noticia-card');
  var formNoticia = document.getElementById('form-noticia');
  function renderNoticias() {
    var tbody = document.querySelector('#tabela-noticias tbody');
    if (!tbody) return;
    var list = D.getNews() || [];
    tbody.innerHTML = list.map(function (n) {
      var status = n.publicado ? '<span class="badge badge-ok">Publicado</span>' : '<span class="badge badge-rascunho">Rascunho</span>';
      return '<tr><td>' + (n.titulo || '') + '</td><td>' + (n.categoria || '') + '</td><td>' + status + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-noticia" data-id="' + n.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-noticia" data-id="' + n.id + '">Excluir</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('.btn-edit-noticia').forEach(function (b) { b.addEventListener('click', function () { editarNoticia(this.getAttribute('data-id')); }); });
    tbody.querySelectorAll('.btn-remove-noticia').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Excluir?')) removerNoticia(this.getAttribute('data-id')); }); });
  }
  function editarNoticia(id) {
    var list = D.getNews() || [];
    var n = list.find(function (x) { return x.id === id; });
    if (!n) return;
    document.getElementById('noticia-id').value = n.id;
    document.getElementById('noticia-titulo').value = n.titulo || '';
    document.getElementById('noticia-categoria').value = n.categoria || '';
    document.getElementById('noticia-resumo').value = n.resumo || '';
    document.getElementById('noticia-conteudo').value = n.conteudo || '';
    document.getElementById('noticia-publicado').checked = n.publicado !== false;
    document.getElementById('noticia-destaque').checked = !!n.destaque;
    document.getElementById('noticia-exclusivo').checked = !!n.exclusivoMembros;
    document.getElementById('form-noticia-titulo').textContent = 'Editar notícia';
    formNoticiaCard.style.display = 'block';
  }
  function removerNoticia(id) {
    var list = (D.getNews() || []).filter(function (x) { return x.id !== id; });
    D.setNews(list);
    renderNoticias();
    formNoticiaCard.style.display = 'none';
  }
  document.getElementById('btn-nova-noticia').addEventListener('click', function () {
    document.getElementById('noticia-id').value = '';
    document.getElementById('form-noticia').reset();
    document.getElementById('noticia-publicado').checked = true;
    document.getElementById('noticia-exclusivo').checked = false;
    document.getElementById('form-noticia-titulo').textContent = 'Nova notícia';
    formNoticiaCard.style.display = 'block';
  });
  document.getElementById('noticia-cancelar').addEventListener('click', function () { formNoticiaCard.style.display = 'none'; });
  if (formNoticia) {
    formNoticia.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = D.getNews() || [];
      var rec = {
        id: document.getElementById('noticia-id').value || id(),
        titulo: document.getElementById('noticia-titulo').value.trim(),
        categoria: document.getElementById('noticia-categoria').value.trim(),
        resumo: document.getElementById('noticia-resumo').value.trim(),
        conteudo: document.getElementById('noticia-conteudo').value.trim(),
        publicado: document.getElementById('noticia-publicado').checked,
        destaque: document.getElementById('noticia-destaque').checked,
        exclusivoMembros: document.getElementById('noticia-exclusivo') && document.getElementById('noticia-exclusivo').checked,
        dataPublicacao: document.getElementById('noticia-id').value ? (list.find(function (x) { return x.id === document.getElementById('noticia-id').value; }) || {}).dataPublicacao : new Date().toISOString().slice(0, 10)
      };
      var idx = list.findIndex(function (x) { return x.id === rec.id; });
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      D.setNews(list);
      renderNoticias();
      formNoticiaCard.style.display = 'none';
    });
  }
  renderNoticias();

  // ---- BLOG ----
  var formBlogCard = document.getElementById('form-blog-card');
  var formBlog = document.getElementById('form-blog');
  function renderBlog() {
    var tbody = document.querySelector('#tabela-blog tbody');
    if (!tbody) return;
    var list = D.getBlog() || [];
    tbody.innerHTML = list.map(function (b) {
      var status = b.publicado ? '<span class="badge badge-ok">Publicado</span>' : '<span class="badge badge-rascunho">Rascunho</span>';
      return '<tr><td>' + (b.titulo || '') + '</td><td>' + status + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-blog" data-id="' + b.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-blog" data-id="' + b.id + '">Excluir</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('.btn-edit-blog').forEach(function (btn) { btn.addEventListener('click', function () { editarBlog(this.getAttribute('data-id')); }); });
    tbody.querySelectorAll('.btn-remove-blog').forEach(function (btn) { btn.addEventListener('click', function () { if (confirm('Excluir?')) removerBlog(this.getAttribute('data-id')); }); });
  }
  function editarBlog(id) {
    var list = D.getBlog() || [];
    var b = list.find(function (x) { return x.id === id; });
    if (!b) return;
    document.getElementById('blog-id').value = b.id;
    document.getElementById('blog-titulo').value = b.titulo || '';
    document.getElementById('blog-categoria').value = b.categoria || '';
    document.getElementById('blog-resumo').value = b.resumo || '';
    document.getElementById('blog-conteudo').value = b.conteudo || '';
    document.getElementById('blog-publicado').checked = b.publicado !== false;
    document.getElementById('form-blog-titulo').textContent = 'Editar postagem';
    formBlogCard.style.display = 'block';
  }
  function removerBlog(id) {
    var list = (D.getBlog() || []).filter(function (x) { return x.id !== id; });
    D.setBlog(list);
    renderBlog();
    formBlogCard.style.display = 'none';
  }
  document.getElementById('btn-nova-postagem').addEventListener('click', function () {
    document.getElementById('blog-id').value = '';
    document.getElementById('form-blog').reset();
    document.getElementById('blog-publicado').checked = true;
    document.getElementById('form-blog-titulo').textContent = 'Nova postagem';
    formBlogCard.style.display = 'block';
  });
  document.getElementById('blog-cancelar').addEventListener('click', function () { formBlogCard.style.display = 'none'; });
  if (formBlog) {
    formBlog.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = D.getBlog() || [];
      var rec = {
        id: document.getElementById('blog-id').value || id(),
        titulo: document.getElementById('blog-titulo').value.trim(),
        categoria: document.getElementById('blog-categoria').value.trim(),
        resumo: document.getElementById('blog-resumo').value.trim(),
        conteudo: document.getElementById('blog-conteudo').value.trim(),
        publicado: document.getElementById('blog-publicado').checked,
        dataPublicacao: document.getElementById('blog-id').value ? (list.find(function (x) { return x.id === document.getElementById('blog-id').value; }) || {}).dataPublicacao : new Date().toISOString().slice(0, 10)
      };
      var idx = list.findIndex(function (x) { return x.id === rec.id; });
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      D.setBlog(list);
      renderBlog();
      formBlogCard.style.display = 'none';
    });
  }
  renderBlog();

  // ---- GALERIA ----
  var formGaleriaCard = document.getElementById('form-galeria-card');
  var formGaleria = document.getElementById('form-galeria');
  function renderGaleria() {
    var tbody = document.querySelector('#tabela-galeria tbody');
    if (!tbody) return;
    var list = D.getGallery() || [];
    tbody.innerHTML = list.map(function (g) {
      return '<tr><td>' + (g.titulo || '') + '</td><td>' + (g.tipo || 'imagem') + '</td><td>' + (g.categoria || '') + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-galeria" data-id="' + g.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-galeria" data-id="' + g.id + '">Excluir</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('.btn-edit-galeria').forEach(function (b) { b.addEventListener('click', function () { editarGaleria(this.getAttribute('data-id')); }); });
    tbody.querySelectorAll('.btn-remove-galeria').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Excluir?')) removerGaleria(this.getAttribute('data-id')); }); });
  }
  function editarGaleria(id) {
    var list = D.getGallery() || [];
    var g = list.find(function (x) { return x.id === id; });
    if (!g) return;
    document.getElementById('galeria-id').value = g.id;
    document.getElementById('galeria-titulo').value = g.titulo || '';
    document.getElementById('galeria-tipo').value = g.tipo || 'imagem';
    document.getElementById('galeria-url').value = g.url || '';
    document.getElementById('galeria-categoria').value = g.categoria || '';
    document.getElementById('form-galeria-titulo').textContent = 'Editar mídia';
    formGaleriaCard.style.display = 'block';
  }
  function removerGaleria(id) {
    var list = (D.getGallery() || []).filter(function (x) { return x.id !== id; });
    D.setGallery(list);
    renderGaleria();
    formGaleriaCard.style.display = 'none';
  }
  document.getElementById('btn-nova-midia').addEventListener('click', function () {
    document.getElementById('galeria-id').value = '';
    document.getElementById('form-galeria').reset();
    document.getElementById('form-galeria-titulo').textContent = 'Nova mídia';
    formGaleriaCard.style.display = 'block';
  });
  document.getElementById('galeria-cancelar').addEventListener('click', function () { formGaleriaCard.style.display = 'none'; });
  if (formGaleria) {
    formGaleria.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = D.getGallery() || [];
      var rec = {
        id: document.getElementById('galeria-id').value || id(),
        titulo: document.getElementById('galeria-titulo').value.trim(),
        tipo: document.getElementById('galeria-tipo').value || 'imagem',
        url: document.getElementById('galeria-url').value.trim(),
        categoria: document.getElementById('galeria-categoria').value.trim()
      };
      var idx = list.findIndex(function (x) { return x.id === rec.id; });
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      D.setGallery(list);
      renderGaleria();
      formGaleriaCard.style.display = 'none';
    });
  }
  renderGaleria();

  // ---- MEMBROS (só admin) ----
  if (isAdmin) {
    var formMembroCard = document.getElementById('form-membro-card');
    var formMembro = document.getElementById('form-membro');
    function renderMembros() {
      var tbody = document.querySelector('#tabela-membros tbody');
      if (!tbody) return;
      var list = D.getMembers() || [];
      tbody.innerHTML = list.map(function (m) {
        var status = m.ativo !== false ? '<span class="badge badge-ok">Ativo</span>' : '<span class="badge badge-rascunho">Inativo</span>';
        return '<tr><td>' + (m.usuario || '') + '</td><td>' + (m.nome || '') + '</td><td>' + status + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-membro" data-id="' + m.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-membro" data-id="' + m.id + '">Excluir</button></td></tr>';
      }).join('');
      tbody.querySelectorAll('.btn-edit-membro').forEach(function (b) { b.addEventListener('click', function () { editarMembro(this.getAttribute('data-id')); }); });
      tbody.querySelectorAll('.btn-remove-membro').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Excluir membro?')) removerMembro(this.getAttribute('data-id')); }); });
    }
    function editarMembro(id) {
      var list = D.getMembers() || [];
      var m = list.find(function (x) { return x.id === id; });
      if (!m) return;
      document.getElementById('membro-id').value = m.id;
      document.getElementById('membro-usuario').value = m.usuario || '';
      document.getElementById('membro-senha').value = '';
      document.getElementById('membro-nome').value = m.nome || '';
      document.getElementById('membro-email').value = m.email || '';
      document.getElementById('membro-telefone').value = m.telefone || '';
      document.getElementById('membro-tipo').value = m.tipoAssociado || 'Associado';
      document.getElementById('membro-ativo').checked = m.ativo !== false;
      document.getElementById('form-membro-titulo').textContent = 'Editar membro';
      formMembroCard.style.display = 'block';
    }
    function removerMembro(id) {
      var list = (D.getMembers() || []).filter(function (x) { return x.id !== id; });
      D.setMembers(list);
      renderMembros();
      formMembroCard.style.display = 'none';
    }
    document.getElementById('btn-novo-membro').addEventListener('click', function () {
      document.getElementById('membro-id').value = '';
      document.getElementById('form-membro').reset();
      document.getElementById('membro-ativo').checked = true;
      document.getElementById('form-membro-titulo').textContent = 'Novo membro';
      formMembroCard.style.display = 'block';
    });
    document.getElementById('membro-cancelar').addEventListener('click', function () { formMembroCard.style.display = 'none'; });
    if (formMembro) {
      formMembro.addEventListener('submit', function (e) {
        e.preventDefault();
        var list = D.getMembers() || [];
        var senha = document.getElementById('membro-senha').value;
        var existente = list.find(function (x) { return x.id === document.getElementById('membro-id').value; });
        var rec = {
          id: document.getElementById('membro-id').value || id(),
          usuario: document.getElementById('membro-usuario').value.trim(),
          senha: senha || (existente ? existente.senha : ''),
          nome: document.getElementById('membro-nome').value.trim(),
          email: (document.getElementById('membro-email') && document.getElementById('membro-email').value.trim()) || '',
          telefone: (document.getElementById('membro-telefone') && document.getElementById('membro-telefone').value.trim()) || '',
          tipoAssociado: (document.getElementById('membro-tipo') && document.getElementById('membro-tipo').value) || 'Associado',
          foto: (existente && existente.foto) || '',
          ativo: document.getElementById('membro-ativo').checked
        };
        if (!rec.senha && !existente) { alert('Informe uma senha para novo membro.'); return; }
        var idx = list.findIndex(function (x) { return x.id === rec.id; });
        if (idx >= 0) list[idx] = rec; else list.push(rec);
        D.setMembers(list);
        renderMembros();
        formMembroCard.style.display = 'none';
      });
    }
    renderMembros();
  }

  // ---- DOCUMENTOS (só admin) ----
  if (isAdmin) {
    var formDocCard = document.getElementById('form-doc-card');
    var formDoc = document.getElementById('form-documento');
    function renderDocumentos() {
      var tbody = document.querySelector('#tabela-documentos tbody');
      if (!tbody) return;
      var list = D.getDocuments() || [];
      tbody.innerHTML = list.map(function (d) {
        return '<tr><td>' + (d.titulo || '') + '</td><td>' + (d.visivel !== false ? 'Sim' : 'Não') + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-doc" data-id="' + d.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-doc" data-id="' + d.id + '">Excluir</button></td></tr>';
      }).join('');
      tbody.querySelectorAll('.btn-edit-doc').forEach(function (b) { b.addEventListener('click', function () { editarDoc(this.getAttribute('data-id')); }); });
      tbody.querySelectorAll('.btn-remove-doc').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Excluir?')) removerDoc(this.getAttribute('data-id')); }); });
    }
    function editarDoc(id) {
      var list = D.getDocuments() || [];
      var d = list.find(function (x) { return x.id === id; });
      if (!d) return;
      document.getElementById('doc-id').value = d.id;
      document.getElementById('doc-titulo').value = d.titulo || '';
      document.getElementById('doc-categoria').value = d.categoria || 'ata';
      document.getElementById('doc-arquivo').value = d.arquivo || '';
      document.getElementById('doc-visivel').checked = d.visivel !== false;
      document.getElementById('form-doc-titulo').textContent = 'Editar documento';
      formDocCard.style.display = 'block';
    }
    function removerDoc(id) {
      var list = (D.getDocuments() || []).filter(function (x) { return x.id !== id; });
      D.setDocuments(list);
      renderDocumentos();
      formDocCard.style.display = 'none';
    }
    document.getElementById('btn-novo-doc').addEventListener('click', function () {
      document.getElementById('doc-id').value = '';
      document.getElementById('form-documento').reset();
      document.getElementById('doc-visivel').checked = true;
      document.getElementById('form-doc-titulo').textContent = 'Novo documento';
      formDocCard.style.display = 'block';
    });
    document.getElementById('doc-cancelar').addEventListener('click', function () { formDocCard.style.display = 'none'; });
    if (formDoc) {
      formDoc.addEventListener('submit', function (e) {
        e.preventDefault();
        var list = D.getDocuments() || [];
        var rec = {
          id: document.getElementById('doc-id').value || id(),
          titulo: document.getElementById('doc-titulo').value.trim(),
          categoria: (document.getElementById('doc-categoria') && document.getElementById('doc-categoria').value) || 'ata',
          arquivo: document.getElementById('doc-arquivo').value.trim(),
          visivel: document.getElementById('doc-visivel').checked
        };
        var idx = list.findIndex(function (x) { return x.id === rec.id; });
        if (idx >= 0) list[idx] = rec; else list.push(rec);
        D.setDocuments(list);
        renderDocumentos();
        formDocCard.style.display = 'none';
      });
    }
    renderDocumentos();
  }

  // ---- PATROCINADORES ----
  var formPatrocCard = document.getElementById('form-patroc-card');
  var formPatroc = document.getElementById('form-patroc');
  function renderPatrocinadores() {
    var tbody = document.querySelector('#tabela-patrocinadores tbody');
    if (!tbody) return;
    var list = D.getSponsors() || [];
    tbody.innerHTML = list.map(function (p) {
      return '<tr><td>' + (p.nome || '') + '</td><td class="acoes"><button type="button" class="btn btn-outline btn-edit-patroc" data-id="' + p.id + '">Editar</button> <button type="button" class="btn btn-remove btn-remove-patroc" data-id="' + p.id + '">Excluir</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('.btn-edit-patroc').forEach(function (b) { b.addEventListener('click', function () { editarPatroc(this.getAttribute('data-id')); }); });
    tbody.querySelectorAll('.btn-remove-patroc').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Excluir?')) removerPatroc(this.getAttribute('data-id')); }); });
  }
  function editarPatroc(id) {
    var list = D.getSponsors() || [];
    var p = list.find(function (x) { return x.id === id; });
    if (!p) return;
    document.getElementById('patroc-id').value = p.id;
    document.getElementById('patroc-nome').value = p.nome || '';
    document.getElementById('patroc-descricao').value = p.descricao || '';
    document.getElementById('patroc-logo').value = p.logo || '';
    document.getElementById('form-patroc-titulo').textContent = 'Editar patrocinador';
    formPatrocCard.style.display = 'block';
  }
  function removerPatroc(id) {
    var list = (D.getSponsors() || []).filter(function (x) { return x.id !== id; });
    D.setSponsors(list);
    renderPatrocinadores();
    formPatrocCard.style.display = 'none';
  }
  document.getElementById('btn-novo-patroc').addEventListener('click', function () {
    document.getElementById('patroc-id').value = '';
    document.getElementById('form-patroc').reset();
    document.getElementById('form-patroc-titulo').textContent = 'Novo patrocinador';
    formPatrocCard.style.display = 'block';
  });
  document.getElementById('patroc-cancelar').addEventListener('click', function () { formPatrocCard.style.display = 'none'; });
  if (formPatroc) {
    formPatroc.addEventListener('submit', function (e) {
      e.preventDefault();
      var list = D.getSponsors() || [];
      var rec = {
        id: document.getElementById('patroc-id').value || id(),
        nome: document.getElementById('patroc-nome').value.trim(),
        descricao: document.getElementById('patroc-descricao').value.trim(),
        logo: document.getElementById('patroc-logo').value.trim()
      };
      var idx = list.findIndex(function (x) { return x.id === rec.id; });
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      D.setSponsors(list);
      renderPatrocinadores();
      formPatrocCard.style.display = 'none';
    });
  }
  renderPatrocinadores();

  // ---- CONTEÚDO INSTITUCIONAL (só admin) ----
  if (isAdmin) {
    var formInst = document.getElementById('form-institucional');
    var inst = D.getInstitutional() || {};
    document.getElementById('inst-historia').value = inst.historia || '';
    document.getElementById('inst-missao').value = inst.missao || '';
    document.getElementById('inst-visao').value = inst.visao || '';
    document.getElementById('inst-objetivos').value = Array.isArray(inst.objetivos) ? inst.objetivos.join('\n') : (inst.objetivos || '');
    document.getElementById('inst-email').value = inst.email || '';
    document.getElementById('inst-telefone').value = inst.telefone || '';
    document.getElementById('inst-facebook').value = inst.facebook || '';
    document.getElementById('inst-instagram').value = inst.instagram || '';
    document.getElementById('inst-youtube').value = inst.youtube || '';
    if (formInst) {
      formInst.addEventListener('submit', function (e) {
        e.preventDefault();
        var objetivos = document.getElementById('inst-objetivos').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        D.setInstitutional({
          historia: document.getElementById('inst-historia').value.trim(),
          missao: document.getElementById('inst-missao').value.trim(),
          visao: document.getElementById('inst-visao').value.trim(),
          objetivos: objetivos,
          email: document.getElementById('inst-email').value.trim(),
          telefone: document.getElementById('inst-telefone').value.trim(),
          facebook: document.getElementById('inst-facebook').value.trim(),
          instagram: document.getElementById('inst-instagram').value.trim(),
          youtube: document.getElementById('inst-youtube').value.trim()
        });
        alert('Conteúdo institucional salvo.');
      });
    }
  }
})();
