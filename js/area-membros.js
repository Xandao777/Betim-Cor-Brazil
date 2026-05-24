/**
 * Área de membros: navegação, dashboard, perfil, documentos, relatórios, eventos, notícias, voluntariado, suporte.
 */
(function () {
  'use strict';

  var D = window.DadosSite;
  if (!D) return;

  D.ready.then(function () {

  function esc(s) {
    return D.escapeHtml ? D.escapeHtml(s) : String(s == null ? '' : s);
  }
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  function getUsuarioLogado() {
    if (!D || !D.isMemberSession()) return null;
    var list = D.getMembers() || [];
    return list.find(function (m) { return m.ativo !== false; }) || list[0] || null;
  }

  function getMembroUsuario() {
    var m = getUsuarioLogado();
    return m ? m.usuario : '';
  }

  function formatarData(str) {
    if (!str) return { dia: '-', mes: '-', ano: '' };
    var d = new Date(str + 'T12:00:00');
    var mes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][d.getMonth()];
    return { dia: d.getDate(), mes: mes, ano: d.getFullYear() };
  }

  function mostrarSecao(id) {
    document.querySelectorAll('.membro-secao').forEach(function (s) { s.classList.remove('ativo'); });
    document.querySelectorAll('.membro-sidebar a[data-secao]').forEach(function (a) { a.classList.remove('ativo'); });
    var secao = document.getElementById('secao-' + id);
    var link = document.querySelector('.membro-sidebar a[data-secao="' + id + '"]');
    if (secao) secao.classList.add('ativo');
    if (link) link.classList.add('ativo');
    if (id === 'inicio') preencherDashboard();
    if (id === 'perfil') preencherPerfil();
    if (id === 'documentos') preencherDocumentos();
    if (id === 'relatorios') preencherRelatorios();
    if (id === 'eventos') preencherEventos();
    if (id === 'noticias') preencherNoticiasInternas();
  }

  function preencherDashboard() {
    var eventos = (D && D.getEvents()) ? D.getEvents() : [];
    var proximos = eventos.filter(function (e) { return e.publicado !== false && (e.data || '') >= new Date().toISOString().slice(0, 10); }).sort(function (a, b) { return (a.data || '').localeCompare(b.data); }).slice(0, 3);
    var el = document.getElementById('lista-dashboard-eventos');
    if (el) {
      if (proximos.length === 0) el.innerHTML = '<p class="admin-aviso">Nenhum evento próximo no momento.</p>';
      else {
        el.innerHTML = proximos
          .map(function (e) {
            var fd = formatarData(e.data);
            return (
              '<p><strong>' +
              esc(e.titulo || '') +
              '</strong> – ' +
              fd.dia +
              ' ' +
              fd.mes +
              ' ' +
              fd.ano +
              (e.local ? ' · ' + esc(e.local) : '') +
              '</p>'
            );
          })
          .join('');
      }
    }
    var inscricoes = (D && D.getInscricoes()) ? D.getInscricoes() : [];
    var user = getMembroUsuario();
    var minhas = inscricoes.filter(function (i) { return i.membroUsuario === user; });
    var elIns = document.getElementById('lista-dashboard-inscricoes');
    if (elIns) {
      if (minhas.length === 0) elIns.innerHTML = '<p class="admin-aviso">Você ainda não se inscreveu em nenhum evento.</p>';
      else {
        elIns.innerHTML =
          '<ul class="lista-recursos">' +
          minhas
            .map(function (i) {
              return (
                '<li><span class="doc-icon">📅</span> ' +
                esc(i.eventoTitulo || 'Evento') +
                ' – ' +
                esc(i.eventoData || '') +
                '</li>'
              );
            })
            .join('') +
          '</ul>';
      }
    }
    var docs = (D && D.getDocuments()) ? D.getDocuments() : [];
    var visiveis = docs.filter(function (d) { return d.visivel !== false && d.categoria !== 'relatorio'; }).slice(0, 5);
    var elDocs = document.getElementById('lista-dashboard-docs');
    if (elDocs) {
      elDocs.innerHTML = visiveis
        .map(function (d) {
          var link = d.arquivo
            ? '<a href="' + escAttr(d.arquivo) + '" target="_blank" rel="noopener">' + esc(d.titulo || '') + '</a>'
            : esc(d.titulo || '');
          return '<li><span class="doc-icon">📄</span> ' + link + '</li>';
        })
        .join('');
      if (visiveis.length === 0) elDocs.innerHTML = '<li class="admin-aviso">Nenhum documento recente.</li>';
    }
  }

  function preencherPerfil() {
    var m = getUsuarioLogado();
    if (!m) return;
    var nome = document.getElementById('perfil-nome');
    var email = document.getElementById('perfil-email');
    var telefone = document.getElementById('perfil-telefone');
    var tipo = document.getElementById('perfil-tipo');
    if (nome) nome.value = m.nome || '';
    if (email) email.value = m.email || '';
    if (telefone) telefone.value = m.telefone || '';
    if (tipo) tipo.value = m.tipoAssociado || 'Associado';
  }

  function salvarPerfil() {
    var m = getUsuarioLogado();
    if (!m || !D) return Promise.resolve();
    var list = D.getMembers() || [];
    var idx = list.findIndex(function (x) { return x.id === m.id; });
    if (idx < 0) return Promise.resolve();
    var nome = document.getElementById('perfil-nome').value.trim();
    var email = document.getElementById('perfil-email').value.trim();
    var telefone = document.getElementById('perfil-telefone').value.trim();
    return D.salvarPerfilMembro(nome, email, telefone).then(function () {
      return D.refresh();
    }).then(function () {
      var nomeHeader = document.getElementById('nome-membro');
      if (nomeHeader) nomeHeader.textContent = nome;
      if (window.SiteToast) window.SiteToast.success('Perfil atualizado.');
      else alert('Perfil atualizado.');
    }).catch(function (e) {
      if (window.SiteToast) window.SiteToast.error(e.message || 'Não foi possível salvar o perfil.');
      else alert(e.message || 'Não foi possível salvar o perfil.');
    });
  }

  function preencherDocumentos(categoria) {
    var docs = (D && D.getDocuments()) ? D.getDocuments() : [];
    var visiveis = docs.filter(function (d) {
      if (d.visivel === false || d.categoria === 'relatorio') return false;
      if (categoria) return d.categoria === categoria;
      return true;
    });
    var ul = document.getElementById('lista-documentos-membro');
    var vazio = document.getElementById('documentos-vazio');
    if (!ul) return;
    ul.innerHTML = visiveis
      .map(function (d) {
        var link = d.arquivo
          ? '<a href="' + escAttr(d.arquivo) + '" target="_blank" rel="noopener">' + esc(d.titulo || '') + '</a>'
          : esc(d.titulo || '');
        return '<li><span class="doc-icon">📄</span> ' + link + '</li>';
      })
      .join('');
    if (vazio) vazio.style.display = visiveis.length === 0 ? 'block' : 'none';
  }

  function preencherRelatorios() {
    var docs = (D && D.getDocuments()) ? D.getDocuments() : [];
    var relatorios = docs.filter(function (d) { return d.visivel !== false && d.categoria === 'relatorio'; });
    var ul = document.getElementById('lista-relatorios-membro');
    var vazio = document.getElementById('relatorios-vazio');
    if (!ul) return;
    ul.innerHTML = relatorios
      .map(function (d) {
        var link = d.arquivo
          ? '<a href="' + escAttr(d.arquivo) + '" target="_blank" rel="noopener">' + esc(d.titulo || '') + '</a>'
          : esc(d.titulo || '');
        return '<li><span class="doc-icon">📊</span> ' + link + '</li>';
      })
      .join('');
    if (vazio) vazio.style.display = relatorios.length === 0 ? 'block' : 'none';
  }

  function preencherEventos() {
    var eventos = (D && D.getEvents()) ? D.getEvents() : [];
    var publicados = eventos.filter(function (e) { return e.publicado !== false; }).sort(function (a, b) { return (a.data || '').localeCompare(b.data); });
    var user = getMembroUsuario();
    var inscricoes = (D && D.getInscricoes()) ? D.getInscricoes() : [];
    var minhas = inscricoes.filter(function (i) { return i.membroUsuario === user; });

    var ulIns = document.getElementById('lista-minhas-inscricoes');
    var insVazio = document.getElementById('inscricoes-vazio');
    if (ulIns) {
      ulIns.innerHTML = minhas
        .map(function (i) {
          return (
            '<li><span class="doc-icon">📅</span> ' +
            esc(i.eventoTitulo || '') +
            ' – ' +
            esc(i.eventoData || '') +
            ' <button type="button" class="btn btn-outline btn-cancelar-inscricao" data-evento-id="' +
            escAttr(i.eventoId) +
            '">Cancelar</button></li>'
          );
        })
        .join('');
      if (insVazio) insVazio.style.display = minhas.length === 0 ? 'block' : 'none';
    }
    ulIns && ulIns.querySelectorAll('.btn-cancelar-inscricao').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Cancelar esta inscrição?')) return;
        var id = this.getAttribute('data-evento-id');
        D.removeInscricaoMembro(id).then(function () {
          return D.refresh();
        }).then(function () {
          preencherEventos();
          preencherDashboard();
        }).catch(function (e) {
          alert(e.message || 'Erro ao cancelar.');
        });
      });
    });

    var container = document.getElementById('lista-eventos-membro');
    if (!container) return;
    container.innerHTML = publicados
      .map(function (e) {
        var fd = formatarData(e.data);
        var jaInscrito = minhas.some(function (i) {
          return String(i.eventoId) === String(e.id);
        });
        var meta = [fd.dia + ' ' + fd.mes + ' ' + fd.ano];
        if (e.hora) meta.push('às ' + esc(e.hora));
        if (e.local) meta.push(esc(e.local));
        var btn =
          !jaInscrito && e.inscricoesAtivas !== false
            ? '<button type="button" class="btn btn-primary btn-inscrever" data-evento-id="' +
              escAttr(e.id) +
              '" data-evento-titulo="' +
              escAttr(e.titulo || '') +
              '" data-evento-data="' +
              escAttr(e.data || '') +
              '" data-evento-hora="' +
              escAttr(e.hora || '') +
              '" data-evento-local="' +
              escAttr(e.local || '') +
              '">Inscrever-se</button>'
            : jaInscrito
              ? '<span class="badge badge-ok">Inscrição confirmada</span>'
              : '';
        return (
          '<article class="evento-card-membro"><div class="evento-card-data"><span class="dia">' +
          fd.dia +
          '</span><span class="mes">' +
          fd.mes +
          '</span></div><div class="evento-card-body"><h4>' +
          esc(e.titulo || '') +
          '</h4><p class="evento-card-meta">' +
          meta.join(' · ') +
          '</p><p class="evento-card-desc">' +
          esc(e.descricao || '') +
          '</p>' +
          (e.vagas ? '<p class="evento-card-vagas">Vagas limitadas: ' + esc(String(e.vagas)) + '</p>' : '') +
          '<div class="evento-card-acoes">' +
          btn +
          '</div></div></article>'
        );
      })
      .join('');

    container.querySelectorAll('.btn-inscrever').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var titulo = this.getAttribute('data-evento-titulo');
        var data = this.getAttribute('data-evento-data');
        var hora = this.getAttribute('data-evento-hora');
        var local = this.getAttribute('data-evento-local');
        var msg = 'Confirmar inscrição no evento "' + titulo + '"?\n\nData: ' + data + (hora ? ' às ' + hora : '') + (local ? '\nLocal: ' + local : '');
        if (!confirm(msg)) return;
        D.addInscricaoMembro({
          eventoId: this.getAttribute('data-evento-id'),
          eventoTitulo: titulo,
          eventoData: data,
          eventoHora: hora || '',
          eventoLocal: local || ''
        }).then(function () {
          return D.refresh();
        }).then(function () {
          preencherEventos();
          preencherDashboard();
          alert('Inscrição confirmada com sucesso! Você está inscrito(a) no evento. Acompanhe em "Minhas inscrições".');
        }).catch(function (e) {
          alert(e.message || 'Não foi possível inscrever.');
        });
      });
    });
  }

  function preencherNoticiasInternas() {
    var news = (D && D.getNews()) ? D.getNews() : [];
    var internas = news.filter(function (n) { return n.publicado !== false && n.exclusivoMembros; });
    var container = document.getElementById('lista-noticias-internas');
    var vazio = document.getElementById('noticias-internas-vazio');
    if (!container) return;
    if (internas.length === 0) {
      container.innerHTML = '';
      if (vazio) vazio.style.display = 'block';
      return;
    }
    if (vazio) vazio.style.display = 'none';
    container.innerHTML = internas
      .map(function (n) {
        return (
          '<div class="membro-card"><h4>' +
          esc(n.titulo || '') +
          '</h4><p class="meta">' +
          esc(n.dataPublicacao || '') +
          (n.categoria ? ' · ' + esc(n.categoria) : '') +
          '</p><p>' +
          esc(n.resumo || '') +
          '</p>' +
          (n.conteudo ? '<p>' + esc(n.conteudo) + '</p>' : '') +
          '</div>'
        );
      })
      .join('');
  }

  /** Só pode registar-se uma vez; não usar display==='none' — antes do login o painel está oculto mas o DOM já existe. */
  var painelMembroNavegacaoPronta = false;

  function init() {
    var dashboard = document.getElementById('bloco-dashboard');
    if (!dashboard) return;
    if (painelMembroNavegacaoPronta) return;
    painelMembroNavegacaoPronta = true;

    document.querySelectorAll('.membro-sidebar a[data-secao]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        mostrarSecao(this.getAttribute('data-secao'));
      });
    });
    var linkSair = document.getElementById('link-sair');
    if (linkSair) linkSair.addEventListener('click', function (e) { e.preventDefault(); document.getElementById('btn-sair') && document.getElementById('btn-sair').click(); });

    document.getElementById('filtro-documentos') && document.getElementById('filtro-documentos').addEventListener('change', function () {
      preencherDocumentos(this.value || undefined);
    });

    var formPerfil = document.getElementById('form-perfil');
    if (formPerfil) formPerfil.addEventListener('submit', function (e) { e.preventDefault(); salvarPerfil(); });

    var formVol = document.getElementById('form-voluntariado');
    if (formVol) {
      formVol.addEventListener('submit', function (e) {
        e.preventDefault();
        var areaEl = document.getElementById('vol-area');
        var msgEl = document.getElementById('vol-mensagem');
        var area = areaEl ? areaEl.value : '';
        var mensagem = msgEl ? msgEl.value.trim() : '';
        if (!area && !mensagem) {
          alert('Escolha uma área ou escreva uma mensagem.');
          return;
        }
        var btn = formVol.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        fetch('/api/member/mensagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tipo: 'voluntariado', area: area, mensagem: mensagem })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (!r.ok) throw new Error(data.error || 'Falha ao enviar');
              return data;
            });
          })
          .then(function () {
            alert('Obrigado! O seu interesse foi registado. A associação entrará em contacto.');
            formVol.reset();
          })
          .catch(function (err) {
            alert(err.message || 'Não foi possível enviar.');
          })
          .finally(function () {
            if (btn) btn.disabled = false;
          });
      });
    }

    var formSup = document.getElementById('form-suporte');
    if (formSup) {
      formSup.addEventListener('submit', function (e) {
        e.preventDefault();
        var assEl = document.getElementById('sup-assunto');
        var msgEl = document.getElementById('sup-mensagem');
        var btn = formSup.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        fetch('/api/member/mensagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tipo: 'suporte',
            assunto: assEl ? assEl.value : '',
            mensagem: msgEl ? msgEl.value.trim() : ''
          })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (!r.ok) throw new Error(data.error || 'Falha ao enviar');
              return data;
            });
          })
          .then(function () {
            alert('Mensagem enviada. A diretoria responderá em breve.');
            formSup.reset();
          })
          .catch(function (err) {
            alert(err.message || 'Não foi possível enviar.');
          })
          .finally(function () {
            if (btn) btn.disabled = false;
          });
      });
    }

    var paramsReset = new URLSearchParams(window.location.search);
    var resetToken = paramsReset.get('reset');
    if (resetToken) {
      var blocoReset = document.getElementById('bloco-reset-senha');
      if (blocoReset) {
        blocoReset.style.display = 'block';
        blocoReset.setAttribute('data-token', resetToken);
      }
    }

    var formEsqueci = document.getElementById('form-esqueci-senha');
    if (formEsqueci) {
      formEsqueci.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('esqueci-msg');
        fetch('/api/auth/member-forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            usuario: document.getElementById('esqueci-usuario').value.trim(),
            email: document.getElementById('esqueci-email').value.trim()
          })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (!r.ok) throw new Error(data.error || 'Falha');
              return data;
            });
          })
          .then(function (data) {
            if (msg) {
              msg.textContent = data.message || 'Pedido enviado.';
              msg.style.display = 'block';
            }
            formEsqueci.reset();
          })
          .catch(function (err) {
            if (msg) {
              msg.textContent = err.message || 'Não foi possível enviar.';
              msg.style.display = 'block';
            }
          });
      });
    }

    var formReset = document.getElementById('form-reset-senha');
    if (formReset) {
      formReset.addEventListener('submit', function (e) {
        e.preventDefault();
        var blocoR = document.getElementById('bloco-reset-senha');
        var token = (blocoR && blocoR.getAttribute('data-token')) || resetToken || '';
        var s1 = document.getElementById('reset-nova-senha').value;
        var s2 = document.getElementById('reset-nova-senha2').value;
        var errEl = document.getElementById('reset-msg');
        if (s1 !== s2) {
          if (errEl) {
            errEl.textContent = 'As senhas não coincidem.';
            errEl.style.display = 'block';
          }
          return;
        }
        fetch('/api/auth/member-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: token, senhaNova: s1 })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (!r.ok) throw new Error(data.error || 'Falha');
              return data;
            });
          })
          .then(function () {
            if (errEl) errEl.style.display = 'none';
            alert('Senha atualizada. Faça login com a nova senha.');
            window.location.href = 'area-membros.html';
          })
          .catch(function (err) {
            if (errEl) {
              errEl.textContent = err.message || 'Link inválido ou expirado.';
              errEl.style.display = 'block';
            }
          });
      });
    }

    var formSenha = document.getElementById('form-senha-membro');
    if (formSenha) {
      formSenha.addEventListener('submit', function (e) {
        e.preventDefault();
        fetch('/api/member/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            senhaAtual: document.getElementById('senha-atual-membro').value,
            senhaNova: document.getElementById('senha-nova-membro').value
          })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              if (!r.ok) throw new Error(data.error || 'Falha');
              return data;
            });
          })
          .then(function () {
            formSenha.reset();
            if (window.SiteToast) window.SiteToast.success('Senha atualizada.');
            else alert('Senha atualizada.');
          })
          .catch(function (err) {
            if (window.SiteToast) window.SiteToast.error(err.message || 'Não foi possível alterar a senha.');
            else alert(err.message || 'Não foi possível alterar a senha.');
          });
      });
    }

    preencherDashboard();
    preencherDocumentos();
    preencherRelatorios();
  }

  window.refreshAreaMembros = function () {
    D.refresh().then(function () {
      preencherDashboard();
      preencherDocumentos(document.getElementById('filtro-documentos') && document.getElementById('filtro-documentos').value || undefined);
      preencherRelatorios();
      preencherEventos();
      preencherNoticiasInternas();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  }); // D.ready
})();
