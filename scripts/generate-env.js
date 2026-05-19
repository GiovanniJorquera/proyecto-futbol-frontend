const fs = require('fs');
const path = require('path');

const envFilePath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.API_URL ||
  process.env.PUBLIC_API_URL ||
  'https://backend-futbol-f5sj.onrender.com';

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};
`;

fs.writeFileSync(envFilePath, content, { encoding: 'utf8' });
console.log(`Generated environment.prod.ts with apiUrl=${apiUrl}`);
