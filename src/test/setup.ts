import '@testing-library/jest-dom/vitest';

// Fixa a timezone para os testes de data ficarem determinísticos (Brasil).
process.env.TZ = 'America/Sao_Paulo';