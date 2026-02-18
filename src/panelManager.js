const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const panels = new Map();

const BASE_CSS = `.CodeMirror{font-family:monospace;height:300px;color:#000;direction:ltr}.CodeMirror-lines{padding:4px 0}.CodeMirror pre.CodeMirror-line,.CodeMirror pre.CodeMirror-line-like{padding:0 4px}.CodeMirror-gutter-filler,.CodeMirror-scrollbar-filler{background-color:#fff}.CodeMirror-gutters{border-right:1px solid #ddd;background-color:#f7f7f7;white-space:nowrap}.CodeMirror-linenumber{padding:0 3px 0 5px;min-width:20px;text-align:right;color:#999;white-space:nowrap}.CodeMirror-guttermarker{color:#000}.CodeMirror-guttermarker-subtle{color:#999}.CodeMirror-cursor{border-left:1px solid #000;border-right:none;width:0}.CodeMirror div.CodeMirror-secondarycursor{border-left:1px solid silver}.cm-fat-cursor .CodeMirror-cursor{width:auto;border:0!important;background:#7e7}.cm-fat-cursor div.CodeMirror-cursors{z-index:1}.cm-fat-cursor .CodeMirror-line::selection,.cm-fat-cursor .CodeMirror-line>span::selection,.cm-fat-cursor .CodeMirror-line>span>span::selection{background:0 0}.cm-fat-cursor .CodeMirror-line::-moz-selection,.cm-fat-cursor .CodeMirror-line>span::-moz-selection,.cm-fat-cursor .CodeMirror-line>span>span::-moz-selection{background:0 0}.cm-fat-cursor{caret-color:transparent}@-moz-keyframes blink{50%{background-color:transparent}}@-webkit-keyframes blink{50%{background-color:transparent}}@keyframes blink{50%{background-color:transparent}}.cm-tab{display:inline-block;text-decoration:inherit}.CodeMirror-rulers{position:absolute;left:0;right:0;top:-50px;bottom:0;overflow:hidden}.CodeMirror-ruler{border-left:1px solid #ccc;top:0;bottom:0;position:absolute}.cm-s-default .cm-header{color:#00f}.cm-s-default .cm-quote{color:#090}.cm-negative{color:#d44}.cm-positive{color:#292}.cm-header,.cm-strong{font-weight:700}.cm-em{font-style:italic}.cm-link{text-decoration:underline}.cm-strikethrough{text-decoration:line-through}.cm-s-default .cm-keyword{color:#708}.cm-s-default .cm-atom{color:#219}.cm-s-default .cm-number{color:#164}.cm-s-default .cm-def{color:#00f}.cm-s-default .cm-variable-2{color:#05a}.cm-s-default .cm-type,.cm-s-default .cm-variable-3{color:#085}.cm-s-default .cm-comment{color:#a50}.cm-s-default .cm-string{color:#a11}.cm-s-default .cm-string-2{color:#f50}.cm-s-default .cm-meta{color:#555}.cm-s-default .cm-qualifier{color:#555}.cm-s-default .cm-builtin{color:#30a}.cm-s-default .cm-bracket{color:#997}.cm-s-default .cm-tag{color:#170}.cm-s-default .cm-attribute{color:#00c}.cm-s-default .cm-hr{color:#999}.cm-s-default .cm-link{color:#00c}.cm-s-default .cm-error{color:red}.cm-invalidchar{color:red}.CodeMirror-composing{border-bottom:2px solid}div.CodeMirror span.CodeMirror-matchingbracket{color:#0b0}div.CodeMirror span.CodeMirror-nonmatchingbracket{color:#a22}.CodeMirror-matchingtag{background:rgba(255,150,0,.3)}.CodeMirror-activeline-background{background:#e8f2ff}.CodeMirror{position:relative;overflow:hidden;background:#fff}.CodeMirror-scroll{overflow:scroll!important;margin-bottom:-50px;margin-right:-50px;padding-bottom:50px;height:100%;outline:0;position:relative;z-index:0}.CodeMirror-sizer{position:relative;border-right:50px solid transparent}.CodeMirror-gutter-filler,.CodeMirror-hscrollbar,.CodeMirror-scrollbar-filler,.CodeMirror-vscrollbar{position:absolute;z-index:6;display:none;outline:0}.CodeMirror-vscrollbar{right:0;top:0;overflow-x:hidden;overflow-y:scroll}.CodeMirror-hscrollbar{bottom:0;left:0;overflow-y:hidden;overflow-x:scroll}.CodeMirror-scrollbar-filler{right:0;bottom:0}.CodeMirror-gutter-filler{left:0;bottom:0}.CodeMirror-gutters{position:absolute;left:0;top:0;min-height:100%;z-index:3}.CodeMirror-gutter{white-space:normal;height:100%;display:inline-block;vertical-align:top;margin-bottom:-50px}.CodeMirror-gutter-wrapper{position:absolute;z-index:4;background:0 0!important;border:none!important}.CodeMirror-gutter-background{position:absolute;top:0;bottom:0;z-index:4}.CodeMirror-gutter-elt{position:absolute;cursor:default;z-index:4}.CodeMirror-gutter-wrapper ::selection{background-color:transparent}.CodeMirror-gutter-wrapper ::-moz-selection{background-color:transparent}.CodeMirror-lines{cursor:text;min-height:1px}.CodeMirror pre.CodeMirror-line,.CodeMirror pre.CodeMirror-line-like{-moz-border-radius:0;-webkit-border-radius:0;border-radius:0;border-width:0;background:0 0;font-family:inherit;font-size:inherit;margin:0;white-space:pre;word-wrap:normal;line-height:inherit;color:inherit;z-index:2;position:relative;overflow:visible;-webkit-tap-highlight-color:transparent;-webkit-font-variant-ligatures:contextual;font-variant-ligatures:contextual}.CodeMirror-wrap pre.CodeMirror-line,.CodeMirror-wrap pre.CodeMirror-line-like{word-wrap:break-word;white-space:pre-wrap;word-break:normal}.CodeMirror-linebackground{position:absolute;left:0;right:0;top:0;bottom:0;z-index:0}.CodeMirror-linewidget{position:relative;z-index:2;padding:.1px}.CodeMirror-rtl pre{direction:rtl}.CodeMirror-code{outline:0}.CodeMirror-gutter,.CodeMirror-gutters,.CodeMirror-linenumber,.CodeMirror-scroll,.CodeMirror-sizer{-moz-box-sizing:content-box;box-sizing:content-box}.CodeMirror-measure{position:absolute;width:100%;height:0;overflow:hidden;visibility:hidden}.CodeMirror-cursor{position:absolute;pointer-events:none}.CodeMirror-measure pre{position:static}div.CodeMirror-cursors{visibility:hidden;position:relative;z-index:3}div.CodeMirror-dragcursors{visibility:visible}.CodeMirror-focused div.CodeMirror-cursors{visibility:visible}.CodeMirror-selected{background:#d9d9d9}.CodeMirror-focused .CodeMirror-selected{background:#d7d4f0}.CodeMirror-crosshair{cursor:crosshair}.CodeMirror-line::selection,.CodeMirror-line>span::selection,.CodeMirror-line>span>span::selection{background:#d7d4f0}.CodeMirror-line::-moz-selection,.CodeMirror-line>span::-moz-selection,.CodeMirror-line>span>span::-moz-selection{background:#d7d4f0}.cm-searching{background-color:#ffa;background-color:rgba(255,255,0,.4)}.cm-force-border{padding-right:.1px}@media print{.CodeMirror div.CodeMirror-cursors{visibility:hidden}}.cm-tab-wrap-hack:after{content:''}span.CodeMirror-selectedtext{background:0 0}`;

