import fs from "fs";
import path from "path";
const filePath = path.join(process.cwd(), "components/PlayerControls.tsx");
let code = fs.readFileSync(filePath, "utf8");
code = code.replace(/>Suno<\/span>/g, ">Joel's Music</span>");
fs.writeFileSync(filePath, code);
