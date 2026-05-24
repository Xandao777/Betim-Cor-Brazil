/**
 * Melhorias do painel admin — carrega após admin-painel.js (window.AdminPainel).
 */
(function () {
  'use strict';

  function waitForAP(cb) {
    if (window.AdminPainel) return cb(window.AdminPainel);
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (window.AdminPainel) {
        clearInterval(t);
        cb(window.AdminPainel);
      } else if (n > 80) clearInterval(t);
    }, 50);
  }

  waitForAP(function (AP) {
    var D = AP.D;
    var isAdmin = AP.isAdmin;
    var escHtml = AP.escHtml;
    var attrSafe = AP.attrSafe;

    var formFiltroLidas = 'todas';
    var formFiltroDesde = '';

    function passaFiltroData(criadoEm) {
      if (!formFiltroDesde) return true;
      if (!criadoEm) return false;
      return String(criadoEm).slice(0, 10) >= formFiltroDesde;
    }

    function filtrarPorData(list) {
      return list.filter(function (m) {
        return passaFiltroData(m.criadoEm);
      });
    }
    var sitePublicUrl = '';

    // ---- Modal confirmar ----
    var confirmModal = document.getElementById('admin-confirm-modal');
    var confirmResolve = null;

    function confirmar(texto, titulo) {
      return new Promise(function (resolve) {
        if (!confirmModal) {
          resolve(window.confirm(texto));
          return;
        }
        document.getElementById('admin-confirm-title').textContent = titulo || 'Confirmar';
        document.getElementById('admin-confirm-text').textContent = texto;
        confirmModal.hidden = false;
        confirmResolve = resolve;
      });
    }

    var btnConfirmOk = document.getElementById('admin-confirm-ok');
    var btnConfirmCancel = document.getElementById('admin-confirm-cancel');
    if (btnConfirmOk) {
      btnConfirmOk.addEventListener('click', function () {
        if (confirmModal) confirmModal.hidden = true;
        if (confirmResolve) confirmResolve(true);
        confirmResolve = null;
      });
    }
    if (btnConfirmCancel) {
      btnConfirmCancel.addEventListener('click', function () {
        if (confirmModal) confirmModal.hidden = true;
        if (confirmResolve) confirmResolve(false);
        confirmResolve = null;
      });
    }
    AP.confirmar = confirmar;

    // ---- Overlay gravação (contador + timeout — evita ficar preso em "A guardar…") ----
    var overlay = document.getElementById('admin-saving-overlay');
    var savingDepth = 0;
    var savingSafetyTimer = null;

    if (overlay && overlay.parentNode && overlay.parentNode !== document.body) {
      document.body.appendChild(overlay);
    }

    function showSaving(on) {
      if (!overlay) return;
      if (on) {
        savingDepth++;
        overlay.hidden = false;
        overlay.classList.add('is-active');
        overlay.setAttribute('aria-hidden', 'false');
        if (savingSafetyTimer) clearTimeout(savingSafetyTimer);
        savingSafetyTimer = setTimeout(function () {
          savingDepth = 0;
          overlay.hidden = true;
          overlay.classList.remove('is-active');
          overlay.setAttribute('aria-hidden', 'true');
          savingSafetyTimer = null;
          if (window.SiteToast) {
            window.SiteToast.error(
              'A gravação demorou demasiado. Verifique a ligação e atualize a página.'
            );
          }
        }, 90000);
        return;
      }
      savingDepth = Math.max(0, savingDepth - 1);
      if (savingDepth === 0) {
        if (savingSafetyTimer) clearTimeout(savingSafetyTimer);
        savingSafetyTimer = null;
        overlay.hidden = true;
        overlay.classList.remove('is-active');
        overlay.setAttribute('aria-hidden', 'true');
      }
    }

    showSaving(false);

    function wrapPut(fn) {
      return function (data) {
        showSaving(true);
        var result;
        try {
          result = fn(data);
        } catch (e) {
          showSaving(false);
          throw e;
        }
        if (!result || typeof result.then !== 'function') {
          showSaving(false);
          return Promise.resolve(result);
        }
        return result
          .then(function (r) {
            showSaving(false);
            return r;
          })
          .catch(function (e) {
            showSaving(false);
            throw e;
          });
      };
    }
    [
      'setEvents',
      'setNews',
      'setBlog',
      'setGallery',
      'setMembers',
      'setSponsors',
      'setInstitutional',
      'setDocuments',
      'setInscricoes',
      'setMensagensContato',
      'setPedidosDoacao',
      'setMensagensMembros'
    ].forEach(function (m) {
      if (D[m]) D[m] = wrapPut(D[m].bind(D));
    });

    function isUnread(m) {
      return m.lida !== true;
    }

    function countUnread(list) {
      return (list || []).filter(isUnread).length;
    }

    function markRead(collection, id, lida) {
      return fetch('/api/admin/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collection: collection, id: id, lida: lida })
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || r.statusText);
          return D.refresh();
        });
      });
    }

    function exportCsv(filename, header, rows) {
      function cell(v) {
        return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      }
      var lines = [header.map(cell).join(';')];
      rows.forEach(function (row) {
        lines.push(row.map(cell).join(';'));
      });
      var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      AP.toastOk('CSV exportado.');
    }

    function publicUrl(path) {
      var base = sitePublicUrl || '';
      if (!base) return path;
      return base.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');
    }

    // ---- Menu utilizadores + badges ----
    if (isAdmin) {
      document.querySelectorAll('.admin-nav-utilizadores').forEach(function (el) {
        el.style.display = '';
      });
    }

    function updateSidebarBadges() {
      var c = countUnread(D.getMensagensContato ? D.getMensagensContato() : []);
      var m = countUnread(D.getMensagensMembros ? D.getMensagensMembros() : []);
      var d = countUnread(D.getPedidosDoacao ? D.getPedidosDoacao() : []);
      var total = c + m + d;
      var link = document.querySelector('.admin-sidebar a[data-secao="formularios"]');
      if (link) {
        var old = link.querySelector('.admin-nav-badge');
        if (old) old.remove();
        if (total > 0) {
          var b = document.createElement('span');
          b.className = 'admin-nav-badge';
          b.textContent = String(total);
          link.appendChild(b);
        }
      }
      var elCn = document.getElementById('dashboard-contato-novas');
      var elMn = document.getElementById('dashboard-membro-novas');
      if (elCn) elCn.textContent = c ? '(' + c + ' novas)' : '';
      if (elMn) elMn.textContent = m ? '(' + m + ' novas)' : '';
    }

    AP._loadAuditLog = function () {
      if (!isAdmin) return;
      var auditList = document.getElementById('dashboard-audit-list');
      if (!auditList) return;
      var q = new URLSearchParams({ limit: '12' });
      var desde = document.getElementById('audit-desde');
      var ate = document.getElementById('audit-ate');
      var usuario = document.getElementById('audit-usuario');
      var chave = document.getElementById('audit-chave');
      if (desde && desde.value) q.set('desde', desde.value);
      if (ate && ate.value) q.set('ate', ate.value);
      if (usuario && usuario.value.trim()) q.set('usuario', usuario.value.trim());
      if (chave && chave.value.trim()) q.set('chave', chave.value.trim());
      fetch('/api/admin/audit-log?' + q.toString(), { credentials: 'include' })
        .then(function (r) {
          return r.ok ? r.json() : { entries: [] };
        })
        .then(function (data) {
          var entries = data.entries || [];
          auditList.innerHTML = entries.length
            ? entries
                .map(function (e) {
                  return (
                    '<li><time>' +
                    escHtml(AP.formatarDataHoraIso(e.em)) +
                    '</time> — <strong>' +
                    escHtml(e.usuario || '—') +
                    '</strong> ' +
                    escHtml(e.acao || '') +
                    ' <em>' +
                    escHtml(e.chave || '') +
                    '</em></li>'
                  );
                })
                .join('')
            : '<li class="admin-aviso">Nenhuma entrada com estes filtros.</li>';
        })
        .catch(function () {
          auditList.innerHTML = '<li class="admin-aviso">Não foi possível carregar o log.</li>';
        });
    };

    var auditBtn = document.getElementById('audit-filtrar');
    if (auditBtn && !auditBtn.dataset.boundAudit) {
      auditBtn.dataset.boundAudit = '1';
      auditBtn.addEventListener('click', function () {
        AP._loadAuditLog();
      });
    }

    // ---- Dashboard melhorado ----
    var origDashboard = AP.atualizarDashboard;
    AP.atualizarDashboard = function () {
      origDashboard();
      updateSidebarBadges();

      var cards = document.getElementById('admin-dashboard-cards');
      if (cards) {
        var unreadTotal =
          countUnread(D.getMensagensContato()) +
          countUnread(D.getMensagensMembros()) +
          countUnread(D.getPedidosDoacao() || []);
        var doaPend = (D.getPedidosDoacao() || []).filter(function (p) {
          return (p.estado || 'pendente') === 'pendente';
        }).length;
        cards.innerHTML =
          '<a href="#" class="admin-dash-card" data-go="formularios"><span class="admin-dash-card-num">' +
          unreadTotal +
          '</span><span class="admin-dash-card-label">Mensagens novas</span></a>' +
          '<a href="#" class="admin-dash-card" data-go="eventos"><span class="admin-dash-card-num">' +
          (D.getEvents() || []).length +
          '</span><span class="admin-dash-card-label">Eventos</span></a>' +
          '<a href="#" class="admin-dash-card" data-go="inscricoes"><span class="admin-dash-card-num">' +
          (D.getInscricoes() || []).length +
          '</span><span class="admin-dash-card-label">Inscrições</span></a>' +
          '<a href="#" class="admin-dash-card" data-go="formularios"><span class="admin-dash-card-num">' +
          doaPend +
          '</span><span class="admin-dash-card-label">Doações pendentes</span></a>';
        cards.querySelectorAll('[data-go]').forEach(function (a) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            var go = this.getAttribute('data-go');
            var nav = document.querySelector('.admin-sidebar a[data-secao="' + go + '"]');
            if (nav) nav.click();
          });
        });
      }

      var hoje = new Date().toISOString().slice(0, 10);
      var prox = (D.getEvents() || [])
        .filter(function (e) {
          return e.publicado !== false && (e.data || '') >= hoje;
        })
        .sort(function (a, b) {
          return (a.data || '').localeCompare(b.data || '');
        })
        .slice(0, 5);
      var ulEv = document.getElementById('dashboard-proximos-eventos');
      if (ulEv) {
        ulEv.innerHTML = prox.length
          ? prox
              .map(function (e) {
                return (
                  '<li><strong>' +
                  escHtml(e.titulo || '') +
                  '</strong> — ' +
                  escHtml(e.data || '') +
                  (e.local ? ' · ' + escHtml(e.local) : '') +
                  '</li>'
                );
              })
              .join('')
          : '<li class="admin-aviso">Nenhum evento futuro publicado.</li>';
      }

      var ulDoa = document.getElementById('dashboard-doacoes-pendentes');
      if (ulDoa) {
        var pend = (D.getPedidosDoacao() || [])
          .filter(function (p) {
            return (p.estado || 'pendente') === 'pendente';
          })
          .slice(-5)
          .reverse();
        ulDoa.innerHTML = pend.length
          ? pend
              .map(function (p) {
                return (
                  '<li>' +
                  escHtml(p.nome || p.email || '—') +
                  ' — R$ ' +
                  escHtml(String(p.valorReais != null ? p.valorReais : '—')) +
                  '</li>'
                );
              })
              .join('')
          : '<li class="admin-aviso">Nenhuma doação pendente.</li>';
      }

      var chartEl = document.getElementById('dashboard-inscricoes-chart');
      if (chartEl) {
        var mesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        var buckets = [];
        var nowD = new Date();
        for (var mi = 5; mi >= 0; mi--) {
          var md = new Date(nowD.getFullYear(), nowD.getMonth() - mi, 1);
          var mk =
            md.getFullYear() +
            '-' +
            (md.getMonth() + 1 < 10 ? '0' : '') +
            (md.getMonth() + 1);
          buckets.push({ key: mk, label: mesNomes[md.getMonth()] + ' ' + String(md.getFullYear()).slice(2) });
        }
        var counts = {};
        buckets.forEach(function (b) {
          counts[b.key] = 0;
        });
        (D.getInscricoes() || []).forEach(function (ins) {
          var ym = String(ins.dataInscricao || '').slice(0, 7);
          if (counts[ym] !== undefined) counts[ym]++;
        });
        var maxC = 1;
        buckets.forEach(function (b) {
          if (counts[b.key] > maxC) maxC = counts[b.key];
        });
        chartEl.innerHTML = buckets
          .map(function (b) {
            var n = counts[b.key];
            var pct = maxC ? Math.round((n / maxC) * 100) : 0;
            return (
              '<div class="admin-bar-col"><div class="admin-bar-track"><div class="admin-bar-fill" style="height:' +
              pct +
              '%" title="' +
              n +
              ' inscrições"></div></div><span class="admin-bar-label">' +
              escHtml(b.label) +
              '</span><span class="admin-bar-num">' +
              n +
              '</span></div>'
            );
          })
          .join('');
      }

      if (isAdmin) {
        var auditWrap = document.getElementById('dashboard-audit-wrap');
        if (auditWrap) auditWrap.style.display = 'block';
        AP._loadAuditLog();
      }
    };

    AP.atualizarDashboard();

    function renderDeployStatus(st) {
      var wrap = document.getElementById('dashboard-deploy-wrap');
      var list = document.getElementById('dashboard-deploy-checklist');
      var warnEl = document.getElementById('dashboard-deploy-warnings');
      var linkDeploy = document.getElementById('admin-link-site-deploy');
      if (!wrap || !list) return;
      var isAdminRole = AP.isAdmin && AP.isAdmin();
      if (!isAdminRole) return;
      wrap.style.display = 'block';

      var rows = [
        { ok: st.smtp, label: 'SMTP (notificações e recuperação de senha)' },
        { ok: st.turnstile, label: 'Turnstile CAPTCHA (opcional)' },
        {
          ok: st.uploadsPersistent,
          label:
            st.uploads === 's3'
              ? 'Uploads em S3/R2 (persistente)'
              : 'Uploads no disco (montar volume /uploads no Railway)'
        },
        { ok: st.siteUrl, label: 'SITE_PUBLIC_URL definido' },
        { ok: !st.demoSeedAllowed, label: 'Seed demo desativado (ALLOW_DEMO_SEED)' }
      ];
      if (st.smtp) {
        rows.push({
          ok: st.smtpAutoReply && st.smtpAutoReply.contato,
          label: 'Auto-resposta contato (SMTP_AUTO_REPLY_CONTATO)'
        });
        rows.push({
          ok: st.smtpAutoReply && st.smtpAutoReply.doacao,
          label: 'Auto-resposta doação (SMTP_AUTO_REPLY_DOACAO)'
        });
        rows.push({
          ok: st.smtpAutoReply && st.smtpAutoReply.inscricao,
          label: 'Comprovante inscrição (SMTP_AUTO_REPLY_INSCRICAO)'
        });
      }
      if (st.institutional && st.institutional.items) {
        st.institutional.items.forEach(function (it) {
          rows.push({ ok: it.ok, label: 'Conteúdo: ' + it.label });
        });
      }
      list.innerHTML = rows
        .map(function (r) {
          return (
            '<li class="' +
            (r.ok ? 'admin-deploy-ok' : 'admin-deploy-pending') +
            '">' +
            (r.ok ? '✓' : '○') +
            ' ' +
            escHtml(r.label) +
            '</li>'
          );
        })
        .join('');

      var warnings = st.warnings || [];
      if (warnEl) {
        warnEl.textContent = warnings.length ? warnings.join(' ') : '';
        warnEl.style.display = warnings.length ? 'block' : 'none';
      }
      if (linkDeploy && st.siteUrl) {
        linkDeploy.href = st.siteUrl;
        linkDeploy.style.display = '';
      } else if (linkDeploy) linkDeploy.style.display = 'none';
    }

    fetch('/api/admin/status', { credentials: 'include' })
      .then(function (r) {
        return r.ok ? r.json() : {};
      })
      .then(function (st) {
        sitePublicUrl = st.siteUrl || '';
        var linkSite = document.getElementById('admin-link-site');
        if (linkSite && sitePublicUrl) linkSite.href = sitePublicUrl;
        var linha = document.getElementById('dashboard-status-linha');
        if (linha) {
          linha.textContent =
            'Backend: ' +
            (st.backend || '—') +
            ' · SMTP: ' +
            (st.smtp ? 'configurado' : 'não configurado (e-mails desativados)') +
            ' · Uploads: ' +
            (st.uploads === 's3' ? 'S3/R2' : 'disco') +
            (sitePublicUrl ? ' · Site: ' + sitePublicUrl : '');
        }
        renderDeployStatus(st);
      })
      .catch(function () {});

    var btnTestSmtp = document.getElementById('btn-test-smtp');
    if (btnTestSmtp) {
      btnTestSmtp.addEventListener('click', function () {
        var out = document.getElementById('dashboard-deploy-test-result');
        btnTestSmtp.disabled = true;
        if (out) {
          out.hidden = false;
          out.textContent = 'A enviar e-mail de teste…';
        }
        fetch('/api/admin/test-smtp', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        })
          .then(function (r) {
            return r.json().then(function (b) {
              return { ok: r.ok, body: b };
            });
          })
          .then(function (res) {
            if (out) {
              out.textContent = res.ok
                ? 'E-mail de teste enviado para ' + (res.body.to || 'destinatário configurado') + '.'
                : res.body.error || 'Falha ao enviar.';
            }
            if (res.ok && window.SiteToast) window.SiteToast.success('E-mail de teste enviado.');
            else if (!res.ok && window.SiteToast) window.SiteToast.error(res.body.error || 'Erro SMTP');
          })
          .catch(function () {
            if (out) out.textContent = 'Erro de rede ao testar SMTP.';
          })
          .finally(function () {
            btnTestSmtp.disabled = false;
          });
      });
    }

    // ---- Formulários: lida + filtro ----
    var origForm = AP.renderFormularios;
    AP.renderFormularios = function () {
      var cont = filtrarPorData((D.getMensagensContato() || []).slice());
      var mem = filtrarPorData((D.getMensagensMembros() || []).slice());
      var doaAll = filtrarPorData((D.getPedidosDoacao && D.getPedidosDoacao()) || []);
      if (formFiltroLidas === 'nao_lidas') {
        cont = cont.filter(isUnread);
        mem = mem.filter(isUnread);
        doaAll = doaAll.filter(isUnread);
      }

      var tbC = document.querySelector('#tabela-form-contato tbody');
      if (tbC) {
        tbC.innerHTML = cont
          .slice()
          .reverse()
          .map(function (m) {
            var cls = isUnread(m) ? ' admin-row-unread' : '';
            return (
              '<tr class="' +
              cls +
              '"><td>' +
              escHtml(AP.formatarDataHoraIso(m.criadoEm)) +
              '</td><td>' +
              escHtml(m.nome) +
              '</td><td>' +
              escHtml(m.email) +
              '</td><td>' +
              escHtml(m.assunto) +
              '</td><td class="admin-celula-texto">' +
              escHtml(m.mensagem) +
              '</td><td class="acoes">' +
              (m.email
                ? '<a class="btn btn-outline btn-sm" href="mailto:' +
                  encodeURIComponent(m.email) +
                  '?subject=' +
                  encodeURIComponent('Re: ' + (m.assunto || 'Contato')) +
                  '">Responder</a> '
                : '') +
              '<button type="button" class="btn btn-outline btn-sm btn-mark-read" data-col="mensagens_contato" data-id="' +
              attrSafe(m.id) +
              '" data-lida="' +
              (isUnread(m) ? '1' : '0') +
              '">' +
              (isUnread(m) ? 'Marcar lida' : 'Não lida') +
              '</button></td></tr>'
            );
          })
          .join('');
        wireMarkRead(tbC);
      }

      var tbM = document.querySelector('#tabela-form-membro tbody');
      if (tbM) {
        tbM.innerHTML = mem
          .slice()
          .reverse()
          .map(function (x) {
            var tipoLabel = x.tipo === 'voluntariado' ? 'Voluntariado' : x.tipo === 'suporte' ? 'Suporte' : escHtml(x.tipo);
            var det =
              x.tipo === 'voluntariado'
                ? (x.area ? 'Área: ' + escHtml(x.area) + ' · ' : '') + escHtml(x.mensagem || '')
                : 'Assunto: ' + escHtml(x.assunto || '') + ' · ' + escHtml(x.mensagem || '');
            var who = escHtml(x.membroNome || '') + (x.membroUsuario ? ' <small>(' + escHtml(x.membroUsuario) + ')</small>' : '');
            var cls = isUnread(x) ? ' admin-row-unread' : '';
            return (
              '<tr class="' +
              cls +
              '"><td>' +
              escHtml(AP.formatarDataHoraIso(x.criadoEm)) +
              '</td><td>' +
              tipoLabel +
              '</td><td>' +
              who +
              '</td><td class="admin-celula-texto">' +
              det +
              '</td><td class="acoes"><button type="button" class="btn btn-outline btn-sm btn-mark-read" data-col="mensagens_membros" data-id="' +
              attrSafe(x.id) +
              '" data-lida="' +
              (isUnread(x) ? '1' : '0') +
              '">' +
              (isUnread(x) ? 'Marcar lida' : 'Não lida') +
              '</button></td></tr>'
            );
          })
          .join('');
        wireMarkRead(tbM);
      }

      var vazioC = document.getElementById('form-contato-vazio');
      var vazioM = document.getElementById('form-membro-vazio');
      var acoesC = document.getElementById('form-contato-acoes');
      var acoesM = document.getElementById('form-membro-acoes');
      if (vazioC) vazioC.style.display = cont.length ? 'none' : 'block';
      if (vazioM) vazioM.style.display = mem.length ? 'none' : 'block';
      if (acoesC) acoesC.style.display = isAdmin && (D.getMensagensContato() || []).length ? 'block' : 'none';
      if (acoesM) acoesM.style.display = isAdmin && (D.getMensagensMembros() || []).length ? 'block' : 'none';

      var doa = doaAll;
      var tbD = document.querySelector('#tabela-form-doacao tbody');
      var vazioD = document.getElementById('form-doacao-vazio');
      var acoesD = document.getElementById('form-doacao-acoes');
      if (tbD) {
        tbD.innerHTML = doa
          .slice()
          .reverse()
          .map(function (p) {
            var vr = p.valorReais != null ? String(p.valorReais) : '—';
            var est = p.estado || 'pendente';
            var opts = ['pendente', 'contactado', 'concluido']
              .map(function (s) {
                return '<option value="' + s + '"' + (est === s ? ' selected' : '') + '>' + s + '</option>';
              })
              .join('');
            var clsD = isUnread(p) ? ' admin-row-unread' : '';
            return (
              '<tr class="' +
              clsD +
              '"><td>' +
              escHtml(AP.formatarDataHoraIso(p.criadoEm)) +
              '</td><td>' +
              escHtml(p.nome || '—') +
              '</td><td>' +
              escHtml(p.email) +
              '</td><td>' +
              escHtml(vr) +
              '</td><td><select class="select-estado-doacao" data-id="' +
              attrSafe(p.id) +
              '">' +
              opts +
              '</select></td><td class="acoes"><button type="button" class="btn btn-outline btn-sm btn-mark-read" data-col="pedidos_doacao" data-id="' +
              attrSafe(p.id) +
              '" data-lida="' +
              (isUnread(p) ? '1' : '0') +
              '">' +
              (isUnread(p) ? 'Marcar lida' : 'Não lida') +
              '</button></td></tr>'
            );
          })
          .join('');
        wireMarkRead(tbD);
        tbD.querySelectorAll('.select-estado-doacao').forEach(function (sel) {
          sel.addEventListener('change', function () {
            var pid = this.getAttribute('data-id');
            var list = ((D.getPedidosDoacao && D.getPedidosDoacao()) || []).slice();
            var ix = list.findIndex(function (x) {
              return String(x.id) === String(pid);
            });
            if (ix < 0) return;
            list[ix] = Object.assign({}, list[ix], { estado: this.value });
            D.setPedidosDoacao(list).catch(AP.errSave);
          });
        });
        if (vazioD) vazioD.style.display = doa.length ? 'none' : 'block';
        if (acoesD) acoesD.style.display = isAdmin && doa.length ? 'block' : 'none';
      }

      updateSidebarBadges();
      AP.atualizarDashboard();
    };

    function wireMarkRead(tbody) {
      tbody.querySelectorAll('.btn-mark-read').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var col = this.getAttribute('data-col');
          var id = this.getAttribute('data-id');
          var lida = this.getAttribute('data-lida') === '1';
          markRead(col, id, lida)
            .then(function () {
              AP.renderFormularios();
            })
            .catch(AP.errSave);
        });
      });
    }

    var filtroForm = document.getElementById('filtro-form-lidas');
    if (filtroForm) {
      filtroForm.addEventListener('change', function () {
        formFiltroLidas = this.value;
        AP.renderFormularios();
      });
    }
    var filtroDesde = document.getElementById('filtro-form-desde');
    if (filtroDesde) {
      filtroDesde.addEventListener('change', function () {
        formFiltroDesde = this.value || '';
        AP.renderFormularios();
      });
    }
    var btnLimparDesde = document.getElementById('filtro-form-desde-limpar');
    if (btnLimparDesde) {
      btnLimparDesde.addEventListener('click', function () {
        formFiltroDesde = '';
        if (filtroDesde) filtroDesde.value = '';
        AP.renderFormularios();
      });
    }

    var btnCsvCont = document.getElementById('btn-export-contato-csv');
    if (btnCsvCont) {
      btnCsvCont.addEventListener('click', function () {
        var list = D.getMensagensContato() || [];
        exportCsv(
          'contato-' + new Date().toISOString().slice(0, 10) + '.csv',
          ['data', 'nome', 'email', 'assunto', 'mensagem', 'lida'],
          list.map(function (m) {
            return [m.criadoEm, m.nome, m.email, m.assunto, m.mensagem, m.lida ? 'sim' : 'nao'];
          })
        );
      });
    }
    var btnCsvDoa = document.getElementById('btn-export-doacao-csv');
    if (btnCsvDoa) {
      btnCsvDoa.addEventListener('click', function () {
        var list = D.getPedidosDoacao() || [];
        exportCsv(
          'doacoes-' + new Date().toISOString().slice(0, 10) + '.csv',
          ['data', 'nome', 'email', 'valor', 'estado', 'lida'],
          list.map(function (p) {
            return [p.criadoEm, p.nome, p.email, p.valorReais, p.estado, p.lida ? 'sim' : 'nao'];
          })
        );
      });
    }

    // Limpar com confirmação reforçada
    ['btn-limpar-contato', 'btn-limpar-doacao', 'btn-limpar-membro-msg'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.dataset.melhoriasWired) return;
      btn.dataset.melhoriasWired = '1';
      var clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', function () {
        if (!isAdmin) return;
        confirmar(
          'Esta ação apaga o histórico. Recomendamos descarregar o backup JSON antes. Continuar?',
          'Apagar histórico'
        ).then(function (ok) {
          if (!ok) return;
          if (id === 'btn-limpar-contato') {
            D.setMensagensContato([])
              .then(function () {
                return D.refresh();
              })
              .then(AP.renderFormularios)
              .catch(AP.errSave);
          } else if (id === 'btn-limpar-doacao') {
            D.setPedidosDoacao([])
              .then(function () {
                return D.refresh();
              })
              .then(AP.renderFormularios)
              .catch(AP.errSave);
          } else {
            D.setMensagensMembros([])
              .then(function () {
                return D.refresh();
              })
              .then(AP.renderFormularios)
              .catch(AP.errSave);
          }
        });
      });
    });

    // ---- Pesquisa global ----
    var busca = document.getElementById('admin-busca-global');
    var resultados = document.getElementById('admin-busca-resultados');
    if (busca && resultados) {
      busca.addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        if (q.length < 2) {
          resultados.hidden = true;
          return;
        }
        var hits = [];
        (D.getEvents() || []).forEach(function (e) {
          if ((e.titulo || '').toLowerCase().indexOf(q) >= 0) hits.push({ tipo: 'Evento', label: e.titulo, go: 'eventos' });
        });
        (D.getNews() || []).forEach(function (n) {
          if ((n.titulo || '').toLowerCase().indexOf(q) >= 0) hits.push({ tipo: 'Notícia', label: n.titulo, go: 'noticias' });
        });
        (D.getMembers() || []).forEach(function (m) {
          if ((m.nome || '').toLowerCase().indexOf(q) >= 0 || (m.usuario || '').toLowerCase().indexOf(q) >= 0) {
            hits.push({ tipo: 'Membro', label: m.nome || m.usuario, go: 'membros' });
          }
        });
        (D.getInscricoes() || []).forEach(function (i) {
          if ((i.nome || '').toLowerCase().indexOf(q) >= 0 || (i.email || '').toLowerCase().indexOf(q) >= 0) {
            hits.push({ tipo: 'Inscrição', label: (i.nome || i.email) + ' — ' + (i.eventoTitulo || ''), go: 'inscricoes' });
          }
        });
        if (!hits.length) {
          resultados.innerHTML = '<p class="admin-aviso">Nenhum resultado.</p>';
        } else {
          resultados.innerHTML = hits
            .slice(0, 12)
            .map(function (h) {
              return (
                '<button type="button" class="admin-busca-item" data-go="' +
                h.go +
                '"><strong>' +
                escHtml(h.tipo) +
                '</strong> ' +
                escHtml(h.label) +
                '</button>'
              );
            })
            .join('');
          resultados.querySelectorAll('.admin-busca-item').forEach(function (b) {
            b.addEventListener('click', function () {
              var go = this.getAttribute('data-go');
              var nav = document.querySelector('.admin-sidebar a[data-secao="' + go + '"]');
              if (nav) nav.click();
              resultados.hidden = true;
              busca.value = '';
            });
          });
        }
        resultados.hidden = false;
      });
      document.addEventListener('click', function (e) {
        if (!busca.contains(e.target) && !resultados.contains(e.target)) resultados.hidden = true;
      });
    }

    // ---- Alterar senha ----
    var formSenha = document.getElementById('form-alterar-senha');
    if (formSenha) {
      formSenha.addEventListener('submit', function (e) {
        e.preventDefault();
        var a = document.getElementById('senha-atual').value;
        var n1 = document.getElementById('senha-nova').value;
        var n2 = document.getElementById('senha-nova2').value;
        if (n1 !== n2) {
          AP.toastWarn('As senhas novas não coincidem.');
          return;
        }
        fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ senhaAtual: a, senhaNova: n1 })
        })
          .then(function (r) {
            return r.json().then(function (j) {
              if (!r.ok) throw new Error(j.error || r.statusText);
              formSenha.reset();
              AP.toastOk('Senha atualizada.');
            });
          })
          .catch(AP.errSave);
      });
    }

    // ---- Utilizadores admin ----
    if (isAdmin) {
      var formAdminCard = document.getElementById('form-admin-user-card');
      var formAdmin = document.getElementById('form-admin-user');

      function renderAdminUsers() {
        var tbody = document.querySelector('#tabela-admin-users tbody');
        if (!tbody) return;
        var list = D.getAdminUsers() || [];
        tbody.innerHTML = list
          .map(function (u) {
            return (
              '<tr><td>' +
              escHtml(u.usuario) +
              '</td><td>' +
              escHtml(u.nome) +
              '</td><td>' +
              escHtml(u.perfil || 'editor') +
              '</td><td class="acoes"><button type="button" class="btn btn-outline btn-sm btn-edit-admin-user" data-id="' +
              attrSafe(u.id) +
              '">Editar</button></td></tr>'
            );
          })
          .join('');
        tbody.querySelectorAll('.btn-edit-admin-user').forEach(function (b) {
          b.addEventListener('click', function () {
            var u = list.find(function (x) {
              return String(x.id) === String(b.getAttribute('data-id'));
            });
            if (!u) return;
            document.getElementById('admin-user-id').value = u.id;
            document.getElementById('admin-user-usuario').value = u.usuario || '';
            document.getElementById('admin-user-usuario').readOnly = true;
            document.getElementById('admin-user-senha').value = '';
            document.getElementById('admin-user-nome').value = u.nome || '';
            document.getElementById('admin-user-perfil').value = u.perfil || 'editor';
            document.getElementById('form-admin-user-titulo').textContent = 'Editar utilizador';
            formAdminCard.style.display = 'block';
          });
        });
      }

      document.getElementById('btn-novo-admin-user').addEventListener('click', function () {
        formAdmin.reset();
        document.getElementById('admin-user-id').value = '';
        document.getElementById('admin-user-usuario').readOnly = false;
        document.getElementById('form-admin-user-titulo').textContent = 'Novo utilizador';
        formAdminCard.style.display = 'block';
      });
      document.getElementById('admin-user-cancelar').addEventListener('click', function () {
        formAdminCard.style.display = 'none';
      });
      if (formAdmin) {
        formAdmin.addEventListener('submit', function (e) {
          e.preventDefault();
          var list = (D.getAdminUsers() || []).slice();
          var rec = {
            id: document.getElementById('admin-user-id').value || AP.id(),
            usuario: document.getElementById('admin-user-usuario').value.trim(),
            nome: document.getElementById('admin-user-nome').value.trim(),
            perfil: document.getElementById('admin-user-perfil').value,
            senha: document.getElementById('admin-user-senha').value
          };
          if (!rec.usuario || !rec.nome) {
            AP.toastWarn('Preencha utilizador e nome.');
            return;
          }
          var ix = list.findIndex(function (x) {
            return String(x.id) === String(rec.id);
          });
          if (ix >= 0) {
            if (!rec.senha) rec.senha = list[ix].senha || '';
            list[ix] = Object.assign({}, list[ix], rec);
          } else {
            if (!rec.senha) {
              AP.toastWarn('Informe uma senha para o novo utilizador.');
              return;
            }
            list.push(rec);
          }
          showSaving(true);
          fetch('/api/state/admin_users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(list)
          })
            .then(function (r) {
              return r.json().then(function (j) {
                if (!r.ok) throw new Error(j.error || r.statusText);
                return D.refresh();
              });
            })
            .then(function () {
              renderAdminUsers();
              formAdminCard.style.display = 'none';
              AP.toastOk('Utilizador guardado.');
            })
            .catch(AP.errSave)
            .finally(function () {
              showSaving(false);
            });
        });
      }

      document.getElementById('btn-backup-json').addEventListener('click', function () {
        window.location.href = '/api/admin/backup';
      });

      document.querySelector('.admin-sidebar a[data-secao="utilizadores"]').addEventListener('click', function () {
        setTimeout(renderAdminUsers, 0);
      });
      renderAdminUsers();
    }

    // Navegação secção conta
    document.querySelectorAll('.admin-sidebar a[data-secao="conta"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.admin-sidebar a[data-secao]').forEach(function (x) {
          x.classList.remove('ativo');
        });
        a.classList.add('ativo');
        document.querySelectorAll('.admin-secao').forEach(function (s) {
          s.classList.remove('ativo');
        });
        var el = document.getElementById('secao-conta');
        if (el) el.classList.add('ativo');
      });
    });

    // ---- Duplicar registos (delegação) ----
    document.body.addEventListener('click', function (e) {
      var dup = e.target.closest('[data-dup-evento]');
      if (dup && AP.duplicarEvento) AP.duplicarEvento(dup.getAttribute('data-dup-evento'));
      var dupN = e.target.closest('[data-dup-noticia]');
      if (dupN && AP.duplicarNoticia) AP.duplicarNoticia(dupN.getAttribute('data-dup-noticia'));
      var dupB = e.target.closest('[data-dup-blog]');
      if (dupB && AP.duplicarBlog) AP.duplicarBlog(dupB.getAttribute('data-dup-blog'));
    });

    var menuBtn = document.getElementById('admin-menu-toggle');
    var sidebarEl = document.querySelector('.admin-sidebar');
    if (menuBtn && sidebarEl) {
      menuBtn.addEventListener('click', function () {
        var open = sidebarEl.classList.toggle('admin-sidebar--open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (ev) {
        if (!sidebarEl.classList.contains('admin-sidebar--open')) return;
        if (sidebarEl.contains(ev.target) || menuBtn.contains(ev.target)) return;
        sidebarEl.classList.remove('admin-sidebar--open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    }

    AP.publicUrl = publicUrl;
  });
})();
