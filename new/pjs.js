// Copyright 2015 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var fs = require('fs');
var beautify = require('js-beautify').js_beautify;
var sexpp = require('./sexp');
var parseArgs = require('minimist');
var util = require('./util');
var macrolib = require('./macro');
var qqlib = require('./quasi');
var symlib = require('./symbol');
var gen = require('./gen');

// Expose a global pjs object so it can be found by macro evals.
global.pjs = {
  assoc: util.assoc,
  sym: symlib.sym,
  isSymbol: symlib.isSymbol,
};

var genSym = {
  num: 0,
  get: function() {
    return '__pjs_' + genSym.num;
  },
  next: function() {
    genSym.num++;
    return genSym.get();
  }
};

var macros = {
  genSym: genSym.next,
};

var libmacros = ['fn', 'caseSexp', 'forEach', 'assert'];
for (var i = 0; i < libmacros.length; i++) {
  macros[libmacros[i]] = macrolib[libmacros[i]];
}

function evalStmts(code) {
  code = [['var', 'f', ['function', []].concat(code)], ['f']];
  var js = genStmts(code);
  // console.log('js', js);
  return eval(js);
}

function genMacro(sexp, outVar) {
  var name = Symbol.keyFor(sexp[0]);
  var args = sexp.slice(1);
  var macro = macros[name];

  var code = macro.apply(null, args);
  // console.log('macro result', typeof code, code);

  var exp = gen2(code, outVar);
  // console.log('gen', exp);
  return exp;
}

function genAsStmt(sexp, outVar) {
  // console.log('genAsStmt', sexp, outVar);
  var g = gen2(sexp, outVar);
  var code = g.code;
  if (g.expr) {
    if (outVar) {
      if (outVar == 'return') {
        code = 'return ' + code + ';';
      } else {
        code = outVar + "=" + code + ";";
      }
    } else {
      if (!symlib.isSymbol(sexp[0], 'function')) {
        code += ';';
      }
    }
  }
  return code;
}

function genAsExpr(sexp, prec) {
  var g = gen2(sexp);
  if (!g.expr) {
    throw new Error("in " + sexp + " stmt here not supported, had code " + g.code);
  }
  if (!(prec in precTable)) {
    throw new Error('unknown precedence: ' + prec);
  }
  prec = precTable[prec];
  if (prec > g.prec) {
    g.code = '(' + g.code + ')';
  }
  return g.code;
}

function genAsArgs(list) {
  return list.map(function(e) {
    return genAsExpr(e, ',');
  }).join(', ');
}

function mkStmt(code) {
  return {code:code, expr:false};
}

var precTable = gen.precTable;

function mkExpr(code, prec) {
  if (!(prec in precTable)) {
    throw new Error('unknown precedence: ' + prec);
  }
  return {code:code, expr:true, prec:precTable[prec]};
}

