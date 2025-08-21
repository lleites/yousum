export function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  let html = '';
  let inList = false;
  for (let raw of lines) {
    let line = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    if (/^###\s+/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<h3>' + line.replace(/^###\s+/, '') + '</h3>';
    } else if (/^##\s+/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<h2>' + line.replace(/^##\s+/, '') + '</h2>';
    } else if (/^#\s+/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<h1>' + line.replace(/^#\s+/, '') + '</h1>';
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += '<li>' + line.replace(/^[-*]\s+/, '') + '</li>';
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<p>' + line + '</p>';
    }
  }
  if (inList) html += '</ul>';
  return html;
}
