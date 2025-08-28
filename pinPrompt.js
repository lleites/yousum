export function promptForPin(message = 'Enter PIN') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    const box = document.createElement('div');
    box.className = 'pin-box';
    const form = document.createElement('form');
    const label = document.createElement('div');
    label.className = 'pin-title';
    label.textContent = message;
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'PIN';
    input.autocomplete = 'new-password';
    input.className = 'pin-input';
    const actions = document.createElement('div');
    actions.className = 'pin-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    const ok = document.createElement('button');
    ok.type = 'submit';
    ok.textContent = 'OK';
    actions.appendChild(cancel);
    actions.appendChild(ok);
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(actions);
    box.appendChild(form);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const done = val => {
      overlay.remove();
      resolve(val);
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      done(input.value);
    });
    cancel.addEventListener('click', () => done(''));
    overlay.addEventListener('click', e => { if (e.target === overlay) done(''); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        done('');
      }
    });
    setTimeout(() => input.focus(), 0);
  });
}
