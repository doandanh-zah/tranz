import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['dist/**','node_modules/**','agora-baseline/**']},js.configs.recommended,...ts.configs.recommended,{languageOptions:{globals:{console:'readonly',process:'readonly',Buffer:'readonly',URL:'readonly',setTimeout:'readonly',fetch:'readonly'}},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}},{files:['scripts/**/*.mjs'],languageOptions:{globals:{document:'readonly',getComputedStyle:'readonly',chrome:'readonly',setInterval:'readonly',clearInterval:'readonly'}}});
