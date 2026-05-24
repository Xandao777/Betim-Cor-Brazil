/**
 * Editor rich text simples (contenteditable) sincronizado com textarea oculta.
 */
(function () {
  'use strict';

  function exec(cmd, val) {
    try {
      document.execCommand(cmd, false, val || null);
    } catch (e) {}
  }

  function sync(ta, body) {
    ta.value = body.innerHTML;
  }

  function attachRichEditor(textareaId) {
    var ta = document.getElementById(textareaId);
    if (!ta || ta.dataset.richEditor === '1') return;
    ta.dataset.richEditor = '1';

    var wrap = document.createElement('div');
    wrap.className = 'admin-rich-editor';

    var toolbar = document.createElement('div');
    toolbar.className = 'admin-rich-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.innerHTML =
      '<button type="button" data-cmd="bold" title="Negrito"><b>B</b></button>' +
      '<button type="button" data-cmd="italic" title="Itálico"><i>I</i></button>' +
      '<button type="button" data-cmd="insertUnorderedList" title="Lista">• Lista</button>' +
      '<button type="button" data-cmd="formatBlock" data-val="h3" title="Subtítulo">H3</button>' +
      '<button type="button" data-cmd="createLink" title="Link">Link</button>';

    var body = document.createElement('div');
    body.className = 'admin-rich-body';
    body.contentEditable = 'true';
    body.setAttribute('role', 'textbox');
    body.setAttribute('aria-multiline', 'true');
    if (ta.value) body.innerHTML = ta.value;

    ta.classList.add('admin-rich-source');
    ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(toolbar);
    wrap.appendChild(body);
    wrap.appendChild(ta);

    body.addEventListener('input', function () {
      sync(ta, body);
    });

    toolbar.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-cmd]');
      if (!btn) return;
      ev.preventDefault();
      body.focus();
      var cmd = btn.getAttribute('data-cmd');
      if (cmd === 'createLink') {
        var url = window.prompt('URL do link (https://…)', 'https://');
        if (url) exec('createLink', url);
      } else if (cmd === 'formatBlock') {
        exec('formatBlock', btn.getAttribute('data-val') || 'p');
      } else {
        exec(cmd);
      }
      sync(ta, body);
    });

    ta._richSetContent = function (html) {
      body.innerHTML = html || '';
      sync(ta, body);
    };
    sync(ta, body);
  }

  window.AdminRichEditor = {
    attach: attachRichEditor,
    setContent: function (textareaId, html) {
      var ta = document.getElementById(textareaId);
      if (ta && ta._richSetContent) ta._richSetContent(html);
      else if (ta) ta.value = html || '';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    attachRichEditor('noticia-conteudo');
    attachRichEditor('blog-conteudo');
  });
})();