const THEME_CSS = `.cm-s-dracula .CodeMirror-gutters,.cm-s-dracula.CodeMirror{background-color:#282a36!important;color:#f8f8f2!important;border:none}.cm-s-dracula .CodeMirror-gutters{color:#282a36}.cm-s-dracula .CodeMirror-cursor{border-left:solid thin #f8f8f0}.cm-s-dracula .CodeMirror-linenumber{color:#6d8a88}.cm-s-dracula .CodeMirror-selected{background:rgba(255,255,255,.1)}.cm-s-dracula .CodeMirror-line::selection,.cm-s-dracula .CodeMirror-line>span::selection,.cm-s-dracula .CodeMirror-line>span>span::selection{background:rgba(255,255,255,.1)}.cm-s-dracula .CodeMirror-line::-moz-selection,.cm-s-dracula .CodeMirror-line>span::-moz-selection,.cm-s-dracula .CodeMirror-line>span>span::-moz-selection{background:rgba(255,255,255,.1)}.cm-s-dracula span.cm-comment{color:#6272a4}.cm-s-dracula span.cm-string,.cm-s-dracula span.cm-string-2{color:#f1fa8c}.cm-s-dracula span.cm-number{color:#bd93f9}.cm-s-dracula span.cm-variable{color:#50fa7b}.cm-s-dracula span.cm-variable-2{color:#fff}.cm-s-dracula span.cm-def{color:#50fa7b}.cm-s-dracula span.cm-operator{color:#ff79c6}.cm-s-dracula span.cm-keyword{color:#ff79c6}.cm-s-dracula span.cm-atom{color:#bd93f9}.cm-s-dracula span.cm-meta{color:#f8f8f2}.cm-s-dracula span.cm-tag{color:#ff79c6}.cm-s-dracula span.cm-attribute{color:#50fa7b}.cm-s-dracula span.cm-qualifier{color:#50fa7b}.cm-s-dracula span.cm-property{color:#66d9ef}.cm-s-dracula span.cm-builtin{color:#50fa7b}.cm-s-dracula span.cm-type,.cm-s-dracula span.cm-variable-3{color:#ffb86c}.cm-s-dracula .CodeMirror-activeline-background{background:rgba(255,255,255,.1)}.cm-s-dracula .CodeMirror-matchingbracket{text-decoration:underline;color:#fff!important}
.cm-s-monokai.CodeMirror{background:#272822;color:#f8f8f2}.cm-s-monokai div.CodeMirror-selected{background:#49483e}.cm-s-monokai .CodeMirror-gutters{background:#272822;border-right:0}.cm-s-monokai .CodeMirror-linenumber{color:#75715e}.cm-s-monokai .CodeMirror-cursor{border-left:1px solid #f8f8f0}.cm-s-monokai span.cm-comment{color:#75715e}.cm-s-monokai span.cm-atom,.cm-s-monokai span.cm-number{color:#ae81ff}.cm-s-monokai span.cm-keyword{color:#f92672}.cm-s-monokai span.cm-builtin{color:#66d9e8}.cm-s-monokai span.cm-string{color:#e6db74}.cm-s-monokai span.cm-variable-2{color:#9effff}.cm-s-monokai span.cm-variable-3,.cm-s-monokai span.cm-type{color:#66d9e8}.cm-s-monokai span.cm-def{color:#fd971f}.cm-s-monokai span.cm-bracket{color:#f8f8f2}.cm-s-monokai span.cm-tag{color:#f92672}.cm-s-monokai span.cm-header,.cm-s-monokai span.cm-link{color:#ae81ff}.cm-s-monokai span.cm-error{background:#f92672;color:#f8f8f0}.cm-s-monokai .CodeMirror-activeline-background{background:#373831}.cm-s-monokai .CodeMirror-matchingbracket{text-decoration:underline;color:#fff!important}
.cm-s-eclipse span.cm-meta{color:#ff1717}.cm-s-eclipse span.cm-keyword{font-weight:700;color:#7f0055}.cm-s-eclipse span.cm-atom{color:#219}.cm-s-eclipse span.cm-number{color:#164}.cm-s-eclipse span.cm-def{color:#00f}.cm-s-eclipse span.cm-variable,.cm-s-eclipse span.cm-property,.cm-s-eclipse span.cm-operator{color:#000}.cm-s-eclipse span.cm-variable-2,.cm-s-eclipse span.cm-variable-3,.cm-s-eclipse span.cm-type{color:#0000c0}.cm-s-eclipse span.cm-comment{color:#3f7f5f}.cm-s-eclipse span.cm-string{color:#2a00ff}.cm-s-eclipse span.cm-string-2{color:#f50}.cm-s-eclipse span.cm-builtin{color:#30a}.cm-s-eclipse span.cm-bracket{color:#cc7}.cm-s-eclipse span.cm-tag{color:#170}.cm-s-eclipse span.cm-attribute{color:#00f}.cm-s-eclipse span.cm-link{color:#219}.cm-s-eclipse span.cm-error{color:red}.cm-s-eclipse .CodeMirror-activeline-background{background:#e8f2ff}.cm-s-eclipse .CodeMirror-matchingbracket{border:1px solid grey}
.cm-s-nord.CodeMirror{background:#2e3440;color:#d8dee9}.cm-s-nord div.CodeMirror-selected{background:#434c5e}.cm-s-nord .CodeMirror-line::selection,.cm-s-nord .CodeMirror-line>span::selection,.cm-s-nord .CodeMirror-line>span>span::selection{background:#3b4252}.cm-s-nord .CodeMirror-line::-moz-selection,.cm-s-nord .CodeMirror-line>span::-moz-selection,.cm-s-nord .CodeMirror-line>span>span::-moz-selection{background:#3b4252}.cm-s-nord .CodeMirror-gutters{background:#2e3440;border-right:0}.cm-s-nord .CodeMirror-guttermarker{color:#4c566a}.cm-s-nord .CodeMirror-guttermarker-subtle{color:#4c566a}.cm-s-nord .CodeMirror-linenumber{color:#4c566a}.cm-s-nord .CodeMirror-cursor{border-left:1px solid #f8f8f0}.cm-s-nord span.cm-comment{color:#4c566a}.cm-s-nord span.cm-atom{color:#b48ead}.cm-s-nord span.cm-number{color:#b48ead}.cm-s-nord span.cm-comment.cm-attribute{color:#97b757}.cm-s-nord span.cm-comment.cm-def{color:#bc9262}.cm-s-nord span.cm-comment.cm-tag{color:#bc6283}.cm-s-nord span.cm-comment.cm-type{color:#5998a6}.cm-s-nord span.cm-attribute,.cm-s-nord span.cm-property{color:#8fbcbb}.cm-s-nord span.cm-keyword{color:#81a1c1}.cm-s-nord span.cm-builtin{color:#81a1c1}.cm-s-nord span.cm-string{color:#a3be8c}.cm-s-nord span.cm-variable{color:#d8dee9}.cm-s-nord span.cm-variable-2{color:#d8dee9}.cm-s-nord span.cm-type,.cm-s-nord span.cm-variable-3{color:#d8dee9}.cm-s-nord span.cm-def{color:#8fbcbb}.cm-s-nord span.cm-bracket{color:#81a1c1}.cm-s-nord span.cm-tag{color:#bf616a}.cm-s-nord span.cm-header{color:#b48ead}.cm-s-nord span.cm-link{color:#b48ead}.cm-s-nord span.cm-error{background:#bf616a;color:#f8f8f0}.cm-s-nord .CodeMirror-activeline-background{background:#3b4252}.cm-s-nord .CodeMirror-matchingbracket{text-decoration:underline;color:#fff!important}
.cm-s-material.CodeMirror{background-color:#263238;color:#eff}.cm-s-material .CodeMirror-gutters{background:#263238;color:#546e7a;border:none}.cm-s-material .CodeMirror-guttermarker,.cm-s-material .CodeMirror-guttermarker-subtle,.cm-s-material .CodeMirror-linenumber{color:#546e7a}.cm-s-material .CodeMirror-cursor{border-left:1px solid #fc0}.cm-s-material div.CodeMirror-selected{background:rgba(128,203,196,.2)}.cm-s-material.CodeMirror-focused div.CodeMirror-selected{background:rgba(128,203,196,.2)}.cm-s-material .CodeMirror-activeline-background{background:rgba(0,0,0,.5)}.cm-s-material .cm-keyword{color:#c792ea}.cm-s-material .cm-operator{color:#89ddff}.cm-s-material .cm-variable-2{color:#eff}.cm-s-material .cm-type,.cm-s-material .cm-variable-3{color:#f07178}.cm-s-material .cm-builtin{color:#ffcb6b}.cm-s-material .cm-atom{color:#f78c6c}.cm-s-material .cm-number{color:#ff5370}.cm-s-material .cm-def{color:#82aaff}.cm-s-material .cm-string{color:#c3e88d}.cm-s-material .cm-string-2{color:#f07178}.cm-s-material .cm-comment{color:#546e7a}.cm-s-material .cm-variable{color:#f07178}.cm-s-material .cm-tag{color:#ff5370}.cm-s-material .cm-meta{color:#ffcb6b}.cm-s-material .cm-attribute{color:#c792ea}.cm-s-material .cm-property{color:#c792ea}.cm-s-material .cm-qualifier{color:#decb6b}.cm-s-material .cm-error{color:#fff;background-color:#ff5370}.cm-s-material .CodeMirror-matchingbracket{text-decoration:underline;color:#fff!important}
.cm-s-ayu-dark.CodeMirror{background:#0a0e14;color:#b3b1ad}.cm-s-ayu-dark div.CodeMirror-selected{background:#273747}.cm-s-ayu-dark .CodeMirror-line::selection,.cm-s-ayu-dark .CodeMirror-line>span::selection,.cm-s-ayu-dark .CodeMirror-line>span>span::selection{background:#273747}.cm-s-ayu-dark .CodeMirror-line::-moz-selection,.cm-s-ayu-dark .CodeMirror-line>span::-moz-selection,.cm-s-ayu-dark .CodeMirror-line>span>span::-moz-selection{background:#273747}.cm-s-ayu-dark .CodeMirror-gutters{background:#0a0e14;border-right:0}.cm-s-ayu-dark .CodeMirror-guttermarker{color:#fff}.cm-s-ayu-dark .CodeMirror-guttermarker-subtle{color:#3d424d}.cm-s-ayu-dark .CodeMirror-linenumber{color:#3d424d}.cm-s-ayu-dark .CodeMirror-cursor{border-left:1px solid #e6b450}.cm-s-ayu-dark span.cm-comment{color:#626a73}.cm-s-ayu-dark span.cm-atom{color:#ae81ff}.cm-s-ayu-dark span.cm-number{color:#e6b450}.cm-s-ayu-dark span.cm-attribute,.cm-s-ayu-dark span.cm-property{color:#ffb454}.cm-s-ayu-dark span.cm-keyword{color:#ff8f40}.cm-s-ayu-dark span.cm-builtin{color:#e6b450}.cm-s-ayu-dark span.cm-string{color:#c2d94c}.cm-s-ayu-dark span.cm-variable{color:#b3b1ad}.cm-s-ayu-dark span.cm-variable-2{color:#f07178}.cm-s-ayu-dark span.cm-variable-3{color:#39bae6}.cm-s-ayu-dark span.cm-type{color:#ff8f40}.cm-s-ayu-dark span.cm-def{color:#fe9}.cm-s-ayu-dark span.cm-bracket{color:#f8f8f2}.cm-s-ayu-dark span.cm-tag{color:#39bae6}.cm-s-ayu-dark span.cm-header{color:#c2d94c}.cm-s-ayu-dark span.cm-link{color:#39bae6}.cm-s-ayu-dark span.cm-error{color:#f33}.cm-s-ayu-dark .CodeMirror-activeline-background{background:#01060e}.cm-s-ayu-dark .CodeMirror-matchingbracket{text-decoration:underline;color:#fff!important}
.cm-s-gruvbox-dark .CodeMirror-gutters,.cm-s-gruvbox-dark.CodeMirror{background-color:#282828;color:#bdae93}.cm-s-gruvbox-dark .CodeMirror-gutters{background:#282828;border-right:0}.cm-s-gruvbox-dark .CodeMirror-linenumber{color:#7c6f64}.cm-s-gruvbox-dark .CodeMirror-cursor{border-left:1px solid #ebdbb2}.cm-s-gruvbox-dark div.CodeMirror-selected{background:#928374}.cm-s-gruvbox-dark span.cm-meta{color:#83a598}.cm-s-gruvbox-dark span.cm-comment{color:#928374}.cm-s-gruvbox-dark span.cm-number,.cm-s-gruvbox-dark span.cm-atom{color:#d3869b}.cm-s-gruvbox-dark span.cm-keyword{color:#f84934}.cm-s-gruvbox-dark span.cm-variable{color:#ebdbb2}.cm-s-gruvbox-dark span.cm-variable-2{color:#ebdbb2}.cm-s-gruvbox-dark span.cm-type,.cm-s-gruvbox-dark span.cm-variable-3{color:#fabd2f}.cm-s-gruvbox-dark span.cm-operator{color:#ebdbb2}.cm-s-gruvbox-dark span.cm-def{color:#ebdbb2}.cm-s-gruvbox-dark span.cm-property{color:#ebdbb2}.cm-s-gruvbox-dark span.cm-string{color:#b8bb26}.cm-s-gruvbox-dark span.cm-string-2{color:#8ec07c}.cm-s-gruvbox-dark span.cm-qualifier{color:#8ec07c}.cm-s-gruvbox-dark span.cm-attribute{color:#8ec07c}.cm-s-gruvbox-dark .CodeMirror-activeline-background{background:#3c3836}.cm-s-gruvbox-dark .CodeMirror-matchingbracket{background:#928374;color:#282828!important}.cm-s-gruvbox-dark span.cm-builtin{color:#fe8019}.cm-s-gruvbox-dark span.cm-tag{color:#fe8019}
.cm-s-tomorrow-night-eighties.CodeMirror{background:#000;color:#ccc}.cm-s-tomorrow-night-eighties div.CodeMirror-selected{background:#2d2d2d}.cm-s-tomorrow-night-eighties .CodeMirror-gutters{background:#000;border-right:0}.cm-s-tomorrow-night-eighties .CodeMirror-guttermarker{color:#f2777a}.cm-s-tomorrow-night-eighties .CodeMirror-guttermarker-subtle{color:#777}.cm-s-tomorrow-night-eighties .CodeMirror-linenumber{color:#515151}.cm-s-tomorrow-night-eighties .CodeMirror-cursor{border-left:1px solid #6a6a6a}.cm-s-tomorrow-night-eighties span.cm-comment{color:#d27b53}.cm-s-tomorrow-night-eighties span.cm-atom{color:#a16a94}.cm-s-tomorrow-night-eighties span.cm-number{color:#a16a94}.cm-s-tomorrow-night-eighties span.cm-attribute,.cm-s-tomorrow-night-eighties span.cm-property{color:#9c9}.cm-s-tomorrow-night-eighties span.cm-keyword{color:#f2777a}.cm-s-tomorrow-night-eighties span.cm-string{color:#fc6}.cm-s-tomorrow-night-eighties span.cm-variable{color:#9c9}.cm-s-tomorrow-night-eighties span.cm-variable-2{color:#69c}.cm-s-tomorrow-night-eighties span.cm-def{color:#f99157}.cm-s-tomorrow-night-eighties span.cm-bracket{color:#ccc}.cm-s-tomorrow-night-eighties span.cm-tag{color:#f2777a}.cm-s-tomorrow-night-eighties span.cm-link{color:#a16a94}.cm-s-tomorrow-night-eighties span.cm-error{background:#f2777a;color:#6a6a6a}.cm-s-tomorrow-night-eighties .CodeMirror-activeline-background{background:#343600}.cm-s-tomorrow-night-eighties .CodeMirror-matchingbracket{text-decoration:underline;color:#fff!important}
.solarized.base03{color:#002b36}.solarized.base02{color:#073642}.solarized.base01{color:#586e75}.solarized.base00{color:#657b83}.solarized.base0{color:#839496}.solarized.base1{color:#93a1a1}.solarized.base2{color:#eee8d5}.solarized.base3{color:#fdf6e3}.solarized.solar-yellow{color:#b58900}.solarized.solar-orange{color:#cb4b16}.solarized.solar-red{color:#dc322f}.solarized.solar-magenta{color:#d33682}.solarized.solar-violet{color:#6c71c4}.solarized.solar-blue{color:#268bd2}.solarized.solar-cyan{color:#2aa198}.solarized.solar-green{color:#859900}.cm-s-solarized{line-height:1.45em}.cm-s-solarized.cm-s-dark{color:#839496;background-color:#002b36}.cm-s-solarized.cm-s-light{background-color:#fdf6e3;color:#657b83}.cm-s-solarized .cm-keyword{color:#cb4b16}.cm-s-solarized .cm-atom{color:#d33682}.cm-s-solarized .cm-number{color:#d33682}.cm-s-solarized .cm-def{color:#2aa198}.cm-s-solarized .cm-variable{color:#839496}.cm-s-solarized .cm-variable-2{color:#b58900}.cm-s-solarized .cm-type,.cm-s-solarized .cm-variable-3{color:#6c71c4}.cm-s-solarized .cm-property{color:#2aa198}.cm-s-solarized .cm-operator{color:#6c71c4}.cm-s-solarized .cm-comment{color:#586e75;font-style:italic}.cm-s-solarized .cm-string{color:#859900}.cm-s-solarized .cm-string-2{color:#b58900}.cm-s-solarized .cm-builtin{color:#d33682}.cm-s-solarized .cm-bracket{color:#cb4b16}.cm-s-solarized .CodeMirror-matchingbracket{color:#859900}.cm-s-solarized .cm-tag{color:#93a1a1}.cm-s-solarized .cm-attribute{color:#2aa198}.cm-s-solarized .cm-error{color:#586e75;border-bottom:1px dotted #dc322f}.cm-s-solarized.cm-s-dark div.CodeMirror-selected{background:#073642}.cm-s-solarized.cm-s-light div.CodeMirror-selected{background:#eee8d5}.cm-s-solarized .CodeMirror-gutters{border-right:0}.cm-s-solarized.cm-s-dark .CodeMirror-gutters{background-color:#073642}.cm-s-solarized.cm-s-dark .CodeMirror-linenumber{color:#586e75}.cm-s-solarized.cm-s-light .CodeMirror-gutters{background-color:#eee8d5}.cm-s-solarized.cm-s-light .CodeMirror-linenumber{color:#839496}.cm-s-solarized .CodeMirror-cursor{border-left:1px solid #819090}.cm-s-solarized.cm-s-dark .CodeMirror-activeline-background{background:rgba(255,255,255,.06)}.cm-s-solarized.cm-s-light .CodeMirror-activeline-background{background:rgba(0,0,0,.06)}
`;