function gen2(sexp, outVar) {
  // console.log('gen2', typeof sexp, sexp, outVar);

  if (typeof sexp === 'undefined') {
    throw new Error('undefined sexp');
  }

  if (typeof sexp === 'string') {
    return mkExpr(gen.stringQuote(sexp), 'lit');
  }
  if (typeof sexp === 'number') {
    return mkExpr(sexp, 'lit');
  }
  if (typeof sexp === 'boolean') {
    return mkExpr(sexp, 'lit');
  }
  if (symlib.isSymbol(sexp)) {
    return mkExpr(Symbol.keyFor(sexp), 'lit');
  }

  if (sexp.length === 0) {
    return mkStmt(';');
  }

  if (symlib.isSymbol(sexp[0])) {
    switch (Symbol.keyFor(sexp[0])) {
    case '+': case '-': case '*': case '=': case '<': case '>': case '&&': case '!=': case '+=': case '==': case '>=': case 'in': case '||':
      var op = Symbol.keyFor(sexp[0]);
      var exprs = sexp.slice(1).map(function(e) {
        return genAsExpr(e, op);
      });
      return mkExpr(exprs.join(' ' + op + ' '), op);
    case '++': case '--': case '!':
      var op = Symbol.keyFor(sexp[0]);
      return mkExpr(op + genAsExpr(sexp[1], op), op);
    case '.':
      var obj = genAsExpr(sexp[1], '.');
      var attr = Symbol.keyFor(sexp[2]);
      var args = sexp.slice(3);
      if (args.length) {
        // (. foo bar a b) is shorthand for ((. foo bar) a b).
        sexp = sexp.slice(0, 3);
        if (args.length == 1 && args[0].length == 0) {
          // (. foo bar ()) is shorthand for ((. foo bar)).
          args = [];
        }
        return gen2([sexp].concat(args));
      }
      return mkExpr(obj + '.' + attr, '.');
    case 'var':
      var name = Symbol.keyFor(sexp[1]);
      var js = 'var ' + name;
      if (sexp.length > 2) {
        var val = sexp[2];
        var g = gen2(val, name);
        if (g.expr) {
          js += ' = ' + g.code + ';';
        } else {
          js += ';' + g.code;
        }
      } else {
        js += ';';
      }
      return mkStmt(js);
    case 'function':
      sexp = sexp.slice(1);
      var name = '';
      if (symlib.isSymbol(sexp[0])) {
        name = Symbol.keyFor(sexp[0]);
        sexp = sexp.slice(1);
      }
      var args = sexp[0];
      var vararg = null;
      for (var i = 0; i < args.length; i++) {
        if (Symbol.keyFor(args[i]) == '.') {
          vararg = args[i+1];
          args = args.slice(0, i);
          break;
        }
      }
      var body = sexp.slice(1);
      var js = 'function ' + name + '(' + args.map(function(arg) { return Symbol.keyFor(arg) }).join(',') + ') {';
      if (vararg) {
        js += genAsStmt([pjs.sym('var'), vararg, [pjs.sym('Array.prototype.slice.call'), pjs.sym('arguments'), i]], null);
      }
      js += genStmts(body);
      js += '}';
      return mkExpr(js, 'lit');
    case 'return':
      var body = gen2(sexp[1], 'return');
      if (body.expr) {
        return mkStmt('return ' + body.code + ';');
      } else {
        return body;
      }
    case 'for':
      var js = 'for (';
      js += genAsStmt(sexp[1]);
      js += genAsStmt(sexp[2]);
      js += genAsStmt(sexp[3]);
      // XXX need to remove last semi for for loop
      var end = js[js.length - 1];
      if (end == ';') {
        js = js.substr(0, js.length - 1);
      }
      js += ') {';
      js += genStmts(sexp.slice(4));
      js += '}\n';
      return mkStmt(js);
    case 'throw':
      // Intentionally disregard outVar -- the exception throw will
      // never set it.
      return mkStmt('throw ' + genAsExpr(sexp[1], 'none') + ';');
    case 'switch':
      var js = 'switch (' + genAsExpr(sexp[1], 'none') + ') {';
      sexp.slice(2).forEach(function(scase) {
        var str = 'case ' + genAsExpr(scase[0], 'none') + ':\n';
        if (symlib.isSymbol(scase[0]) && Symbol.keyFor(scase[0]) == 'default') {
          str = 'default:\n';
        }
        js += str + genStmts(scase.slice(1), outVar);
        if (outVar && outVar != 'return')
          js += 'break;';
      });
      js += '}';
      return mkStmt(js);
    case 'map':
      return gen2([[pjs.sym('.'), sexp[2], pjs.sym('map')], sexp[1]]);
    case 'at':
      return mkExpr(genAsExpr(sexp[1], '[]') + '[' + genAsExpr(sexp[2], 'none') + ']', '[]');
    case 'while':
      var cond = genAsExpr(sexp[1], 'none');
      var body = genStmts(sexp.slice(2));
      return mkStmt('while (' + cond +  ') {\n' + body + '}');
    case 'break':
      return mkStmt('break;');
    case 'continue':
      return mkStmt('continue;');
    case 'new':
      // TODO: rewrite as a macro arounc a single-arg form
      // e.g. (new x) is builtin, while (new x y z) is (new (x y z)).
      return mkExpr('new ' + Symbol.keyFor(sexp[1]) + '(' + genAsArgs(sexp.slice(2)) + ')', 'new');
    case 'if':
      if (sexp.length < 3 || sexp.length > 4) {
        throw 'bad if';
      }

      // TODO factor this out.
      var js = '';
      var exp = gen2(sexp[1], genSym.get());
      if (!exp.expr) {
        js += exp.code;
        exp = genSym.get();
        genSym.next();
      } else {
        exp = exp.code;
      }

      js += 'if (' + exp + ') {';
      js += genAsStmt(sexp[2], outVar);
      js += '}\n';
      if (sexp.length == 4) {
        js += " else {\n" + genAsStmt(sexp[3], outVar) + "}\n";
      }
      return mkStmt(js);
    case 'do':
      return mkStmt(genStmts(sexp.slice(1), outVar));
    case 'list':
      // XXX rewrite as macro?
      var args = sexp.slice(1).map(function(e) {
        return genAsExpr(e, ',');
      });
      return mkExpr("[" + genAsArgs(sexp.slice(1)) + "]", 'list');
    case 'qq':
      return gen2(qqlib.qq(sexp[1]), outVar);
    case 'instanceof':
      var left = genAsExpr(sexp[1], 'instanceof');
      var right = genAsExpr(sexp[2], 'instanceof');
      return mkExpr(left + ' instanceof ' + right, 'instanceof');
    case 'obj':
      var js = '{';
      for (var i = 1; i < sexp.length; i += 2) {
        if (i > 1) {
          js += ', ';
        }
        var key = sexp[i];
        if (pjs.isSymbol(key)) {
          key = Symbol.keyFor(key);
        } else if (typeof key == 'string') {
          key = gen.stringQuote(key);
        } else {
          throw new Error('cannot make obj literal with ' + key);
        }
        var val = genAsExpr(sexp[i+1], ',');
        js += key + ':' + val;
      }
      js += '}';
      return mkExpr(js, 'obj');
    case '#macro':
      var name = Symbol.keyFor(sexp[1]);
      var args = sexp[2].map(function(a) { return Symbol.keyFor(a); });
      var body = sexp.slice(3);

      var jsBody = genStmts(body);
      var fn = new Function(args.join(','), jsBody);
      macros[name] = fn;
      return mkExpr('/* macro definition */', 'lit');
    default:
      if (macros[Symbol.keyFor(sexp[0])]) {
        return genMacro(sexp, outVar);
      }
    }
  }

  var func = genAsExpr(sexp[0], 'call');
  var args = genAsArgs(sexp.slice(1));
  return mkExpr(func + '(' + args + ')', 'call');
}

function genStmts(sexps, outVar) {
  var js = '';
  for (var i = 0; i < sexps.length; i++) {
    if (i < sexps.length - 1) {
      js += genAsStmt(sexps[i], null);
    } else {
      js += genAsStmt(sexps[i], outVar);
    }
  }
  return js;
}

var args = parseArgs(process.argv.slice(2), {
  boolean: ['u', 'n'],
  string: ['_'],
  unknown: function(arg) {
    if (arg[0] === '-') {
      console.log('unknown arg', arg);
      process.exit(1);
    }
    return true;
  }
});

var infile = args._[0];
var outfile = args._[1];
var data = fs.readFileSync(infile);

var p = sexpp.parse(data);
// console.log(p);

if (args.n) {
  var gen = require('./gen');
  js = gen.genStmts(p);
} else {
  var js = genStmts(p);
}
js = '// generated by pjs -- do not edit\n' + js;

if (!args.u) {
  js = beautify(js, {indent_size:2});
}
if (js[js.length - 1] != '\n') {
  js += '\n';
}

fs.writeFileSync(outfile, js);
