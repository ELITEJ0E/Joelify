import { parseLrc } from "./hooks/useLyrics.ts";

const lyrics = `[00:01.00]Intro
[00:05.00]Oh oh oh
[00:09.00]Itataas Ka Hesus

[00:16.00]Verse 1
[00:18.00]Naligaw sa dilim
[00:22.00]Tinawag Mo ako`;

console.log(parseLrc(lyrics));
