const regex = /^\[\s*(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\s*\](.*)$/;
const str = "[00:01.00]Intro";
console.log(str.match(regex));
