import fs from 'fs';

const html = fs.readFileSync('suno.html', 'utf8');

const chunks = [];
for (const match of html.matchAll(/self\.__next_f\.push\((\[1,"(?:\\.|[^"\\])*"\])\)/g)) {
  try {
     const arr = JSON.parse(match[1]);
     if (typeof arr[1] === 'string') {
        chunks.push(arr[1]);
     }
  } catch(e) {}
}

const fullStr = chunks.join('');
console.log(fullStr.substring(fullStr.indexOf('5d:'), fullStr.indexOf('5d:') + 100));