const EXPORT_FILENAMES = {
  GraphingCalculator: 'graphing.desmos',
  Calculator3D: '3d.desmos',
  Geometry: 'geometry.desmos',
  ScientificCalculator: 'scientific.desmos',
  FourFunctionCalculator: 'fourfunc.desmos',
};

const THEMES = [
  { value: 'dracula',                  label: 'Dracula' },
  { value: 'nord',                     label: 'Nord' },
  { value: 'material',                 label: 'Material' },
  { value: 'ayu-dark',                 label: 'Ayu Dark' },
  { value: 'gruvbox-dark',             label: 'Gruvbox Dark' },
  { value: 'monokai',                  label: 'Monokai' },
  { value: 'tomorrow-night-eighties',  label: 'Tomorrow Night 80s' },
  { value: 'solarized dark',           label: 'Solarized Dark' },
  { value: 'solarized light',          label: 'Solarized Light' },
  { value: 'eclipse',                  label: 'Eclipse' },
  { value: 'default',                  label: 'Default' },
];

function getHtml(scriptUri, cmJsUri, jsModeUri, calculatorType, jsonTheme) {
  jsonTheme = jsonTheme || 'dracula';
  const hasState = calculatorType === 'GraphingCalculator' || calculatorType === 'Geometry' || calculatorType === 'Calculator3D';
  const themeOptions = THEMES
    .map(t => `<option value="${t.value}"${t.value === jsonTheme ? ' selected' : ''}>${t.label}</option>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${BASE_CSS}
    ${THEME_CSS}
    html, body { height: 100%; margin: 0; padding: 0; }
    #container { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
    #left { flex: ${hasState ? '7' : '1'} 1 0; min-width: 200px; background: #fff; }
    #right { flex: 3 1 0; min-width: 200px; background: var(--vscode-editor-background, #1e1e1e); position: relative; display: flex; flex-direction: column; ${hasState ? '' : 'display: none;'} }
    #dragbar { width: 6px; background: #888; cursor: ew-resize; z-index: 10; ${hasState ? '' : 'display: none;'} }
    #theme-bar { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: var(--vscode-sideBar-background, #252526); flex-shrink: 0; border-bottom: 1px solid var(--vscode-panel-border, #444); }
    #theme-label { font-size: 11px; font-family: var(--vscode-font-family, sans-serif); color: var(--vscode-foreground, #ccc); }
    #theme-select { font-size: 11px; font-family: var(--vscode-font-family, sans-serif); background: var(--vscode-dropdown-background, #3c3c3c); color: var(--vscode-dropdown-foreground, #f0f0f0); border: 1px solid var(--vscode-dropdown-border, #3c3c3c); border-radius: 2px; padding: 2px 4px; cursor: pointer; }
    textarea#json-editor { display: none; }
    .CodeMirror { flex: 1; height: auto; }
    .CodeMirror-gutters { border-right: none !important; }
    #apply-btn { position: absolute; bottom: 16px; right: 16px; background: #2d70b3; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; height: 32px; }
    #apply-btn:hover { background: #388c46; }
    #calculator { width: 100%; height: 100%; }
  </style>
  <script src="${cmJsUri}"></script>
  <script src="${jsModeUri}"></script>
</head>
<body>
  <div id="container">
    <div id="left"><div id="calculator"></div></div>
    <div id="dragbar"></div>
    <div id="right">
      ${hasState ? `<div id="theme-bar"><label id="theme-label">Theme</label><select id="theme-select">${themeOptions}</select></div>` : ''}
      <textarea id="json-editor" spellcheck="false"></textarea>
      <button id="apply-btn">Apply to Calculator</button>
    </div>
  </div>
  <script src="${scriptUri}"></script>
  <script>
    const vscode = acquireVsCodeApi();
    const CALC_TYPE = '${calculatorType}';
    const HAS_STATE = ${hasState};
    let Calc = null;
    window.addEventListener('DOMContentLoaded', () => {
      if (HAS_STATE) {
        const ta = document.getElementById('json-editor');
        window.editor = CodeMirror.fromTextArea(ta, {
          mode: { name: 'javascript', json: true },
          theme: '${jsonTheme}',
          lineNumbers: true,
          lineWrapping: true
        });
        const sel = document.getElementById('theme-select');
        if (sel) {
          sel.addEventListener('change', () => {
            window.editor.setOption('theme', sel.value);
            vscode.postMessage({ command: 'themeChange', theme: sel.value });
          });
        }
      }
    });
    function updateJsonViewer(state) {
      if (!HAS_STATE) return;
      const str = JSON.stringify(state, null, 2);
      if (window.editor) window.editor.setValue(str);
    }
    function tryInit() {
      if (!window.Desmos || !window.Desmos[CALC_TYPE]) { setTimeout(tryInit, 300); return; }
      Calc = window.Desmos[CALC_TYPE](document.getElementById('calculator'));
      window.Calc = Calc;
      if (HAS_STATE && Calc.observeEvent) {
        Calc.observeEvent('change', () => {
          const state = Calc.getState();
          updateJsonViewer(state);
          vscode.postMessage({ command: 'tempState', data: state });
        });
        setTimeout(() => updateJsonViewer(Calc.getState()), 500);
      }
    }
    tryInit();
    const dragbar = document.getElementById('dragbar');
    let dragging = false;
    dragbar.onmousedown = () => { dragging = true; document.body.style.cursor='ew-resize'; };
    window.onmousemove = e => { if (dragging) { const pct = e.clientX/window.innerWidth; document.getElementById('left').style.flex = pct * 10; document.getElementById('right').style.flex = (1-pct) * 10; } };
    window.onmouseup = () => { dragging=false; document.body.style.cursor=''; };
    if (HAS_STATE) {
      document.getElementById('apply-btn').onclick = () => {
        try {
          const val = window.editor ? window.editor.getValue() : document.getElementById('json-editor').value;
          const json = JSON.parse(val);
          if (Calc.setState) Calc.setState(json);
        } catch {
          alert('Invalid JSON');
        }
      };
    }
    window.addEventListener('message', evt => {
      if (evt.data.command === 'import' && HAS_STATE) Calc.setState(evt.data.data);
      else if (evt.data.command === 'export' && HAS_STATE) vscode.postMessage({ command:'calcState', data:Calc.getState() });
      else if (evt.data.command === 'randomizeSeed' && HAS_STATE) {
        const state=Calc.getState(), newSeed=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('');
        state.randomSeed=newSeed; Calc.setState(state); vscode.postMessage({command:'info',message:'Random seed updated.'});
      }
    });
  </script>
</body>
</html>`;
}

function openDesmos({ viewType, script, title, restoredState, onUnsaved, onSave, onThemeChange, calculatorType, jsonTheme, existingPanel }) {
  calculatorType = calculatorType || 'GraphingCalculator';
  jsonTheme = jsonTheme || 'dracula';
  const panel = existingPanel || vscode.window.createWebviewPanel(
    viewType, title, vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  if (existingPanel) {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(__dirname, '..', 'lib'))]
    };
  }

  const scriptUri = script instanceof vscode.Uri
    ? panel.webview.asWebviewUri(script).toString()
    : script;
  const libDir = path.join(__dirname, '..', 'lib');
  const cmJsUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(libDir, 'codemirror.min.js'))).toString();
  const jsModeUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(libDir, 'javascript.min.js'))).toString();
  panel.webview.html = getHtml(scriptUri, cmJsUri, jsModeUri, calculatorType, jsonTheme);

  const panelState = {
    tempState: null,
    jsonTemp: null,
    tempImport: null,
    justImported: false,
    hasRecovery: false,
    calculatorType,
    onUnsaved,
    onSave,
    onThemeChange
  };
  panels.set(panel, panelState);

  panel.webview.onDidReceiveMessage(async msg => {
    if (msg.command === "calcState") {
      const calcType = panelState.calculatorType || 'GraphingCalculator';
      const defaultName = EXPORT_FILENAMES[calcType] || 'export.desmos';
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultName),
        filters: { 'Desmos Calculator': ["desmos"] }
      });
      if (saveUri) {
        const dataWithType = { ...msg.data, _calculatorType: calcType };
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(dataWithType, null, 2));
        vscode.window.showInformationMessage("Data exported");
        panelState.jsonTemp = msg.data;
        if (typeof panelState.onSave === 'function') panelState.onSave(saveUri.fsPath);
      }
    } else if (msg.command === "tempState") {
      if (panelState.justImported) {
        panelState.justImported = false;
        return;
      }
      panelState.tempState = msg.data;
      if (typeof panelState.onUnsaved === 'function') {
        panelState.onUnsaved(panelState.tempState, panelState.hasRecovery);
      }
      panelState.hasRecovery = true;
    } else if (msg.command === "import") {
      panelState.tempImport = msg.data;
      panelState.tempState = msg.data;
      panelState.justImported = true;
      panelState.hasRecovery = false;
    } else if (msg.command === "themeChange") {
      if (typeof panelState.onThemeChange === 'function') {
        panelState.onThemeChange(msg.theme);
      }
    }
  });

  panel.onDidDispose(() => {
    panels.delete(panel);
  });

  if (restoredState) {
    panel.webview.postMessage({ command: "import", data: restoredState });
  }
}

function getPanel() {
  for (const [panel] of panels) {
    if (panel.visible) {
      return panel;
    }
  }
  return null;
}

function setTempImport(panel, data) {
  const panelState = panels.get(panel);
  if (panelState) {
    panelState.tempImport = data;
    panelState.tempState = data;
    panelState.justImported = true;
  }
}

module.exports = { openDesmos, getPanel, setTempImport };
