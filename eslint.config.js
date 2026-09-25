const correctnessRules={
  'no-debugger':'error',
  'no-dupe-args':'error',
  'no-dupe-keys':'error',
  'no-duplicate-case':'error',
  'no-func-assign':'error',
  'no-import-assign':'error',
  'no-invalid-regexp':'error',
  'no-irregular-whitespace':'error',
  'no-loss-of-precision':'error',
  'no-obj-calls':'error',
  'no-redeclare':'error',
  'no-self-assign':'error',
  'no-sparse-arrays':'error',
  'no-unreachable':'error',
  'no-unsafe-finally':'error',
  'no-unsafe-negation':'error',
  'use-isnan':'error',
  'valid-typeof':'error',
  'no-undef':'error',
  'no-unused-vars':['error',{args:'none',caughtErrors:'none',ignoreRestSiblings:true,varsIgnorePattern:'^_'}]
};

const browserGlobals={
  window:'readonly',document:'readonly',globalThis:'readonly',DOMParser:'readonly',getComputedStyle:'readonly',
  FileReader:'readonly',Blob:'readonly',File:'readonly',URL:'readonly',
  URLSearchParams:'readonly',alert:'readonly',console:'readonly',fetch:'readonly',
  navigator:'readonly',location:'readonly',performance:'readonly',
  requestAnimationFrame:'readonly',cancelAnimationFrame:'readonly',
  setTimeout:'readonly',clearTimeout:'readonly',setInterval:'readonly',clearInterval:'readonly',
  HTMLElement:'readonly',HTMLCanvasElement:'readonly',Event:'readonly',CustomEvent:'readonly',
  Image:'readonly',crypto:'readonly',atob:'readonly',btoa:'readonly'
};

const nodeGlobals={
  require:'readonly',module:'readonly',exports:'writable',__dirname:'readonly',__filename:'readonly',
  process:'readonly',console:'readonly',Buffer:'readonly',global:'writable',globalThis:'readonly',
  setTimeout:'readonly',clearTimeout:'readonly',setInterval:'readonly',clearInterval:'readonly',
  URL:'readonly',URLSearchParams:'readonly',TextEncoder:'readonly',TextDecoder:'readonly',
  AbortController:'readonly',fetch:'readonly',Blob:'readonly',FormData:'readonly',
  PV2000:'writable'
};

module.exports=[
  {ignores:['dist/**','legacy/**','private/**']},
  {
    files:['src/**/*.js'],
    languageOptions:{ecmaVersion:'latest',sourceType:'script',globals:browserGlobals},
    linterOptions:{reportUnusedDisableDirectives:'error'},
    rules:correctnessRules
  },
  {
    files:['scripts/**/*.js','tests/**/*.js'],
    languageOptions:{ecmaVersion:'latest',sourceType:'script',globals:nodeGlobals},
    linterOptions:{reportUnusedDisableDirectives:'error'},
    rules:correctnessRules
  }
];
