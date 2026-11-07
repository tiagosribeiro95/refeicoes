# Refeições

Webapp (PWA) para seguir um plano alimentar: carrega o PDF do plano, revê as refeições, e adiciona avisos diários ao Calendário do iPhone (X minutos antes de cada refeição, com o que comer).

- Tudo corre no dispositivo: o PDF é lido localmente com pdf.js; os dados ficam em `localStorage`.
- Avisos via ficheiro `.ics` (eventos diários com alarme), porque o iOS não permite notificações agendadas em webapps.
