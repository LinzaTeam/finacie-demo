# Финансье — публичное демо

Обезличенный интерфейс финансового приложения. Демо не подключено к production-базе:
добавленные операции существуют только в памяти вкладки и исчезают после перезагрузки.

Публичная версия: https://linzateam.github.io/finacie-demo/

## Проверка локально

```bash
npm ci
VITE_FINANCE_DEMO=true npm run dev
```

Каждый push в `main` запускает тесты, TypeScript-проверку, production build, privacy scan
и GitHub Pages deployment.
